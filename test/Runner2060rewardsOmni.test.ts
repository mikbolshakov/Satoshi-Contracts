import { deployments, ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Runner2060rewardsOmni } from '../typechain-types';
import { Contract, ContractFactory, Wallet } from 'ethers';
import { Options } from '@layerzerolabs/lz-v2-utilities';

const fee = 750;

// amount
const zeroAmount = 0;
const tenTokens = 10;
const hundredTokens = 100;

// id
const zeroTokenId = 0;
const firstTokenId = 1;
const secondTokenId = 2;
const thirdTokenId = 3;

// eid
const eidLineaMainnet = 30183;
const eidScrollMainnet = 30214;

describe('Runner2060rewardsOmni tests', () => {
  // contracts
  let EndpointV2Mock: ContractFactory;
  let erc1155Linea: Runner2060rewardsOmni;
  let erc1155Scroll: Runner2060rewardsOmni;
  let mockEndpointV2Linea: Contract;
  let mockEndpointV2Scroll: Contract;

  // accounts
  let signers: SignerWithAddress[];
  let mintMaintainer: Wallet;
  let adminLinea: SignerWithAddress; // _delegate & Owner
  let adminScroll: SignerWithAddress; // _delegate & Owner
  let endpointOwner: SignerWithAddress;
  let user10: SignerWithAddress;
  let user20: SignerWithAddress;
  let thirdPartyDeployer: SignerWithAddress;

  before(async () => {
    mintMaintainer = ethers.Wallet.createRandom();
    signers = await ethers.getSigners();
    adminLinea = signers[0];
    adminScroll = signers[1];
    endpointOwner = signers[2];
    user10 = signers[3];
    user20 = signers[4];
    thirdPartyDeployer = signers[5];

    const EndpointV2MockArtifact = await deployments.getArtifact('EndpointV2Mock');
    EndpointV2Mock = new ContractFactory(
      EndpointV2MockArtifact.abi,
      EndpointV2MockArtifact.bytecode,
      endpointOwner,
    );
  });

  it('Deploy endpoints and contracts by thirdPartyDeployer', async () => {
    mockEndpointV2Linea = await EndpointV2Mock.connect(thirdPartyDeployer).deploy(eidLineaMainnet);
    mockEndpointV2Scroll =
      await EndpointV2Mock.connect(thirdPartyDeployer).deploy(eidScrollMainnet);

    const Factory = await ethers.getContractFactory('Runner2060rewardsOmni');

    const runner2060Linea = await Factory.connect(thirdPartyDeployer).deploy(
      mintMaintainer.address,
      adminLinea.address,
      fee,
      mockEndpointV2Linea.address,
      adminLinea.address,
    );
    const runner2060Scroll = await Factory.connect(thirdPartyDeployer).deploy(
      mintMaintainer.address,
      adminScroll.address,
      fee,
      mockEndpointV2Scroll.address,
      adminScroll.address,
    );

    expect(mockEndpointV2Linea.address).to.not.eq(ethers.constants.AddressZero);
    expect(mockEndpointV2Scroll.address).to.not.eq(ethers.constants.AddressZero);
    expect(runner2060Linea.address).to.not.eq(ethers.constants.AddressZero);
    expect(runner2060Scroll.address).to.not.eq(ethers.constants.AddressZero);

    erc1155Linea = runner2060Linea as Runner2060rewardsOmni;
    erc1155Scroll = runner2060Scroll as Runner2060rewardsOmni;
  });

  it('Match omni contracts on Linea by thirdPartyDeployer and adminLinea', async () => {
    await mockEndpointV2Linea
      .connect(thirdPartyDeployer)
      .setDestLzEndpoint(erc1155Scroll.address, mockEndpointV2Scroll.address);

    expect(
      erc1155Linea
        .connect(thirdPartyDeployer)
        .setPeer(eidScrollMainnet, ethers.utils.zeroPad(erc1155Scroll.address, 32)),
    ).to.be.revertedWithCustomError; // onlyOwner

    await erc1155Linea
      .connect(adminLinea)
      .setPeer(eidScrollMainnet, ethers.utils.zeroPad(erc1155Scroll.address, 32));
  });

  it('Match omni contracts on Scroll by thirdPartyDeployer and adminScroll', async () => {
    await mockEndpointV2Scroll
      .connect(thirdPartyDeployer)
      .setDestLzEndpoint(erc1155Linea.address, mockEndpointV2Linea.address);

    expect(
      erc1155Scroll
        .connect(thirdPartyDeployer)
        .setPeer(eidScrollMainnet, ethers.utils.zeroPad(erc1155Linea.address, 32)),
    ).to.be.revertedWithCustomError; // onlyOwner

    await erc1155Scroll
      .connect(adminScroll)
      .setPeer(eidLineaMainnet, ethers.utils.zeroPad(erc1155Linea.address, 32));
  });

  it('Send tokens from Linea to Scroll (adminLinea => adminScroll)', async () => {
    await erc1155Linea.connect(adminLinea).mintAdmin(adminLinea.address, zeroTokenId, tenTokens);

    expect(await erc1155Linea.balanceOf(adminLinea.address, zeroTokenId)).to.be.eq(tenTokens);
    expect(await erc1155Linea.balanceOf(adminScroll.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Scroll.balanceOf(adminLinea.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Scroll.balanceOf(adminScroll.address, zeroTokenId)).to.be.eq(zeroAmount);

    const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();
    const eid = eidScrollMainnet;
    const to = ethers.utils.zeroPad(adminScroll.address, 32);
    const tokenId = zeroTokenId;
    const amount = tenTokens;

    const [nativeFee] = await erc1155Linea.quote(eid, to, tokenId, amount, options, false);

    await erc1155Linea
      .connect(adminLinea)
      .send(eid, to, tokenId, amount, options, { value: nativeFee });

    expect(await erc1155Linea.balanceOf(adminLinea.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Linea.balanceOf(adminScroll.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Scroll.balanceOf(adminLinea.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Scroll.balanceOf(adminScroll.address, zeroTokenId)).to.be.eq(tenTokens);
  });

  it('Send tokens from Linea to Scroll (user10 => user10)', async () => {
    await erc1155Linea.connect(adminLinea).mintAdmin(user10.address, firstTokenId, 100);

    expect(await erc1155Linea.balanceOf(user10.address, firstTokenId)).to.be.eq(100);
    expect(await erc1155Scroll.balanceOf(user10.address, firstTokenId)).to.be.eq(0);

    const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();
    const eid = eidScrollMainnet;
    const to = ethers.utils.zeroPad(user10.address, 32);
    const tokenId = firstTokenId;
    const amount = 20;

    const [nativeFee] = await erc1155Linea.quote(eid, to, tokenId, amount, options, false);

    await erc1155Linea
      .connect(user10)
      .send(eid, to, tokenId, amount, options, { value: nativeFee });

    expect(await erc1155Linea.balanceOf(user10.address, firstTokenId)).to.be.eq(80);
    expect(await erc1155Scroll.balanceOf(user10.address, firstTokenId)).to.be.eq(amount);
  });

  it('Send tokens from Linea to Scroll (user10 => user20)', async () => {
    expect(await erc1155Linea.balanceOf(user10.address, firstTokenId)).to.be.eq(80);
    expect(await erc1155Linea.balanceOf(user20.address, firstTokenId)).to.be.eq(0);
    expect(await erc1155Scroll.balanceOf(user10.address, firstTokenId)).to.be.eq(20);
    expect(await erc1155Scroll.balanceOf(user20.address, firstTokenId)).to.be.eq(0);

    const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();
    const eid = eidScrollMainnet;
    const to = ethers.utils.zeroPad(user20.address, 32);
    const tokenId = firstTokenId;
    const amount = 20;

    const [nativeFee] = await erc1155Linea.quote(eid, to, tokenId, amount, options, false);

    await erc1155Linea
      .connect(user10)
      .send(eid, to, tokenId, amount, options, { value: nativeFee });

    expect(await erc1155Linea.balanceOf(user10.address, firstTokenId)).to.be.eq(60);
    expect(await erc1155Linea.balanceOf(user20.address, firstTokenId)).to.be.eq(0);
    expect(await erc1155Scroll.balanceOf(user10.address, firstTokenId)).to.be.eq(20);
    expect(await erc1155Scroll.balanceOf(user20.address, firstTokenId)).to.be.eq(20);
  });

  it('Send tokens from Scroll to Linea (user20 => user20)', async () => {
    expect(await erc1155Linea.balanceOf(user20.address, firstTokenId)).to.be.eq(0);
    expect(await erc1155Scroll.balanceOf(user20.address, firstTokenId)).to.be.eq(20);

    const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();
    const eid = eidLineaMainnet;
    const to = ethers.utils.zeroPad(user20.address, 32);
    const tokenId = firstTokenId;
    const amount = 10;

    const [nativeFee] = await erc1155Scroll.quote(eid, to, tokenId, amount, options, false);

    await erc1155Scroll
      .connect(user20)
      .send(eid, to, tokenId, amount, options, { value: nativeFee });

    expect(await erc1155Linea.balanceOf(user20.address, firstTokenId)).to.be.eq(10);
    expect(await erc1155Scroll.balanceOf(user20.address, firstTokenId)).to.be.eq(10);
  });

  it('Send tokens from Scroll to Linea (user20 => user10)', async () => {
    expect(await erc1155Linea.balanceOf(user10.address, firstTokenId)).to.be.eq(60);
    expect(await erc1155Linea.balanceOf(user20.address, firstTokenId)).to.be.eq(10);
    expect(await erc1155Scroll.balanceOf(user10.address, firstTokenId)).to.be.eq(20);
    expect(await erc1155Scroll.balanceOf(user20.address, firstTokenId)).to.be.eq(10);

    const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();
    const eid = eidLineaMainnet;
    const to = ethers.utils.zeroPad(user10.address, 32);
    const tokenId = firstTokenId;
    const amount = 10;

    const [nativeFee] = await erc1155Scroll.quote(eid, to, tokenId, amount, options, false);

    await erc1155Scroll
      .connect(user20)
      .send(eid, to, tokenId, amount, options, { value: nativeFee });

    expect(await erc1155Linea.balanceOf(user10.address, firstTokenId)).to.be.eq(70);
    expect(await erc1155Linea.balanceOf(user20.address, firstTokenId)).to.be.eq(10);
    expect(await erc1155Scroll.balanceOf(user10.address, firstTokenId)).to.be.eq(20);
    expect(await erc1155Scroll.balanceOf(user20.address, firstTokenId)).to.be.eq(0);
  });

  it('Send tokens from Linea to Scroll (user10 => user20) revert msg.sender', async () => {
    expect(await erc1155Linea.balanceOf(user10.address, firstTokenId)).to.be.eq(70);
    expect(await erc1155Linea.balanceOf(user20.address, firstTokenId)).to.be.eq(10);
    expect(await erc1155Scroll.balanceOf(user10.address, firstTokenId)).to.be.eq(20);
    expect(await erc1155Scroll.balanceOf(user20.address, firstTokenId)).to.be.eq(0);

    const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();
    const eid = eidScrollMainnet;
    const to = ethers.utils.zeroPad(user20.address, 32);
    const tokenId = firstTokenId;
    const amount = 222;

    const [nativeFee] = await erc1155Linea.quote(eid, to, tokenId, amount, options, false);

    // user20 => user20
    expect(
      erc1155Linea.connect(user20).send(eid, to, tokenId, amount, options, { value: nativeFee }),
    ).to.be.revertedWithCustomError; // 'ERC1155InsufficientBalance("0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", 10, 222, 1)'

    // user10 => user20
    // await erc1155Linea
    //   .connect(user10)
    //   .send(sendParam, MessagingFee, user10.address, { value: nativeFee });

    //   await erc1155Scroll
    //   .connect(user20)
    //   .send(eid, to, tokenId, amount, options, { value: nativeFee });

    // expect(await erc1155Linea.balanceOf(user10.address)).to.be.eq(
    //   thousandTokens.sub(hundredTokens.mul(2)),
    // );
    // expect(await erc1155Scroll.balanceOf(user20.address)).to.be.eq(hundredTokens);

    // // adminLinea => user20
    // expect(await erc1155Linea.balanceOf(adminLinea.address)).to.be.eq(
    //   thousandTokens.sub(hundredTokens),
    // );
    // await erc1155Linea
    //   .connect(adminLinea)
    //   .send(sendParam, MessagingFee, user10.address, { value: nativeFee });
    // expect(await erc1155Linea.balanceOf(adminLinea.address)).to.be.eq(
    //   thousandTokens.sub(hundredTokens.mul(2)),
    // );

    // expect(await erc1155Linea.balanceOf(user10.address)).to.be.eq(
    //   thousandTokens.sub(hundredTokens.mul(2)),
    // );
    // expect(await erc1155Scroll.balanceOf(user20.address)).to.be.eq(hundredTokens.mul(2));
  });
});
