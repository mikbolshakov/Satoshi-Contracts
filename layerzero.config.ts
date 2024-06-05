import { EndpointId } from '@layerzerolabs/lz-definitions';
import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat';

const lineaSepoliaContract: OmniPointHardhat = {
  eid: EndpointId.LINEASEP_V2_TESTNET,
  contractName: 'RunnerOmni',
};

const scrollSepoliaContract: OmniPointHardhat = {
  eid: EndpointId.SCROLL_V2_TESTNET,
  contractName: 'RunnerOmni',
};

const config: OAppOmniGraphHardhat = {
  contracts: [
    {
      contract: lineaSepoliaContract,
    },
    {
      contract: scrollSepoliaContract,
    },
  ],
  connections: [
    {
      from: lineaSepoliaContract,
      to: scrollSepoliaContract,
    },
    {
      from: scrollSepoliaContract,
      to: lineaSepoliaContract,
    },
  ],
};

export default config;
