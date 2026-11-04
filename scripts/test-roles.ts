import "dotenv/config";
import { network } from "hardhat";

const CONTRACT_ADDRESS = process.env.FIRE_INSURANCE_ADDRESS;

if (!CONTRACT_ADDRESS) {
  throw new Error("Set FIRE_INSURANCE_ADDRESS in your .env file");
}

async function main() {
  const { ethers } = await network.create();

  const signers = await ethers.getSigners();

  const admin = signers[0];
  const insurer = signers[1];
  const fireOfficer = signers[2];
  const surveyor = signers[3];
  const unauthorized = signers[4];

  const artifact = await import(
    "../artifacts/contracts/FireInsurance.sol/FireInsurance.json",
    { with: { type: "json" } }
  );

  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    artifact.default.abi,
    admin
  );

  const roles = {
    INSURER_ROLE: ethers.id("INSURER_ROLE"),
    FIRE_OFFICER_ROLE: ethers.id("FIRE_OFFICER_ROLE"),
    SURVEYOR_ROLE: ethers.id("SURVEYOR_ROLE")
  };

  console.log("\n========== FIRECHAIN ROLE TESTING ==========");

  // Check stakeholder role assignments
  console.log("\n1. CHECKING ROLE ASSIGNMENTS");

  const assignments = [
    ["Insurer", insurer, roles.INSURER_ROLE],
    ["Fire Officer", fireOfficer, roles.FIRE_OFFICER_ROLE],
    ["Surveyor", surveyor, roles.SURVEYOR_ROLE]
  ] as const;

  for (const [name, signer, role] of assignments) {
    const assigned = await contract.hasRole(role, signer.address);

    console.log(
      `${name}: ${assigned ? "PASS - Role assigned" : "FAIL - Role missing"}`
    );

    if (!assigned) {
      throw new Error(`${name} does not have the expected role.`);
    }
  }

  console.log("\n2. TESTING UNAUTHORIZED OPERATIONS");

  let passed = 0;
  let failed = 0;

  async function expectRevert(
    description: string,
    action: () => Promise<any>
  ) {
    try {
      const tx = await action();

      if (tx && typeof tx.wait === "function") {
        await tx.wait();
      }

      console.log(`FAIL: ${description} - Transaction succeeded`);
      failed++;
    } catch {
      console.log(`PASS: ${description} - Access denied`);
      passed++;
    }
  }

  const zeroHash = ethers.ZeroHash;

  // Fire Officer must not perform insurer operations
  await expectRevert(
    "Fire Officer cannot verify policies",
    () => contract.connect(fireOfficer).verifyPolicy(1n)
  );

  await expectRevert(
    "Fire Officer cannot approve claims",
    () => contract.connect(fireOfficer).approveClaim(1n, 1n)
  );

  // Surveyor must not perform insurer operations
  await expectRevert(
    "Surveyor cannot verify policies",
    () => contract.connect(surveyor).verifyPolicy(1n)
  );

  await expectRevert(
    "Surveyor cannot approve claims",
    () => contract.connect(surveyor).approveClaim(1n, 1n)
  );

  // Insurer must not perform fire officer operations
  await expectRevert(
    "Insurer cannot verify fire incidents",
    () => contract.connect(insurer).verifyIncident(1n, zeroHash)
  );

  // Insurer must not perform surveyor operations
  await expectRevert(
    "Insurer cannot submit assessments",
    () =>
      contract.connect(insurer).submitAssessment(
        1n, 0n, 0n, 0n, 0n, zeroHash
      )
  );

  // Unauthorized account must not perform restricted operations
  await expectRevert(
    "Unauthorized user cannot verify policies",
    () => contract.connect(unauthorized).verifyPolicy(1n)
  );

  await expectRevert(
    "Unauthorized user cannot report fires",
    () =>
      contract.connect(unauthorized).reportFire(
        1n, 0n, zeroHash, zeroHash
      )
  );

  await expectRevert(
    "Unauthorized user cannot approve claims",
    () => contract.connect(unauthorized).approveClaim(1n, 1n)
  );

  console.log("\n3. TEST SUMMARY");
  console.log("--------------------------------");
  console.log("Permission tests passed:", passed);
  console.log("Permission tests failed:", failed);
  console.log("--------------------------------");

  if (failed > 0) {
    throw new Error("Some role-based permission tests failed.");
  }

  console.log("\nAll role-based permission tests passed.");
  console.log("============================================");
}

main().catch((error) => {
  console.error("\nRole testing failed:");
  console.error(error);
  process.exitCode = 1;
});