import { config } from 'dotenv';
config();

export const chainParams = {
  rpcUrl: process.env.ETH_SEPOLIA as string,
  privateKey: process.env.ADMIN_PRIVATE_KEY as string,
  contractAddress: '0x2C03c6Ef9FEFE41cdEa0803C637d57B320B51389',
  eid: 40161,
};
