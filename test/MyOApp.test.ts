import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract, ContractFactory } from 'ethers';
import { deployments, ethers } from 'hardhat';
import { Options } from '@layerzerolabs/lz-v2-utilities';

// eid
const eidLineaMainnet = 30183;
const eidScrollMainnet = 30214;

describe('MyOApp Test', function () {
  // contracts
  let EndpointV2Mock: ContractFactory;
  let erc1155Linea: Contract;
  let erc1155Scroll: Contract;
  let mockEndpointV2Linea: Contract;
  let mockEndpointV2Scroll: Contract;
  let MyOApp: ContractFactory;

  // accounts
  let signers: SignerWithAddress[];
  let adminLinea: SignerWithAddress;
  let adminScroll: SignerWithAddress;
  let endpointOwner: SignerWithAddress;
  let thirdPartyDeployer: SignerWithAddress;

  before(async function () {
    signers = await ethers.getSigners();
    adminLinea = signers[0];
    adminScroll = signers[1];
    endpointOwner = signers[2];
    thirdPartyDeployer = signers[3];

    MyOApp = await ethers.getContractFactory('MyOApp');

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

    // Deploying two instances of MyOApp contract and linking them to the mock LZEndpoint
    erc1155Linea = await MyOApp.deploy(mockEndpointV2Linea.address, adminLinea.address);
    erc1155Scroll = await MyOApp.deploy(mockEndpointV2Scroll.address, adminScroll.address);

    // Setting destination endpoints in the LZEndpoint mock for each MyOApp instance
    await mockEndpointV2Linea.setDestLzEndpoint(
      erc1155Scroll.address,
      mockEndpointV2Scroll.address,
    );
    await mockEndpointV2Scroll.setDestLzEndpoint(erc1155Linea.address, mockEndpointV2Linea.address);

    // Setting each MyOApp instance as a peer of the other
    await erc1155Linea
      .connect(adminLinea)
      .setPeer(eidScrollMainnet, ethers.utils.zeroPad(erc1155Scroll.address, 32));
    await erc1155Scroll
      .connect(adminScroll)
      .setPeer(eidLineaMainnet, ethers.utils.zeroPad(erc1155Linea.address, 32));
  });

  // A test case to verify message sending functionality
  it('should send a message to each destination OApp', async function () {
    // Assert initial state of data in both MyOApp instances
    expect(await erc1155Linea.data()).to.equal('Nothing received yet.');
    expect(await erc1155Scroll.data()).to.equal('Nothing received yet.');
    const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();

    // Define native fee and quote for the message send operation
    let nativeFee = 0;
    [nativeFee] = await erc1155Linea.quote(
      eidScrollMainnet,
      'Nothing received yet.',
      options,
      false,
    );

    // Execute send operation from erc1155Linea
    await erc1155Linea.send(eidScrollMainnet, 'Test message.', options, {
      value: nativeFee.toString(),
    });

    // Assert the resulting state of data in both MyOApp instances
    expect(await erc1155Linea.data()).to.equal('Nothing received yet.');
    expect(await erc1155Scroll.data()).to.equal('Test message.');
  });
});
