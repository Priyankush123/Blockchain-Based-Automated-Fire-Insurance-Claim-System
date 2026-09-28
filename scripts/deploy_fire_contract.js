const hre = require("hardhat");

async function main() {
  const FireInsurance = await hre.ethers.getContractFactory("FireInsurance");
  const fireInsurance = await FireInsurance.deploy();

  // ethers v6 syntax
  await fireInsurance.waitForDeployment();
  const address = await fireInsurance.getAddress();

  console.log("✅ FireInsurance deployed to:", address);
  console.log("👉 Copy this address into your .env as FI_CONTRACT_ADDRESS");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
