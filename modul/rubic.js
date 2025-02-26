const { ethers } = require("ethers");
const colors = require("colors");
const walletUtils = require("../utils/wallet-utils");
const config = require("../utils/config");
const retryUtils = require("../utils/retry-utils");
const txLogger = require("../utils/transaction-logger");

// Use the displayHeader function
const displayHeader = global.displayHeader || walletUtils.displayHeader;
displayHeader();

const WMON_CONTRACT = config.contracts.weth;

const contract_abi = [
  "function deposit() public payable",
  "function withdraw(uint256 amount) public",
];

async function wrapMON(contract, amount, wallet) {
  return retryUtils.retryWithBackoff(async () => {
    try {
      console.log(` `);
      console.log(`🔄 Wrap ${ethers.utils.formatEther(amount)} MON > WMON`.magenta);
      
      return await retryUtils.retryWithIncreasedGas(
        async (gasMultiplier = 1.0) => {
          // Calculate gas price with multiplier
          const gasPrice = (await wallet.provider.getGasPrice()).mul(
            Math.floor(gasMultiplier * 100)
          ).div(100);
          
          const tx = await contract.deposit({ 
            value: amount, 
            gasLimit: 500000,
            gasPrice
          });
          console.log(`✅ Wrap MON > WMON successful`.green);
          console.log(`➡️  Hash: ${tx.hash}`.yellow);
          await tx.wait();
          return tx;
        },
        wallet,
        { 
          moduleName: "Rubic", 
          actionName: "Wrap MON to WMON"
        }
      );
    } catch (error) {
      console.error(`❌ Error wrap MON:`.red, error.message);
      throw error;
    }
  }, { 
    wallet, 
    moduleName: "Rubic", 
    actionName: "Wrap MON to WMON" 
  });
}

async function unwrapMON(contract, amount, wallet) {
  return retryUtils.retryWithBackoff(async () => {
    try {
      console.log(`🔄 Unwrap ${ethers.utils.formatEther(amount)} WMON > MON`.magenta);
      
      return await retryUtils.retryWithIncreasedGas(
        async (gasMultiplier = 1.0) => {
          // Calculate gas price with multiplier
          const gasPrice = (await wallet.provider.getGasPrice()).mul(
            Math.floor(gasMultiplier * 100)
          ).div(100);
          
          const tx = await contract.withdraw(amount, { 
            gasLimit: 500000,
            gasPrice
          });
          console.log(`✅ Unwrap WMON > MON successful`.green);
          console.log(`➡️  Hash: ${tx.hash}`.yellow);
          await tx.wait();
          return tx;
        },
        wallet,
        { 
          moduleName: "Rubic", 
          actionName: "Unwrap WMON to MON"
        }
      );
    } catch (error) {
      console.error(`❌ Error unwrapping WMON:`.red, error.message);
      throw error;
    }
  }, { 
    wallet, 
    moduleName: "Rubic", 
    actionName: "Unwrap WMON to MON" 
  });
}

async function runSwapCycle(wallet, cycles = 1) {
  txLogger.logInfo(wallet.address, "Rubic", "Process Started", `Starting ${cycles} cycles`);
  console.log(`🪫  Starting Rubic ⏩⏩⏩⏩`.blue);
  console.log(`🧧 Account: ${wallet.address}`.green);
  
  const contract = new ethers.Contract(WMON_CONTRACT, contract_abi, wallet);
  
  let successCount = 0;
  
  for (let i = 0; i < cycles; i++) {
    const randomAmount = walletUtils.getRandomEthAmount(
      config.amounts.swap.min,
      config.amounts.swap.max
    );
    
    // Wrap MON to WMON
    const wrapTx = await wrapMON(contract, randomAmount, wallet);
    const wrapSuccess = wrapTx !== null;
    
    if (wrapSuccess) {
      txLogger.logSuccess(
        wallet.address,
        "Rubic",
        "Wrap MON to WMON",
        wrapTx.hash,
        `Amount: ${ethers.utils.formatEther(randomAmount)} MON`
      );
      
      // Wait a bit before unwrapping
      await walletUtils.delay(5000);
      
      // Unwrap WMON to MON
      const unwrapTx = await unwrapMON(contract, randomAmount, wallet);
      const unwrapSuccess = unwrapTx !== null;
      
      if (unwrapSuccess) {
        txLogger.logSuccess(
          wallet.address,
          "Rubic",
          "Unwrap WMON to MON",
          unwrapTx.hash,
          `Amount: ${ethers.utils.formatEther(randomAmount)} WMON`
        );
        
        if (wrapSuccess && unwrapSuccess) {
          successCount++;
        }
      }
    }
    
    if (i < cycles - 1) {
      const randomDelay = walletUtils.getRandomDelay(1, 3);
      console.log(`⏳ Wait ${randomDelay / 1000 / 60} Minute`.grey);
      await walletUtils.delay(randomDelay);
    }
  }
  
  console.log(`✅ Completed ${successCount} of ${cycles} swap cycles`.green);
  txLogger.logSuccess(
    wallet.address,
    "Rubic",
    "Process Completed",
    null,
    `${successCount}/${cycles} cycles successful`
  );
  
  return successCount;
}

async function main() {
  try {
    const wallet = await walletUtils.getWallet();
    await runSwapCycle(wallet, 1);
  } catch (error) {
    console.error(`❌ Error in main process:`.red, error.message);
  }
}

// When run directly
if (require.main === module) {
  main().catch(error => {
    console.error(`❌ Unhandled error:`.red, error);
    process.exit(1);
  });
}

// Export function for use in multi-wallet script
module.exports = { runSwapCycle, main };