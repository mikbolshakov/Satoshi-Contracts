import { deployments, ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Runner2060rewardsOmni } from '../typechain-types';
import { Contract, ContractFactory, Wallet } from 'ethers';
import { joinSignature } from 'ethers/lib/utils';
import { TypedDataUtils } from 'ethers-eip712';
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
  let user30: SignerWithAddress;
  let thirdPartyDeployer: SignerWithAddress;

  let backend: BackendMock;

  before(async () => {
    mintMaintainer = ethers.Wallet.createRandom();
    signers = await ethers.getSigners();
    adminLinea = signers[0];
    adminScroll = signers[1];
    endpointOwner = signers[2];
    user10 = signers[3];
    user20 = signers[4];
    user30 = signers[5];
    thirdPartyDeployer = signers[6];

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
      mockEndpointV2Linea.address,
      adminLinea.address,
    );
    const runner2060Scroll = await Factory.connect(thirdPartyDeployer).deploy(
      mintMaintainer.address,
      mockEndpointV2Scroll.address,
      adminScroll.address,
    );

    expect(mockEndpointV2Linea.address).to.not.eq(ethers.constants.AddressZero);
    expect(mockEndpointV2Scroll.address).to.not.eq(ethers.constants.AddressZero);
    expect(runner2060Linea.address).to.not.eq(ethers.constants.AddressZero);
    expect(runner2060Scroll.address).to.not.eq(ethers.constants.AddressZero);

    erc1155Linea = runner2060Linea as Runner2060rewardsOmni;
    erc1155Scroll = runner2060Scroll as Runner2060rewardsOmni;

    const ERC1155 = '0xd9b67a26';
    expect(await erc1155Linea.supportsInterface(ERC1155)).to.equal(true);
    expect(await erc1155Linea.name()).to.eq('Runner2060rewards');
    expect(await erc1155Linea.symbol()).to.eq('SuRunRewards');
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

  it('Set URI', async () => {
    expect(
      erc1155Linea.connect(user10).setURI('ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/'),
    ).to.be.revertedWithCustomError; // onlyOwner

    await erc1155Linea
      .connect(adminLinea)
      .setURI('ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/');

    expect(await erc1155Linea.uri(zeroTokenId)).to.be.eq(
      'ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/0.json',
    );

    expect(await erc1155Linea.uri(firstTokenId)).to.be.eq(
      'ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/1.json',
    );
  });

  it('Enable backend', async () => {
    backend = new BackendMock(31337, erc1155Linea.address, mintMaintainer);
  });

  it('Set and get max supply', async () => {
    expect(erc1155Linea.connect(user10).setMaxSupply(firstTokenId, tenTokens)).to.be
      .revertedWithCustomError; // onlyOwner

    // setMaxSupply()
    expect(await erc1155Linea.getMaxSupply(zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Linea.getMaxSupply(firstTokenId)).to.be.eq(zeroAmount);
    await erc1155Linea.connect(adminLinea).setMaxSupply(zeroTokenId, hundredTokens);
    await erc1155Linea.connect(adminLinea).setMaxSupply(firstTokenId, tenTokens * 3);
    expect(await erc1155Linea.getMaxSupply(zeroTokenId)).to.be.eq(hundredTokens);
    expect(await erc1155Linea.getMaxSupply(firstTokenId)).to.be.eq(tenTokens * 3);

    // Check: Exceeds max supply
    const mintOne = {
      tokenId: firstTokenId,
      amount: hundredTokens,
      salt: '0x123b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6321',
    };
    const signatureOne = backend.signMintMessage(mintOne);

    expect(await erc1155Linea.balanceOf(user10.address, firstTokenId)).to.be.eq(zeroAmount);
    await expect(erc1155Linea.connect(user10).mint(signatureOne, mintOne)).to.be.revertedWith(
      'Exceeds max supply',
    );
    expect(await erc1155Linea.balanceOf(user10.address, firstTokenId)).to.be.eq(zeroAmount);

    // Check: Exceeds max supply (Batch mint)
    const mintTwo = {
      tokenIds: [zeroTokenId, firstTokenId, secondTokenId],
      amounts: [tenTokens, hundredTokens, tenTokens],
      salt: '0x4334141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d3344',
    };
    const signatureTwo = backend.signBatchMintMessage(mintTwo);

    expect(await erc1155Linea.balanceOf(user30.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Linea.balanceOf(user30.address, firstTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Linea.balanceOf(user30.address, secondTokenId)).to.be.eq(zeroAmount);

    await expect(erc1155Linea.connect(user30).mintBatch(signatureTwo, mintTwo)).to.be.revertedWith(
      'Exceeds max supply',
    );

    expect(await erc1155Linea.balanceOf(user30.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Linea.balanceOf(user30.address, firstTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Linea.balanceOf(user30.address, secondTokenId)).to.be.eq(zeroAmount);
  });

  it('Mint tokens by user', async () => {
    // Mint tokens
    const mintOne = {
      tokenId: zeroTokenId,
      amount: tenTokens,
      salt: '0x979b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6e37',
    };
    const signatureOne = backend.signMintMessage(mintOne);

    expect(await erc1155Linea.balanceOf(user10.address, zeroTokenId)).to.be.eq(zeroAmount);

    // mint()
    await erc1155Linea.connect(user10).mint(signatureOne, mintOne);

    expect(await erc1155Linea.balanceOf(user10.address, zeroTokenId)).to.be.eq(tenTokens);
    expect(await erc1155Linea.uri(zeroTokenId)).to.be.eq(
      'ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/0.json',
    );

    await expect(erc1155Linea.connect(user10).mint(signatureOne, mintOne)).to.be.revertedWith(
      'This message has already been executed!',
    );

    // Check: Token id doesn't exist
    const mintTwo = {
      tokenId: secondTokenId,
      amount: tenTokens,
      salt: '0x869b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6e26',
    };
    const signatureTwo = backend.signMintMessage(mintTwo);

    // Check: Maintainer did not sign this message!
    const mintThree = {
      tokenId: secondTokenId,
      amount: tenTokens,
      salt: '0x111b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6e11',
    };

    await expect(erc1155Linea.connect(user10).mint(signatureTwo, mintThree)).to.be.revertedWith(
      'Maintainer did not sign this message!',
    );
  });

  it('Mint tokens by adminLinea', async () => {
    expect(erc1155Linea.connect(user10).mintAdmin(adminLinea.address, firstTokenId, hundredTokens))
      .to.be.revertedWithCustomError; // onlyOwner

    expect(await erc1155Linea.balanceOf(adminLinea.address, firstTokenId)).to.be.eq(zeroAmount);
    await erc1155Linea.connect(adminLinea).mintAdmin(adminLinea.address, firstTokenId, tenTokens);
    expect(await erc1155Linea.balanceOf(adminLinea.address, firstTokenId)).to.be.eq(tenTokens);
  });

  it('Enable token transfers', async () => {
    await expect(
      erc1155Linea.connect(user10).safeTransferFrom(user10.address, user20.address, 0, 100, '0x'),
    ).to.be.revertedWith('Enable token transfers functionality!');
    expect(erc1155Linea.connect(user10).enableTransfer()).to.be.revertedWithCustomError; // onlyOwner

    // enableTransfer()
    await erc1155Linea.connect(adminLinea).enableTransfer();
  });

  it('Transfer token when Enabled', async () => {
    expect(await erc1155Linea.balanceOf(user10.address, zeroTokenId)).to.be.eq(tenTokens);
    expect(await erc1155Linea.balanceOf(user20.address, zeroTokenId)).to.be.eq(zeroAmount);
    await erc1155Linea
      .connect(user10)
      .safeTransferFrom(user10.address, user20.address, zeroTokenId, tenTokens, '0x');

    expect(await erc1155Linea.balanceOf(user10.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Linea.balanceOf(user20.address, zeroTokenId)).to.be.eq(tenTokens);

    await erc1155Linea
      .connect(user20)
      .safeBatchTransferFrom(user20.address, user10.address, [zeroTokenId], [tenTokens], '0x');

    expect(await erc1155Linea.balanceOf(user10.address, zeroTokenId)).to.be.eq(tenTokens);
    expect(await erc1155Linea.balanceOf(user20.address, zeroTokenId)).to.be.eq(zeroAmount);
  });

  it('Approve token when Enabled', async () => {
    expect(await erc1155Linea.isApprovedForAll(user10.address, user20.address)).to.be.eq(false);
    await erc1155Linea.connect(user10).setApprovalForAll(user20.address, true);
    expect(await erc1155Linea.isApprovedForAll(user10.address, user20.address)).to.be.eq(true);
  });

  it('Disable token transfers', async () => {
    expect(erc1155Linea.connect(user10).disableTransfer()).to.be.revertedWithCustomError; // onlyOwner

    // disableTransfer()
    await erc1155Linea.connect(adminLinea).disableTransfer();

    await expect(
      erc1155Linea
        .connect(user10)
        .safeTransferFrom(user10.address, adminLinea.address, firstTokenId, hundredTokens, '0x'),
    ).to.be.revertedWith('Enable token transfers functionality!');
    await expect(
      erc1155Linea
        .connect(user10)
        .safeBatchTransferFrom(
          user10.address,
          adminLinea.address,
          [firstTokenId],
          [hundredTokens],
          '0x',
        ),
    ).to.be.revertedWith('Enable token transfers functionality!');
    await expect(
      erc1155Linea.connect(user10).setApprovalForAll(user20.address, true),
    ).to.be.revertedWith('Enable token transfers functionality!');
  });

  it('Transfer token when Disabled', async () => {
    expect(await erc1155Linea.balanceOf(adminLinea.address, firstTokenId)).to.be.eq(tenTokens);
    expect(await erc1155Linea.balanceOf(user20.address, firstTokenId)).to.be.eq(zeroAmount);

    await erc1155Linea
      .connect(adminLinea)
      .safeTransferFrom(adminLinea.address, user20.address, firstTokenId, tenTokens / 2, '0x');

    expect(await erc1155Linea.balanceOf(adminLinea.address, firstTokenId)).to.be.eq(tenTokens / 2);
    expect(await erc1155Linea.balanceOf(user20.address, firstTokenId)).to.be.eq(tenTokens / 2);

    await erc1155Linea
      .connect(adminLinea)
      .safeBatchTransferFrom(
        adminLinea.address,
        user20.address,
        [firstTokenId],
        [tenTokens / 2],
        '0x',
      );

    expect(await erc1155Linea.balanceOf(adminLinea.address, firstTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Linea.balanceOf(user20.address, firstTokenId)).to.be.eq(tenTokens);

    await erc1155Linea.connect(adminLinea).enableTransfer();
    await erc1155Linea
      .connect(user20)
      .safeTransferFrom(user20.address, adminLinea.address, firstTokenId, tenTokens, '0x');
  });

  it('Transfer token when Disabled', async () => {
    expect(await erc1155Linea.isApprovedForAll(adminLinea.address, user30.address)).to.be.eq(false);
    await erc1155Linea.connect(adminLinea).setApprovalForAll(user30.address, true);
    expect(await erc1155Linea.isApprovedForAll(adminLinea.address, user30.address)).to.be.eq(true);

    expect(await erc1155Scroll.isApprovedForAll(adminScroll.address, user20.address)).to.be.eq(
      false,
    );
    await erc1155Scroll.connect(adminScroll).setApprovalForAll(user20.address, true);
    expect(await erc1155Scroll.isApprovedForAll(adminScroll.address, user20.address)).to.be.eq(
      true,
    );
  });

  it('Pause and unpause contract', async () => {
    expect(erc1155Linea.connect(user10).pause()).to.be.revertedWithCustomError; // onlyOwner

    // pause()
    await erc1155Linea.connect(adminLinea).pause();

    // Check: EnforcedPause()
    const mintOne = {
      tokenId: zeroTokenId,
      amount: tenTokens,
      salt: '0x000b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6000',
    };
    const signatureOne = backend.signMintMessage(mintOne);

    expect(await erc1155Linea.balanceOf(user10.address, zeroTokenId)).to.be.eq(tenTokens);
    await expect(
      erc1155Linea
        .connect(user10)
        .safeTransferFrom(user10.address, user20.address, zeroTokenId, tenTokens, []),
    ).to.be.rejectedWith('EnforcedPause()');
    await expect(erc1155Linea.connect(user10).mint(signatureOne, mintOne)).to.be.rejectedWith(
      'EnforcedPause()',
    );
    expect(await erc1155Linea.balanceOf(user10.address, zeroTokenId)).to.be.eq(tenTokens);

    expect(erc1155Linea.connect(user10).unpause()).to.be.revertedWithCustomError; // onlyOwner

    // unpause()
    await erc1155Linea.connect(adminLinea).unpause();

    // mint()
    expect(await erc1155Linea.balanceOf(user20.address, zeroTokenId)).to.be.eq(zeroAmount);
    await erc1155Linea.connect(user20).mint(signatureOne, mintOne);
    expect(await erc1155Linea.balanceOf(user20.address, zeroTokenId)).to.be.eq(tenTokens);
  });

  it('Mint Batch tokens by user', async () => {
    // Check: Token id doesn't exist (Batch mint)
    const mintOne = {
      tokenIds: [zeroTokenId, firstTokenId, secondTokenId, thirdTokenId],
      amounts: [tenTokens, tenTokens, tenTokens, tenTokens],
      salt: '0x333b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6333',
    };
    const signatureOne = backend.signBatchMintMessage(mintOne);

    // Batch mint tokens
    const mintTwo = {
      tokenIds: [zeroTokenId, firstTokenId, secondTokenId],
      amounts: [tenTokens, tenTokens, tenTokens],
      salt: '0x4444141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d4444',
    };
    const signatureTwo = backend.signBatchMintMessage(mintTwo);

    expect(await erc1155Linea.balanceOf(user30.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Linea.balanceOf(user30.address, firstTokenId)).to.be.eq(zeroAmount);
    expect(await erc1155Linea.balanceOf(user30.address, secondTokenId)).to.be.eq(zeroAmount);

    // mintBatch()
    await erc1155Linea.connect(user30).mintBatch(signatureTwo, mintTwo);

    expect(await erc1155Linea.balanceOf(user30.address, zeroTokenId)).to.be.eq(tenTokens);
    expect(await erc1155Linea.balanceOf(user30.address, firstTokenId)).to.be.eq(tenTokens);
    expect(await erc1155Linea.balanceOf(user30.address, secondTokenId)).to.be.eq(tenTokens);
    await expect(erc1155Linea.connect(user30).mintBatch(signatureOne, mintTwo)).to.be.revertedWith(
      'Maintainer did not sign this message!',
    );
    await expect(erc1155Linea.connect(user30).mintBatch(signatureTwo, mintTwo)).to.be.revertedWith(
      'This message has already been executed!',
    );

    expect(await erc1155Linea.uri(firstTokenId)).to.be.eq(
      'ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/1.json',
    );
    expect(await erc1155Linea.uri(secondTokenId)).to.be.eq(
      'ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/2.json',
    );
  });

  it('Burn tokens by adminLinea', async () => {
    // burnAdmin()
    expect(erc1155Linea.connect(user10).burnAdmin(user30.address, firstTokenId, tenTokens)).to.be
      .revertedWithCustomError; // onlyOwner
    expect(await erc1155Linea.balanceOf(user30.address, firstTokenId)).to.be.eq(tenTokens);
    await erc1155Linea.connect(adminLinea).burnAdmin(user30.address, firstTokenId, tenTokens);
    expect(await erc1155Linea.balanceOf(user30.address, firstTokenId)).to.be.eq(zeroAmount);

    // burn()
    expect(erc1155Linea.connect(user10).burn(user30.address, firstTokenId, tenTokens)).to.be
      .revertedWithCustomError; // onlyOwner
    // await erc1155Linea.connect(adminLinea).mintAdmin(adminLinea.address, firstTokenId, hundredTokens);
    expect(await erc1155Linea.balanceOf(adminLinea.address, firstTokenId)).to.be.eq(tenTokens);
    await erc1155Linea.connect(adminLinea).burn(adminLinea.address, firstTokenId, tenTokens);
    expect(await erc1155Linea.balanceOf(adminLinea.address, firstTokenId)).to.be.eq(zeroAmount);

    // burnBatch()
    expect(erc1155Linea.connect(user10).burnBatch(user30.address, [firstTokenId], [tenTokens])).to
      .be.revertedWithCustomError; // onlyOwner
    await erc1155Linea
      .connect(adminLinea)
      .mintAdmin(adminLinea.address, firstTokenId, hundredTokens);
    expect(await erc1155Linea.balanceOf(adminLinea.address, firstTokenId)).to.be.eq(hundredTokens);
    await erc1155Linea
      .connect(adminLinea)
      .burnBatch(adminLinea.address, [firstTokenId], [hundredTokens]);
    expect(await erc1155Linea.balanceOf(adminLinea.address, firstTokenId)).to.be.eq(zeroAmount);
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

  it('Set mint maintainer', async () => {
    expect(erc1155Linea.connect(user10).setMintingMaintainer(user20.address)).to.be
      .revertedWithCustomError; // onlyOwner

    expect(await erc1155Linea.mintingMaintainer()).to.be.eq(mintMaintainer.address);
    await erc1155Linea.connect(adminLinea).setMintingMaintainer(user20.address);
    expect(await erc1155Linea.mintingMaintainer()).to.be.eq(user20.address);
  });
});

interface MintInterface {
  tokenId: number;
  amount: number;
  salt: string;
}

interface BatchMintInterface {
  tokenIds: Array<number>;
  amounts: Array<number>;
  salt: string;
}

class BackendMock {
  /// The EIP-712 domain name used for computing the domain separator.
  DOMAIN_NAME = 'Runner2060rewards';
  /// The EIP-712 domain version used for computing the domain separator.
  DOMAIN_VERSION = 'V1';

  maintainer: Wallet;
  chainId: number;
  contractAddress: string;

  constructor(chainId: number, contractAddress: string, maintainer: Wallet) {
    this.chainId = chainId;
    this.contractAddress = contractAddress;
    this.maintainer = maintainer;
  }

  signMintMessage(payload: MintInterface): Buffer {
    const message = this.constructMint(payload);

    const signature = joinSignature(this.maintainer._signingKey().signDigest(message));
    return Buffer.from(signature.slice(2), 'hex');
  }

  signBatchMintMessage(payload: BatchMintInterface): Buffer {
    const message = this.constructBatchMint(payload);

    const signature = joinSignature(this.maintainer._signingKey().signDigest(message));
    return Buffer.from(signature.slice(2), 'hex');
  }

  private constructMint({ tokenId, amount, salt }: MintInterface): string {
    const data = {
      domain: {
        chainId: this.chainId,
        verifyingContract: this.contractAddress,
        name: this.DOMAIN_NAME,
        version: this.DOMAIN_VERSION,
      },
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' },
        ],
        MintingParams: [
          { name: 'tokenId', type: 'uint256' },
          { name: 'amount', type: 'uint256' },
          { name: 'salt', type: 'bytes32' },
        ],
      },
      primaryType: 'MintingParams',
      message: {
        tokenId: tokenId,
        amount: amount,
        salt: salt,
      },
    };
    const digest = TypedDataUtils.encodeDigest(data);
    const digestHex = ethers.utils.hexlify(digest);
    return digestHex;
  }

  private constructBatchMint({ tokenIds, amounts, salt }: BatchMintInterface): string {
    const data = {
      domain: {
        chainId: this.chainId,
        verifyingContract: this.contractAddress,
        name: this.DOMAIN_NAME,
        version: this.DOMAIN_VERSION,
      },
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' },
        ],
        BatchMintingParams: [
          { name: 'tokenIds', type: 'uint256[]' },
          { name: 'amounts', type: 'uint256[]' },
          { name: 'salt', type: 'bytes32' },
        ],
      },
      primaryType: 'BatchMintingParams',
      message: {
        tokenIds: tokenIds,
        amounts: amounts,
        salt: salt,
      },
    };
    const digest = TypedDataUtils.encodeDigest(data);
    const digestHex = ethers.utils.hexlify(digest);
    return digestHex;
  }
}
