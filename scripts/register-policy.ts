import "dotenv/config";
import { network } from "hardhat";

const CONTRACT_ADDRESS = process.env.FIRE_INSURANCE_ADDRESS;

if (!CONTRACT_ADDRESS) {
  throw new Error("Set FIRE_INSURANCE_ADDRESS in your .env file");
}

async function main() {
  // Connect to the local Hardhat blockchain
  const { ethers } = await network.create();

  // Get available Hardhat accounts
  const signers = await ethers.getSigners();

  // The second account is the demo insurer registered earlier
  const insurer = signers[1];

  console.log("Insurer wallet:", await insurer.getAddress());

  // Load the compiled contract artifact
  const artifact = await import(
    "../artifacts/contracts/FireInsurance.sol/FireInsurance.json",
    { with: { type: "json" } }
  );

  // Connect to the deployed contract using insurer's wallet
  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    artifact.default.abi,
    insurer
  );

  // Generate Ethereum-compatible hashes
  const hash = (value: string) =>
    ethers.keccak256(ethers.toUtf8Bytes(value));

  // Sample policy data for demonstration
  const policyInput = {
    policyReferenceHash: hash("FIRECHAIN-POLICY-001"),
    propertyReferenceHash: hash("PROPERTY-001"),
    policyholderReferenceHash: hash("POLICYHOLDER-001"),
    policyDocumentHash: hash("SAMPLE-POLICY-DOCUMENT-001"),
    termsHash: hash("FIRE-INSURANCE-TERMS-001"),

    // INR values converted into paise
    sumInsured: 50_00_000n * 100n,
    deductible: 25_000n * 100n,

    // Policy validity dates (Unix timestamps)
    startDate: BigInt(
      Math.floor(new Date("2026-11-01T00:00:00Z").getTime() / 1000)
    ),
    endDate: BigInt(
      Math.floor(new Date("2027-11-01T00:00:00Z").getTime() / 1000)
    ),

    fireCovered: true
  };

  console.log("\nRegistering insurance policy...");

  const tx = await contract.registerPolicy(policyInput);

  console.log("Transaction submitted:", tx.hash);

  const receipt = await tx.wait();

  console.log("\nPolicy registered successfully!");
  console.log("Transaction hash:", receipt.hash);

  // Read the policy count from the contract
  const policyCount = await contract.policyCount();

  console.log("Registered Policy ID:", policyCount.toString());
}

main().catch((error) => {
  console.error("Policy registration failed:", error);
  process.exitCode = 1;
});
