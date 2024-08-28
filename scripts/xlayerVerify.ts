import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config();

const apiKey = process.env.OKLINK_API_KEY as string;
const url = 'https://www.oklink.com/api/v5/explorer/contract/verify-source-code';
const headers = {
  'Ok-Access-Key': apiKey,
  'Content-Type': 'application/json',
};

// npx ts-node scripts/xlayerVerify.ts
async function verifyContract() {
  const contractFilePath = path.join(__dirname, '../contracts/Runner2060rewardsOmni.sol');
  const sourceCode = fs.readFileSync(contractFilePath, 'utf8');

  const data = {
    chainShortName: 'XLAYER',
    contractAddress: '0x15F0bf5Ff3F5aA1A3ff10120c1dA669b80309642',
    contractName: 'Runner2060rewardsOmni',
    sourceCode: sourceCode,
    codeFormat: 'solidity-single-file',
    compilerVersion: 'v0.8.24+commit.e11b9ed9',
    optimization: '1',
    optimizationRuns: '200',
    evmVersion: 'cancun',
    licenseType: 'MIT License (MIT)',
  };

  try {
    const response = await axios.post(url, data, { headers });
    console.log('Successfully verified:', response.data);
  } catch (error: any) {
    console.error(
      'Verification error:',
      error.response ? error.response.status : error.message,
      error.response ? error.response.data : '',
    );
  }
}

verifyContract();
