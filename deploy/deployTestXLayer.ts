import { ethers } from 'hardhat';

// npx hardhat run deploy/deployTestXLayer.ts --network xlayer_mainnet
async function main() {
  const maintainer = '0x74d3B5A23cb82c0ca215F2cE485f23e5a7f51D89';
  const LZEndpoint = '0x1a44076050125825900e736c501f859c50fE728c';
  const adminAddress = '0xcb0e044384Bd09f194bb82A5A7eF32C30a3d4277';

  const Runner2060 = await ethers.getContractFactory('TestXLayer');
  const runner2060 = await Runner2060.deploy(maintainer, LZEndpoint, adminAddress);

  await runner2060.deployed();
  console.log(`TestXLayer deployed to ${runner2060.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
