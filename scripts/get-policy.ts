
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

  // Change this ID to view another policy
  const policyId = 1n;

  console.log("\nFetching insurance policy...");
  console.log("Policy ID:", policyId.toString());

  const policy = await contract.getPolicy(policyId);

  const formatINR = (amount: bigint) =>
    "₹" + ethers.formatUnits(amount, 2);

  console.log("\n========== FIRECHAIN POLICY DETAILS ==========");

  console.log("Policy ID:", policy.policyId.toString());

  console.log(
    "Policy Reference Hash:",
    policy.policyReferenceHash
  );

  console.log(
    "Property Reference Hash:",
    policy.propertyReferenceHash
  );

  console.log(
    "Policyholder Reference Hash:",
    policy.policyholderReferenceHash
  );

  console.log("Insurer:", policy.insurer);

  console.log(
    "Sum Insured:",
    formatINR(policy.sumInsured)
  );

  console.log(
    "Deductible:",
    formatINR(policy.deductible)
  );

  console.log(
    "Start Date:",
    new Date(Number(policy.startDate) * 1000).toLocaleString()
  );

  console.log(
    "End Date:",
    new Date(Number(policy.endDate) * 1000).toLocaleString()
  );

  console.log(
    "Cancelled At:",
    policy.cancelledAt.toString() === "0"
      ? "Not cancelled"
      : new Date(Number(policy.cancelledAt) * 1000).toLocaleString()
  );

  console.log("Fire Covered:", policy.fireCovered);
  console.log("Verified:", policy.verified);
  console.log("Exists:", policy.exists);

  console.log("===============================================");
}

main().catch((error) => {
  console.error("\nFailed to retrieve policy:");
  console.error(error);
  process.exitCode = 1;
});
