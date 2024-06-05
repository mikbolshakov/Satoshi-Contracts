import { ethers } from 'ethers';
import { config } from 'dotenv';
import abiRunner from '../ABI/abiRunnerOmni.json';
config();

// npx ts-node scripts/setPeerLinea.ts
const erc20Linea = '0x95D9990D1E80c3D39Ef5854670239e5bC71Ce34a';
const erc20Scroll = '0xc4a7f40983eA8d97b1098add9b8b80C06E73c9AB';

const provider = new ethers.providers.JsonRpcProvider(
  process.env.LINEA_SEPOLIA,
);
const admin = new ethers.Wallet(
  process.env.LINEA_SEPOLIA_ADMIN_PRIVATE_KEY as string,
  provider,
);
const contract = new ethers.Contract(erc20Linea, abiRunner, provider);

const eidScrollTestnet = 40170;

export async function setPeer() {
  try {
    let tx = await contract
      .connect(admin)
      .setPeer(eidScrollTestnet, ethers.utils.zeroPad(erc20Scroll, 32));

    await tx.wait();
  } catch (error: any) {
    console.error('Minting error:', error.message);
  }
}

setPeer();
