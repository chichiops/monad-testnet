const { ethers } = require("ethers");
const colors = require("colors");
const { HttpsProxyAgent } = require("https-proxy-agent");
const fetch = require("node-fetch");
const walletUtils = require('../utils/wallet-utils');

// Use the displayHeader from wallet-utils or define it if not available
const displayHeader = global.displayHeader || walletUtils.displayHeader;

// Display header at the beginning
displayHeader();

const CHAIN_ID = 10143;
const UNISWAP_V2_ROUTER_ADDRESS = "0xCa810D095e90Daae6e867c19DF6D9A8C56db2c89";
const WETH_ADDRESS = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701";

const TOKEN_ADDRESSES = {
  "DAC": "0x0f0bdebf0f83cd1ee3974779bcb7315f9808c714",
  "USDT": "0x88b8e2161dedc77ef4ab7585569d2415a1c1055d",
  "WETH": "0x836047a99e11f376522b447bffb6e3495dd0637c",
  "MUK": "0x989d38aeed8408452f0273c7d4a17fef20878e62",
  "USDC": "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
  "CHOG": "0xE0590015A873bF326bd645c3E1266d4db41C4E6B",
};

const erc20Abi = [
  { name: "balanceOf", type: "function", inputs: [{ name: "_owner", type: "address" }], outputs: [{ name: "balance", type: "uint256" }] },
  { name: "approve", type: "function", inputs: [{ name: "_spender", type: "address" }, { name: "_value", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
];

/**
 * Menjalankan swap ETH ke token.
 */
async function swapEthForTokens(wallet, tokenAddress, amountInWei, tokenSymbol) {
  if (!tokenAddress) {
    console.error(`❌ Token ${tokenSymbol} tidak ditemukan dalam daftar!`.red);
    return;
  }

  const router = new ethers.Contract(
    UNISWAP_V2_ROUTER_ADDRESS,
    ["function swapExactETHForTokens(uint256,address[],address,uint256) external payable returns (uint256[])"],
    wallet
  );

  try {
    console.log(`🔄 Swap ${ethers.utils.formatEther(amountInWei)} MON > ${tokenSymbol}`.green);
    const tx = await router.swapExactETHForTokens(
      0,
      [WETH_ADDRESS, tokenAddress],
      wallet.address,
      Math.floor(Date.now() / 1000) + 600,
      { value: amountInWei, gasLimit: 210000 }
    );

    console.log(`➡️ Hash: ${tx.hash}`.yellow);
    await tx.wait();
    return true;
  } catch (error) {
    console.error(`❌ Gagal swap: ${error.message}`.red);
    return false;
  }
}

/**
 * Menjalankan swap token ke ETH.
 */
async function swapTokensForEth(wallet, tokenAddress, tokenSymbol) {
  if (!tokenAddress) {
    console.error(`❌ Token ${tokenSymbol} tidak ditemukan dalam daftar!`.red);
    return;
  }

  const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, wallet);
  const balance = await tokenContract.balanceOf(wallet.address);

  if (balance.eq(0)) {
    console.log(`❌ Tidak ada saldo ${tokenSymbol}, lewati`.black);
    return false;
  }

  console.log(`📊 Saldo ${tokenSymbol}: ${ethers.utils.formatEther(balance)} `.blue);

  const router = new ethers.Contract(
    UNISWAP_V2_ROUTER_ADDRESS,
    ["function swapExactTokensForETH(uint256,uint256,address[],address,uint256)"],
    wallet
  );

  try {
    console.log(`🔄 Swap ${tokenSymbol} > MON`.green);
    await tokenContract.approve(UNISWAP_V2_ROUTER_ADDRESS, balance);
    
    const tx = await router.swapExactTokensForETH(
      balance,
      0,
      [tokenAddress, WETH_ADDRESS],
      wallet.address,
      Math.floor(Date.now() / 1000) + 600,
      { gasLimit: 210000 }
    );

    console.log(`➡️ Hash: ${tx.hash}`.yellow);
    await tx.wait();
    return true;
  } catch (error) {
    console.error(`❌ Gagal: ${error.message}`.red);
    return false;
  }
}

/**
 * Main function to run the script
 */
async function main() {
  try {
    const wallet = await walletUtils.getWallet();
    console.log(`🧧 Wallet: ${wallet.address}`.green);

    // Choose a random token
    const tokenSymbols = Object.keys(TOKEN_ADDRESSES);
    const tokenSymbol = tokenSymbols[Math.floor(Math.random() * tokenSymbols.length)];
    const tokenAddress = TOKEN_ADDRESSES[tokenSymbol];

    await swapEthForTokens(wallet, tokenAddress, walletUtils.getRandomEthAmount(), tokenSymbol);
    
    // Wait a bit before swapping back
    const randomDelay = walletUtils.getRandomDelay(0.5, 1);
    console.log(`⏳ Waiting ${randomDelay/1000} seconds before swapping back...`.grey);
    await walletUtils.delay(randomDelay);
    
    await swapTokensForEth(wallet, tokenAddress, tokenSymbol);
  } catch (error) {
    console.error(`❌ Error utama: ${error.message}`.red);
  }
}

// If the file is run directly
if (require.main === module) {
  main().catch(error => {
    console.error(`❌ Unhandled error: ${error.message}`.red);
    process.exit(1);
  });
}

// Export functions for multi-wallet script
module.exports = { swapEthForTokens, swapTokensForEth, main };