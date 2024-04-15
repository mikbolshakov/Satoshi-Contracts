import { ethers } from 'hardhat';
import hre from 'hardhat';

// npx hardhat run deploy/deployRunner2060rewards.ts --network linea_goerli
async function main() {
  const adminAddress = '0x6ae19a226A6Cec3E29D5dfC90C2bd6640d8d77b9';
  const feeNumerator = 750;

  const Runner2060 = await ethers.getContractFactory('Runner2060rewards');
  const runner2060 = await Runner2060.deploy(
    adminAddress,
    adminAddress,
    feeNumerator,
    adminAddress,
  );

  await runner2060.deployed();
  console.log(`Runner2060rewards deployed to ${runner2060.address}`);

  await new Promise((resolve) => setTimeout(resolve, 10000));

  await hre.run('verify:verify', {
    address: runner2060.address,
    constructorArguments: [
      adminAddress,
      adminAddress,
      feeNumerator,
      adminAddress,
    ],
    contract: 'contracts/Runner2060rewards.sol:Runner2060rewards',
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
