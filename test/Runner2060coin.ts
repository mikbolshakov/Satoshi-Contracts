import { ethers } from 'hardhat';
import { expect } from 'chai';
import { Runner2060coin } from '../typechain-types';
import { Wallet } from 'ethers';
// import { TypedDataUtils } from 'eip712';
import hre from 'hardhat';

describe('Hex Planet tests', () => {
  let nftContract: Runner2060coin;
  let backend: BackendMock;
  before(async () => {
    const [admin, user1, user2] = await hre.ethers.getSigners();
    const mintingMaintainer = ethers.Wallet.createRandom();
  });

  //     it("Deploy NFT contract", async () => {
  //         const Factory = await ethers.getContractFactory("HexPlanet");
  //         const mintingCont = await Factory.deploy(
  //             admin.address,
  //             mintingMaintainer.address
  //         );
  //         expect(mintingCont.address).to.not.eq(ethers.constants.AddressZero);
  //         nftContract = mintingCont as HexPlanet;
  //     });

  //     it("Check NFT contract data", async () => {
  //         expect(await nftContract.name()).to.equal("HexPlanet");
  //         expect(await nftContract.symbol()).to.equal("Playtest");

  //         const erc721 = "0x80ac58cd";
  //         expect(await nftContract.supportsInterface(erc721)).to.equal(true);
  //     });

  //     it("mints", async () => {
  //         await mintCards(mintingMaintainer, user1, nftContract);

  //         expect(await nftContract.tokenURI(0)).to.be.eq(
  //             "ipfs://defaultTokenUri"
  //         );
  //         expect(await nftContract.ownerOf(0)).to.be.eq(user1.address);
  //         expect(await nftContract.totalSupply()).to.eq(1);
  //         expect(await nftContract.balanceOf(user1.address)).to.be.eq(1);
  //     });

  //     /*it("Enable backend", async () => {
  //         backend = new BackendMock(
  //             31337,
  //             nftContract.address,
  //             mintingMaintainer
  //         );
  //     });

  //     it("Mint building", async () => {
  //         let build = {
  //             nftOwner: user1.address,
  //             tokenUri: "test-url",
  //         };
  //         let buildNotSigned = {
  //             nftOwner: user2.address,
  //             tokenUri: "not-signed-test-url",
  //         };

  //         let signature = backend.signMintMessage(build);

  //         await expect(
  //             nftContract.connect(user1).safeMint(signature, buildNotSigned)
  //         ).to.be.revertedWith("Only self minting");
  //         await expect(
  //             nftContract.connect(user2).safeMint(signature, buildNotSigned)
  //         ).to.be.revertedWith("Maintainer did not sign this message!");
  //         await nftContract.connect(user1).safeMint(signature, build);
  //         await expect(
  //             nftContract.connect(user1).safeMint(signature, build)
  //         ).to.be.revertedWith("This message has already been executed!");

  //         expect(await nftContract.tokenURI(0)).to.be.eq("ipfs://test-url");
  //         expect(await nftContract.ownerOf(0)).to.be.eq(user1.address);
  //         expect(await nftContract.totalSupply()).to.eq(1);
  //         expect(await nftContract.balanceOf(user1.address)).to.be.eq(1);
  //     });

  //     it("Disable and enable minting", async () => {
  //         expect(await nftContract.isNFTMintingStopped()).to.eq(false);
  //         // onlyOwner check
  //         expect(nftContract.connect(user2).stopMinting()).to.be
  //             .revertedWithCustomError;

  //         await nftContract.stopMinting();
  //         expect(await nftContract.isNFTMintingStopped()).to.eq(true);

  //         let build = {
  //             nftOwner: user2.address,
  //             tokenUri: "test-url",
  //         };
  //         let signature = backend.signMintMessage(build);
  //         await expect(
  //             nftContract.connect(user2).safeMint(signature, build)
  //         ).to.be.revertedWith("Minting stopped");

  //         // onlyOwner check
  //         expect(nftContract.connect(user2).restartMinting()).to.be
  //             .revertedWithCustomError;

  //         await nftContract.restartMinting();
  //         expect(await nftContract.isNFTMintingStopped()).to.eq(false);
  //     });

  //     it("Mint building", async () => {
  //         let build = {
  //             nftOwner: user1.address,
  //             tokenUri: "second-url",
  //         };

  //         let signature = backend.signMintMessage(build);

  //         await nftContract.connect(user1).safeMint(signature, build);
  //         await expect(
  //             nftContract.connect(user1).safeMint(signature, build)
  //         ).to.be.revertedWith("This message has already been executed!");

  //         expect(await nftContract.tokenURI(1)).to.be.eq("ipfs://second-url");
  //         expect(await nftContract.ownerOf(1)).to.be.eq(user1.address);
  //         expect(await nftContract.totalSupply()).to.eq(2);
  //         expect(await nftContract.balanceOf(user1.address)).to.be.eq(2);
  //     });

  //     it("Set maintainer", async () => {
  //         // onlyOwner check
  //         expect(nftContract.connect(user2).setMintingMaintainer(user1.address))
  //             .to.be.revertedWithCustomError;

  //         expect(await nftContract.getMintingMaintainer()).to.eq(
  //             mintingMaintainer.address
  //         );
  //         nftContract.setMintingMaintainer(user2.address);
  //         expect(await nftContract.getMintingMaintainer()).to.eq(user2.address);
  //     });*/
});

interface MintBuilding {
  nftOwner: string;
  tokenUri: string;
}

class BackendMock {
  /// The EIP-712 domain name used for computing the domain separator.
  DOMAIN_NAME = 'CityBuilder';
  /// The EIP-712 domain version used for computing the domain separator.
  DOMAIN_VERSION = 'v1';

  maintainer: Wallet;
  chainId: number;
  contractAddress: string;

  constructor(chainId: number, contractAddress: string, maintainer: Wallet) {
    this.chainId = chainId;
    this.contractAddress = contractAddress;
    this.maintainer = maintainer;
  }

  signMintMessage(payload: MintBuilding): Buffer {
    const message = this.constructMint(payload);

    const signature = ethers.Signature.from(
        // this.maintainer._signingKey().signDigest(message)
        this.maintainer._signingKey().signDigest(message)
    ).serialized;
    return Buffer.from(signature.slice(2), 'hex');
  }

  private constructMint({ nftOwner, tokenUri }: MintBuilding): string {
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
        BuildingParams: [
          { name: 'nftOwner', type: 'address' },
          { name: 'tokenUri', type: 'string' },
        ],
      },
      primaryType: 'BuildingParams',
      message: {
        nftOwner: nftOwner,
        tokenUri: tokenUri,
      },
    };
 
    const digest = TypedDataUtils.encodeDigest(data);
    const digestHex = ethers.hexlify(digest);
    return digestHex;
  }
}
