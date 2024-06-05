import { ethers } from 'hardhat';
import hre from 'hardhat';

// npx hardhat run deploy/deployRunnerOmni.ts --network scroll_sepolia
async function main() {
  const adminAddress = '0x6ae19a226A6Cec3E29D5dfC90C2bd6640d8d77b9';
  const scrollAndLineaEndpointTestnet =
    '0x6EDCE65403992e310A62460808c4b910D972f10f';

  const Runner2060 = await ethers.getContractFactory('RunnerOmni');
  const runner2060 = await Runner2060.deploy(
    adminAddress,
    scrollAndLineaEndpointTestnet,
    adminAddress,
  );

  await runner2060.deployed();
  console.log(`RunnerOmni deployed to ${runner2060.address}`);

  await new Promise((resolve) => setTimeout(resolve, 10000));

  await hre.run('verify:verify', {
    address: runner2060.address,
    constructorArguments: [
      adminAddress,
      scrollAndLineaEndpointTestnet,
      adminAddress,
    ],
    contract: 'contracts/RunnerOmni.sol:RunnerOmni',
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
