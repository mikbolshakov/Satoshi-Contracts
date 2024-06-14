import { config } from 'dotenv';
config();

export const chainParams = {
  rpcUrl: process.env.BASE_SEPOLIA as string,
  privateKey: process.env.ADMIN_PRIVATE_KEY as string,
  contractAddress: '0x010488dB01d54F667464292f0d29c1DdbA059685',
  eid: 40245,
  chainId: 84532,
};
