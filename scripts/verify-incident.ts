
import "dotenv/config";
import { network } from "hardhat";

const CONTRACT_ADDRESS = process.env.FIRE_INSURANCE_ADDRESS;

if (!CONTRACT_ADDRESS) {
  throw new Error("Set FIRE_INSURANCE_ADDRESS in your .env file");
}

async function main() {
  const { ethers } = await network.create();
  const signers = await ethers.getSigners();

  // Account 2: Registered fire officer
  const fireOfficer = signers[2];

  const artifact = await import(
    "../artifacts/contracts/FireInsurance.sol/FireInsurance.json",
    { with: { type: "json" } }
  );

  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    artifact.default.abi,
    fireOfficer
  );

  const incidentId = 1n;

  // Demonstration fire report fingerprint
  const fireReportHash = ethers.sha256(
    ethers.toUtf8Bytes("FIRECHAIN-OFFICIAL-FIRE-REPORT-001")
  );

  console.log("Fire officer:", await fireOfficer.getAddress());
  console.log("Incident ID:", incidentId.toString());

  console.log("\nVerifying fire incident...");

  const tx = await contract.verifyIncident(
    incidentId,
    fireReportHash
  );

  console.log("Transaction:", tx.hash);

  await tx.wait();

  const incident = await contract.getIncident(incidentId);

  console.log("\nFire incident verified successfully!");
  console.log("Incident ID:", incident.incidentId.toString());
  console.log("Verified:", incident.verified);
  console.log("Verified by:", incident.verifiedBy);
  console.log("Fire report hash:", incident.fireReportHash);
}

main().catch((error) => {
  console.error("Incident verification failed:", error);
  process.exitCode = 1;
});
