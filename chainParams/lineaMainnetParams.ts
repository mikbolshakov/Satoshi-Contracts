import { config } from 'dotenv';
config();

export const chainParams = {
  rpcUrl: process.env.LINEA_MAINNET as string,
  privateKey: process.env.USER_PRIVATE_KEY as string,
  contractAddress: '0x4F2B0b9f441EF3C04a81eEB84827a91859Ac31f2',
  eid: 30183,
  chainId: 59144,
};
