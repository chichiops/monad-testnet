const { ethers } = require("ethers");
const colors = require("colors");
const walletUtils = require("../utils/wallet-utils");

// Use the displayHeader from wallet-utils or global scope
const displayHeader = global.displayHeader || walletUtils.displayHeader;

// Display header at the beginning
displayHeader();

const EXPLORER_URL = "https://testnet.monadexplorer.com/tx";
const WMON_CONTRACT = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701"; 

async function wrapMON(contract, amount) {
  try {
    console.log(`🔄 Wrapping ${ethers.utils.formatEther(amount)} MON to WMON`.magenta);

    const tx = await contract.deposit({ value: amount, gasLimit: 210000 });
    console.log(`✅ Successfully wrapped MON to WMON`.green);
    console.log(`➡️  Hash: ${tx.hash}`.grey);
    await tx.wait();
    return true;
  } catch (error) {
    console.error(`❌ Error while wrapping MON to WMON:`.red, error.message);
    return false;
  }
}

async function unwrapMON(contract, amount) {
  try {
    console.log(`🔄 Unwrapping ${ethers.utils.formatEther(amount)} WMON to MON`.magenta);
    const tx = await contract.withdraw(amount, { gasLimit: 210000 });
    console.log(`✅ Successfully unwrapped WMON to MON`.green);
    console.log(`➡️  Hash: ${tx.hash}`.grey);
    await tx.wait();
    return true;
  } catch (error) {
    console.error(`❌ Error while unwrapping WMON to MON:`.red, error.message);
    return false;
  }
}

async function runBebopProcess(wallet, cycles = 1) {
  console.log(`🪫 Starting Bebop ⏩⏩⏩⏩`.blue);
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
      const randomDelay = walletUtils.getRandomDelay(); 

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
        console.log(`⏳ Waiting for ${randomDelay / 1000 / 60} minutes`.grey);
        await walletUtils.delay(randomDelay); 
      }
    }
    
    console.log(`✅ Completed ${successCount} of ${cycles} cycles`.green);
    return successCount;
  } catch (error) {
    console.error(`❌ Error during swap cycle:`.red, error.message);
    return successCount;
  }
}

async function main() {
  try {
    const wallet = await walletUtils.getWallet();
    await runBebopProcess(wallet, 1);
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
module.exports = { runBebopProcess, main };