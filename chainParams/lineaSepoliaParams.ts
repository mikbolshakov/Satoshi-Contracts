import { config } from 'dotenv';
config();

export const chainParams = {
  rpcUrl: process.env.LINEA_SEPOLIA as string,
  privateKey: process.env.ADMIN_PRIVATE_KEY as string,
  contractAddress: '0x36e60b82bbBA00f16dac572410540a261E27E586',
  eid: 40287,
  chainId: 59141,
};
