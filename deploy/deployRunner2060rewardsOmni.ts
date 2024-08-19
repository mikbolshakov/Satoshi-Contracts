import { ethers } from 'hardhat';
import hre from 'hardhat';

// npx hardhat run deploy/deployRunner2060rewardsOmni.ts --network scroll_mainnet
async function main() {
  const maintainer = '0xa57f7478D617aB2f8D52580833A7DD1b3556c4e2';
  const LZEndpoint = '0x1a44076050125825900e736c501f859c50fE728c';
  const adminAddress = '0x1F729fA5C7fB42050c7294165d0bA0CACFDd913d';

  const Runner2060 = await ethers.getContractFactory('Runner2060rewardsOmni');
  const runner2060 = await Runner2060.deploy(maintainer, LZEndpoint, adminAddress);

  await runner2060.deployed();
  console.log(`Runner2060rewardsOmni deployed to ${runner2060.address}`);

  await new Promise((resolve) => setTimeout(resolve, 10000));

  await hre.run('verify:verify', {
    address: runner2060.address,
    constructorArguments: [maintainer, LZEndpoint, adminAddress],
    contract: 'contracts/Runner2060rewardsOmni.sol:Runner2060rewardsOmni',
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
