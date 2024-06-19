import { ethers } from 'hardhat';
import hre from 'hardhat';

// npx hardhat run deploy/deployRunner2060rewards.ts --network linea_mainnet
async function main() {
  const maintainer = '0x6ae19a226A6Cec3E29D5dfC90C2bd6640d8d77b9';
  const royaltyReceiver = '0x264eB120162500F484068212f27137d6b7915428';
  const adminAddress = '0xcb0e044384Bd09f194bb82A5A7eF32C30a3d4277';
  const feeNumerator = 500;

  const Runner2060 = await ethers.getContractFactory('RewardsTest');
  const runner2060 = await Runner2060.deploy(
    maintainer,
    royaltyReceiver,
    feeNumerator,
    adminAddress,
  );

  await runner2060.deployed();
  console.log(`RewardsTest deployed to ${runner2060.address}`);

  await new Promise((resolve) => setTimeout(resolve, 10000));

  await hre.run('verify:verify', {
    address: runner2060.address,
    constructorArguments: [maintainer, royaltyReceiver, feeNumerator, adminAddress],
    contract: 'contracts/RewardsTest.sol:RewardsTest',
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
