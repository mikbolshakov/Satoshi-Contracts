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
    ethereum_mainnet: {
      eid: EndpointId.ETHEREUM_V2_MAINNET,
      url: process.env.ETH_MAINNET as string,
      accounts: [process.env.USER_PRIVATE_KEY as string],
    },
    ethereum_testnet: {
      eid: EndpointId.SEPOLIA_V2_TESTNET,
      url: process.env.ETH_SEPOLIA as string,
      accounts: [process.env.ADMIN_PRIVATE_KEY as string],
    },
    linea_mainnet: {
      eid: 30183,
      url: process.env.LINEA_MAINNET as string,
      accounts: [process.env.USER_PRIVATE_KEY as string],
    },
    linea_testnet: {
      eid: EndpointId.LINEASEP_V2_TESTNET,
      url: process.env.LINEA_SEPOLIA as string,
      accounts: [process.env.ADMIN_PRIVATE_KEY as string],
    },
    scroll_mainnet: {
      eid: EndpointId.SCROLL_V2_MAINNET,
      url: process.env.SCROLL_MAINNET as string,
      accounts: [process.env.USER_PRIVATE_KEY as string],
    },
    scroll_testnet: {
      eid: EndpointId.SCROLL_V2_TESTNET,
      url: process.env.SCROLL_SEPOLIA as string,
      accounts: [process.env.ADMIN_PRIVATE_KEY as string],
    },
    xlayer_mainnet: {
      eid: EndpointId.XLAYER_V2_MAINNET,
      url: process.env.XLAYER_MAINNET as string,
      accounts: [process.env.USER_PRIVATE_KEY as string],
    },
    xlayer_testnet: {
      eid: EndpointId.XLAYER_V2_TESTNET,
      url: process.env.XLAYER_TESTNET as string,
      accounts: [process.env.USER_PRIVATE_KEY as string],
    },
    base_mainnet: {
      eid: EndpointId.BASE_MAINNET,
      url: process.env.BASE_MAINNET as string,
      accounts: [process.env.USER_PRIVATE_KEY as string],
    },
    base_testnet: {
      eid: EndpointId.BASESEP_V2_TESTNET,
      url: process.env.BASE_SEPOLIA as string,
      accounts: [process.env.ADMIN_PRIVATE_KEY as string],
    },
  },
  etherscan: {
    apiKey: {
      ethereum_mainnet: process.env.ETHERSCAN_API_KEY as string,
      ethereum_testnet: process.env.ETHERSCAN_API_KEY as string,
      linea_mainnet: process.env.LINEASCAN_API_KEY as string,
      linea_testnet: process.env.LINEASCAN_API_KEY as string,
      scroll_mainnet: process.env.SCROLLSCAN_API_KEY as string,
      scroll_testnet: process.env.SCROLLSCAN_API_KEY as string,
      base_mainnet: process.env.BASESCAN_API_KEY as string,
    },
    customChains: [
      {
        network: 'linea_mainnet',
        chainId: 59144,
        urls: {
          apiURL: 'https://api.lineascan.build/api',
          browserURL: 'https://lineascan.build',
        },
      },
      {
        network: 'linea_testnet',
        chainId: 59141,
        urls: {
          apiURL: 'https://api-sepolia.lineascan.build/api',
          browserURL: 'https://sepolia.lineascan.build',
        },
      },
      {
        network: 'scroll_mainnet',
        chainId: 534352,
        urls: {
          apiURL: 'https://api.scrollscan.com/api',
          browserURL: 'https://scrollscan.build',
        },
      },
      {
        network: 'scroll_testnet',
        chainId: 534351,
        urls: {
          apiURL: 'https://api-sepolia.scrollscan.com/api',
          browserURL: 'https://sepolia.scrollscan.build',
        },
      },
      {
        network: 'base_mainnet',
        chainId: 8453,
        urls: {
          apiURL: 'https://api.basescan.com/api',
          browserURL: 'https://basescan.build',
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
