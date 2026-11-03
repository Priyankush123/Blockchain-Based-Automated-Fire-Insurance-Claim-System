<<<<<<< HEAD

import "dotenv/config";
import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],

  solidity: {
    profiles: {
      default: {
        version: "0.8.34",
        settings: {
          optimizer: { enabled: true, runs: 200 }
        }
      },
      production: {
        version: "0.8.34",
        settings: {
          optimizer: { enabled: true, runs: 200 }
        }
      }
    }
  },

  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1"
    },

    hardhatOp: {
      type: "edr-simulated",
      chainType: "op"
    },

    localhost: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8545",
      accounts: {
        mnemonic: "test test test test test test test test test test test junk"
      }
    },

    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")]
    }
  }
});
=======
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
>>>>>>> 72c00741ff8a425676ac953906d996037488592b
