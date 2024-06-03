import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@layerzerolabs/toolbox-hardhat';
import 'solidity-coverage';
import 'hardhat-deploy';
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
    linea_sepolia: {
      url: process.env.LINEA_SEPOLIA as string,
      accounts: [process.env.LINEA_SEPOLIA_ADMIN_PRIVATE_KEY as string],
    },
    scroll_sepolia: {
      url: 'https://sepolia-rpc.scroll.io/',
      accounts: [process.env.LINEA_SEPOLIA_ADMIN_PRIVATE_KEY as string],
    },
  },
  etherscan: {
    apiKey: {
      linea_sepolia: process.env.LINEASCAN_API_KEY as string,
      scroll_sepolia: process.env.SCROLLSCAN_API_KEY as string,
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
    ],
  },
};

export default config;
