const { ethers } = require("ethers");
const colors = require("colors");
const { HttpsProxyAgent } = require("https-proxy-agent");
const fetch = require("node-fetch");
const config = require("./config");

/**
 * Creates a custom fetch function that works with a proxy
 * @param {string} proxyUrl - The proxy URL to use
 * @returns {Function} A fetch function that uses the proxy
 */
async function createProxyFetch(proxyUrl) {
  if (proxyUrl) {
    const proxyAgent = new HttpsProxyAgent(proxyUrl);
    return (url, options) => fetch(url, { ...options, agent: proxyAgent });
  }
  return fetch;
}

/**
 * Connects to an RPC endpoint, trying multiple URLs if necessary
 * @returns {Promise<ethers.providers.JsonRpcProvider>} A connected provider
 */
async function connectToRpc() {
  // Get proxy settings from environment variables
  const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
  const proxyFetch = await createProxyFetch(proxyUrl);
  
  for (const url of config.network.rpcUrls) {
    try {
      const provider = new ethers.providers.JsonRpcProvider({
        url: url,
        fetch: proxyFetch
      });
      
      await provider.getNetwork();
      
      if (proxyUrl) {
        console.log(`🔌 Connected via proxy: ${proxyUrl.split('@').pop()}`.cyan);
      } else {
        console.log(`✅ Connected to ${url}`.green);
      }
      
      return provider;
    } catch (error) {
      console.log(`Failed to connect to ${url}, trying another...`.yellow);
    }
  }
  throw new Error(`❌ Unable to connect to any RPC endpoint`.red);
}

/**
 * Gets a wallet using the private key from environment variables
 * @returns {Promise<ethers.Wallet>} An initialized wallet
 */
async function getWallet() {
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error("No private key provided. Set PRIVATE_KEY in environment.");
  }
  
  const provider = await connectToRpc();
  return new ethers.Wallet(privateKey, provider);
}

/**
 * Generates a random amount of ETH within the specified range
 * @param {number} min - Minimum amount in ETH
 * @param {number} max - Maximum amount in ETH
 * @returns {ethers.BigNumber} Random amount in wei
 */
function getRandomEthAmount(min = 0.01, max = 0.05) {
  const randomAmount = Math.random() * (max - min) + min;
  return ethers.utils.parseEther(randomAmount.toFixed(6));
}

/**
 * Generates a random delay within the specified range
 * @param {number} minMinutes - Minimum delay in minutes
 * @param {number} maxMinutes - Maximum delay in minutes
 * @returns {number} Random delay in milliseconds
 */
function getRandomDelay(minMinutes = 1, maxMinutes = 3) {
  const minMs = minMinutes * 60 * 1000;
  const maxMs = maxMinutes * 60 * 1000;
  return Math.floor(Math.random() * (maxMs - minMs + 1) + minMs);
}

/**
 * Creates a delay promise
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} A promise that resolves after the delay
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Display header for scripts
 */
function displayHeader() {
  console.log(colors.yellow("===================================="));
  console.log(colors.cyan("🚀 Monad Testnet Automation Script 🚀"));
  console.log(colors.green("📡 Auto Multi-Wallet Executor"));
  console.log(colors.yellow("===================================="));
}

module.exports = {
  createProxyFetch,
  connectToRpc,
  getWallet,
  getRandomEthAmount,
  getRandomDelay,
  delay,
  displayHeader
};