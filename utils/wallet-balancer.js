/**
 * Wallet balance checker and metrics tool
 * Helps monitor wallet health and ensure adequate balances
 */

const { ethers } = require("ethers");
const fs = require("fs");
const colors = require("colors");
const path = require("path");
const walletUtils = require("./wallet-utils");
const config = require("./config");

/**
 * Reads wallet data from the wallet file
 * @param {string} filePath - Path to the wallet file
 * @returns {Array} Array of wallet objects with private keys and proxies
 */
async function readWalletData(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Wallet file not found: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '' && !line.trim().startsWith('#'));
    
    const walletData = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const parts = line.split('|');
      const privateKey = parts[0].trim();
      const proxy = parts.length > 1 ? parts[1].trim() : null;
      
      if (privateKey) {
        walletData.push({ privateKey, proxy, index: i + 1 });
      }
    }
    
    return walletData;
  } catch (error) {
    console.error(colors.red(`Error reading wallet file: ${error.message}`));
    return [];
  }
}

/**
 * Gets a wallet's balance
 * @param {Object} walletData - Wallet data with private key and proxy
 * @returns {Object} Balance information
 */
async function getWalletBalance(walletData) {
  try {
    // Format proxy for environment variables
    if (walletData.proxy) {
      process.env.HTTP_PROXY = `http://${walletData.proxy}`;
      process.env.HTTPS_PROXY = process.env.HTTP_PROXY;
    } else {
      delete process.env.HTTP_PROXY;
      delete process.env.HTTPS_PROXY;
    }
    
    // Create provider
    const provider = await walletUtils.connectToRpc();
    
    // Create wallet
    const wallet = new ethers.Wallet(walletData.privateKey, provider);
    
    // Get balance
    const balance = await provider.getBalance(wallet.address);
    
    return {
      address: wallet.address,
      balance: balance,
      balanceEth: ethers.utils.formatEther(balance),
      hasProxy: !!walletData.proxy,
      index: walletData.index
    };
  } catch (error) {
    return {
      address: "Error",
      balance: ethers.BigNumber.from(0),
      balanceEth: "0.0",
      error: error.message,
      hasProxy: !!walletData.proxy,
      index: walletData.index
    };
  }
}

/**
 * Checks balances of all wallets
 * @param {string} walletsFile - Path to the wallet file
 */
async function checkAllWallets(walletsFile) {
  console.log(colors.blue.bold("\n🔍 Checking wallet balances...\n"));
  
  const walletData = await readWalletData(walletsFile);
  
  if (walletData.length === 0) {
    console.error(colors.red("❌ No valid wallets found"));
    return;
  }
  
  console.log(colors.cyan(`Found ${walletData.length} wallets, checking balances...\n`));
  
  const results = [];
  let totalBalance = ethers.BigNumber.from(0);