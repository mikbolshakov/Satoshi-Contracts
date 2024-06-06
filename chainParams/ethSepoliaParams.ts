import { config } from 'dotenv';
config();

export const chainParams = {
  rpcUrl: process.env.ETH_SEPOLIA as string,
  privateKey: process.env.ADMIN_PRIVATE_KEY as string,
  contractAddress: '0x8D0823A1986C5E66bbF2E66FA29251c4C179FBdb',
  eid: 40161,
};
