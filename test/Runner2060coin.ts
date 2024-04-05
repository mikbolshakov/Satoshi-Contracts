import { ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Runner2060coin } from '../typechain-types';
import { Wallet } from 'ethers';
import { joinSignature } from 'ethers/lib/utils';
import { TypedDataUtils } from 'ethers-eip712';

describe('Runner2060coin tests', async () => {
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
    const runner2060 = await Factory.deploy(
      mintMaintainer.address,
      admin.address,
      admin.address,
    );
    expect(runner2060.address).to.not.eq(ethers.constants.AddressZero);
    tokenContract = runner2060 as Runner2060coin;
  });

  it('Mint tokens by user', async () => {
    backend = new BackendMock(31337, tokenContract.address, mintMaintainer);

    let mint1 = {
      amount: 10000,
      salt: '0x979b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6e37',
      userAddress: user1.address,
    };

    let signature = backend.signMintMessage(mint1);

    let mint2 = {
      amount: 10000,
      salt: '0x869b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6e26',
      userAddress: user1.address,
    };

    await expect(
      tokenContract.connect(user1).mint(signature, mint2),
    ).to.be.revertedWith('Maintainer did not sign this message!');

    expect(await tokenContract.balanceOf(user1.address)).to.be.eq(0);
    await tokenContract.connect(user1).mint(signature, mint1);
    expect(await tokenContract.balanceOf(user1.address)).to.be.eq(10000);

    await expect(
      tokenContract.connect(user1).mint(signature, mint1),
    ).to.be.revertedWith('This message has already been executed!');
  });

  it('Mint tokens by admin', async () => {
    const amount = 100;

    expect(tokenContract.connect(user1).mintByAdmin(user2.address, amount)).to
      .be.revertedWithCustomError; // onlyRole

    expect(await tokenContract.balanceOf(user2.address)).to.be.eq(0);
    await tokenContract.connect(admin).mintByAdmin(user2.address, amount);
    expect(await tokenContract.balanceOf(user2.address)).to.be.eq(amount);
  });

  it('Pause and unpause contract', async () => {
    const amount = 100;

    expect(tokenContract.connect(user1).pause()).to.be.revertedWithCustomError; // onlyRole
    await tokenContract.pause();

    await expect(
      tokenContract.connect(user1).transfer(user2.address, amount),
    ).to.be.rejectedWith('EnforcedPause()');
    await expect(
      tokenContract.connect(admin).mintByAdmin(user2.address, amount),
    ).to.be.rejectedWith('EnforcedPause()');

    expect(tokenContract.connect(user1).unpause()).to.be
      .revertedWithCustomError; // onlyRole
    await tokenContract.unpause();

    expect(await tokenContract.balanceOf(user2.address)).to.be.eq(amount);
    await tokenContract.connect(admin).mintByAdmin(user2.address, amount);
    expect(await tokenContract.balanceOf(user2.address)).to.be.eq(amount * 2);
  });

  it('Burn tokens by user', async () => {
    const amount = 100;

    expect(await tokenContract.balanceOf(user2.address)).to.be.eq(amount * 2);
    await tokenContract.connect(user2).burn(amount);
    expect(await tokenContract.balanceOf(user2.address)).to.be.eq(amount);
  });

  it('Burn tokens by admin', async () => {
    const amount = 100;

    expect(tokenContract.connect(user1).burnByAdmin(user2.address, amount)).to
      .be.revertedWithCustomError; // onlyRole

    expect(await tokenContract.balanceOf(user2.address)).to.be.eq(amount);
    await tokenContract.connect(admin).burnByAdmin(user2.address, amount);
    expect(await tokenContract.balanceOf(user2.address)).to.be.eq(0);
  });

  it('Set mint maintainer', async () => {
    expect(tokenContract.connect(user1).setMintingMaintainer(user2.address)).to
      .be.revertedWithCustomError; // onlyRole

    expect(await tokenContract.getMintingMaintainer()).to.be.eq(
      mintMaintainer.address,
    );
    await tokenContract.setMintingMaintainer(user2.address);
    expect(await tokenContract.getMintingMaintainer()).to.be.eq(user2.address);
  });

  it('Grant and revoke role', async () => {
    const adminRole =
      '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775';

    expect(
      await tokenContract.connect(user1).hasRole(adminRole, user1.address),
    ).to.be.eq(false);

    expect(tokenContract.connect(user1).grantRole(adminRole, user1.address)).to
      .be.revertedWithCustomError; // onlyRole

    await tokenContract.grantRole(adminRole, user1.address);
    expect(
      await tokenContract.connect(user1).hasRole(adminRole, user1.address),
    ).to.be.eq(true);

    await tokenContract.revokeRole(adminRole, admin.address);
    expect(await tokenContract.hasRole(adminRole, admin.address)).to.be.eq(
      false,
    );
  });
});

interface MintInterface {
  amount: number;
  salt: string;
  userAddress: string;
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

    const signature = joinSignature(
      this.maintainer._signingKey().signDigest(message),
    );
    return Buffer.from(signature.slice(2), 'hex');
  }

  private constructMint({ amount, salt, userAddress }: MintInterface): string {
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
          { name: 'amount', type: 'uint256' },
          { name: 'salt', type: 'bytes32' },
          { name: 'userAddress', type: 'address' },
        ],
      },
      primaryType: 'MintingParams',
      message: {
        amount: amount,
        salt: salt,
        userAddress: userAddress,
      },
    };
    const digest = TypedDataUtils.encodeDigest(data);
    const digestHex = ethers.utils.hexlify(digest);
    return digestHex;
  }
}
