import { ethers } from 'ethers';
import { config } from 'dotenv';
import { Options } from '@layerzerolabs/lz-v2-utilities';
import abiRunner from '../ABI/abiRunnerOmni.json';
config();

// npx ts-node scripts/setEnforcedOptionsLinea.ts
const erc20Linea = '0x95D9990D1E80c3D39Ef5854670239e5bC71Ce34a';

const provider = new ethers.providers.JsonRpcProvider(
  process.env.LINEA_SEPOLIA,
);
const admin = new ethers.Wallet(
  process.env.LINEA_SEPOLIA_ADMIN_PRIVATE_KEY as string,
  provider,
);
const contract = new ethers.Contract(erc20Linea, abiRunner, provider);

const eidScrollTestnet = 40170;

const options = Options.newOptions()
  .addExecutorLzReceiveOption(200000, 0)
  .toHex()
  .toString();

let enforcedOptions = [
  {
    eid: eidScrollTestnet,
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
