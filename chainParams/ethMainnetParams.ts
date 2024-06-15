import { config } from 'dotenv';
config();

export const chainParams = {
  rpcUrl: process.env.ETH_MAINNET as string,
  privateKey: process.env.USER_PRIVATE_KEY as string,
  contractAddress: '0x8D0823A1986C5E66bbF2E66FA29251c4C179FBdb',
  eid: 30101,
  chainId: 1,
};
