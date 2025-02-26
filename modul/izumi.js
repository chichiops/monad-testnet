const { ethers } = require("ethers");
const colors = require("colors");
const walletUtils = require("../utils/wallet-utils");

// Use the displayHeader function
const displayHeader = global.displayHeader || walletUtils.displayHeader;
displayHeader();

const EXPLORER_URL = "https://testnet.monadexplorer.com/tx";
const WMON_CONTRACT = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701";

async function wrapMON(contract, amount) {
  try {
    console.log(`🔄 Wrap ${ethers.utils.formatEther(amount)} MON > WMON`.magenta);
    const tx = await contract.deposit({ value: amount, gasLimit: 500000 });
    console.log(`✅ Wrap MON > WMON successful`.green);
    console.log(`➡️  Hash: ${tx.hash}`.grey);
    await tx.wait();
    return true;
  } catch (error) {
    console.error(`❌ Error wrapping MON:`.red, error.message);
    return false;
  }
}

async function unwrapMON(contract, amount) {
  try {
    console.log(`🔄 Unwrap ${ethers.utils.formatEther(amount)} WMON > MON`.magenta);
    const tx = await contract.withdraw(amount, { gasLimit: 500000 });
    console.log(`✅ Unwrap WMON > MON successful`.green);
    console.log(`➡️  Hash: ${tx.hash}`.grey);
    await tx.wait();
    return true;
  } catch (error) {
    console.error(`❌ Error Unwrap:`.red, error.message);
    return false;
  }
}

async function runIzumiProcess(wallet, cycles = 1) {
  console.log(`🪫 Starting Izumi ⏩⏩⏩⏩`.blue);
  console.log(` `);
  console.log(`🧧 Account: ${wallet.address}`.green);
  
  const contract = new ethers.Contract(
    WMON_CONTRACT,
    ["function deposit() public payable", "function withdraw(uint256 amount) public"],
    wallet
  );

  let successCount = 0;
  
  try {
    for (let i = 0; i < cycles; i++) {
      const randomAmount = walletUtils.getRandomEthAmount();
      
      // Wrap MON to WMON
      const wrapSuccess = await wrapMON(contract, randomAmount);
      
      // Unwrap WMON to MON if wrap was successful
      let unwrapSuccess = false;
      if (wrapSuccess) {
        unwrapSuccess = await unwrapMON(contract, randomAmount);
      }
      
      // Count as success only if both operations succeeded
      if (wrapSuccess && unwrapSuccess) {
        successCount++;
      }

      if (i < cycles - 1) {
        const randomDelay = walletUtils.getRandomDelay();
        console.log(`⏳ Wait ${randomDelay / 1000 / 60} minutes`.grey);
        await walletUtils.delay(randomDelay);
      }
    }
    
    console.log(`✅ Finished Izumi Swap: ${successCount} of ${cycles} cycles completed`.green);
    return successCount;
  } catch (error) {
    console.error(`❌ Error in runSwapCycle:`.red, error.message);
    return successCount;
  }
}

async function main() {
  try {
    const wallet = await walletUtils.getWallet();
    await runIzumiProcess(wallet, 1);
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
module.exports = { runIzumiProcess, main };