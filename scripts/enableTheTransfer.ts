import { ethers } from 'ethers';
import { config } from 'dotenv';
import contractAbi from '../ABI/abiRunner2060coin.json';
import { chainParams as source } from '../chainParams/baseMainnetParams';
config();

// npx ts-node scripts/enableTheTransfer.ts
const provider = new ethers.providers.JsonRpcProvider(source.rpcUrl);
const contract = new ethers.Contract(source.contractAddress, contractAbi, provider);
const admin = new ethers.Wallet(source.privateKey as string, provider);

export async function mint() {
  try {
    let tx = await contract.connect(admin).enableTheTransfer();

    await tx.wait();
    console.log('Enabled');
  } catch (error: any) {
    console.error('Minting error:', error.message);
  }
}

mint();
