import { ethers } from 'ethers';
import { config } from 'dotenv';
import { Options } from '@layerzerolabs/lz-v2-utilities';
import abiRunner from '../ABI/abiRunnerOmni.json';
config();

// npx ts-node scripts/setEnforcedOptionsScroll.ts
const erc20Scroll = '0xc4a7f40983eA8d97b1098add9b8b80C06E73c9AB';

const provider = new ethers.providers.JsonRpcProvider(
  process.env.SCROLL_SEPOLIA,
);
const admin = new ethers.Wallet(
  process.env.LINEA_SEPOLIA_ADMIN_PRIVATE_KEY as string,
  provider,
);
const contract = new ethers.Contract(erc20Scroll, abiRunner, provider);

const eidLineaTestnet = 40287;

const options = Options.newOptions()
  .addExecutorLzReceiveOption(200000, 0)
  .toHex()
  .toString();

let enforcedOptions = [
  {
    eid: eidLineaTestnet,
    msgType: 1,
    options: options,
  },
];

export async function setPeer() {
  try {
    let tx = await contract.connect(admin).setEnforcedOptions(enforcedOptions);

    await tx.wait();
  } catch (error: any) {
    console.error('Minting error:', error.message);
  }
}

setPeer();
