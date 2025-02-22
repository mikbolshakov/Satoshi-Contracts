import { ethers } from 'ethers';
import { config } from 'dotenv';
import contractAbi from '../ABI/abiRunner2060coin.json';
import { chainParams as source } from '../chainParams/ethSepoliaParams';
config();

// npx ts-node scripts/mintCoinByAdmin.ts
const provider = new ethers.providers.JsonRpcProvider(source.rpcUrl);
const contract = new ethers.Contract(source.contractAddress, contractAbi, provider);

const admin = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY as string, provider);
const mintAmount = ethers.utils.parseEther('1000');
const mintAccount = admin.address;

export async function mint() {
  try {
    let tx = await contract.connect(admin).mintByAdmin(mintAccount, mintAmount);

    await tx.wait();
    console.log('Mint success');
  } catch (error: any) {
    console.error('Minting error:', error.message);
  }
}

mint();
