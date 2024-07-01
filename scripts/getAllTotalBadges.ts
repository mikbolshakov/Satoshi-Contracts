import { ethers } from 'ethers';
import { config } from 'dotenv';
import abiRewards from '../ABI/abiRunner2060rewards.json';
import * as fs from 'fs';

config();

// npx ts-node scripts/getAllTotalBadges.ts
const rewardsAddr = '0xdd873af53d1aDb11Acd4DfBdeC4E8a160d172Ca5';
const rpcUrl = process.env.LINEA_MAINNET;

const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
const contract = new ethers.Contract(rewardsAddr, abiRewards, provider);

const addresses = [
    "0x0846960aB4588378e7e1d9961F857358FEa662d5",
    "0x1164ea02F5753EB1d783E67147e5dD2023d575A5",
    "0x9f43AEA1E53F40bd7c9fAe2C4f485A91b34F0D78",
    "0x8FCb5Bd892cC0DCDB9c2414E0601926C8122f599",
    "0xc44942CEFb871E75f8538aC1cAD98C703a108CD5",
    "0x8a81DAFbFA575C9992eb649bA3F370197F7De9b9",
    "0xcb0e044384Bd09f194bb82A5A7eF32C30a3d4277",
    "0x3Ff3652383C17d7e13299b4c386235C46E9b2Ef7",
    "0x4990529199A2aE371B1F49C0889BBa72d942138e",
    "0x52b94CB45b9853068916d13E1487Bad03572D253",
    "0xf87aD903d55a51F4Ddb6E7a307af2c8FC4642cFb"
];

const tokenIds = Array.from({ length: 10 }, (_, i) => i);

const getBalances = async (address: string): Promise<number> => {
  let totalBalance = 0;
  for (const tokenId of tokenIds) {
    const balance = await contract.balanceOf(address, tokenId);
    totalBalance += balance.toNumber();
  }
  return totalBalance;
};

const main = async () => {
  const results: Record<string, number> = {};
  for (const address of addresses) {
    const totalBalance = await getBalances(address);
    results[address] = totalBalance;
  }

  fs.writeFileSync('scripts/ercData/balances.json', JSON.stringify(results, null, 2));
  console.log('Balances have been written to balances.json');
};

main().catch((error) => {
  console.error('Error:', error);
});
