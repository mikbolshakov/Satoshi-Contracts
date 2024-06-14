import { config } from 'dotenv';
config();

export const chainParams = {
  rpcUrl: process.env.LINEA_MAINNET as string,
  privateKey: process.env.USER_PRIVATE_KEY as string,
  contractAddress: '0x4f2b0b9f441ef3c04a81eeb84827a91859ac31f2',
  eid: 30183,
  chainId: 59144,
};
