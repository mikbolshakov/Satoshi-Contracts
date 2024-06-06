import { config } from 'dotenv';
config();

export const chainParams = {
  rpcUrl: process.env.SCROLL_SEPOLIA as string,
  privateKey: process.env.ADMIN_PRIVATE_KEY as string,
  contractAddress: '0xB410DD71dAe422a4162ffaF2fF7ba411c02d8176',
  eid: 40170,
};
