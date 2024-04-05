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

  it('mints', async () => {
    expect(await tokenContract.getMintingMaintainer()).to.be.eq(
      mintMaintainer.address,
    );
    backend = new BackendMock(31337, tokenContract.address, mintMaintainer);

    let mint = {
      amount: 10000,
      salt: 223,
    };

    let signature = backend.signMintMessage(mint);

    expect(await tokenContract.balanceOf(user1.address)).to.be.eq(0);
    await tokenContract.connect(user1).mint(signature, mint);
    expect(await tokenContract.balanceOf(user1.address)).to.be.eq(10000);
  });
});

interface MintInterface {
  amount: number;
  salt: number;
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

  private constructMint({ amount, salt }: MintInterface): string {
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
          { name: 'salt', type: 'uint256' },
        ],
      },
      primaryType: 'MintingParams',
      message: {
        amount: amount,
        salt: salt,
      },
    };
    const digest = TypedDataUtils.encodeDigest(data);
    const digestHex = ethers.utils.hexlify(digest);
    return digestHex;
  }
}
