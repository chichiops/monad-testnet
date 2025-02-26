const { ethers } = require("ethers");
const colors = require("colors");
const walletUtils = require("../utils/wallet-utils");

// Use the displayHeader function
const displayHeader = global.displayHeader || walletUtils.displayHeader;
displayHeader();

const EXPLORER_URL = "https://testnet.monadexplorer.com/tx/";

const contractAddress = "0x2c9C959516e9AAEdB2C748224a41249202ca8BE7";
const gasLimitStake = 500000;
const gasLimitUnstake = 800000;

const STAKE_AMOUNT = ethers.utils.parseEther("0.1"); 
const UNSTAKE_DELAY = 5 * 60 * 1000; 

async function stakeMON(wallet) {
    try {
        console.log(`🔄 stake: ${ethers.utils.formatEther(STAKE_AMOUNT)} MON`.magenta);

        const tx = {
            to: contractAddress,
            data: "0xd5575982", 
            gasLimit: ethers.utils.hexlify(gasLimitStake),
            value: STAKE_AMOUNT,
        };

        console.log(`✅ STAKE`.green);
        const txResponse = await wallet.sendTransaction(tx);
        console.log(`➡️  Hash: ${txResponse.hash}`.yellow);
        console.log(`⏳ Wait Confirmation`.grey);
        await txResponse.wait();
        console.log(`✅ Stake DONE`.green);

        return STAKE_AMOUNT;
    } catch (error) {
        console.error(`❌ Staking failed:`.red, error.message);
        throw error;
    }
}

async function unstakeGMON(wallet, amountToUnstake) {
    try {
        console.log(`✅ Unstake: ${ethers.utils.formatEther(amountToUnstake)} gMON`.green);

        const functionSelector = "0x6fed1ea7";
        const paddedAmount = ethers.utils.hexZeroPad(amountToUnstake.toHexString(), 32);
        const data = functionSelector + paddedAmount.slice(2);

        const tx = {
            to: contractAddress,
            data: data,
            gasLimit: ethers.utils.hexlify(gasLimitUnstake),
        };

        console.log(`✅ Unstake`.green);
        const txResponse = await wallet.sendTransaction(tx);
        console.log(`➡️  Hash: ${txResponse.hash}`.yellow);
        console.log(`⏳ Wait Confirmation`.grey);
        await txResponse.wait();
        console.log(`✅ Unstake DONE!`.green);
        
        return true;
    } catch (error) {
        console.error(`❌ Unstaking failed:`.red, error.message);
        throw error;
    }
}

async function runKitsuProcess(wallet) {
    try {
        console.log(`🪫  Starting Kitsu`.blue);
        console.log(` `);
        console.log(`🧧 Account: ${wallet.address}`.green);
        
        // Stake MON
        const stakeAmount = await stakeMON(wallet);
        
        // Wait for the specified delay before unstaking
        console.log(`⏳ wait for 5 minutes before unstaking`.grey);
        await walletUtils.delay(UNSTAKE_DELAY); 
        
        // Unstake gMON
        await unstakeGMON(wallet, stakeAmount);
        
        console.log(`✅ Kitsu process completed successfully`.green);
        return true;
    } catch (error) {
        console.error(`❌ Kitsu process failed:`.red, error.message);
        return false;
    }
}

async function main() {
    try {
        const wallet = await walletUtils.getWallet();
        await runKitsuProcess(wallet);
    } catch (error) {
        console.error(`❌ Main process error: ${error.message}`.red);
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
module.exports = { runKitsuProcess, main };