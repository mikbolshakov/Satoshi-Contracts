import { ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Runner2060rewards } from '../typechain-types';
import { Wallet } from 'ethers';
import { joinSignature } from 'ethers/lib/utils';
import { TypedDataUtils } from 'ethers-eip712';

describe('Runner2060rewards tests', () => {
  const fee = 750;
  const zeroAmount = 0;
  const zeroTokenId = 0;
  const firstTokenId = 1;
  const secondTokenId = 2;
  const thirdTokenId = 3;
  const tokenAmount = 10;
  const overTokenAmount = 1000;

  let nftContract: Runner2060rewards;
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
    const Factory = await ethers.getContractFactory('Runner2060rewards');
    const runner2060 = await Factory.deploy(
      mintMaintainer.address,
      admin.address,
      fee,
      admin.address,
    );

    expect(runner2060.address).to.not.eq(ethers.constants.AddressZero);
    nftContract = runner2060 as Runner2060rewards;

    const ERC2981 = '0x2a55205a';
    expect(await nftContract.supportsInterface(ERC2981)).to.equal(true);

    expect(
      nftContract
        .connect(user1)
        .setURI('ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/'),
    ).to.be.revertedWithCustomError; // only owner check
    await nftContract.setURI(
      'ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/',
    );
  });

  it('Increments unique items count', async () => {
    expect(nftContract.connect(user1).incrementUniqueItemsCount()).to.be
      .revertedWithCustomError; // only owner check

    expect(await nftContract.getUniqueItemsCount()).to.eq(zeroAmount);
    await expect(nftContract.uri(1)).to.be.revertedWith(
      "Token id doesn't exist",
    );

    await nftContract.connect(admin).incrementUniqueItemsCount();

    expect(await nftContract.getUniqueItemsCount()).to.eq(1);
    expect(await nftContract.uri(firstTokenId)).to.be.eq(
      'ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/1',
    );

    backend = new BackendMock(31337, nftContract.address, mintMaintainer);
  });

  it('Set and get max supply', async () => {
    expect(nftContract.connect(user1).setMaxSupply(firstTokenId, tokenAmount))
      .to.be.revertedWithCustomError; // only owner check

    await nftContract.setMaxSupply(zeroTokenId, tokenAmount * 10);
    await nftContract.setMaxSupply(firstTokenId, tokenAmount * 2);

    const mintOne = {
      tokenId: firstTokenId,
      amount: tokenAmount * 10,
      salt: '0x123b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6321',
    };

    const signature = backend.signMintMessage(mintOne);

    expect(await nftContract.balanceOf(user1.address, firstTokenId)).to.be.eq(
      zeroAmount,
    );
    await expect(
      nftContract.connect(user1).mint(signature, mintOne),
    ).to.be.revertedWith('Exceeds max supply');
    expect(await nftContract.balanceOf(user1.address, firstTokenId)).to.be.eq(
      zeroAmount,
    );

    const mintTwo = {
      tokenIds: [zeroTokenId, firstTokenId, secondTokenId],
      amounts: [tokenAmount, tokenAmount * 10, tokenAmount],
      salt: '0x4334141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d3344',
    };

    const signatureTwo = backend.signBatchMintMessage(mintTwo);

    expect(await nftContract.balanceOf(user3.address, zeroTokenId)).to.be.eq(
      zeroAmount,
    );
    expect(await nftContract.balanceOf(user3.address, firstTokenId)).to.be.eq(
      zeroAmount,
    );
    expect(await nftContract.balanceOf(user3.address, secondTokenId)).to.be.eq(
      zeroAmount,
    );

    await expect(
      nftContract.connect(user3).mintBatch(signatureTwo, mintTwo),
    ).to.be.revertedWith('Exceeds max supply');

    expect(await nftContract.balanceOf(user3.address, zeroTokenId)).to.be.eq(
      zeroAmount,
    );
    expect(await nftContract.balanceOf(user3.address, firstTokenId)).to.be.eq(
      zeroAmount,
    );
    expect(await nftContract.balanceOf(user3.address, secondTokenId)).to.be.eq(
      zeroAmount,
    );
  });

  it('Mint tokens by user', async () => {
    const mintOne = {
      tokenId: zeroTokenId,
      amount: tokenAmount,
      salt: '0x979b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6e37',
    };
    const mintTwo = {
      tokenId: secondTokenId,
      amount: tokenAmount,
      salt: '0x869b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6e26',
    };
    const mintThree = {
      tokenId: secondTokenId,
      amount: tokenAmount,
      salt: '0x111b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6e11',
    };

    const signature = backend.signMintMessage(mintOne);
    const signatureTwo = backend.signMintMessage(mintTwo);

    expect(
      nftContract.connect(user1).mint(signature, mintTwo),
    ).to.be.revertedWith("Token id doesn't exist");
    expect(await nftContract.balanceOf(user1.address, zeroTokenId)).to.be.eq(
      zeroAmount,
    );

    await nftContract.connect(user1).mint(signature, mintOne);

    expect(await nftContract.balanceOf(user1.address, zeroTokenId)).to.be.eq(
      tokenAmount,
    );
    expect(await nftContract.uri(zeroTokenId)).to.be.eq(
      'ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/0',
    );

    await expect(
      nftContract.connect(user1).mint(signature, mintOne),
    ).to.be.revertedWith('This message has already been executed!');

    await nftContract.incrementUniqueItemsCount();

    await expect(
      nftContract.connect(user1).mint(signatureTwo, mintThree),
    ).to.be.revertedWith('Maintainer did not sign this message!');
  });

  it('Pause and unpause contract', async () => {
    const mintOne = {
      tokenId: zeroTokenId,
      amount: tokenAmount,
      salt: '0x000b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6000',
    };

    const signature = backend.signMintMessage(mintOne);

    expect(await nftContract.balanceOf(user1.address, zeroTokenId)).to.be.eq(
      tokenAmount,
    );
    expect(nftContract.connect(user1).pause()).to.be.revertedWithCustomError; // onlyRole
    await nftContract.pause();

    await expect(
      nftContract
        .connect(user1)
        .safeTransferFrom(
          user1.address,
          user2.address,
          zeroTokenId,
          tokenAmount,
          [],
        ),
    ).to.be.rejectedWith('EnforcedPause()');
    await expect(
      nftContract.connect(user1).mint(signature, mintOne),
    ).to.be.rejectedWith('EnforcedPause()');

    expect(nftContract.connect(user1).unpause()).to.be.revertedWithCustomError; // onlyRole
    await nftContract.unpause();

    expect(await nftContract.balanceOf(user2.address, zeroTokenId)).to.be.eq(
      zeroAmount,
    );
    await nftContract.connect(user2).mint(signature, mintOne);
    expect(await nftContract.balanceOf(user2.address, zeroTokenId)).to.be.eq(
      tokenAmount,
    );
  });

  it('Mint Batch tokens by user', async () => {
    const mintOne = {
      tokenIds: [zeroTokenId, firstTokenId, secondTokenId, thirdTokenId],
      amounts: [tokenAmount, tokenAmount, tokenAmount, tokenAmount],
      salt: '0x333b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6333',
    };
    const mintTwo = {
      tokenIds: [zeroTokenId, firstTokenId, secondTokenId],
      amounts: [tokenAmount, tokenAmount, tokenAmount],
      salt: '0x4444141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d4444',
    };

    const signature = backend.signBatchMintMessage(mintOne);
    const signatureTwo = backend.signBatchMintMessage(mintTwo);

    await expect(
      nftContract.connect(user3).mintBatch(signature, mintOne),
    ).to.be.revertedWith("Token id doesn't exist");
    expect(await nftContract.balanceOf(user3.address, zeroTokenId)).to.be.eq(
      zeroAmount,
    );
    expect(await nftContract.balanceOf(user3.address, firstTokenId)).to.be.eq(
      zeroAmount,
    );
    expect(await nftContract.balanceOf(user3.address, secondTokenId)).to.be.eq(
      zeroAmount,
    );

    await nftContract.connect(user3).mintBatch(signatureTwo, mintTwo);

    expect(await nftContract.balanceOf(user3.address, zeroTokenId)).to.be.eq(
      tokenAmount,
    );
    expect(await nftContract.balanceOf(user3.address, firstTokenId)).to.be.eq(
      tokenAmount,
    );
    expect(await nftContract.balanceOf(user3.address, secondTokenId)).to.be.eq(
      tokenAmount,
    );
    await expect(
      nftContract.connect(user3).mintBatch(signature, mintTwo),
    ).to.be.revertedWith('Maintainer did not sign this message!');
    await expect(
      nftContract.connect(user3).mintBatch(signatureTwo, mintTwo),
    ).to.be.revertedWith('This message has already been executed!');

    expect(await nftContract.uri(firstTokenId)).to.be.eq(
      'ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/1',
    );
    expect(await nftContract.uri(secondTokenId)).to.be.eq(
      'ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/2',
    );
  });

  it('Set mint maintainer', async () => {
    expect(nftContract.connect(user1).setMintingMaintainer(user2.address)).to.be
      .revertedWithCustomError; // onlyRole

    expect(await nftContract.getMintingMaintainer()).to.be.eq(
      mintMaintainer.address,
    );
    await nftContract.setMintingMaintainer(user2.address);
    expect(await nftContract.getMintingMaintainer()).to.be.eq(user2.address);
  });

  it('Grant and revoke role', async () => {
    const adminRole =
      '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775';

    expect(
      await nftContract.connect(user1).hasRole(adminRole, user1.address),
    ).to.be.eq(false);

    expect(nftContract.connect(user1).grantRole(adminRole, user1.address)).to.be
      .revertedWithCustomError; // onlyRole

    await nftContract.grantRole(adminRole, user1.address);
    expect(
      await nftContract.connect(user1).hasRole(adminRole, user1.address),
    ).to.be.eq(true);

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

    const signature = joinSignature(
      this.maintainer._signingKey().signDigest(message),
    );
    return Buffer.from(signature.slice(2), 'hex');
  }

  signBatchMintMessage(payload: BatchMintInterface): Buffer {
    const message = this.constructBatchMint(payload);

    const signature = joinSignature(
      this.maintainer._signingKey().signDigest(message),
    );
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

  private constructBatchMint({
    tokenIds,
    amounts,
    salt,
  }: BatchMintInterface): string {
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
