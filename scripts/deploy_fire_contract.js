const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const FireInsurance = await hre.ethers.getContractFactory("FireInsurance");
  const fireInsurance = await FireInsurance.deploy();

  // ethers v6 syntax
  await fireInsurance.waitForDeployment();
  const address = await fireInsurance.getAddress();

  console.log("✅ FireInsurance deployed to:", address);

  // Write to Docker shared volume output path if present
  const envOutDir = "/app/env-out";
  if (fs.existsSync(envOutDir)) {
    const envOutPath = path.join(envOutDir, "contract.env");
    fs.writeFileSync(envOutPath, `FI_CONTRACT_ADDRESS=${address}\n`);
    console.log(`📝 Wrote FI_CONTRACT_ADDRESS=${address} to ${envOutPath}`);
  }

  // Update or create .env in project root if running locally
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    if (envContent.includes("FI_CONTRACT_ADDRESS=")) {
      envContent = envContent.replace(/^FI_CONTRACT_ADDRESS=.*/m, `FI_CONTRACT_ADDRESS=${address}`);
    } else {
      envContent += `\nFI_CONTRACT_ADDRESS=${address}\n`;
    }
    fs.writeFileSync(envPath, envContent);
    console.log(`📝 Updated FI_CONTRACT_ADDRESS in ${envPath}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

