
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

  // Retrieve the approved amount from the contract
  const claim = await contract.getClaim(claimId);

  if (Number(claim.status) !== 3) {
    throw new Error("Claim is not approved");
  }

  const settledAmount = claim.approvedAmount;

  // Demonstration payment reference fingerprint
  const paymentReferenceHash = ethers.sha256(
    ethers.toUtf8Bytes("FIRECHAIN-PAYMENT-REFERENCE-001")
  );

  console.log("Insurer:", await insurer.getAddress());
  console.log("Claim ID:", claimId.toString());
  console.log(
    "Settlement amount: ₹",
    ethers.formatUnits(settledAmount, 2)
  );

  console.log("\nRecording settlement...");

  const tx = await contract.recordSettlement(
    claimId,
    settledAmount,
    paymentReferenceHash
  );

  console.log("Transaction:", tx.hash);

  await tx.wait();

  const updatedClaim = await contract.getClaim(claimId);

  console.log("\nSettlement recorded successfully!");
  console.log("Claim ID:", updatedClaim.claimId.toString());
  console.log(
    "Settled amount: ₹",
    ethers.formatUnits(updatedClaim.settledAmount, 2)
  );
  console.log("Payment reference:", updatedClaim.paymentReferenceHash);
  console.log("Final claim status:", updatedClaim.status.toString());
}

main().catch((error) => {
  console.error("Settlement recording failed:", error);
  process.exitCode = 1;
});
