import "dotenv/config";
import { network } from "hardhat";

const CONTRACT_ADDRESS = process.env.FIRE_INSURANCE_ADDRESS;

if (!CONTRACT_ADDRESS) {
  throw new Error("Set FIRE_INSURANCE_ADDRESS in your .env file");
} 

async function main() {
  const { ethers } = await network.create();
  const signers = await ethers.getSigners();

  // Account 1: Registered insurer
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

  const claimId = 1n;

  // Retrieve assessment ID from the claim
  const claim = await contract.getClaim(claimId);
  const assessment = await contract.getAssessment(claim.assessmentId);

  const eligibleAmount = assessment.eligibleAmount;

  console.log("Insurer:", await insurer.getAddress());
  console.log("Claim ID:", claimId.toString());
  console.log(
    "Eligible amount: ₹",
    ethers.formatUnits(eligibleAmount, 2)
  );

  if (eligibleAmount === 0n) {
    throw new Error("Cannot approve a zero-value claim");
  }

  console.log("\nApproving claim...");

  const tx = await contract.approveClaim(
    claimId,
    eligibleAmount
  );

  console.log("Transaction:", tx.hash);

  await tx.wait();

  const updatedClaim = await contract.getClaim(claimId);

  console.log("\nClaim approved successfully!");
  console.log(
    "Approved amount: ₹",
    ethers.formatUnits(updatedClaim.approvedAmount, 2)
  );
  console.log("Claim status:", updatedClaim.status.toString());
}

main().catch((error) => {
  console.error("Claim approval failed:", error);
  process.exitCode = 1;
});
