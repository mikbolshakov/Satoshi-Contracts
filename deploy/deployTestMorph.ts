import { ethers } from 'hardhat';
import hre from 'hardhat';

// npx hardhat run deploy/deployTestMorph.ts --network scroll_mainnet
async function main() {
  const maintainer = '0x74d3B5A23cb82c0ca215F2cE485f23e5a7f51D89';
  const LZEndpoint = '0x1a44076050125825900e736c501f859c50fE728c';
  const adminAddress = '0xcb0e044384Bd09f194bb82A5A7eF32C30a3d4277';

  const Runner2060 = await ethers.getContractFactory('TestMorph');
  const runner2060 = await Runner2060.deploy(maintainer, LZEndpoint, adminAddress);

  await runner2060.deployed();
  console.log(`TestMorph deployed to ${runner2060.address}`);

  await new Promise((resolve) => setTimeout(resolve, 10000));

  await hre.run('verify:verify', {
    address: runner2060.address,
    constructorArguments: [maintainer, LZEndpoint, adminAddress],
    contract: 'contracts/TestMorph.sol:TestMorph',
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
