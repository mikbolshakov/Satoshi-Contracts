import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'solidity-coverage';
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
    apiKey: {
      linea_goerli: process.env.LINEASCAN_API_KEY as string,
    },
    customChains: [
      {
        network: 'linea_goerli',
        chainId: 59140,
        urls: {
          apiURL: 'https://api-testnet.lineascan.build/api',
          browserURL: 'https://goerli.lineascan.build',
        },
      },
    ],
  },
};

export default config;
