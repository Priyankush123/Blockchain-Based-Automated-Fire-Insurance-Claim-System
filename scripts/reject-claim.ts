import "dotenv/config";
import { network } from "hardhat";

async function main() {
  const { ethers } = await network.create();
  const signers = await ethers.getSigners();
  const insurer = signers[1];

  const artifact = await import(
    "../artifacts/contracts/FireInsurance.sol/FireInsurance.json",
    { with: { type: "json" } }
  );

  const contract = new ethers.Contract(
    process.env.FIRE_INSURANCE_ADDRESS!,
    artifact.default.abi,
    insurer
  );

  const claimId = 2n;

  const reasonHash = ethers.sha256(
    ethers.toUtf8Bytes("POLICY-EXCLUSION-DEMONSTRATION")
  );

  const tx = await contract.rejectClaim(claimId, reasonHash);
  await tx.wait();

  const claim = await contract.getClaim(claimId);

  console.log("Claim rejected successfully!");
  console.log("Claim ID:", claim.claimId.toString());
  console.log("Claim status:", claim.status.toString());
}

main().catch(console.error);