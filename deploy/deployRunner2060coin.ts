import { ethers } from 'hardhat';
import hre from 'hardhat';

// npx hardhat run deploy/deployRunner2060coin.ts --network linea_mainnet
async function main() {
  const maintainer = '0x6ae19a226A6Cec3E29D5dfC90C2bd6640d8d77b9';
  const adminAddress = '0xcb0e044384Bd09f194bb82A5A7eF32C30a3d4277';
  const testnetEndpointLZ = '0x1a44076050125825900e736c501f859c50fE728c';

  const Runner2060 = await ethers.getContractFactory('Runner2060coin');
  const runner2060 = await Runner2060.deploy(maintainer, testnetEndpointLZ, adminAddress);

  await runner2060.deployed();
  console.log(`Runner2060coin deployed to ${runner2060.address}`);

  await new Promise((resolve) => setTimeout(resolve, 10000));

  await hre.run('verify:verify', {
    address: runner2060.address,
    constructorArguments: [maintainer, testnetEndpointLZ, adminAddress],
    contract: 'contracts/Runner2060coin.sol:Runner2060coin',
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
