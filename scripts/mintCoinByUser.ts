import { ethers } from 'ethers';
import { config } from 'dotenv';
import { Wallet } from 'ethers';
import { joinSignature } from 'ethers/lib/utils';
import { TypedDataUtils } from 'ethers-eip712';
import contractAbi from '../ABI/abiRunner2060coin.json';
import { chainParams as source } from '../chainParams/scrollMainnetParams';
config();

// npx ts-node scripts/mintCoinByUser.ts
const provider = new ethers.providers.JsonRpcProvider(source.rpcUrl);
const contract = new ethers.Contract(source.contractAddress, contractAbi, provider);

const user = new ethers.Wallet(process.env.USER_PRIVATE_KEY as string, provider);
const admin = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY as string, provider);
const mintAmount = ethers.utils.parseEther('1000');

interface MintInterface {
  userAddress: string;
  amount: ethers.BigNumber;
  salt: string;
}

class BackendMock {
  DOMAIN_NAME = 'RunnerOmni';
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

function generateSalt(): string {
  const timestamp = Math.floor(Date.now() / 1000);
  return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['uint256'], [timestamp]));
}

async function mint() {
  try {
    let backend = new BackendMock(source.chainId, contract.address, admin);

    let mintOne = {
      userAddress: user.address,
      amount: mintAmount,
      salt: generateSalt(),
    };
    let signatureOne = backend.signMintMessage(mintOne);

    let tx = await contract.connect(user).mint(signatureOne, mintOne);

    await tx.wait();
    console.log('Mint success');
  } catch (error: any) {
    console.error('Minting error:', error.message);
  }
}

mint();
