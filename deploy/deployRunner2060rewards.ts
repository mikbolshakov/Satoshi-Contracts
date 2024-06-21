import { ethers } from 'hardhat';
import hre from 'hardhat';

// npx hardhat run deploy/deployRunner2060rewards.ts --network linea_mainnet
async function main() {
  const maintainer = '0xa57f7478D617aB2f8D52580833A7DD1b3556c4e2';
  const royaltyReceiver = '0x264eB120162500F484068212f27137d6b7915428';
  const adminAddress = '0x1F729fA5C7fB42050c7294165d0bA0CACFDd913d';
  const feeNumerator = 500;

  const Runner2060 = await ethers.getContractFactory('Runner2060rewards');
  const runner2060 = await Runner2060.deploy(
    maintainer,
    royaltyReceiver,
    feeNumerator,
    adminAddress,
  );

  await runner2060.deployed();
  console.log(`Runner2060rewards deployed to ${runner2060.address}`);

  await new Promise((resolve) => setTimeout(resolve, 10000));

  await hre.run('verify:verify', {
    address: runner2060.address,
    constructorArguments: [maintainer, royaltyReceiver, feeNumerator, adminAddress],
    contract: 'contracts/Runner2060rewards.sol:Runner2060rewards',
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
