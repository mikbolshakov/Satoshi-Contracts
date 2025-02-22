import { config } from 'dotenv';
config();

export const chainParams = {
  rpcUrl: process.env.BASE_MAINNET as string,
  privateKey: process.env.USER_PRIVATE_KEY as string,
  contractAddress: '0x6bF27b83fC96AD3873610d69513d266c5F7DF372',
  eid: 30184,
  chainId: 8453,
};
