import "dotenv/config";
import { network } from "hardhat";

const CONTRACT_ADDRESS = process.env.FIRE_INSURANCE_ADDRESS;

if (!CONTRACT_ADDRESS) {
  throw new Error("Set FIRE_INSURANCE_ADDRESS in your .env file");
}

async function main() {
  const { ethers } = await network.create();

  const signers = await ethers.getSigners();

  // Insurer account
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

  // Change this ID to cancel another policy
  const policyId = 1n;

  console.log("\n========== CANCEL INSURANCE POLICY ==========");
  console.log("Policy ID:", policyId.toString());

  // Check the policy before cancellation
  const policy = await contract.getPolicy(policyId);

  if (!policy.exists) {
    throw new Error("Policy does not exist.");
  }

  if (!policy.verified) {
    throw new Error("Policy must be verified before cancellation.");
  }

  if (policy.cancelledAt !== 0n) {
    throw new Error("This policy has already been cancelled.");
  }

  console.log("Policy Reference Hash:", policy.policyReferenceHash);
  console.log("Current Status: Verified and Active");

  console.log("\nSubmitting cancellation transaction...");

  const tx = await contract.cancelPolicy(policyId);

  console.log("Transaction Hash:", tx.hash);

  await tx.wait();

  // Retrieve updated policy details
  const updatedPolicy = await contract.getPolicy(policyId);

  console.log("\nPolicy cancelled successfully.");

  console.log(
    "Cancelled At:",
    new Date(Number(updatedPolicy.cancelledAt) * 1000).toLocaleString()
  );

  console.log("Verified:", updatedPolicy.verified);
  console.log("==============================================");
}

main().catch((error) => {
  console.error("\nFailed to cancel policy:");
  console.error(error);
  process.exitCode = 1;
});