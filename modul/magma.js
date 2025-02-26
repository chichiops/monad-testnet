const { ethers } = require("ethers");
const colors = require("colors");
const walletUtils = require("../utils/wallet-utils");
const config = require("../utils/config");
const retryUtils = require("../utils/retry-utils");
const txLogger = require("../utils/transaction-logger");

// Use the displayHeader function
const displayHeader = global.displayHeader || walletUtils.displayHeader;
displayHeader();

const contractAddress = config.contracts.kitsu;
const gasLimitStake = config.transaction.gasLimitStake;
const gasLimitUnstake = config.transaction.gasLimitUnstake;

async function stakeMON(wallet) {
    return retryUtils.retryWithBackoff(async () => {
        try {
            const stakeAmount = walletUtils.getRandomEthAmount(
                config.amounts.stake.min,
                config.amounts.stake.max
            );
            
            console.log(`🪫  Starting Magma ⏩⏩⏩⏩`.blue);
            console.log(` `);
            console.log(`🔄 Magma stake: ${ethers.utils.formatEther(stakeAmount)} MON`.magenta);

            return await retryUtils.retryWithIncreasedGas(
                async (gasMultiplier = 1.0) => {
                    // Calculate gas price with multiplier
                    const gasPrice = (await wallet.provider.getGasPrice()).mul(
                        Math.floor(gasMultiplier * 100)
                    ).div(100);
                    
                    const tx = {
                        to: contractAddress,
                        data: "0xd5575982",
                        gasLimit: ethers.utils.hexlify(gasLimitStake),
                        value: stakeAmount,
                        gasPrice
                    };

                    console.log(`🔄 STAKE`.green);
                    const txResponse = await wallet.sendTransaction(tx);
                    console.log(`➡️  Hash: ${txResponse.hash}`.yellow);
                    console.log(`🔄 Wait Confirmation`.green);
                    await txResponse.wait();
                    console.log(`✅ Stake DONE`.green);
                    
                    // Return both the transaction and the stake amount
                    return { txResponse, stakeAmount };
                },
                wallet,
                { 
                    moduleName: "Magma", 
                    actionName: "Stake MON"
                }
            );
        } catch (error) {
            console.error(`❌ Staking failed:`.red, error.message);
            throw error;
        }
    }, { 
        wallet, 
        moduleName: "Magma", 
        actionName: "Stake MON" 
    });
}

async function unstakeGMON(wallet, amountToUnstake) {
    return retryUtils.retryWithBackoff(async () => {
        try {
            console.log(`🔄 Unstake: ${ethers.utils.formatEther(amountToUnstake)} gMON`.green);

            return await retryUtils.retryWithIncreasedGas(
                async (gasMultiplier = 1.0) => {
                    // Calculate gas price with multiplier
                    const gasPrice = (await wallet.provider.getGasPrice()).mul(
                        Math.floor(gasMultiplier * 100)
                    ).div(100);
                    
                    const functionSelector = "0x6fed1ea7";
                    const paddedAmount = ethers.utils.hexZeroPad(amountToUnstake.toHexString(), 32);
                    const data = functionSelector + paddedAmount.slice(2);

                    const tx = {
                        to: contractAddress,
                        data: data,
                        gasLimit: ethers.utils.hexlify(gasLimitUnstake),
                        gasPrice
                    };

                    console.log(`🔄 Unstake`.red);
                    const txResponse = await wallet.sendTransaction(tx);
                    console.log(`➡️ Hash: ${txResponse.hash}`.yellow);
                    console.log(`🔄 Wait Confirmation`.green);
                    await txResponse.wait();
                    console.log(`✅ Unstake DONE`.green);
                    return txResponse;
                },
                wallet,
                { 
                    moduleName: "Magma", 
                    actionName: "Unstake gMON"
                }
            );
        } catch (error) {
            console.error(`❌ Unstaking failed:`.red, error.message);
            throw error;
        }
    }, { 
        wallet, 
        moduleName: "Magma", 
        actionName: "Unstake gMON" 
    });
}

async function runMagmaProcess(wallet) {
    txLogger.logInfo(wallet.address, "Magma", "Process Started", "Starting staking process");
    try {
        // Stake MON
        const result = await stakeMON(wallet);
        if (!result) {
            throw new Error("Staking failed");
        }
        
        const { txResponse: stakeTx, stakeAmount } = result;
        
        txLogger.logSuccess(
            wallet.address,
            "Magma",
            "Stake MON",
            stakeTx.hash,
            `Amount: ${ethers.utils.formatEther(stakeAmount)} MON`
        );
        
        // Wait for a bit before unstaking
        const waitTime = 73383; // Specific delay from original script
        console.log(`🔄 wait for ${waitTime / 1000} seconds before unstaking`.yellow);
        txLogger.logInfo(
            wallet.address, 
            "Magma", 
            "Waiting", 
            `Delaying ${waitTime / 1000} seconds before unstaking`
        );
        await walletUtils.delay(waitTime);
        
        // Unstake gMON
        const unstakeTx = await unstakeGMON(wallet, stakeAmount);
        if (unstakeTx) {
            txLogger.logSuccess(
                wallet.address,
                "Magma",
                "Unstake gMON",
                unstakeTx.hash,
                `Amount: ${ethers.utils.formatEther(stakeAmount)} gMON`
            );
        }
        
        txLogger.logSuccess(
            wallet.address,
            "Magma",
            "Process Completed",
            null,
            "Staking and unstaking completed successfully"
        );
        return true;
    } catch (error) {
        console.error(`❌ Magma process failed:`.red, error.message);
        txLogger.logError(
            wallet.address,
            "Magma",
            "Process Failed",
            error.message
        );
        return false;
    }
}

async function main() {
    try {
        const wallet = await walletUtils.getWallet();
        await runMagmaProcess(wallet);
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
module.exports = { runMagmaProcess, main };