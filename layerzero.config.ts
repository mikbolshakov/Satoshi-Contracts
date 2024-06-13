import { EndpointId } from '@layerzerolabs/lz-definitions';
import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat';

const ethSepoliaContract: OmniPointHardhat = {
  eid: EndpointId.SEPOLIA_V2_TESTNET,
  contractName: 'RunnerOmni',
};

const baseSepoliaContract: OmniPointHardhat = {
  eid: EndpointId.BASESEP_V2_TESTNET,
  contractName: 'RunnerOmni',
};

const lineaSepoliaContract: OmniPointHardhat = {
  eid: EndpointId.LINEASEP_V2_TESTNET,
  contractName: 'RunnerOmni',
};

const scrollSepoliaContract: OmniPointHardhat = {
  eid: EndpointId.SCROLL_V2_TESTNET,
  contractName: 'RunnerOmni',
};

const lineaContract: OmniPointHardhat = {
  eid: 30183,
  contractName: 'CoinTest',
};

const scrollContract: OmniPointHardhat = {
  eid: EndpointId.SCROLL_MAINNET,
  contractName: 'CoinTest',
};

const xlayerContract: OmniPointHardhat = {
  eid: EndpointId.XLAYER_V2_MAINNET,
  contractName: 'CoinTest',
};

const config: OAppOmniGraphHardhat = {
  contracts: [
    {
      contract: ethSepoliaContract,
    },
    {
      contract: baseSepoliaContract,
    },
    {
      contract: lineaSepoliaContract,
    },
    {
      contract: scrollSepoliaContract,
    },
    {
      contract: lineaContract,
    },
    {
      contract: scrollContract,
    },
    {
      contract: xlayerContract,
    },
  ],
  connections: [
    {
      from: ethSepoliaContract,
      to: baseSepoliaContract,
    },
    {
      from: baseSepoliaContract,
      to: ethSepoliaContract,
    },
    {
      from: lineaSepoliaContract,
      to: scrollSepoliaContract,
    },
    {
      from: scrollSepoliaContract,
      to: lineaSepoliaContract,
    },
    {
      from: lineaContract,
      to: scrollContract,
    },
    {
      from: scrollContract,
      to: lineaContract,
    },
    {
      from: lineaContract,
      to: xlayerContract,
    },
    {
      from: xlayerContract,
      to: lineaContract,
    },
    {
      from: scrollContract,
      to: xlayerContract,
    },
    {
      from: xlayerContract,
      to: scrollContract,
    },
  ],
};

export default config;
