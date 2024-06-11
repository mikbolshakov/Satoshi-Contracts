import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@layerzerolabs/toolbox-hardhat';
import 'solidity-coverage';
import 'hardhat-deploy';
import { EndpointId } from '@layerzerolabs/lz-definitions';
import dotenv from 'dotenv';
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.24',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    ethereum_sepolia: {
      eid: EndpointId.SEPOLIA_V2_TESTNET,
      url: process.env.ETH_SEPOLIA as string,
      accounts: [process.env.ADMIN_PRIVATE_KEY as string],
    },
    base_sepolia: {
      eid: EndpointId.BASESEP_V2_TESTNET,
      url: process.env.BASE_SEPOLIA as string,
      accounts: [process.env.ADMIN_PRIVATE_KEY as string],
    },
    linea_sepolia: {
      eid: EndpointId.LINEASEP_V2_TESTNET,
      url: process.env.LINEA_SEPOLIA as string,
      accounts: [process.env.ADMIN_PRIVATE_KEY as string],
    },
    scroll_sepolia: {
      eid: EndpointId.SCROLL_V2_TESTNET,
      url: process.env.SCROLL_SEPOLIA as string,
      accounts: [process.env.ADMIN_PRIVATE_KEY as string],
    },
    linea_mainnet: {
      eid: 30183,
      url: process.env.LINEA_MAINNET as string,
      accounts: [process.env.ADMIN_PRIVATE_KEY as string],
    },
    scroll_mainnet: {
      eid: EndpointId.SCROLL_V2_MAINNET,
      url: process.env.SCROLL_SEPOLIA as string,
      accounts: [process.env.ADMIN_PRIVATE_KEY as string],
    },
  },
  etherscan: {
    apiKey: {
      linea_sepolia: process.env.LINEASCAN_API_KEY as string,
      scroll_sepolia: process.env.SCROLLSCAN_API_KEY as string,
      ethereum_sepolia: process.env.ETHERSCAN_API_KEY as string,
      linea_mainnet: process.env.LINEASCAN_API_KEY as string,
      scroll_mainnet: process.env.SCROLLSCAN_API_KEY as string,
    },
    customChains: [
      {
        network: 'linea_sepolia',
        chainId: 59141,
        urls: {
          apiURL: 'https://api-sepolia.lineascan.build/api',
          browserURL: 'https://sepolia.lineascan.build',
        },
      },
      {
        network: 'scroll_sepolia',
        chainId: 534351,
        urls: {
          apiURL: 'https://api-sepolia.scrollscan.com/api',
          browserURL: 'https://sepolia.scrollscan.build',
        },
      },
      {
        network: 'ethereum_sepolia',
        chainId: 11155111,
        urls: {
          apiURL: 'https://api-sepolia.etherscan.io/api',
          browserURL: 'https://sepolia.etherscan.build',
        },
      },
      {
        network: 'linea_mainnet',
        chainId: 59144,
        urls: {
          apiURL: 'https://api.lineascan.build/api',
          browserURL: 'https://lineascan.build',
        },
      },
      {
        network: 'scroll_mainnet',
        chainId: 534351,
        urls: {
          apiURL: 'https://api.scrollscan.com/api',
          browserURL: 'https://scrollscan.build',
        },
      },
    ],
  },
  namedAccounts: {
    deployer: {
      default: 0, // wallet address of index[0], of the mnemonic in .env
    },
  },
};

export default config;
