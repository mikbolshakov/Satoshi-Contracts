import { config } from 'dotenv';
config();

export const chainParams = {
  rpcUrl: process.env.XLAYER_MAINNET as string,
  privateKey: process.env.USER_PRIVATE_KEY as string,
  contractAddress: '0x36e60b82bbBA00f16dac572410540a261E27E586',
  eid: 30274,
};
