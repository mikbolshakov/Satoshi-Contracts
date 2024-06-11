import { ethers } from 'ethers';
import { config } from 'dotenv';
import abiRunner from '../ABI/abiRunner2060coin.json';
config();

// npx ts-node scripts/mintCoinByAdmin.ts
const erc20Linea = '0x4d65faD5bb34A586a9537FFF8E621B4Ba30720D9';

const provider = new ethers.providers.JsonRpcProvider(process.env.LINEA_SEPOLIA);
const admin = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY as string, provider);
const contract = new ethers.Contract(erc20Linea, abiRunner, provider);

export async function setPeer() {
  try {
    let tx = await contract
      .connect(admin)
      .mintByAdmin(admin.address, ethers.utils.parseEther('1000'));

    await tx.wait();
  } catch (error: any) {
    console.error('Minting error:', error.message);
  }
}

setPeer();
