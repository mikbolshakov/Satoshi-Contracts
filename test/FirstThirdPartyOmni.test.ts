import { deployments, ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Runner2060rewardsOmni, Runner2060rewards, FirstThirdPartyOmni } from '../typechain-types';
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

describe('FirstThirdPartyOmni tests', () => {
  // contracts
  let EndpointV2Mock: ContractFactory;
  let erc1155Linea: Runner2060rewards;
  let thirdPartyLineaOmni: FirstThirdPartyOmni;
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

    const FactoryRunner2060rewardsOmni = await ethers.getContractFactory('Runner2060rewardsOmni');
    const FactoryFirstThirdPartyOmni = await ethers.getContractFactory('FirstThirdPartyOmni');
    const FactoryRunner2060rewards = await ethers.getContractFactory('Runner2060rewards');

    const runner2060Linea = await FactoryRunner2060rewards.connect(thirdPartyDeployer).deploy(
      mintMaintainer.address,
      adminLinea.address,
      fee,
      adminLinea.address,
    );
    const omni1155Linea = await FactoryFirstThirdPartyOmni.connect(thirdPartyDeployer).deploy(
      mockEndpointV2Linea.address,
      adminLinea.address,
      runner2060Linea.address,
    );
    const runner2060Scroll = await FactoryRunner2060rewardsOmni.connect(thirdPartyDeployer).deploy(
      mintMaintainer.address,
      adminScroll.address,
      fee,
      mockEndpointV2Scroll.address,
      adminScroll.address,
    );

    expect(mockEndpointV2Linea.address).to.not.eq(ethers.constants.AddressZero);
    expect(mockEndpointV2Scroll.address).to.not.eq(ethers.constants.AddressZero);
    expect(runner2060Linea.address).to.not.eq(ethers.constants.AddressZero);
    expect(omni1155Linea.address).to.not.eq(ethers.constants.AddressZero);
    expect(runner2060Scroll.address).to.not.eq(ethers.constants.AddressZero);

    erc1155Linea = runner2060Linea as Runner2060rewards;
    thirdPartyLineaOmni = omni1155Linea as FirstThirdPartyOmni;
    erc1155Scroll = runner2060Scroll as Runner2060rewardsOmni;
  });

  it('Match omni contracts on Linea by thirdPartyDeployer and adminLinea', async () => {
    await mockEndpointV2Linea
      .connect(thirdPartyDeployer)
      .setDestLzEndpoint(erc1155Scroll.address, mockEndpointV2Scroll.address);

    expect(
      thirdPartyLineaOmni
        .connect(thirdPartyDeployer)
        .setPeer(eidScrollMainnet, ethers.utils.zeroPad(erc1155Scroll.address, 32)),
    ).to.be.revertedWithCustomError; // onlyOwner

    await thirdPartyLineaOmni
      .connect(adminLinea)
      .setPeer(eidScrollMainnet, ethers.utils.zeroPad(erc1155Scroll.address, 32));
  });

  it('Match omni contracts on Scroll by thirdPartyDeployer and adminScroll', async () => {
    await mockEndpointV2Scroll
      .connect(thirdPartyDeployer)
      .setDestLzEndpoint(thirdPartyLineaOmni.address, mockEndpointV2Linea.address);

    expect(
      erc1155Scroll
        .connect(thirdPartyDeployer)
        .setPeer(eidScrollMainnet, ethers.utils.zeroPad(thirdPartyLineaOmni.address, 32)),
    ).to.be.revertedWithCustomError; // onlyOwner

    await erc1155Scroll
      .connect(adminScroll)
      .setPeer(eidLineaMainnet, ethers.utils.zeroPad(thirdPartyLineaOmni.address, 32));
  });

  it('Send tokens from Linea to Scroll (adminLinea => adminScroll)', async () => {
    await erc1155Linea.connect(adminLinea).mintAdmin(user10.address, zeroTokenId, tenTokens);
    await erc1155Linea.connect(adminLinea).mintAdmin(adminLinea.address, zeroTokenId, tenTokens);
    await erc1155Linea.connect(adminLinea).enableTransfer();
    await erc1155Scroll.connect(adminScroll).enableTransfer();
    await erc1155Linea.connect(adminLinea).transferOwnership(thirdPartyLineaOmni.address);

    expect(await erc1155Linea.balanceOf(adminLinea.address, zeroTokenId)).to.be.eq(tenTokens);
    expect(await erc1155Linea.balanceOf(adminScroll.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Scroll.balanceOf(adminLinea.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Scroll.balanceOf(adminScroll.address, zeroTokenId)).to.be.eq(zeroAmount);

    const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();
    const eid = eidScrollMainnet;
    const from = adminLinea.address;
    const to = ethers.utils.zeroPad(adminScroll.address, 32);
    const tokenId = zeroTokenId;
    const amount = tenTokens;

    const [nativeFee] = await thirdPartyLineaOmni.quote(eid, to, tokenId, amount, options, false);

    await thirdPartyLineaOmni
      .connect(adminLinea)
      .send(eid, from, to, tokenId, amount, options, { value: nativeFee });

    expect(await erc1155Linea.balanceOf(adminLinea.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Linea.balanceOf(adminScroll.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Scroll.balanceOf(adminLinea.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Scroll.balanceOf(adminScroll.address, zeroTokenId)).to.be.eq(tenTokens);
  });

  it('Send tokens from Linea to Scroll (user10 => user20)', async () => {
    expect(await erc1155Linea.balanceOf(user10.address, zeroTokenId)).to.be.eq(tenTokens);
    expect(await erc1155Linea.balanceOf(user20.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Scroll.balanceOf(user10.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Scroll.balanceOf(user20.address, zeroTokenId)).to.be.eq(zeroAmount);

    const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();
    const eid = eidScrollMainnet;
    const from = user10.address;
    const to = ethers.utils.zeroPad(user20.address, 32);
    const tokenId = zeroTokenId;
    const amount = tenTokens;

    const [nativeFee] = await thirdPartyLineaOmni.quote(eid, to, tokenId, amount, options, false);

    await thirdPartyLineaOmni
      .connect(user10)
      .send(eid, from, to, tokenId, amount, options, { value: nativeFee });

    expect(await erc1155Linea.balanceOf(user10.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Linea.balanceOf(user20.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Scroll.balanceOf(user10.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Scroll.balanceOf(user20.address, zeroTokenId)).to.be.eq(tenTokens);
  });

  it('Send tokens from Scroll to Linea (user20 => user10)', async () => {
    expect(await erc1155Linea.balanceOf(user10.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Linea.balanceOf(user20.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Scroll.balanceOf(user10.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Scroll.balanceOf(user20.address, zeroTokenId)).to.be.eq(tenTokens);

    const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();
    const eid = eidLineaMainnet;
    const to = ethers.utils.zeroPad(user10.address, 32);
    const tokenId = zeroTokenId;
    const amount = tenTokens;

    const [nativeFee] = await erc1155Scroll.quote(eid, to, tokenId, amount, options, false);

    await erc1155Scroll
      .connect(user20)
      .send(eid, to, tokenId, amount, options, { value: nativeFee });

    expect(await erc1155Linea.balanceOf(user10.address, zeroTokenId)).to.be.eq(tenTokens);
    expect(await erc1155Linea.balanceOf(user20.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Scroll.balanceOf(user10.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Scroll.balanceOf(user20.address, zeroTokenId)).to.be.eq(zeroAmount);
  });
});
