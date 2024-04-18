import { ethers } from 'hardhat';
import hre from 'hardhat';

// npx hardhat run deploy/deployHexPlanetItems.ts --network linea_goerli
async function main() {
  const adminAddress = '0x6ae19a226A6Cec3E29D5dfC90C2bd6640d8d77b9';
  const feeNumerator = 500;

  const HexPlanet = await ethers.getContractFactory('HexPlanetItems');
  const hexPlanet = await HexPlanet.deploy(
    adminAddress,
    adminAddress,
    feeNumerator,
    adminAddress,
  );

  await hexPlanet.deployed();
  console.log(`HexPlanetItems deployed to ${hexPlanet.address}`);

  await new Promise((resolve) => setTimeout(resolve, 10000));

  await hre.run('verify:verify', {
    address: hexPlanet.address,
    constructorArguments: [
      adminAddress,
      adminAddress,
      feeNumerator,
      adminAddress,
    ],
    contract: 'contracts/HexPlanetItems.sol:HexPlanetItems',
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
