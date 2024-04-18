import { ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Runner2060coin } from '../typechain-types';
import { Wallet } from 'ethers';
import { joinSignature } from 'ethers/lib/utils';
import { TypedDataUtils } from 'ethers-eip712';

describe('Runner2060coin tests', async () => {
  const zeroAmount = 0;
  const tokenAmount = 100;
  const tokenLargeAmount = 1000;

  let tokenContract: Runner2060coin;
  let mintMaintainer: Wallet;
  let signers: SignerWithAddress[];
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let backend: BackendMock;
  before(async () => {
    mintMaintainer = ethers.Wallet.createRandom();
    signers = await ethers.getSigners();
    admin = signers[0];
    user1 = signers[1];
    user2 = signers[2];
  });

  it('Deploy contract', async () => {
    const Factory = await ethers.getContractFactory('Runner2060coin');
    const runner2060 = await Factory.deploy(mintMaintainer.address, admin.address);

    expect(runner2060.address).to.not.eq(ethers.constants.AddressZero);
    tokenContract = runner2060 as Runner2060coin;
  });

  it('Mint tokens by user', async () => {
    backend = new BackendMock(31337, tokenContract.address, mintMaintainer);

    // Mint tokens
    let mintOne = {
      userAddress: user1.address,
      amount: tokenLargeAmount,
      salt: '0x979b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6e37',
    };
    let signatureOne = backend.signMintMessage(mintOne);

    expect(await tokenContract.balanceOf(user1.address)).to.be.eq(zeroAmount);

    // mint()
    await tokenContract.connect(user1).mint(signatureOne, mintOne);

    expect(await tokenContract.balanceOf(user1.address)).to.be.eq(tokenLargeAmount);
    await expect(tokenContract.connect(user1).mint(signatureOne, mintOne)).to.be.revertedWith(
      'This message has already been executed!',
    );

    // Check: Maintainer did not sign this message!
    let mintTwo = {
      userAddress: user1.address,
      amount: tokenLargeAmount,
      salt: '0x222b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6222',
    };
    let signatureTwo = backend.signMintMessage(mintTwo);

    await expect(tokenContract.connect(user1).mint(signatureTwo, mintOne)).to.be.revertedWith(
      'Maintainer did not sign this message!',
    );
  });

  it('Mint tokens by admin', async () => {
    expect(tokenContract.connect(user1).mintByAdmin(user2.address, tokenAmount)).to.be
      .revertedWithCustomError; // onlyRole

    expect(await tokenContract.balanceOf(user2.address)).to.be.eq(zeroAmount);
    await tokenContract.connect(admin).mintByAdmin(user2.address, tokenAmount);
    expect(await tokenContract.balanceOf(user2.address)).to.be.eq(tokenAmount);
  });

  it('Pause and unpause contract', async () => {
    expect(tokenContract.connect(user1).pause()).to.be.revertedWithCustomError; // onlyRole

    // pause()
    await tokenContract.pause();

    // Check: EnforcedPause()
    await expect(
      tokenContract.connect(user1).transfer(user2.address, tokenAmount),
    ).to.be.rejectedWith('EnforcedPause()');
    await expect(
      tokenContract.connect(admin).mintByAdmin(user2.address, tokenAmount),
    ).to.be.rejectedWith('EnforcedPause()');

    expect(tokenContract.connect(user1).unpause()).to.be.revertedWithCustomError; // onlyRole

    // unpause()
    await tokenContract.unpause();

    // mintByAdmin()
    expect(await tokenContract.balanceOf(user2.address)).to.be.eq(tokenAmount);
    await tokenContract.connect(admin).mintByAdmin(user2.address, tokenAmount);
    expect(await tokenContract.balanceOf(user2.address)).to.be.eq(tokenAmount * 2);
  });

  it('Burn tokens by user', async () => {
    expect(await tokenContract.balanceOf(user2.address)).to.be.eq(tokenAmount * 2);
    await tokenContract.connect(user2).burn(tokenAmount);
    expect(await tokenContract.balanceOf(user2.address)).to.be.eq(tokenAmount);
  });

  it('Burn tokens by admin', async () => {
    expect(tokenContract.connect(user1).burnByAdmin(user2.address, tokenAmount)).to.be
      .revertedWithCustomError; // onlyRole

    expect(await tokenContract.balanceOf(user2.address)).to.be.eq(tokenAmount);
    await tokenContract.connect(admin).burnByAdmin(user2.address, tokenAmount);
    expect(await tokenContract.balanceOf(user2.address)).to.be.eq(zeroAmount);
  });

  it('Set mint maintainer', async () => {
    expect(tokenContract.connect(user1).setMintingMaintainer(user2.address)).to.be
      .revertedWithCustomError; // onlyRole

    expect(await tokenContract.getMintingMaintainer()).to.be.eq(mintMaintainer.address);
    await tokenContract.setMintingMaintainer(user2.address);
    expect(await tokenContract.getMintingMaintainer()).to.be.eq(user2.address);
  });

  it('Grant and revoke role', async () => {
    const adminRole = '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775';

    expect(await tokenContract.connect(user1).hasRole(adminRole, user1.address)).to.be.eq(false);

    expect(tokenContract.connect(user1).grantRole(adminRole, user1.address)).to.be
      .revertedWithCustomError; // onlyRole

    // grantRole()
    await tokenContract.grantRole(adminRole, user1.address);
    expect(await tokenContract.connect(user1).hasRole(adminRole, user1.address)).to.be.eq(true);

    // revokeRole()
    await tokenContract.revokeRole(adminRole, admin.address);
    expect(await tokenContract.hasRole(adminRole, admin.address)).to.be.eq(false);
  });
});

interface MintInterface {
  userAddress: string;
  amount: number;
  salt: string;
}

class BackendMock {
  /// The EIP-712 domain name used for computing the domain separator.
  DOMAIN_NAME = 'Runner2060coin';
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

    const signatureOne = joinSignature(this.maintainer._signingKey().signDigest(message));
    return Buffer.from(signatureOne.slice(2), 'hex');
  }

  private constructMint({ userAddress, amount, salt }: MintInterface): string {
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
          { name: 'userAddress', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'salt', type: 'bytes32' },
        ],
      },
      primaryType: 'MintingParams',
      message: {
        userAddress: userAddress,
        amount: amount,
        salt: salt,
      },
    };
    const digest = TypedDataUtils.encodeDigest(data);
    const digestHex = ethers.utils.hexlify(digest);
    return digestHex;
  }
}
