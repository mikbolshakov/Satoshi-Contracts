import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'solidity-coverage';
import dotenv from 'dotenv';
dotenv.config();

const config: HardhatUserConfig = {
  solidity: '0.8.24',
  networks: {
    linea_sepolia: {
      url: process.env.LINEA_SEPOLIA as string,
      accounts: [process.env.LINEA_SEPOLIA_ADMIN_PRIVATE_KEY as string],
    },
  },
  etherscan: {
    apiKey: {
      linea_sepolia: process.env.LINEASCAN_API_KEY as string,
    },
    customChains: [
      {
        network: "linea_sepolia",
        chainId: 59141,
        urls: {
          apiURL: "https://api-sepolia.lineascan.build/api",
          browserURL: "https://sepolia.lineascan.build",
        },
      },
    ],
  },
};

export default config;
