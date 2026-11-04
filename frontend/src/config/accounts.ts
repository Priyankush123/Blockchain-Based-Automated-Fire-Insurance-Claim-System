export interface Persona {
  id: string;
  name: string;
  roleTitle: string;
  address: string;
  privateKey: string;
  description: string;
}

export const HARDHAT_PERSONAS: Persona[] = [
  {
    id: "admin",
    name: "Admin / Deployer",
    roleTitle: "Default Admin",
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    description: "Deploys contracts and registers/revokes stakeholder roles."
  },
  {
    id: "insurer",
    name: "Apex Fire Insurance Co.",
    roleTitle: "Insurer (Underwriter & Claims)",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    description: "Registers & verifies policies, reports fires, assigns surveyors, approves & settles claims."
  },
  {
    id: "fire_officer",
    name: "Chief Fire Officer Sharma",
    roleTitle: "Civic Fire Department Officer",
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    description: "Civic Oracle who inspects fire scenes and certifies official fire reports on-chain."
  },
  {
    id: "surveyor",
    name: "Veritas Loss Adjusters",
    roleTitle: "Independent Surveyor",
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    privateKey: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    description: "Inspects damages, calculates itemized losses & salvage, submits loss evaluation reports."
  },
  {
    id: "claimant",
    name: "Policyholder (External)",
    roleTitle: "Unprivileged External Account",
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    privateKey: "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
    description: "Represents an unauthorized public wallet to demonstrate access restriction security."
  }
];

