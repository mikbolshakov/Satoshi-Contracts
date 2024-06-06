import { config } from 'dotenv';
config();

export const chainParams = {
  rpcUrl: process.env.BASE_SEPOLIA as string,
  privateKey: process.env.ADMIN_PRIVATE_KEY as string,
  contractAddress: '0x79A1b328e549aE14158158Af8cae8c14C247e736',
  eid: 40245,
};
