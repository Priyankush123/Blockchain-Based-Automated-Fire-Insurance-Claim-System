import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    // Used when running locally outside Docker
    local: {
      url: "http://127.0.0.1:8545",
    },
    // Used by the contract-deploy container inside Docker Compose
    dockerlocal: {
      url: "http://hardhat-node:8545",
    },
  },
};

export default config;
