import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("FireChain complete workflow", function () {
  let admin: any, insurer: any, insurer2: any, officer: any, surveyor: any, surveyor2: any, outsider: any;
  let app: any;

  const INSURER = 0, FIRE_OFFICER = 1, SURVEYOR = 2;
  const policyInput = {
    policyReferenceHash: ethers.id("POLICY-001"),
    propertyReferenceHash: ethers.id("PROPERTY-001"),
    policyholderReferenceHash: ethers.id("POLICYHOLDER-001"),
    policyDocumentHash: ethers.id("POLICY-PDF-001"),
    termsHash: ethers.id("TERMS-001"),
    sumInsured: 5_000_000_00n,
    deductible: 50_000_00n,
    startDate: 1_700_000_000n,
    endDate: 1_900_000_000n,
    fireCovered: true
  };

  async function registerRoles() {
    await app.registerStakeholder(insurer.address, INSURER);
    await app.registerStakeholder(insurer2.address, INSURER);
    await app.registerStakeholder(officer.address, FIRE_OFFICER);
    await app.registerStakeholder(surveyor.address, SURVEYOR);
    await app.registerStakeholder(surveyor2.address, SURVEYOR);
  }

  async function createVerifiedPolicy() {
    await app.connect(insurer).registerPolicy(policyInput);
    await app.connect(insurer).verifyPolicy(1);
  }

  async function createVerifiedIncident() {
    const block = await ethers.provider.getBlock("latest");
    const incidentDate = BigInt(block!.timestamp - 100);
    await app.connect(insurer).reportFire(
      1, incidentDate, ethers.id("INCIDENT-001"), ethers.id("EVIDENCE-001")
    );
    await app.connect(officer).verifyIncident(1, ethers.id("FIRE-REPORT-001"));
  }

  beforeEach(async function () {
    [admin, insurer, insurer2, officer, surveyor, surveyor2, outsider] = await ethers.getSigners();
    app = await ethers.deployContract("FireInsurance");
  });

  describe("Access control", function () {
    it("assigns admin role to deployer", async function () {
      expect(await app.hasRole(ethers.ZeroHash, admin.address)).to.equal(true);
    });

    it("allows admin to register insurer, officer and surveyor", async function () {
      await registerRoles();
      expect(await app.hasRole(await app.INSURER_ROLE(), insurer.address)).to.equal(true);
      expect(await app.hasRole(await app.FIRE_OFFICER_ROLE(), officer.address)).to.equal(true);
      expect(await app.hasRole(await app.SURVEYOR_ROLE(), surveyor.address)).to.equal(true);
    });

    it("rejects stakeholder registration by non-admin", async function () {
      await expect(app.connect(outsider).registerStakeholder(insurer.address, INSURER)).to.revert(ethers);
    });

    it("rejects duplicate role assignment", async function () {
      await app.registerStakeholder(insurer.address, INSURER);
      await expect(app.registerStakeholder(insurer.address, INSURER)).to.be.revertedWith("Role already assigned");
    });

    it("allows admin to revoke a stakeholder", async function () {
      await app.registerStakeholder(insurer.address, INSURER);
      await app.revokeStakeholder(insurer.address, INSURER);
      expect(await app.hasRole(await app.INSURER_ROLE(), insurer.address)).to.equal(false);
    });
  });

  describe("Policy lifecycle", function () {
    beforeEach(registerRoles);

    it("registers an existing policy", async function () {
      await expect(app.connect(insurer).registerPolicy(policyInput))
        .to.emit(app, "PolicyRegistered");
      expect(await app.policyCount()).to.equal(1n);
    });

    it("stores policy fields and document hash", async function () {
      await app.connect(insurer).registerPolicy(policyInput);
      const p = await app.getPolicy(1);
      expect(p.insurer).to.equal(insurer.address);
      expect(p.policyDocumentHash).to.equal(policyInput.policyDocumentHash);
      expect(p.verified).to.equal(false);
    });

    it("rejects policy registration by an unauthorised account", async function () {
      await expect(app.connect(outsider).registerPolicy(policyInput)).to.revert(ethers);
    });

    it("rejects duplicate policy reference", async function () {
      await app.connect(insurer).registerPolicy(policyInput);
      await expect(app.connect(insurer).registerPolicy(policyInput)).to.be.revertedWith("Policy already registered");
    });

    it("rejects invalid sum insured and deductible", async function () {
      await expect(app.connect(insurer).registerPolicy({ ...policyInput, sumInsured: 0n }))
        .to.be.revertedWith("Invalid sum insured");
      await expect(app.connect(insurer).registerPolicy({ ...policyInput, deductible: 6_000_000_00n }))
        .to.be.revertedWith("Invalid deductible");
    });

    it("allows only the registering insurer to verify", async function () {
      await app.connect(insurer).registerPolicy(policyInput);
      await expect(app.connect(insurer2).verifyPolicy(1)).to.be.revertedWith("Not the policy insurer");
      await app.connect(insurer).verifyPolicy(1);
      expect((await app.getPolicy(1)).verified).to.equal(true);
    });

    it("checks policy dates and fire coverage", async function () {
      await createVerifiedPolicy();
      expect(await app.isPolicyValidAt(1, 1_800_000_000n)).to.equal(true);
      expect(await app.isPolicyValidAt(1, 1_600_000_000n)).to.equal(false);
      expect(await app.isPolicyValidAt(1, 2_000_000_000n)).to.equal(false);
    });

    it("preserves historical validity after cancellation", async function () {
      await createVerifiedPolicy();
      const block = await ethers.provider.getBlock("latest");
      const beforeCancellation = BigInt(block!.timestamp);
      await app.connect(insurer).cancelPolicy(1);
      const p = await app.getPolicy(1);
      expect(p.verified).to.equal(true);
      expect(p.cancelledAt).to.be.greaterThan(0n);
      expect(await app.isPolicyValidAt(1, beforeCancellation)).to.equal(true);
      expect(await app.isPolicyValidAt(1, p.cancelledAt)).to.equal(false);
    });

    it("does not allow cancellation twice", async function () {
      await createVerifiedPolicy();
      await app.connect(insurer).cancelPolicy(1);
      await expect(app.connect(insurer).cancelPolicy(1)).to.be.revertedWith("Policy already cancelled");
    });
  });

  describe("Fire incident verification", function () {
    beforeEach(async function () {
      await registerRoles();
      await createVerifiedPolicy();
    });

    it("allows insurer to report an incident", async function () {
      const block = await ethers.provider.getBlock("latest");
      const date = BigInt(block!.timestamp - 100);
      await expect(app.connect(insurer).reportFire(
        1, date, ethers.id("INC-1"), ethers.id("EVIDENCE-1")
      )).to.emit(app, "IncidentReported");
      expect(await app.incidentCount()).to.equal(1n);
    });

    it("rejects duplicate incident references", async function () {
      const block = await ethers.provider.getBlock("latest");
      const date = BigInt(block!.timestamp - 100);
      const ref = ethers.id("INC-DUP");
      await app.connect(insurer).reportFire(1, date, ref, ethers.id("E1"));
      await expect(app.connect(insurer).reportFire(1, date, ref, ethers.id("E2")))
        .to.be.revertedWith("Incident already registered");
    });

    it("rejects reporting by a non-insurer", async function () {
      const block = await ethers.provider.getBlock("latest");
      await expect(app.connect(outsider).reportFire(
        1, BigInt(block!.timestamp - 100), ethers.id("INC-X"), ethers.id("E-X")
      )).to.revert(ethers);
    });

    it("rejects future incident dates", async function () {
      await expect(app.connect(insurer).reportFire(
        1, 2_000_000_000n, ethers.id("INC-FUTURE"), ethers.id("E-FUTURE")
      )).to.be.revertedWith("Future incident date");
    });

    it("rejects incidents outside policy period", async function () {
      await expect(app.connect(insurer).reportFire(
        1, 1_600_000_000n, ethers.id("INC-OLD"), ethers.id("E-OLD")
      )).to.be.revertedWith("Policy not valid on incident date");
    });

    it("allows authorised fire officer to verify incident", async function () {
      await createVerifiedIncident();
      const i = await app.getIncident(1);
      expect(i.verified).to.equal(true);
      expect(i.verifiedBy).to.equal(officer.address);
      expect(i.fireReportHash).to.equal(ethers.id("FIRE-REPORT-001"));
    });

    it("rejects incident verification by an unauthorised account", async function () {
      const block = await ethers.provider.getBlock("latest");
      await app.connect(insurer).reportFire(
        1, BigInt(block!.timestamp - 100), ethers.id("INC-2"), ethers.id("E-2")
      );
      await expect(app.connect(outsider).verifyIncident(1, ethers.id("REPORT-X"))).to.revert(ethers);
    });

    it("rejects verifying the same incident twice", async function () {
      await createVerifiedIncident();
      await expect(app.connect(officer).verifyIncident(1, ethers.id("REPORT-SECOND")))
        .to.be.revertedWith("Incident already verified");
    });
  });

  describe("Surveyor assignment and assessment", function () {
    beforeEach(async function () {
      await registerRoles();
      await createVerifiedPolicy();
      await createVerifiedIncident();
    });

    it("allows insurer to assign an authorised surveyor and creates a claim", async function () {
      await expect(app.connect(insurer).assignSurveyor(1, surveyor.address))
        .to.emit(app, "ClaimCreated");
      const c = await app.getClaim(1);
      expect(c.assignedSurveyor).to.equal(surveyor.address);
      expect(c.status).to.equal(1n); // SUBMITTED
    });

    it("rejects assignment of an unregistered surveyor", async function () {
      await expect(app.connect(insurer).assignSurveyor(1, outsider.address))
        .to.be.revertedWith("Not an authorised surveyor");
    });

    it("rejects assignment by a different insurer", async function () {
      await expect(app.connect(insurer2).assignSurveyor(1, surveyor.address))
        .to.be.revertedWith("Not the policy insurer");
    });

    it("rejects duplicate claim creation for one incident", async function () {
      await app.connect(insurer).assignSurveyor(1, surveyor.address);
      await expect(app.connect(insurer).assignSurveyor(1, surveyor.address))
        .to.be.revertedWith("Claim already created");
    });

    it("allows assigned surveyor to submit assessment", async function () {
      await app.connect(insurer).assignSurveyor(1, surveyor.address);
      await expect(app.connect(surveyor).submitAssessment(
        1, 3_000_000_00n, 1_000_000_00n, 0n, 100_000_00n, ethers.id("SURVEY-1")
      )).to.emit(app, "AssessmentSubmitted");
      const c = await app.getClaim(1);
      expect(c.status).to.equal(2n); // ASSESSED
      const a = await app.getAssessment(1);
      expect(a.grossLoss).to.equal(3_900_000_00n);
      expect(a.eligibleAmount).to.equal(3_850_000_00n);
    });

    it("rejects assessment from a non-assigned surveyor", async function () {
      await app.connect(insurer).assignSurveyor(1, surveyor.address);
      await expect(app.connect(surveyor2).submitAssessment(
        1, 100n, 0n, 0n, 0n, ethers.id("SURVEY-X")
      )).to.be.revertedWith("Not the assigned surveyor");
    });

    it("rejects salvage greater than total loss", async function () {
      await app.connect(insurer).assignSurveyor(1, surveyor.address);
      await expect(app.connect(surveyor).submitAssessment(
        1, 100n, 0n, 0n, 101n, ethers.id("SURVEY-BAD")
      )).to.be.revertedWith("Salvage exceeds total loss");
    });
  });

  describe("Claim approval, rejection and settlement", function () {
    beforeEach(async function () {
      await registerRoles();
      await createVerifiedPolicy();
      await createVerifiedIncident();
      await app.connect(insurer).assignSurveyor(1, surveyor.address);
      await app.connect(surveyor).submitAssessment(
        1, 3_000_000_00n, 1_000_000_00n, 0n, 100_000_00n, ethers.id("SURVEY-FINAL")
      );
    });

    it("allows insurer to approve an eligible amount", async function () {
      await expect(app.connect(insurer).approveClaim(1, 3_850_000_00n))
        .to.emit(app, "ClaimApproved");
      expect((await app.getClaim(1)).status).to.equal(3n); // APPROVED
    });

    it("rejects approval above assessed eligible amount", async function () {
      await expect(app.connect(insurer).approveClaim(1, 4_000_000_00n))
        .to.be.revertedWith("Amount exceeds eligible loss");
    });

    it("rejects approval by another insurer", async function () {
      await expect(app.connect(insurer2).approveClaim(1, 100n))
        .to.be.revertedWith("Not the policy insurer");
    });

    it("allows insurer to record settlement matching approved amount", async function () {
      await app.connect(insurer).approveClaim(1, 3_850_000_00n);
      await expect(app.connect(insurer).recordSettlement(
        1, 3_850_000_00n, ethers.id("PAYMENT-REF-1")
      )).to.emit(app, "ClaimSettled");
      const c = await app.getClaim(1);
      expect(c.status).to.equal(5n); // SETTLED
      expect(c.settledAmount).to.equal(3_850_000_00n);
    });

    it("rejects settlement before approval", async function () {
      await expect(app.connect(insurer).recordSettlement(
        1, 100n, ethers.id("PAYMENT-REF-X")
      )).to.be.revertedWith("Claim not approved");
    });

    it("allows insurer to reject a claim with a reason hash", async function () {
      await expect(app.connect(insurer).rejectClaim(1, ethers.id("REJECTION-REASON")))
        .to.emit(app, "ClaimRejected");
      expect((await app.getClaim(1)).status).to.equal(4n); // REJECTED
    });
  });
});
