
import "dotenv/config";
import { network } from "hardhat";

const CONTRACT_ADDRESS = process.env.FIRE_INSURANCE_ADDRESS;

if (!CONTRACT_ADDRESS) {
  throw new Error("Set FIRE_INSURANCE_ADDRESS in your .env file");
}

async function main() {
  const { ethers } = await network.create();

  // Account 1 is the demo insurer
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

  const policyId = 1n;

  console.log("Insurer:", await insurer.getAddress());
  console.log("Verifying Policy ID:", policyId.toString());

  const tx = await contract.verifyPolicy(policyId);
  console.log("Transaction submitted:", tx.hash);

  await tx.wait();

  const policy = await contract.getPolicy(policyId);

  console.log("\nPolicy verified successfully!");
  console.log("Policy ID:", policy.policyId.toString());
  console.log("Verified:", policy.verified);
}

main().catch((error) => {
  console.error("Policy verification failed:", error);
  process.exitCode = 1;
});
