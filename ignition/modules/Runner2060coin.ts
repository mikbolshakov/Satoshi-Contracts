import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const adminAddress = '0x6ae19a226A6Cec3E29D5dfC90C2bd6640d8d77b9';

const RunnerModule = buildModule('Runner2060coin', (m) => {
  const runner = m.contract('Runner2060coin', [
    adminAddress,
    adminAddress,
    adminAddress,
  ]);

  return { runner };
});

export default RunnerModule;
