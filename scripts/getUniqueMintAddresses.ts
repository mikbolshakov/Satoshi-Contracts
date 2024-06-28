import { ethers } from 'ethers';
import { config } from 'dotenv';
import abiCoin from '../ABI/abiRunner2060coin.json';
import abiRewards from '../ABI/abiRunner2060rewards.json';
import * as fs from 'fs';
config();

// npx ts-node scripts/getUniqueMintAddresses.ts
const coinAddr = '0xCb2735948db0ac349075F1d8b916B6371dcCAEB9';
const rewardsAddr = '0xdd873af53d1aDb11Acd4DfBdeC4E8a160d172Ca5';
const rpcUrl = process.env.LINEA_MAINNET;

const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
const contractCoin = new ethers.Contract(coinAddr, abiCoin, provider);
const contractRewards = new ethers.Contract(rewardsAddr, abiRewards, provider);

async function getUniqueMintAddresses() {
  try {
    const transferEventsCoin = await contractCoin.queryFilter(
      contractCoin.filters.Transfer(null, null), // (from, to)
      0, // search from 0 block
      'latest', // search to latest block
    );

    const transferSingleEventsRewards = await contractRewards.queryFilter(
      // (operator, from, to, id, value)
      contractRewards.filters.TransferSingle(null, null, null, null, null),
      0,
      'latest',
    );
    const transferBatchEventsRewards = await contractRewards.queryFilter(
      contractRewards.filters.TransferBatch(null, null, null, null, null),
      0,
      'latest',
    );

    const coinUniqueAddresses = new Set<string>();
    const rewardsUniqueAddresses = new Set<string>();

    transferEventsCoin.forEach((event) => {
      if (event.args && event.args.from === ethers.constants.AddressZero) {
        coinUniqueAddresses.add(event.args.to);
      }
    });

    transferSingleEventsRewards.forEach((event) => {
      if (event.args && event.args.from === ethers.constants.AddressZero) {
        rewardsUniqueAddresses.add(event.args.to);
      }
    });
    transferBatchEventsRewards.forEach((event) => {
      if (event.args && event.args.from === ethers.constants.AddressZero) {
        event.args.to.forEach((to: string) => {
          rewardsUniqueAddresses.add(to);
        });
      }
    });

    fs.writeFileSync(
      'scripts/uniqueMinters/coinUniqueMinters.txt',
      Array.from(coinUniqueAddresses).join('\n'),
    );
    fs.writeFileSync(
      'scripts/uniqueMinters/rewardsUniqueMinters.txt',
      Array.from(rewardsUniqueAddresses).join('\n'),
    );

    console.log('Unique addresses saved to files.');
  } catch (error) {
    console.error('Error fetching mint addresses:', error);
  }
}

getUniqueMintAddresses();
