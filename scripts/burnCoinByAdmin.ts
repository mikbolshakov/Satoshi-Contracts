import { ethers } from 'ethers';
import { config } from 'dotenv';
import contractAbi from '../ABI/abiRunner2060coin.json';
import { chainParams as source } from '../chainParams/lineaMainnetParams';
config();

// npx ts-node scripts/burnCoinByAdmin.ts
const provider = new ethers.providers.JsonRpcProvider(source.rpcUrl);
const contract = new ethers.Contract(source.contractAddress, contractAbi, provider);

const burnAmount = ethers.utils.parseEther('1830');
const admin = new ethers.Wallet(source.privateKey as string, provider);

export async function burn() {
  try {
    let tx = await contract
      .connect(admin)
      .burnByAdmin('0x9f43AEA1E53F40bd7c9fAe2C4f485A91b34F0D78', burnAmount);

    await tx.wait();
    console.log('Burn success');
  } catch (error: any) {
    console.error('Burning error:', error.message);
  }
}

burn();
