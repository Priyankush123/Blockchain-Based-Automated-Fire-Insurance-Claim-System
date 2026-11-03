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

  // Change this ID to retrieve another claim
  const claimId = 1n;

  console.log("\nFetching claim details...");
  console.log("Claim ID:", claimId.toString());

  const claim = await contract.getClaim(claimId);

  const statuses = [
    "NONE",
    "SUBMITTED",
    "ASSESSED",
    "APPROVED",
    "REJECTED",
    "SETTLED"
  ];

  const status =
    statuses[Number(claim.status)] ?? "UNKNOWN";

  console.log("\n========== FIRECHAIN CLAIM DETAILS ==========");

  console.log("Claim ID:", claim.claimId.toString());
  console.log("Policy ID:", claim.policyId.toString());
  console.log("Incident ID:", claim.incidentId.toString());

  console.log("Claimant Agent:", claim.claimantAgent);
  console.log("Assigned Surveyor:", claim.assignedSurveyor);

  console.log("Assessment ID:", claim.assessmentId.toString());

  console.log(
    "Approved Amount: ₹",
    ethers.formatUnits(claim.approvedAmount, 2)
  );

  console.log(
    "Settled Amount: ₹",
    ethers.formatUnits(claim.settledAmount, 2)
  );

  console.log("Status:", status);

  console.log("Rejection Reason Hash:", claim.rejectionReasonHash);
  console.log("Payment Reference Hash:", claim.paymentReferenceHash);

  console.log("Exists:", claim.exists);

  // Retrieve assessment details if an assessment exists
  if (claim.assessmentId > 0n) {
    const assessment = await contract.getAssessment(
      claim.assessmentId
    );

    console.log("\n---------- CLAIM ASSESSMENT ----------");

    console.log(
      "Building Loss: ₹",
      ethers.formatUnits(assessment.buildingLoss, 2)
    );

    console.log(
      "Contents Loss: ₹",
      ethers.formatUnits(assessment.contentsLoss, 2)
    );

    console.log(
      "Machinery Loss: ₹",
      ethers.formatUnits(assessment.machineryLoss, 2)
    );

    console.log(
      "Salvage Value: ₹",
      ethers.formatUnits(assessment.salvageValue, 2)
    );

    console.log(
      "Gross Loss: ₹",
      ethers.formatUnits(assessment.grossLoss, 2)
    );

    console.log(
      "Eligible Amount: ₹",
      ethers.formatUnits(assessment.eligibleAmount, 2)
    );

    console.log("Report Hash:", assessment.reportHash);
    console.log("Surveyor:", assessment.surveyor);

    console.log(
      "Submitted At:",
      new Date(Number(assessment.submittedAt) * 1000).toLocaleString()
    );

    console.log("--------------------------------------");
  } else {
    console.log("\nNo assessment has been submitted for this claim.");
  }

  console.log("=============================================");
}

main().catch((error) => {
  console.error("\nFailed to retrieve claim:");
  console.error(error);
  process.exitCode = 1;
});