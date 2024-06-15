import { config } from 'dotenv';
config();

export const chainParams = {
  rpcUrl: process.env.XLAYER_MAINNET as string,
  privateKey: process.env.USER_PRIVATE_KEY as string,
  contractAddress: '0xB8f3b67D6cd8137624183D5D4C8393864B3eD56B',
  eid: 30274,
  chainId: 196,
};
