import { ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { HexPlanetItems } from '../typechain-types';
import { Wallet } from 'ethers';
import { joinSignature } from 'ethers/lib/utils';
import { TypedDataUtils } from 'ethers-eip712';

describe('HexPlanetItems tests', () => {
  const fee = 750;
  const zeroAmount = 0;
  const tokenAmount = 10;
  const overTokenAmount = 1000;
  const zeroTokenId = 0;
  const firstTokenId = 1;
  const secondTokenId = 2;
  const thirdTokenId = 3;

  let nftContract: HexPlanetItems;
  let mintMaintainer: Wallet;
  let signers: SignerWithAddress[];
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let backend: BackendMock;
  before(async () => {
    mintMaintainer = ethers.Wallet.createRandom();
    signers = await ethers.getSigners();
    admin = signers[0];
    user1 = signers[1];
    user2 = signers[2];
    user3 = signers[3];
  });

  it('Deploy contract', async () => {
    const Factory = await ethers.getContractFactory('HexPlanetItems');
    const hexItems = await Factory.deploy(
      mintMaintainer.address,
      admin.address,
      fee,
      admin.address,
    );

    expect(hexItems.address).to.not.eq(ethers.constants.AddressZero);
    nftContract = hexItems as HexPlanetItems;

    const ERC2981 = '0x2a55205a';
    expect(await nftContract.supportsInterface(ERC2981)).to.equal(true);
  });

  it('Set URI', async () => {
    expect(
      nftContract.connect(user1).setURI('ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/'),
    ).to.be.revertedWithCustomError; // only owner check

    await nftContract.setURI('ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/');
  });

  it('Increment unique items count', async () => {
    expect(nftContract.connect(user1).incrementUniqueItemsCount()).to.be.revertedWithCustomError; // only owner check

    expect(await nftContract.getUniqueItemsCount()).to.eq(zeroAmount);
    expect(await nftContract.uri(zeroTokenId)).to.be.eq(
      'ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/0.json',
    );

    await expect(nftContract.uri(firstTokenId)).to.be.revertedWith("Token id doesn't exist");

    // incrementUniqueItemsCount()
    await nftContract.connect(admin).incrementUniqueItemsCount();

    expect(await nftContract.getUniqueItemsCount()).to.eq(1);
    expect(await nftContract.uri(firstTokenId)).to.be.eq(
      'ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/1.json',
    );

    backend = new BackendMock(31337, nftContract.address, mintMaintainer);
  });

  it('Set and get max supply', async () => {
    expect(nftContract.connect(user1).setMaxSupply(firstTokenId, tokenAmount)).to.be
      .revertedWithCustomError; // only owner check

    // Set: max supply
    expect(await nftContract.getMaxSupply(zeroTokenId)).to.be.eq(zeroAmount);
    expect(await nftContract.getMaxSupply(firstTokenId)).to.be.eq(zeroAmount);
    await nftContract.setMaxSupply(zeroTokenId, overTokenAmount);
    await nftContract.setMaxSupply(firstTokenId, tokenAmount * 2);
    expect(await nftContract.getMaxSupply(zeroTokenId)).to.be.eq(overTokenAmount);
    expect(await nftContract.getMaxSupply(firstTokenId)).to.be.eq(tokenAmount * 2);

    // Check: Exceeds max supply
    const mintOne = {
      tokenId: firstTokenId,
      amount: overTokenAmount,
      salt: '0x123b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6321',
    };
    const signatureOne = backend.signMintMessage(mintOne);

    expect(await nftContract.balanceOf(user1.address, firstTokenId)).to.be.eq(zeroAmount);
    await expect(nftContract.connect(user1).mint(signatureOne, mintOne)).to.be.revertedWith(
      'Exceeds max supply',
    );
    expect(await nftContract.balanceOf(user1.address, firstTokenId)).to.be.eq(zeroAmount);

    // Check: Exceeds max supply (Batch mint)
    const mintTwo = {
      tokenIds: [zeroTokenId, firstTokenId, secondTokenId],
      amounts: [tokenAmount, overTokenAmount, tokenAmount],
      salt: '0x4334141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d3344',
    };
    const signatureTwo = backend.signBatchMintMessage(mintTwo);

    expect(await nftContract.balanceOf(user3.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await nftContract.balanceOf(user3.address, firstTokenId)).to.be.eq(zeroAmount);
    expect(await nftContract.balanceOf(user3.address, secondTokenId)).to.be.eq(zeroAmount);

    await expect(nftContract.connect(user3).mintBatch(signatureTwo, mintTwo)).to.be.revertedWith(
      'Exceeds max supply',
    );

    expect(await nftContract.balanceOf(user3.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await nftContract.balanceOf(user3.address, firstTokenId)).to.be.eq(zeroAmount);
    expect(await nftContract.balanceOf(user3.address, secondTokenId)).to.be.eq(zeroAmount);
  });

  it('Mint tokens by user', async () => {
    // Mint tokens
    const mintOne = {
      tokenId: zeroTokenId,
      amount: tokenAmount,
      salt: '0x979b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6e37',
    };
    const signatureOne = backend.signMintMessage(mintOne);

    expect(await nftContract.balanceOf(user1.address, zeroTokenId)).to.be.eq(zeroAmount);

    // mint()
    await nftContract.connect(user1).mint(signatureOne, mintOne);

    expect(await nftContract.balanceOf(user1.address, zeroTokenId)).to.be.eq(tokenAmount);
    expect(await nftContract.uri(zeroTokenId)).to.be.eq(
      'ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/0.json',
    );

    await expect(nftContract.connect(user1).mint(signatureOne, mintOne)).to.be.revertedWith(
      'This message has already been executed!',
    );

    // Check: Token id doesn't exist
    const mintTwo = {
      tokenId: secondTokenId,
      amount: tokenAmount,
      salt: '0x869b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6e26',
    };
    const signatureTwo = backend.signMintMessage(mintTwo);

    await expect(nftContract.connect(user1).mint(signatureOne, mintTwo)).to.be.revertedWith(
      "Token id doesn't exist",
    );

    // Check: Maintainer did not sign this message!
    const mintThree = {
      tokenId: secondTokenId,
      amount: tokenAmount,
      salt: '0x111b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6e11',
    };

    await nftContract.incrementUniqueItemsCount();

    await expect(nftContract.connect(user1).mint(signatureTwo, mintThree)).to.be.revertedWith(
      'Maintainer did not sign this message!',
    );
  });

  it('Pause and unpause contract', async () => {
    expect(nftContract.connect(user1).pause()).to.be.revertedWithCustomError; // onlyRole

    // pause()
    await nftContract.pause();

    // Check: EnforcedPause()
    const mintOne = {
      tokenId: zeroTokenId,
      amount: tokenAmount,
      salt: '0x000b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6000',
    };
    const signatureOne = backend.signMintMessage(mintOne);

    expect(await nftContract.balanceOf(user1.address, zeroTokenId)).to.be.eq(tokenAmount);
    await expect(
      nftContract
        .connect(user1)
        .safeTransferFrom(user1.address, user2.address, zeroTokenId, tokenAmount, []),
    ).to.be.rejectedWith('EnforcedPause()');
    await expect(nftContract.connect(user1).mint(signatureOne, mintOne)).to.be.rejectedWith(
      'EnforcedPause()',
    );
    expect(await nftContract.balanceOf(user1.address, zeroTokenId)).to.be.eq(tokenAmount);

    expect(nftContract.connect(user1).unpause()).to.be.revertedWithCustomError; // onlyRole

    // unpause()
    await nftContract.unpause();

    // mint()
    expect(await nftContract.balanceOf(user2.address, zeroTokenId)).to.be.eq(zeroAmount);
    await nftContract.connect(user2).mint(signatureOne, mintOne);
    expect(await nftContract.balanceOf(user2.address, zeroTokenId)).to.be.eq(tokenAmount);
  });

  it('Mint Batch tokens by user', async () => {
    // Check: Token id doesn't exist (Batch mint)
    const mintOne = {
      tokenIds: [zeroTokenId, firstTokenId, secondTokenId, thirdTokenId],
      amounts: [tokenAmount, tokenAmount, tokenAmount, tokenAmount],
      salt: '0x333b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6333',
    };
    const signatureOne = backend.signBatchMintMessage(mintOne);

    await expect(nftContract.connect(user3).mintBatch(signatureOne, mintOne)).to.be.revertedWith(
      "Token id doesn't exist",
    );

    // Batch mint tokens
    const mintTwo = {
      tokenIds: [zeroTokenId, firstTokenId, secondTokenId],
      amounts: [tokenAmount, tokenAmount, tokenAmount],
      salt: '0x4444141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d4444',
    };
    const signatureTwo = backend.signBatchMintMessage(mintTwo);

    expect(await nftContract.balanceOf(user3.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await nftContract.balanceOf(user3.address, firstTokenId)).to.be.eq(zeroAmount);
    expect(await nftContract.balanceOf(user3.address, secondTokenId)).to.be.eq(zeroAmount);

    // mintBatch()
    await nftContract.connect(user3).mintBatch(signatureTwo, mintTwo);

    expect(await nftContract.balanceOf(user3.address, zeroTokenId)).to.be.eq(tokenAmount);
    expect(await nftContract.balanceOf(user3.address, firstTokenId)).to.be.eq(tokenAmount);
    expect(await nftContract.balanceOf(user3.address, secondTokenId)).to.be.eq(tokenAmount);
    await expect(nftContract.connect(user3).mintBatch(signatureOne, mintTwo)).to.be.revertedWith(
      'Maintainer did not sign this message!',
    );
    await expect(nftContract.connect(user3).mintBatch(signatureTwo, mintTwo)).to.be.revertedWith(
      'This message has already been executed!',
    );

    expect(await nftContract.uri(firstTokenId)).to.be.eq(
      'ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/1.json',
    );
    expect(await nftContract.uri(secondTokenId)).to.be.eq(
      'ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/2.json',
    );
  });

  it('Set mint maintainer', async () => {
    expect(nftContract.connect(user1).setMintingMaintainer(user2.address)).to.be
      .revertedWithCustomError; // onlyRole

    expect(await nftContract.getMintingMaintainer()).to.be.eq(mintMaintainer.address);
    await nftContract.setMintingMaintainer(user2.address);
    expect(await nftContract.getMintingMaintainer()).to.be.eq(user2.address);
  });

  it('Grant and revoke role', async () => {
    const adminRole = '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775';

    expect(await nftContract.connect(user1).hasRole(adminRole, user1.address)).to.be.eq(false);

    expect(nftContract.connect(user1).grantRole(adminRole, user1.address)).to.be
      .revertedWithCustomError; // onlyRole

    // grantRole()
    await nftContract.grantRole(adminRole, user1.address);
    expect(await nftContract.connect(user1).hasRole(adminRole, user1.address)).to.be.eq(true);

    // revokeRole()
    await nftContract.revokeRole(adminRole, admin.address);
    expect(await nftContract.hasRole(adminRole, admin.address)).to.be.eq(false);
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
  DOMAIN_NAME = 'HexPlanetItems';
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
