import { config } from 'dotenv';
config();

export const chainParams = {
  rpcUrl: process.env.XLAYER_TESTNET as string,
  privateKey: process.env.USER_PRIVATE_KEY as string,
  contractAddress: '0xB8f3b67D6cd8137624183D5D4C8393864B3eD56B',
  eid: 40269,
  chainId: 195,
};
