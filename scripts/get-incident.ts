
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

  // Change this ID to view another incident
  const incidentId = 1n;

  console.log("\nFetching fire incident...");
  console.log("Incident ID:", incidentId.toString());

  const incident = await contract.getIncident(incidentId);

  console.log("\n========== FIRECHAIN INCIDENT DETAILS ==========");

  console.log("Incident ID:", incident.incidentId.toString());
  console.log("Policy ID:", incident.policyId.toString());

  console.log(
    "Incident Date:",
    new Date(Number(incident.incidentDate) * 1000).toLocaleString()
  );

  console.log(
    "Reported At:",
    new Date(Number(incident.reportedAt) * 1000).toLocaleString()
  );

  console.log("Reported By:", incident.reportedBy);

  console.log(
    "Incident Reference Hash:",
    incident.incidentReferenceHash
  );

  console.log("Evidence Hash:", incident.evidenceHash);
  console.log("Fire Report Hash:", incident.fireReportHash);

  console.log("Verified:", incident.verified);

  console.log(
    "Verified By:",
    incident.verifiedBy === ethers.ZeroAddress
      ? "Not verified"
      : incident.verifiedBy
  );

  console.log(
    "Verified At:",
    incident.verifiedAt.toString() === "0"
      ? "Not verified"
      : new Date(Number(incident.verifiedAt) * 1000).toLocaleString()
  );

  console.log("Exists:", incident.exists);

  console.log("=================================================");
}

main().catch((error) => {
  console.error("\nFailed to retrieve incident:");
  console.error(error);
  process.exitCode = 1;
});
