import { ethers } from 'ethers';
import { Options } from '@layerzerolabs/lz-v2-utilities';
import contractAbi from '../ABI/abiRunner2060coin.json';
import { chainParams as source } from '../chainParams/lineaMainnetParams';
import { chainParams as destination } from '../chainParams/baseMainnetParams';

// npx hardhat run scripts/transferCoin.ts
const amount = '10';

const LAYERZERO_ENDPOINT_ADDRESS = '0x1a44076050125825900e736c501f859c50fE728c'; // mainnet
// const LAYERZERO_ENDPOINT_ADDRESS = '0x6EDCE65403992e310A62460808c4b910D972f10f'; // testnet

async function transferTokens() {
  const sourceProvider = new ethers.providers.JsonRpcProvider(source.rpcUrl);
  const destinationProvider = new ethers.providers.JsonRpcProvider(destination.rpcUrl);

  const sourceWallet = new ethers.Wallet(source.privateKey, sourceProvider);
  const destWallet = new ethers.Wallet(destination.privateKey, destinationProvider);

  const sourceContract = new ethers.Contract(source.contractAddress, contractAbi, sourceProvider);
  const destinationContract = new ethers.Contract(
    destination.contractAddress,
    contractAbi,
    destinationProvider,
  );

  const tokensToSend = ethers.utils.parseEther(amount);
  console.log(`Starting transfer of ${amount} tokens`);

  const allowance = await sourceContract
    .connect(sourceWallet)
    .allowance(sourceWallet.address, LAYERZERO_ENDPOINT_ADDRESS);
  if (parseFloat(ethers.utils.formatEther(allowance)) < parseFloat(amount)) {
    console.log('Approving tokens spend for LZ endpoint...');
    const approveTx = await sourceContract
      .connect(sourceWallet)
      .approve(LAYERZERO_ENDPOINT_ADDRESS, tokensToSend);
    await approveTx.wait();
    console.log(`Approved ${amount} tokens to LayerZero Endpoint`);
  }

  const isSourcePeerSet = await sourceContract
    .connect(sourceWallet)
    .isPeer(destination.eid, ethers.utils.zeroPad(destinationContract.address, 32));
  if (!isSourcePeerSet) {
    console.log('Setting peer on source contract...');
    const settingPeer = await sourceContract
      .connect(sourceWallet)
      .setPeer(destination.eid, ethers.utils.zeroPad(destinationContract.address, 32));

    await settingPeer.wait();
    console.log('Peer setted on source contract');
  } else {
    console.log('Peer already setted on source contract');
  }

  const isDestPeerSet = await destinationContract
    .connect(destWallet)
    .isPeer(source.eid, ethers.utils.zeroPad(sourceContract.address, 32));
  if (!isDestPeerSet) {
    console.log('Setting peer on destination contract...');
    const settingPeer = await destinationContract
      .connect(destWallet)
      .setPeer(source.eid, ethers.utils.zeroPad(sourceContract.address, 32));

    await settingPeer.wait();
    console.log('Peer setted on destination contract');
  } else {
    console.log('Peer already setted on destination contract');
  }

  const options = Options.newOptions().addExecutorLzReceiveOption(20000, 0).toHex().toString();
  console.log('options:', options);

  const sendParam = {
    dstEid: destination.eid,
    amountLD: tokensToSend,
    minAmountLD: tokensToSend,
    to: ethers.utils.zeroPad(destWallet.address, 32),
    extraOptions: options,
    composeMsg: '0x',
    oftCmd: '0x',
  };

  const [nativeFee] = await sourceContract.quoteSend(sendParam, false);
  console.log('Estimated gas fee:', nativeFee.toString());

  console.log(
    'Source balance before %s',
    ethers.utils.formatEther(await sourceContract.balanceOf(sourceWallet.address)),
  );
  console.log(
    'Destination balance before %s',
    ethers.utils.formatEther(await destinationContract.balanceOf(destWallet.address)),
  );

  const tx = await sourceContract
    .connect(sourceWallet)
    .send(sendParam, [nativeFee, 0], sourceWallet.address, {
      value: nativeFee,
    });

  await tx.wait();

  console.log(
    'Source balance after %s',
    ethers.utils.formatEther(await sourceContract.balanceOf(sourceWallet.address)),
  );
  console.log(
    'Destination balance after %s',
    ethers.utils.formatEther(await destinationContract.balanceOf(destWallet.address)),
  );
}

transferTokens();
