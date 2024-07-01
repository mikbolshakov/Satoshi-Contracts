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
  const tenTokens = 10;
  const hundredTokens = 100;
  const zeroTokenId = 0;
  const firstTokenId = 1;
  const secondTokenId = 2;
  const thirdTokenId = 3;

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
    expect(await nftContract.name()).to.eq('Runner2060rewards');
    expect(await nftContract.symbol()).to.eq('SuRunRewards');
  });

  it('Set URI', async () => {
    expect(
      nftContract.connect(user1).setURI('ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/'),
    ).to.be.revertedWithCustomError; // onlyOwner

    await nftContract.setURI('ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/');

    expect(await nftContract.uri(zeroTokenId)).to.be.eq(
      'ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/0.json',
    );

    expect(await nftContract.uri(firstTokenId)).to.be.eq(
      'ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/1.json',
    );
  });

  it('Enable backend', async () => {
    backend = new BackendMock(31337, nftContract.address, mintMaintainer);
  });

  it('Set and get max supply', async () => {
    expect(nftContract.connect(user1).setMaxSupply(firstTokenId, tenTokens)).to.be
      .revertedWithCustomError; // onlyOwner

    // setMaxSupply()
    expect(await nftContract.getMaxSupply(zeroTokenId)).to.be.eq(zeroAmount);
    expect(await nftContract.getMaxSupply(firstTokenId)).to.be.eq(zeroAmount);
    await nftContract.setMaxSupply(zeroTokenId, hundredTokens);
    await nftContract.setMaxSupply(firstTokenId, tenTokens * 3);
    expect(await nftContract.getMaxSupply(zeroTokenId)).to.be.eq(hundredTokens);
    expect(await nftContract.getMaxSupply(firstTokenId)).to.be.eq(tenTokens * 3);

    // Check: Exceeds max supply
    const mintOne = {
      tokenId: firstTokenId,
      amount: hundredTokens,
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
      amounts: [tenTokens, hundredTokens, tenTokens],
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
      amount: tenTokens,
      salt: '0x979b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6e37',
    };
    const signatureOne = backend.signMintMessage(mintOne);

    expect(await nftContract.balanceOf(user1.address, zeroTokenId)).to.be.eq(zeroAmount);

    // mint()
    await nftContract.connect(user1).mint(signatureOne, mintOne);

    expect(await nftContract.balanceOf(user1.address, zeroTokenId)).to.be.eq(tenTokens);
    expect(await nftContract.uri(zeroTokenId)).to.be.eq(
      'ipfs://QmU48M65weZGtmVUBVbj1hgfnozAsSgoKhgZ3NyGK24pMB/0.json',
    );

    await expect(nftContract.connect(user1).mint(signatureOne, mintOne)).to.be.revertedWith(
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

    await expect(nftContract.connect(user1).mint(signatureTwo, mintThree)).to.be.revertedWith(
      'Maintainer did not sign this message!',
    );
  });

  it('Mint tokens by admin', async () => {
    expect(nftContract.connect(user1).mintAdmin(admin.address, firstTokenId, hundredTokens)).to.be
      .revertedWithCustomError; // onlyOwner

    expect(await nftContract.balanceOf(admin.address, firstTokenId)).to.be.eq(zeroAmount);
    await nftContract.connect(admin).mintAdmin(admin.address, firstTokenId, tenTokens);
    expect(await nftContract.balanceOf(admin.address, firstTokenId)).to.be.eq(tenTokens);
  });

  it('Enable token transfers', async () => {
    await expect(
      nftContract.connect(user1).safeTransferFrom(user1.address, user2.address, 0, 100, '0x'),
    ).to.be.revertedWith('Enable token transfers functionality!');
    expect(nftContract.connect(user1).enableTransfer()).to.be.revertedWithCustomError; // onlyOwner

    // enableTransfer()
    await nftContract.connect(admin).enableTransfer();
  });

  it('Transfer token when Enabled', async () => {
    expect(await nftContract.balanceOf(user1.address, zeroTokenId)).to.be.eq(tenTokens);
    expect(await nftContract.balanceOf(user2.address, zeroTokenId)).to.be.eq(zeroAmount);
    await nftContract
      .connect(user1)
      .safeTransferFrom(user1.address, user2.address, zeroTokenId, tenTokens, '0x');

    expect(await nftContract.balanceOf(user1.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await nftContract.balanceOf(user2.address, zeroTokenId)).to.be.eq(tenTokens);

    await nftContract
      .connect(user2)
      .safeBatchTransferFrom(user2.address, user1.address, [zeroTokenId], [tenTokens], '0x');

    expect(await nftContract.balanceOf(user1.address, zeroTokenId)).to.be.eq(tenTokens);
    expect(await nftContract.balanceOf(user2.address, zeroTokenId)).to.be.eq(zeroAmount);
  });

  it('Disable token transfers', async () => {
    expect(nftContract.connect(user1).disableTransfer()).to.be.revertedWithCustomError; // onlyOwner

    // disableTransfer()
    await nftContract.connect(admin).disableTransfer();

    await expect(
      nftContract
        .connect(user1)
        .safeTransferFrom(user1.address, admin.address, firstTokenId, hundredTokens, '0x'),
    ).to.be.revertedWith('Enable token transfers functionality!');
    await expect(
      nftContract
        .connect(user1)
        .safeBatchTransferFrom(user1.address, admin.address, [firstTokenId], [hundredTokens], '0x'),
    ).to.be.revertedWith('Enable token transfers functionality!');
  });

  it('Transfer token when Disabled', async () => {
    expect(await nftContract.balanceOf(admin.address, firstTokenId)).to.be.eq(tenTokens);
    expect(await nftContract.balanceOf(user2.address, firstTokenId)).to.be.eq(zeroAmount);

    await nftContract
      .connect(admin)
      .safeTransferFrom(admin.address, user2.address, firstTokenId, tenTokens / 2, '0x');

    expect(await nftContract.balanceOf(admin.address, firstTokenId)).to.be.eq(tenTokens / 2);
    expect(await nftContract.balanceOf(user2.address, firstTokenId)).to.be.eq(tenTokens / 2);

    await nftContract
      .connect(admin)
      .safeBatchTransferFrom(admin.address, user2.address, [firstTokenId], [tenTokens / 2], '0x');

    expect(await nftContract.balanceOf(admin.address, firstTokenId)).to.be.eq(zeroAmount);
    expect(await nftContract.balanceOf(user2.address, firstTokenId)).to.be.eq(tenTokens);

    await nftContract.connect(admin).enableTransfer();
    await nftContract
      .connect(user2)
      .safeTransferFrom(user2.address, admin.address, firstTokenId, tenTokens, '0x');
  });

  it('Pause and unpause contract', async () => {
    expect(nftContract.connect(user1).pause()).to.be.revertedWithCustomError; // onlyOwner

    // pause()
    await nftContract.pause();

    // Check: EnforcedPause()
    const mintOne = {
      tokenId: zeroTokenId,
      amount: tenTokens,
      salt: '0x000b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6000',
    };
    const signatureOne = backend.signMintMessage(mintOne);

    expect(await nftContract.balanceOf(user1.address, zeroTokenId)).to.be.eq(tenTokens);
    await expect(
      nftContract
        .connect(user1)
        .safeTransferFrom(user1.address, user2.address, zeroTokenId, tenTokens, []),
    ).to.be.rejectedWith('EnforcedPause()');
    await expect(nftContract.connect(user1).mint(signatureOne, mintOne)).to.be.rejectedWith(
      'EnforcedPause()',
    );
    expect(await nftContract.balanceOf(user1.address, zeroTokenId)).to.be.eq(tenTokens);

    expect(nftContract.connect(user1).unpause()).to.be.revertedWithCustomError; // onlyOwner

    // unpause()
    await nftContract.unpause();

    // mint()
    expect(await nftContract.balanceOf(user2.address, zeroTokenId)).to.be.eq(zeroAmount);
    await nftContract.connect(user2).mint(signatureOne, mintOne);
    expect(await nftContract.balanceOf(user2.address, zeroTokenId)).to.be.eq(tenTokens);
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

    expect(await nftContract.balanceOf(user3.address, zeroTokenId)).to.be.eq(zeroAmount);
    expect(await nftContract.balanceOf(user3.address, firstTokenId)).to.be.eq(zeroAmount);
    expect(await nftContract.balanceOf(user3.address, secondTokenId)).to.be.eq(zeroAmount);

    // mintBatch()
    await nftContract.connect(user3).mintBatch(signatureTwo, mintTwo);

    expect(await nftContract.balanceOf(user3.address, zeroTokenId)).to.be.eq(tenTokens);
    expect(await nftContract.balanceOf(user3.address, firstTokenId)).to.be.eq(tenTokens);
    expect(await nftContract.balanceOf(user3.address, secondTokenId)).to.be.eq(tenTokens);
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

  it('Burn tokens by admin', async () => {
    // burnAdmin()
    expect(nftContract.connect(user1).burnAdmin(user3.address, firstTokenId, tenTokens)).to.be
      .revertedWithCustomError; // onlyOwner
    expect(await nftContract.balanceOf(user3.address, firstTokenId)).to.be.eq(tenTokens);
    await nftContract.connect(admin).burnAdmin(user3.address, firstTokenId, tenTokens);
    expect(await nftContract.balanceOf(user3.address, firstTokenId)).to.be.eq(zeroAmount);

    // burn()
    expect(nftContract.connect(user1).burn(user3.address, firstTokenId, tenTokens)).to.be
      .revertedWithCustomError; // onlyOwner
    // await nftContract.connect(admin).mintAdmin(admin.address, firstTokenId, hundredTokens);
    expect(await nftContract.balanceOf(admin.address, firstTokenId)).to.be.eq(tenTokens);
    await nftContract.connect(admin).burn(admin.address, firstTokenId, tenTokens);
    expect(await nftContract.balanceOf(admin.address, firstTokenId)).to.be.eq(zeroAmount);

    // burnBatch()
    expect(nftContract.connect(user1).burnBatch(user3.address, [firstTokenId], [tenTokens])).to.be
      .revertedWithCustomError; // onlyOwner
    await nftContract.connect(admin).mintAdmin(admin.address, firstTokenId, hundredTokens);
    expect(await nftContract.balanceOf(admin.address, firstTokenId)).to.be.eq(hundredTokens);
    await nftContract.connect(admin).burnBatch(admin.address, [firstTokenId], [hundredTokens]);
    expect(await nftContract.balanceOf(admin.address, firstTokenId)).to.be.eq(zeroAmount);
  });

  it('Set mint maintainer', async () => {
    expect(nftContract.connect(user1).setMintingMaintainer(user2.address)).to.be
      .revertedWithCustomError; // onlyOwner

    expect(await nftContract.mintingMaintainer()).to.be.eq(mintMaintainer.address);
    await nftContract.setMintingMaintainer(user2.address);
    expect(await nftContract.mintingMaintainer()).to.be.eq(user2.address);
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
