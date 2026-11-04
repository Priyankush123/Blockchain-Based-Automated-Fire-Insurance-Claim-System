
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

  // Account 3: Registered surveyor
  const surveyor = signers[3];

  const artifact = await import(
    "../artifacts/contracts/FireInsurance.sol/FireInsurance.json",
    { with: { type: "json" } }
  );

  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    artifact.default.abi,
    insurer
  );

  const incidentId = 1n;
  const surveyorAddress = await surveyor.getAddress();

  console.log("Insurer:", await insurer.getAddress());
  console.log("Assigned surveyor:", surveyorAddress);
  console.log("Incident ID:", incidentId.toString());

  console.log("\nAssigning surveyor...");

  const tx = await contract.assignSurveyor(
    incidentId,
    surveyorAddress
  );

  console.log("Transaction:", tx.hash);

  await tx.wait();

  const claimId = await contract.incidentToClaimId(incidentId);
  const claim = await contract.getClaim(claimId);

  console.log("\nSurveyor assigned successfully!");
  console.log("Claim ID:", claimId.toString());
  console.log("Policy ID:", claim.policyId.toString());
  console.log("Incident ID:", claim.incidentId.toString());
  console.log("Assigned surveyor:", claim.assignedSurveyor);
  console.log("Claim status:", claim.status.toString());
}

main().catch((error) => {
  console.error("Surveyor assignment failed:", error);
  process.exitCode = 1;
});
