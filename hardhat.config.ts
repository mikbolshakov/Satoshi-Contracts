import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import dotenv from 'dotenv';
dotenv.config();

const config: HardhatUserConfig = {
  solidity: '0.8.24',

  networks: {
    linea_goerli: {
      url: process.env.LINEA_GOERLI as string,
      accounts: [process.env.ADMIN_PRIVATE_KEY as string],
    },
  },
  etherscan: {
    apiKey: process.env.LINEASCAN_API_KEY as string,
  },
};

export default config;
