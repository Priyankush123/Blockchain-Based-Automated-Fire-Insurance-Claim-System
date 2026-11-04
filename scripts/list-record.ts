import "dotenv/config";
import { network } from "hardhat";

const CONTRACT_ADDRESS = process.env.FIRE_INSURANCE_ADDRESS;

if (!CONTRACT_ADDRESS) {
  throw new Error("Set FIRE_INSURANCE_ADDRESS in your .env file");
}

async function main() {
  const { ethers } = await network.create();

  const signers = await ethers.getSigners();
  const insurer = signers[1];

  const artifact = await import(
    "../artifacts/contracts/FireInsurance.sol/FireInsurance.json",
    { with: { type: "json" } }
  );

  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    artifact.default.abi,
    insurer
  );

  console.log("\n========== FIRECHAIN BLOCKCHAIN RECORDS ==========");

  // Retrieve total record counts
  const policyCount = await contract.getTotalPolicies();
  const incidentCount = await contract.getTotalIncidents();
  const claimCount = await contract.getTotalClaims();
  const assessmentCount = await contract.getTotalAssessments();

  console.log("\nRECORD SUMMARY");
  console.log("--------------------------------");
  console.log("Total Policies:", policyCount.toString());
  console.log("Total Incidents:", incidentCount.toString());
  console.log("Total Claims:", claimCount.toString());
  console.log("Total Assessments:", assessmentCount.toString());

  // List all policies
  console.log("\n========== POLICIES ==========");

  for (let i = 1n; i <= policyCount; i++) {
    const policy = await contract.getPolicy(i);

    console.log(`\nPolicy ID: ${i.toString()}`);
    console.log("Verified:", policy.verified);
    console.log("Fire Covered:", policy.fireCovered);
    console.log("Sum Insured: ₹", ethers.formatUnits(policy.sumInsured, 2));
    console.log("Exists:", policy.exists);
  }

  // List all incidents
  console.log("\n========== FIRE INCIDENTS ==========");

  for (let i = 1n; i <= incidentCount; i++) {
    const incident = await contract.getIncident(i);

    console.log(`\nIncident ID: ${i.toString()}`);
    console.log("Policy ID:", incident.policyId.toString());
    console.log("Verified:", incident.verified);
    console.log("Exists:", incident.exists);
  }

  // List all claims
  console.log("\n========== CLAIMS ==========");

  const statuses = [
    "NONE",
    "SUBMITTED",
    "ASSESSED",
    "APPROVED",
    "REJECTED",
    "SETTLED"
  ];

  for (let i = 1n; i <= claimCount; i++) {
    const claim = await contract.getClaim(i);

    const status =
      statuses[Number(claim.status)] ?? "UNKNOWN";

    console.log(`\nClaim ID: ${i.toString()}`);
    console.log("Policy ID:", claim.policyId.toString());
    console.log("Incident ID:", claim.incidentId.toString());
    console.log("Status:", status);

    console.log(
      "Approved Amount: ₹",
      ethers.formatUnits(claim.approvedAmount, 2)
    );

    console.log(
      "Settled Amount: ₹",
      ethers.formatUnits(claim.settledAmount, 2)
    );
  }

  // List all assessments
  console.log("\n========== ASSESSMENTS ==========");

  for (let i = 1n; i <= assessmentCount; i++) {
    const assessment = await contract.getAssessment(i);

    console.log(`\nAssessment ID: ${i.toString()}`);

    console.log(
      "Gross Loss: ₹",
      ethers.formatUnits(assessment.grossLoss, 2)
    );

    console.log(
      "Eligible Amount: ₹",
      ethers.formatUnits(assessment.eligibleAmount, 2)
    );

    console.log("Surveyor:", assessment.surveyor);
  }

  console.log("\n==================================================");
  console.log("Blockchain record listing completed.");
}

main().catch((error) => {
  console.error("\nFailed to list blockchain records:");
  console.error(error);
  process.exitCode = 1;
});