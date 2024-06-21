import { EndpointId } from '@layerzerolabs/lz-definitions';
import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat';

const ethMainnetContract: OmniPointHardhat = {
  eid: EndpointId.ETHEREUM_V2_MAINNET,
  contractName: 'CoinTest',
};
const ethTestnetContract: OmniPointHardhat = {
  eid: EndpointId.SEPOLIA_V2_TESTNET,
  contractName: 'CoinTest',
};

const lineaMainnetContract: OmniPointHardhat = {
  eid: 30183,
  contractName: 'CoinTest',
};
const lineaTestnetContract: OmniPointHardhat = {
  eid: EndpointId.LINEASEP_V2_TESTNET,
  contractName: 'CoinTest',
};

const scrollMainnetContract: OmniPointHardhat = {
  eid: EndpointId.SCROLL_V2_MAINNET,
  contractName: 'CoinTest',
};
const scrollTestnetContract: OmniPointHardhat = {
  eid: EndpointId.SCROLL_V2_TESTNET,
  contractName: 'CoinTest',
};

const xlayerMainnetContract: OmniPointHardhat = {
  eid: EndpointId.XLAYER_V2_MAINNET,
  contractName: 'CoinTest',
};
const xlayerTestnetContract: OmniPointHardhat = {
  eid: EndpointId.XLAYER_V2_TESTNET,
  contractName: 'CoinTest',
};

const baseMainnetContract: OmniPointHardhat = {
  eid: EndpointId.BASE_V2_MAINNET,
  contractName: 'CoinTest',
};
const baseTestnetContract: OmniPointHardhat = {
  eid: EndpointId.BASESEP_V2_TESTNET,
  contractName: 'CoinTest',
};

const config: OAppOmniGraphHardhat = {
  contracts: [
    {
      contract: ethMainnetContract,
    },
    {
      contract: ethTestnetContract,
    },
    {
      contract: lineaMainnetContract,
    },
    {
      contract: lineaTestnetContract,
    },
    {
      contract: scrollMainnetContract,
    },
    {
      contract: scrollTestnetContract,
    },
    {
      contract: xlayerMainnetContract,
    },
    {
      contract: xlayerTestnetContract,
    },
    {
      contract: baseMainnetContract,
    },
    {
      contract: baseTestnetContract,
    },
  ],
  connections: [
    {
      from: ethMainnetContract,
      to: lineaMainnetContract,
    },
    {
      from: ethMainnetContract,
      to: scrollMainnetContract,
    },
    {
      from: ethMainnetContract,
      to: xlayerMainnetContract,
    },
    {
      from: ethMainnetContract,
      to: baseMainnetContract,
    },
    {
      from: lineaMainnetContract,
      to: scrollMainnetContract,
    },
    {
      from: lineaMainnetContract,
      to: xlayerMainnetContract,
    },
    {
      from: lineaMainnetContract,
      to: baseMainnetContract,
    },
    {
      from: scrollMainnetContract,
      to: xlayerMainnetContract,
    },
    {
      from: scrollMainnetContract,
      to: baseMainnetContract,
    },
    {
      from: xlayerMainnetContract,
      to: baseMainnetContract,
    },
    {
      from: ethTestnetContract,
      to: lineaTestnetContract,
    },
    {
      from: ethTestnetContract,
      to: scrollTestnetContract,
    },
    {
      from: ethTestnetContract,
      to: xlayerTestnetContract,
    },
    {
      from: ethTestnetContract,
      to: baseTestnetContract,
    },
    {
      from: lineaTestnetContract,
      to: scrollTestnetContract,
    },
    {
      from: lineaTestnetContract,
      to: xlayerTestnetContract,
    },
    {
      from: lineaTestnetContract,
      to: baseTestnetContract,
    },
    {
      from: scrollTestnetContract,
      to: xlayerTestnetContract,
    },
    {
      from: scrollTestnetContract,
      to: baseTestnetContract,
    },
    {
      from: xlayerTestnetContract,
      to: baseTestnetContract,
    },
  ],
};

export default config;
