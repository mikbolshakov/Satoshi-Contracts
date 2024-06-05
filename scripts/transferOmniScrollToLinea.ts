import { ethers } from 'ethers';
import { config } from 'dotenv';
import { Options } from '@layerzerolabs/lz-v2-utilities';
import abiRunner from '../ABI/abiRunnerOmni.json';
config();

// npx ts-node scripts/transferOmniScrollToLinea.ts
const erc20Linea = '0x95D9990D1E80c3D39Ef5854670239e5bC71Ce34a';
const erc20Scroll = '0xc4a7f40983eA8d97b1098add9b8b80C06E73c9AB';

const providerLinea = new ethers.providers.JsonRpcProvider(
  process.env.LINEA_SEPOLIA,
);
const providerScroll = new ethers.providers.JsonRpcProvider(
  process.env.SCROLL_SEPOLIA,
);
const admin = new ethers.Wallet(
  process.env.LINEA_SEPOLIA_ADMIN_PRIVATE_KEY as string,
  providerLinea,
);
const contractLinea = new ethers.Contract(erc20Linea, abiRunner, providerLinea);
const contractScroll = new ethers.Contract(
  erc20Scroll,
  abiRunner,
  providerScroll,
);

const eidLineaTestnet = 40287;
const oneToken = ethers.utils.parseEther('1');

export async function setPeer() {
  const options = Options.newOptions()
    .addExecutorLzReceiveOption(200000, 0)
    .toHex()
    .toString();

  const sendParam = {
    dstEid: eidLineaTestnet,
    to: ethers.utils.zeroPad(admin.address, 32),
    amountLD: oneToken,
    minAmountLD: oneToken,
    extraOptions: options,
    composeMsg: '0x',
    oftCmd: '0x',
  };

  const [nativeFee] = await contractScroll.quoteSend(sendParam, false);
  console.log('FFF %s', nativeFee);

  const MessagingFee = {
    nativeFee: nativeFee,
    lzTokenFee: 0,
  };

  try {
    console.log(
      'Linea before %s',
      await contractLinea.balanceOf(admin.address),
    );
    console.log(
      'Scroll before %s',
      await contractScroll.balanceOf(admin.address),
    );

    let tx = await contractScroll
      .connect(admin)
      .send(sendParam, MessagingFee, admin.address, {
        value: nativeFee,
      });
    await tx.wait();

    console.log('Linea after %s', await contractLinea.balanceOf(admin.address));
    console.log(
      'Scroll after %s',
      await contractScroll.balanceOf(admin.address),
    );
  } catch (error: any) {
    console.error('Minting error:', error.message);
  }
}

setPeer();
