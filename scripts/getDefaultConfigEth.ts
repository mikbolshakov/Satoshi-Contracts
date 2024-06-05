import * as ethers from 'ethers';
import { config } from 'dotenv';
config();

// npx ts-node scripts/getDefaultConfigEth.ts
const provider = new ethers.providers.JsonRpcProvider(
  process.env.ETHEREUM_MAINNET,
);

const ethereumLzEndpointAddress = '0x1a44076050125825900e736c501f859c50fE728c';
const ethereumLzEndpointABI = [
  'function getConfig(address _oapp, address _lib, uint32 _eid, uint32 _configType) external view returns (bytes memory config)',
];

// Create a contract instance
const contract = new ethers.Contract(
  ethereumLzEndpointAddress,
  ethereumLzEndpointABI,
  provider,
);

const oappAddress = '0xEB6671c152C88E76fdAaBC804Bf973e3270f4c78';
const sendLibAddress = '0xbB2Ea70C9E858123480642Cf96acbcCE1372dCe1';
const receiveLibAddress = '0xc02Ab410f0734EFa3F14628780e6e695156024C2';
const remoteEid = 30102; // Example target endpoint ID, Binance Smart Chain
const executorConfigType = 1; // 1 for executor
const ulnConfigType = 2; // 2 for UlnConfig

async function getConfigAndDecode() {
  try {
    // Fetch and decode for sendLib (both Executor and ULN Config)
    const sendExecutorConfigBytes = await contract.getConfig(
      oappAddress,
      sendLibAddress,
      remoteEid,
      executorConfigType,
    );
    const executorConfigAbi = [
      'tuple(uint32 maxMessageSize, address executorAddress)',
    ];
    const executorConfigArray = ethers.utils.defaultAbiCoder.decode(
      executorConfigAbi,
      sendExecutorConfigBytes,
    );
    console.log('Send Library Executor Config:', executorConfigArray);

    const sendUlnConfigBytes = await contract.getConfig(
      oappAddress,
      sendLibAddress,
      remoteEid,
      ulnConfigType,
    );
    const ulnConfigStructType = [
      'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)',
    ];
    const sendUlnConfigArray = ethers.utils.defaultAbiCoder.decode(
      ulnConfigStructType,
      sendUlnConfigBytes,
    );
    console.log('Send Library ULN Config:', sendUlnConfigArray);

    // Fetch and decode for receiveLib (only ULN Config)
    const receiveUlnConfigBytes = await contract.getConfig(
      oappAddress,
      receiveLibAddress,
      remoteEid,
      ulnConfigType,
    );
    const receiveUlnConfigArray = ethers.utils.defaultAbiCoder.decode(
      ulnConfigStructType,
      receiveUlnConfigBytes,
    );
    console.log('Receive Library ULN Config:', receiveUlnConfigArray);
  } catch (error) {
    console.error('Error fetching or decoding config:', error);
  }
}

// Execute the function
getConfigAndDecode();
