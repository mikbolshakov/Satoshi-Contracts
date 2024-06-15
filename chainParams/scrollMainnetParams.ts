import { config } from 'dotenv';
config();

export const chainParams = {
  rpcUrl: process.env.SCROLL_MAINNET as string,
  privateKey: process.env.USER_PRIVATE_KEY as string,
  contractAddress: '0xDaf131eb30748F4E204D42537E54E4C0B305F0D4',
  eid: 30214,
  chainId: 534352,
};
