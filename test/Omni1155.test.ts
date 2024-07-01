import { deployments, ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Omni1155 } from '../typechain-types';
import { Contract, ContractFactory } from 'ethers';
import { Options } from '@layerzerolabs/lz-v2-utilities';

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

describe('Omni1155 tests', () => {
  // contracts
  let EndpointV2Mock: ContractFactory;
  let erc1155Linea: Omni1155;
  let erc1155Scroll: Omni1155;
  let mockEndpointV2Linea: Contract;
  let mockEndpointV2Scroll: Contract;

  // accounts
  let signers: SignerWithAddress[];
  let adminLinea: SignerWithAddress; // _delegate & Owner
  let adminScroll: SignerWithAddress; // _delegate & Owner
  let endpointOwner: SignerWithAddress;
  let user10: SignerWithAddress;
  let user20: SignerWithAddress;
  let thirdPartyDeployer: SignerWithAddress;

  before(async () => {
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

    const Factory = await ethers.getContractFactory('Omni1155');

    const runner2060Linea = await Factory.connect(thirdPartyDeployer).deploy(
      mockEndpointV2Linea.address,
      adminLinea.address,
    );
    const runner2060Scroll = await Factory.connect(thirdPartyDeployer).deploy(
      mockEndpointV2Scroll.address,
      adminScroll.address,
    );

    expect(mockEndpointV2Linea.address).to.not.eq(ethers.constants.AddressZero);
    expect(mockEndpointV2Scroll.address).to.not.eq(ethers.constants.AddressZero);
    expect(runner2060Linea.address).to.not.eq(ethers.constants.AddressZero);
    expect(runner2060Scroll.address).to.not.eq(ethers.constants.AddressZero);

    erc1155Linea = runner2060Linea as Omni1155;
    erc1155Scroll = runner2060Scroll as Omni1155;
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
      erc1155Linea
        .connect(thirdPartyDeployer)
        .setPeer(eidScrollMainnet, ethers.utils.zeroPad(erc1155Scroll.address, 32)),
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

    const sendParam = {
      dstEid: eidScrollMainnet,
      to: ethers.utils.zeroPad(adminScroll.address, 32),
      amountLD: hundredTokens,
      minAmountLD: hundredTokens,
      extraOptions: options,
      composeMsg: '0x',
      oftCmd: '0x',
    };

    const [nativeFee] = await erc1155Linea.quoteSend(sendParam, false); // false - Flag indicating whether the caller is paying in the LZ token.

    const MessagingFee = {
      nativeFee: nativeFee,
      lzTokenFee: 0,
    };
    await erc1155Linea
      .connect(adminLinea)
      .send(sendParam, MessagingFee, adminLinea.address, { value: nativeFee });

    expect(await erc1155Linea.balanceOf(adminLinea.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Linea.balanceOf(adminScroll.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Scroll.balanceOf(adminLinea.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Scroll.balanceOf(adminScroll.address, zeroTokenId)).to.be.eq(tenTokens);
  });
  /*
  it('Set URI', async () => {
    expect(
      erc1155Linea.connect(user1).setURI('ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/'),
    ).to.be.revertedWithCustomError; // onlyOwner

    await erc1155Linea.setURI('ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/');

    expect(await erc1155Linea.uri(zeroTokenId)).to.be.eq(
      'ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/0.json',
    );

    expect(await erc1155Linea.uri(firstTokenId)).to.be.eq(
      'ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/1.json',
    );
  });

  it('Mint tokens by adminLinea', async () => {
    expect(
      erc1155Linea.connect(user1).mintadminLinea(adminLinea.address, firstTokenId, hundredTokens),
    ).to.be.revertedWithCustomError; // onlyOwner

    expect(await erc1155Linea.balanceOf(user1.address, firstTokenId)).to.be.eq(zeroAmount);
    await erc1155Linea.connect(adminLinea).mintadminLinea(user1.address, firstTokenId, tenTokens);
    expect(await erc1155Linea.balanceOf(user1.address, firstTokenId)).to.be.eq(tenTokens);
  });

  it('Burn tokens by adminLinea', async () => {
    // burnadminLinea()
    expect(erc1155Linea.connect(user1).burnadminLinea(user1.address, firstTokenId, tenTokens)).to.be
      .revertedWithCustomError; // onlyOwner
    expect(await erc1155Linea.balanceOf(user1.address, firstTokenId)).to.be.eq(tenTokens);
    await erc1155Linea.connect(adminLinea).burnadminLinea(user1.address, firstTokenId, tenTokens);
    expect(await erc1155Linea.balanceOf(user1.address, firstTokenId)).to.be.eq(zeroAmount);
  });*/
});
