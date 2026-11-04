import { network } from "hardhat";

const { ethers } = await network.connect();

const contract = await ethers.deployContract("FireInsurance");
await contract.waitForDeployment();

console.log("FireInsurance deployed to:", await contract.getAddress());
