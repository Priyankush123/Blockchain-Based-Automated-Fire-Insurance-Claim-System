import { network } from "hardhat";

const { ethers } = await network.connect();
const [admin, insurer, officer, surveyor] = await ethers.getSigners();

const contractAddress = process.env.FIRE_INSURANCE_ADDRESS;
if (!contractAddress) throw new Error("Set FIRE_INSURANCE_ADDRESS in your environment");

const artifact = await import("../artifacts/contracts/FireInsurance.sol/FireInsurance.json", {
  with: { type: "json" }
});
const app = new ethers.Contract(contractAddress, artifact.default.abi, admin);

await (await app.registerStakeholder(insurer.address, 0)).wait();
await (await app.registerStakeholder(officer.address, 1)).wait();
await (await app.registerStakeholder(surveyor.address, 2)).wait();

console.log("Registered demo insurer:", insurer.address);
console.log("Registered demo fire officer:", officer.address);
console.log("Registered demo surveyor:", surveyor.address);
