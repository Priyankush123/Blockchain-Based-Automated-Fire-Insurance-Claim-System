
import "dotenv/config";
import { network } from "hardhat";

const CONTRACT_ADDRESS = process.env.FIRE_INSURANCE_ADDRESS;

if (!CONTRACT_ADDRESS) {
  throw new Error("Set FIRE_INSURANCE_ADDRESS in your .env file");
}

async function main() {
  const { ethers } = await network.create();
  const signers = await ethers.getSigners();

  // Account 3: Registered surveyor
  const surveyor = signers[3];

  const artifact = await import(
    "../artifacts/contracts/FireInsurance.sol/FireInsurance.json",
    { with: { type: "json" } }
  );

  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    artifact.default.abi,
    surveyor
  );

  const claimId = 1n;

  // All amounts are in INR paise
  const buildingLoss = 12_00_000n * 100n;  // ₹12,00,000
  const contentsLoss = 3_00_000n * 100n;   // ₹3,00,000
  const machineryLoss = 2_00_000n * 100n;  // ₹2,00,000
  const salvageValue = 50_000n * 100n;     // ₹50,000

  // Demonstration assessment report fingerprint
  const reportHash = ethers.sha256(
    ethers.toUtf8Bytes("FIRECHAIN-SURVEY-ASSESSMENT-001")
  );

  console.log("Surveyor:", await surveyor.getAddress());
  console.log("Claim ID:", claimId.toString());

  console.log("\nSubmitting loss assessment...");

  const tx = await contract.submitAssessment(
    claimId,
    buildingLoss,
    contentsLoss,
    machineryLoss,
    salvageValue,
    reportHash
  );

  console.log("Transaction:", tx.hash);

  await tx.wait();

  const assessmentId = await contract.assessmentCount();
  const assessment = await contract.getAssessment(assessmentId);
  const claim = await contract.getClaim(claimId);

  console.log("\nAssessment submitted successfully!");
  console.log("Assessment ID:", assessmentId.toString());
  console.log("Gross loss: ₹", ethers.formatUnits(assessment.grossLoss, 2));
  console.log("Eligible amount: ₹", ethers.formatUnits(assessment.eligibleAmount, 2));
  console.log("Claim status:", claim.status.toString());
}

main().catch((error) => {
  console.error("Assessment submission failed:", error);
  process.exitCode = 1;
});
