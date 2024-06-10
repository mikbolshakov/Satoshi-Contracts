import { ethers } from 'ethers';
import { config } from 'dotenv';
import { Wallet } from 'ethers';
import { joinSignature } from 'ethers/lib/utils';
import { TypedDataUtils } from 'ethers-eip712';
import abiRunner from '../ABI/abiRunner2060.json';
config();

// npx ts-node scripts/mintRunner2060.ts
const erc20Linea = '0x71589e8A956Cc2bc86593Cc5d6f9671f44178D0F';
const provider = new ethers.providers.JsonRpcProvider(process.env.LINEA_SEPOLIA);
const user = new ethers.Wallet('e714b8d4cdbfea5b18431d237e7e33e48bffa4a71d794fa3fa608bad5818cde4', provider);
const admin = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY as string, provider);
const contract = new ethers.Contract(erc20Linea, abiRunner, provider);

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

async function mint() {
  try {
    let backend = new BackendMock(59141, contract.address, admin);

    let mintOne = {
      userAddress: user.address,
      amount: 5000000000000000,
      salt: '0x777b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6e37',
    };
    let signatureOne = backend.signMintMessage(mintOne);

    let tx = await contract.connect(user).mint(signatureOne, mintOne);

    await tx.wait();
  } catch (error: any) {
    console.error('Minting error:', error);
  }
}

mint();
