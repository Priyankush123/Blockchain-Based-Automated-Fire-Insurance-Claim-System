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

  // Get the latest local blockchain timestamp
  const latestBlock = await ethers.provider.getBlock("latest");

  if (!latestBlock) {
    throw new Error("Could not retrieve latest blockchain block");
  }

  const incidentDate = BigInt(latestBlock.timestamp);

  // Generate unique demonstration hashes
  const incidentReferenceHash = ethers.keccak256(
    ethers.toUtf8Bytes("FIRECHAIN-INCIDENT-001")
  );

  console.log("Insurer:", await insurer.getAddress());
  console.log("Policy ID:", policyId.toString());
  console.log("Incident date:", new Date(Number(incidentDate) * 1000).toISOString());

  console.log("\nReporting fire incident...");

  const tx = await contract.reportFire(
    policyId,
    incidentDate,
    incidentReferenceHash
  );

  console.log("Transaction submitted:", tx.hash);

  await tx.wait();

  const incidentCount = await contract.incidentCount();

  console.log("\nFire incident reported successfully!");
  console.log("Incident ID:", incidentCount.toString());
  console.log("Incident reference hash:", incidentReferenceHash);
}

main().catch((error) => {
  console.error("Fire reporting failed:", error);
  process.exitCode = 1;
});
