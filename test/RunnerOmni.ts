import { deployments, ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { RunnerOmni } from '../typechain-types';
import { Wallet, Contract, ContractFactory } from 'ethers';
import { joinSignature } from 'ethers/lib/utils';
import { TypedDataUtils } from 'ethers-eip712';
import { Options } from '@layerzerolabs/lz-v2-utilities';
import { BigNumber } from 'ethers';

const zeroAmount = 0;
const hundredTokens = ethers.utils.parseEther('100');
const thousandTokens = ethers.utils.parseEther('1000');

const eidLineaMainnet = 30183;
const eidScrollMainnet = 30214;

describe('RunnerOmni tests', async () => {
  // contracts
  let EndpointV2Mock: ContractFactory;
  let erc20Linea: RunnerOmni;
  let erc20Scroll: RunnerOmni;
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
  let thirdPartyDeployer: SignerWithAddress;

  // backend
  let backend: BackendMock;

  before(async () => {
    mintMaintainer = ethers.Wallet.createRandom();
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

    const Factory = await ethers.getContractFactory('RunnerOmni');

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

    erc20Linea = runner2060Linea as RunnerOmni;
    erc20Scroll = runner2060Scroll as RunnerOmni;
  });

  it('Match omni contracts on Linea by thirdPartyDeployer and adminLinea', async () => {
    await mockEndpointV2Linea
      .connect(thirdPartyDeployer)
      .setDestLzEndpoint(erc20Scroll.address, mockEndpointV2Scroll.address);

    expect(
      erc20Linea
        .connect(thirdPartyDeployer)
        .setPeer(eidScrollMainnet, ethers.utils.zeroPad(erc20Scroll.address, 32)),
    ).to.be.revertedWithCustomError; // onlyOwner

    await erc20Linea
      .connect(adminLinea)
      .setPeer(eidScrollMainnet, ethers.utils.zeroPad(erc20Scroll.address, 32));
  });

  it('Match omni contracts on Scroll by thirdPartyDeployer and adminScroll', async () => {
    await mockEndpointV2Scroll
      .connect(thirdPartyDeployer)
      .setDestLzEndpoint(erc20Linea.address, mockEndpointV2Linea.address);

    expect(
      erc20Linea
        .connect(thirdPartyDeployer)
        .setPeer(eidScrollMainnet, ethers.utils.zeroPad(erc20Scroll.address, 32)),
    ).to.be.revertedWithCustomError; // onlyOwner

    await erc20Scroll
      .connect(adminScroll)
      .setPeer(eidLineaMainnet, ethers.utils.zeroPad(erc20Linea.address, 32));
  });

  it('Enable backend', async () => {
    backend = new BackendMock(31337, erc20Linea.address, mintMaintainer);
  });

  it('Mint tokens by user', async () => {
    // Mint tokens
    let mintOne = {
      userAddress: user10.address,
      amount: thousandTokens,
      salt: '0x979b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6e37',
    };
    let signatureOne = backend.signMintMessage(mintOne);

    expect(await erc20Linea.balanceOf(user10.address)).to.be.eq(zeroAmount);

    // mint()
    await erc20Linea.connect(user10).mint(signatureOne, mintOne);

    expect(await erc20Linea.balanceOf(user10.address)).to.be.eq(thousandTokens);
    await expect(erc20Linea.connect(user10).mint(signatureOne, mintOne)).to.be.revertedWith(
      'This message has already been executed!',
    );

    // Check: Maintainer did not sign this message!
    let mintTwo = {
      userAddress: user10.address,
      amount: thousandTokens,
      salt: '0x222b141b8bcd3ba17815cd76811f1fca1cabaa9d51f7c00712606970f01d6222',
    };
    let signatureTwo = backend.signMintMessage(mintTwo);

    await expect(erc20Linea.connect(user10).mint(signatureTwo, mintOne)).to.be.revertedWith(
      'Maintainer did not sign this message!',
    );
  });

  it('Mint tokens by admin', async () => {
    expect(erc20Linea.connect(user10).mintByAdmin(user20.address, hundredTokens)).to.be
      .revertedWithCustomError; // onlyOwner

    expect(await erc20Linea.balanceOf(user20.address)).to.be.eq(zeroAmount);
    await erc20Linea.connect(adminLinea).mintByAdmin(user20.address, hundredTokens);
    expect(await erc20Linea.balanceOf(user20.address)).to.be.eq(hundredTokens);
  });

  it('Pause and unpause contract', async () => {
    expect(erc20Linea.connect(user10).pause()).to.be.revertedWithCustomError; // onlyOwner

    // pause()
    await erc20Linea.connect(adminLinea).pause();

    // Check: EnforcedPause()
    await expect(
      erc20Linea.connect(user10).transfer(user20.address, hundredTokens),
    ).to.be.rejectedWith('EnforcedPause()');
    await expect(
      erc20Linea.connect(adminLinea).mintByAdmin(user20.address, hundredTokens),
    ).to.be.rejectedWith('EnforcedPause()');

    expect(erc20Linea.connect(user10).unpause()).to.be.revertedWithCustomError; // onlyOwner

    // unpause()
    await erc20Linea.connect(adminLinea).unpause();

    // mintByAdmin()
    expect(await erc20Linea.balanceOf(user20.address)).to.be.eq(hundredTokens);
    await erc20Linea.connect(adminLinea).mintByAdmin(user20.address, hundredTokens);
    expect(await erc20Linea.balanceOf(user20.address)).to.be.eq(hundredTokens.mul(2));
  });

  it('Burn tokens by user', async () => {
    expect(await erc20Linea.balanceOf(user20.address)).to.be.eq(hundredTokens.mul(2));
    await erc20Linea.connect(user20).burn(hundredTokens);
    expect(await erc20Linea.balanceOf(user20.address)).to.be.eq(hundredTokens);
  });

  it('Burn tokens by admin', async () => {
    expect(erc20Linea.connect(user10).burnByAdmin(user20.address, hundredTokens)).to.be
      .revertedWithCustomError; // onlyOwner

    expect(await erc20Linea.balanceOf(user20.address)).to.be.eq(hundredTokens);
    await erc20Linea.connect(adminLinea).burnByAdmin(user20.address, hundredTokens);
    expect(await erc20Linea.balanceOf(user20.address)).to.be.eq(zeroAmount);
  });

  it('Set mint maintainer', async () => {
    expect(erc20Linea.connect(user10).setMintingMaintainer(user20.address)).to.be
      .revertedWithCustomError; // onlyOwner

    expect(await erc20Linea.getMintingMaintainer()).to.be.eq(mintMaintainer.address);
    await erc20Linea.connect(adminLinea).setMintingMaintainer(user20.address);
    expect(await erc20Linea.getMintingMaintainer()).to.be.eq(user20.address);
  });

  it('Send tokens from Linea to Scroll (adminLinea => adminScroll)', async () => {
    await erc20Linea.connect(adminLinea).mintByAdmin(adminLinea.address, thousandTokens);

    expect(await erc20Linea.totalSupply()).to.be.eq(thousandTokens.mul(2));
    expect(await erc20Scroll.totalSupply()).to.be.eq(zeroAmount);

    expect(await erc20Linea.balanceOf(adminLinea.address)).to.be.eq(thousandTokens);
    expect(await erc20Scroll.balanceOf(adminLinea.address)).to.be.eq(zeroAmount);
    expect(await erc20Linea.balanceOf(adminScroll.address)).to.be.eq(zeroAmount);
    expect(await erc20Scroll.balanceOf(adminScroll.address)).to.be.eq(zeroAmount);

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

    const [nativeFee] = await erc20Linea.quoteSend(sendParam, false); // false - Flag indicating whether the caller is paying in the LZ token.

    const MessagingFee = {
      nativeFee: nativeFee,
      lzTokenFee: 0,
    };
    await erc20Linea
      .connect(adminLinea)
      .send(sendParam, MessagingFee, adminLinea.address, { value: nativeFee });

    expect(await erc20Linea.balanceOf(adminLinea.address)).to.be.eq(
      thousandTokens.sub(hundredTokens),
    );
    expect(await erc20Scroll.balanceOf(adminLinea.address)).to.be.eq(zeroAmount);
    expect(await erc20Linea.balanceOf(adminScroll.address)).to.be.eq(zeroAmount);
    expect(await erc20Scroll.balanceOf(adminScroll.address)).to.be.eq(hundredTokens);

    expect(await erc20Linea.totalSupply()).to.be.eq(thousandTokens.mul(2).sub(hundredTokens));
    expect(await erc20Scroll.totalSupply()).to.be.eq(hundredTokens);
  });

  it('Send tokens from Linea to Scroll (user10 => user10)', async () => {
    expect(await erc20Linea.totalSupply()).to.be.eq(thousandTokens.mul(2).sub(hundredTokens));
    expect(await erc20Scroll.totalSupply()).to.be.eq(hundredTokens);

    expect(await erc20Linea.balanceOf(user10.address)).to.be.eq(thousandTokens);
    expect(await erc20Scroll.balanceOf(user10.address)).to.be.eq(zeroAmount);

    const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();

    const sendParam = {
      dstEid: eidScrollMainnet,
      to: ethers.utils.zeroPad(user10.address, 32),
      amountLD: hundredTokens,
      minAmountLD: hundredTokens,
      extraOptions: options,
      composeMsg: '0x',
      oftCmd: '0x',
    };

    const [nativeFee] = await erc20Linea.quoteSend(sendParam, false); // false - Flag indicating whether the caller is paying in the LZ token.

    const MessagingFee = {
      nativeFee: nativeFee,
      lzTokenFee: 0,
    };
    await erc20Linea
      .connect(user10)
      .send(sendParam, MessagingFee, adminLinea.address, { value: nativeFee });

    expect(await erc20Linea.balanceOf(user10.address)).to.be.eq(thousandTokens.sub(hundredTokens));
    expect(await erc20Scroll.balanceOf(user10.address)).to.be.eq(hundredTokens);

    expect(await erc20Linea.totalSupply()).to.be.eq(thousandTokens.mul(2).sub(hundredTokens.mul(2)));
    expect(await erc20Scroll.totalSupply()).to.be.eq(hundredTokens.mul(2));
  });

  it('Send tokens from Linea to Scroll (user10 => user20)', async () => {
    expect(await erc20Linea.totalSupply()).to.be.eq(thousandTokens.mul(2).sub(hundredTokens.mul(2)));
    expect(await erc20Scroll.totalSupply()).to.be.eq(hundredTokens.mul(2));

    expect(await erc20Linea.balanceOf(user10.address)).to.be.eq(thousandTokens.sub(hundredTokens));
    expect(await erc20Scroll.balanceOf(user20.address)).to.be.eq(zeroAmount);

    const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();

    const sendParam = {
      dstEid: eidScrollMainnet,
      to: ethers.utils.zeroPad(user20.address, 32),
      amountLD: hundredTokens,
      minAmountLD: hundredTokens,
      extraOptions: options,
      composeMsg: '0x',
      oftCmd: '0x',
    };

    const [nativeFee] = await erc20Linea.quoteSend(sendParam, false); // false - Flag indicating whether the caller is paying in the LZ token.

    const MessagingFee = {
      nativeFee: nativeFee,
      lzTokenFee: 0,
    };
    await erc20Linea
      .connect(user10)
      .send(sendParam, MessagingFee, user10.address, { value: nativeFee });

    expect(await erc20Linea.balanceOf(user10.address)).to.be.eq(
      thousandTokens.sub(hundredTokens.mul(2)),
    );
    expect(await erc20Scroll.balanceOf(user20.address)).to.be.eq(hundredTokens);

    expect(await erc20Linea.totalSupply()).to.be.eq(thousandTokens.mul(2).sub(hundredTokens.mul(3)));
    expect(await erc20Scroll.totalSupply()).to.be.eq(hundredTokens.mul(3));
  });

  it('Send tokens from Scroll to Linea (user20 => user10)', async () => {
    expect(await erc20Linea.totalSupply()).to.be.eq(thousandTokens.mul(2).sub(hundredTokens.mul(3)));
    expect(await erc20Scroll.totalSupply()).to.be.eq(hundredTokens.mul(3));

    expect(await erc20Linea.balanceOf(user10.address)).to.be.eq(
      thousandTokens.sub(hundredTokens.mul(2)),
    );
    expect(await erc20Scroll.balanceOf(user20.address)).to.be.eq(hundredTokens);

    const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();

    const sendParam = {
      dstEid: eidLineaMainnet,
      to: ethers.utils.zeroPad(user10.address, 32),
      amountLD: hundredTokens,
      minAmountLD: hundredTokens,
      extraOptions: options,
      composeMsg: '0x',
      oftCmd: '0x',
    };

    const [nativeFee] = await erc20Scroll.quoteSend(sendParam, false); // false - Flag indicating whether the caller is paying in the LZ token.

    const MessagingFee = {
      nativeFee: nativeFee,
      lzTokenFee: 0,
    };
    await erc20Scroll
      .connect(user20)
      .send(sendParam, MessagingFee, user10.address, { value: nativeFee });

    expect(await erc20Linea.balanceOf(user10.address)).to.be.eq(thousandTokens.sub(hundredTokens));
    expect(await erc20Scroll.balanceOf(user20.address)).to.be.eq(zeroAmount);

    expect(await erc20Linea.totalSupply()).to.be.eq(thousandTokens.mul(2).sub(hundredTokens.mul(2)));
    expect(await erc20Scroll.totalSupply()).to.be.eq(hundredTokens.mul(2));
  });

  it('Send tokens from Linea to Scroll (user10 => user20) revert msg.sender', async () => {
    expect(await erc20Linea.balanceOf(user10.address)).to.be.eq(thousandTokens.sub(hundredTokens));
    expect(await erc20Scroll.balanceOf(user20.address)).to.be.eq(zeroAmount);

    const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();

    const sendParam = {
      dstEid: eidScrollMainnet,
      to: ethers.utils.zeroPad(user20.address, 32),
      amountLD: hundredTokens,
      minAmountLD: hundredTokens,
      extraOptions: options,
      composeMsg: '0x',
      oftCmd: '0x',
    };

    let [nativeFee] = await erc20Linea.quoteSend(sendParam, false); // false - Flag indicating whether the caller is paying in the LZ token.

    const MessagingFee = {
      nativeFee: nativeFee,
      lzTokenFee: 0,
    };

    // user20 => user20
    expect(
      erc20Linea
        .connect(user20)
        .send(sendParam, MessagingFee, user10.address, { value: nativeFee }),
    ).to.be.revertedWithCustomError; // "ERC20InsufficientBalance(\"0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65\", 0, 100000000000000000000)"

    // user10 => user20
    await erc20Linea
      .connect(user10)
      .send(sendParam, MessagingFee, user10.address, { value: nativeFee });

    expect(await erc20Linea.balanceOf(user10.address)).to.be.eq(
      thousandTokens.sub(hundredTokens.mul(2)),
    );
    expect(await erc20Scroll.balanceOf(user20.address)).to.be.eq(hundredTokens);

    // adminLinea => user20
    expect(await erc20Linea.balanceOf(adminLinea.address)).to.be.eq(
      thousandTokens.sub(hundredTokens),
    );
    await erc20Linea
      .connect(adminLinea)
      .send(sendParam, MessagingFee, user10.address, { value: nativeFee });
    expect(await erc20Linea.balanceOf(adminLinea.address)).to.be.eq(
      thousandTokens.sub(hundredTokens.mul(2)),
    );

    expect(await erc20Linea.balanceOf(user10.address)).to.be.eq(
      thousandTokens.sub(hundredTokens.mul(2)),
    );
    expect(await erc20Scroll.balanceOf(user20.address)).to.be.eq(hundredTokens.mul(2));
  });

  it('Send tokens from Linea to Scroll (user10 => user20) revert params', async () => {
    const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();

    // changed dstEid: eidScrollMainnet => eidLineaMainnet
    const sendParam2 = {
      dstEid: eidLineaMainnet,
      to: ethers.utils.zeroPad(user20.address, 32),
      amountLD: hundredTokens,
      minAmountLD: hundredTokens,
      extraOptions: options,
      composeMsg: '0x',
      oftCmd: '0x',
    };

    // reverted: need to change erc20Linea to erc20Scroll, because eidLineaMainnet in sendParam2
    expect(erc20Linea.quoteSend(sendParam2, false)).to.be.revertedWithCustomError;
  });

  it('Send tokens from Linea to Scroll (user10 => user20)', async () => {
    const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();
    const sendParam3 = {
      dstEid: eidScrollMainnet,
      to: ethers.utils.zeroPad(user20.address, 32),
      amountLD: hundredTokens,
      minAmountLD: hundredTokens,
      extraOptions: options,
      composeMsg: '0x',
      oftCmd: '0x',
    };

    let [nativeFee] = await erc20Linea.quoteSend(sendParam3, false);

    const MessagingFee3 = {
      nativeFee: nativeFee,
      lzTokenFee: 0,
    };

    expect(await erc20Linea.balanceOf(user10.address)).to.be.eq(
      thousandTokens.sub(hundredTokens.mul(2)),
    );
    expect(await erc20Scroll.balanceOf(user20.address)).to.be.eq(hundredTokens.mul(2));

    // user10 => user20
    await erc20Linea
      .connect(user10)
      .send(sendParam3, MessagingFee3, user10.address, { value: nativeFee });

    expect(await erc20Linea.balanceOf(user10.address)).to.be.eq(
      thousandTokens.sub(hundredTokens.mul(3)),
    );
    expect(await erc20Scroll.balanceOf(user20.address)).to.be.eq(hundredTokens.mul(3));
  });

  it('Send tokens from Scroll to Linea (user20 => user20)', async () => {
    const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();
    const sendParam4 = {
      dstEid: eidLineaMainnet,
      to: ethers.utils.zeroPad(user20.address, 32),
      amountLD: hundredTokens,
      minAmountLD: hundredTokens,
      extraOptions: options,
      composeMsg: '0x',
      oftCmd: '0x',
    };

    let [nativeFee] = await erc20Scroll.quoteSend(sendParam4, false);

    const MessagingFee4 = {
      nativeFee: nativeFee,
      lzTokenFee: 0,
    };

    expect(await erc20Linea.balanceOf(user20.address)).to.be.eq(zeroAmount);
    expect(await erc20Scroll.balanceOf(user20.address)).to.be.eq(hundredTokens.mul(3));

    // user20 => user20
    await erc20Scroll
      .connect(user20)
      .send(sendParam4, MessagingFee4, user20.address, { value: nativeFee });

    expect(await erc20Linea.balanceOf(user20.address)).to.be.eq(hundredTokens);
    expect(await erc20Scroll.balanceOf(user20.address)).to.be.eq(hundredTokens.mul(2));
  });
});

interface MintInterface {
  userAddress: string;
  amount: BigNumber;
  salt: string;
}

class BackendMock {
  /// The EIP-712 domain name used for computing the domain separator.
  DOMAIN_NAME = 'RunnerOmni';
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
