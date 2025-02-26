const { ethers } = require("ethers");
const colors = require("colors");
const axios = require("axios");
const { HttpsProxyAgent } = require("https-proxy-agent");
const walletUtils = require("../utils/wallet-utils");

// Use the displayHeader function
const displayHeader = global.displayHeader || walletUtils.displayHeader;
displayHeader();

const EXPLORER_URL = "https://testnet.monadexplorer.com/tx/";

const contractAddress = "0xb2f82D0f38dc453D596Ad40A37799446Cc89274A";
const gasLimitStake = 500000;
const gasLimitUnstake = 800000;
const gasLimitClaim = 800000;

const minimalABI = [
  "function getPendingUnstakeRequests(address) view returns (uint256[] memory)",
];

async function createAxiosWithProxy() {
  const PROXY_URL = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
  if (PROXY_URL) {
    const httpsAgent = new HttpsProxyAgent(PROXY_URL);
    return axios.create({
      httpsAgent,
      timeout: 10000
    });
  }
  return axios;
}

async function stakeMON(wallet, cycleNumber) {
  try {
    const stakeAmount = walletUtils.getRandomEthAmount();

    console.log(
      `🔄 Stake: ${ethers.utils.formatEther(stakeAmount)} MON`.green
    );

    const data =
      "0x6e553f65" +
      ethers.utils.hexZeroPad(stakeAmount.toHexString(), 32).slice(2) +
      ethers.utils.hexZeroPad(wallet.address, 32).slice(2);

    const tx = {
      to: contractAddress,
      data: data,
      gasLimit: ethers.utils.hexlify(gasLimitStake),
      value: stakeAmount,
    };

    console.log(`✅ Stake `.magenta);
    const txResponse = await wallet.sendTransaction(tx);
    console.log(
      `➡️  Hash: ${txResponse.hash}`.yellow
    );

    console.log(`🔄 Wait confirmation`.grey);
    const receipt = await txResponse.wait();
    console.log(`✅ Stake successful!`.green);

    return { receipt, stakeAmount };
  } catch (error) {
    console.error(`❌ Staking failed:`.red, error.message);
    throw error;
  }
}

async function requestUnstakeAprMON(wallet, amountToUnstake, cycleNumber) {
  try {
    console.error(` `);
    console.log(
      `🔄 unstake: ${ethers.utils.formatEther(
        amountToUnstake
      )} aprMON`.green
    );

    const data =
      "0x7d41c86e" +
      ethers.utils.hexZeroPad(amountToUnstake.toHexString(), 32).slice(2) +
      ethers.utils.hexZeroPad(wallet.address, 32).slice(2) +
      ethers.utils.hexZeroPad(wallet.address, 32).slice(2);

    const tx = {
      to: contractAddress,
      data: data,
      gasLimit: ethers.utils.hexlify(gasLimitUnstake),
      value: ethers.utils.parseEther("0"),
    };

    console.log(`🔄 Unstake`.magenta);
    const txResponse = await wallet.sendTransaction(tx);
    console.log(
      `➡️   Hash: ${txResponse.hash}`.yellow
    );

    console.log(`🔄 Wait confirmation`.grey);
    const receipt = await txResponse.wait();
    console.log(`✅ Unstake successful`.green);

    return receipt;
  } catch (error) {
    console.error(`❌ Unstake failed:`.red, error.message);
    throw error;
  }
}

async function checkClaimableStatus(walletAddress) {
  try {
    const apiUrl = `https://testnet.monadexplorer.com/api/v1/unstake-requests?address=${walletAddress}`;
    
    // Use axios with proxy if available
    const axiosInstance = await createAxiosWithProxy();
    const response = await axiosInstance.get(apiUrl);

    const claimableRequest = response.data.find(
      (request) => !request.claimed && request.is_claimable
    );

    if (claimableRequest) {
      console.log(`✅ Found claimable: ${claimableRequest.id}`.green);
      return {
        id: claimableRequest.id,
        isClaimable: true,
      };
    }
    return {
      id: null,
      isClaimable: false,
    };
  } catch (error) {
    console.error(
      `❌ Failed Claimable :`.red,
      error.message
    );
    return {
      id: null,
      isClaimable: false,
    };
  }
}

async function claimMON(wallet, cycleNumber) {
  try {
    const { id, isClaimable } = await checkClaimableStatus(wallet.address);

    if (!isClaimable || !id) {
      console.log(`❌ No claimable`.red);
      return null;
    }

    console.log(`✅ Claim withdrawal: ${id}`.green);

    const data =
      "0x492e47d2" +
      "0000000000000000000000000000000000000000000000000000000000000040" +
      ethers.utils.hexZeroPad(wallet.address, 32).slice(2) +
      "0000000000000000000000000000000000000000000000000000000000000001" +
      ethers.utils
        .hexZeroPad(ethers.BigNumber.from(id).toHexString(), 32)
        .slice(2);

    const tx = {
      to: contractAddress,
      data: data,
      gasLimit: ethers.utils.hexlify(gasLimitClaim),
      value: ethers.utils.parseEther("0"),
    };

    console.log(`✅ Claim `.green);
    const txResponse = await wallet.sendTransaction(tx);
    console.log(`➡️ Hash: ${txResponse.hash}`.grey);

    console.log(`✅ Wait Confirmation`.green);
    const receipt = await txResponse.wait();
    console.log(`✅ Claim successful: ${id}`.green);

    return receipt;
  } catch (error) {
    console.error(`❌ Claim failed:`.red, error.message);
    throw error;
  }
}

async function runCycle(wallet, cycleNumber) {
  try {
    const { stakeAmount } = await stakeMON(wallet, cycleNumber);

    const delayTimeBeforeUnstake = walletUtils.getRandomDelay();
    console.log(
      `⏳ Wait ${
        delayTimeBeforeUnstake / 1000
      } Seconds`.grey
    );
    await walletUtils.delay(delayTimeBeforeUnstake);

    await requestUnstakeAprMON(wallet, stakeAmount, cycleNumber);

    console.log(
      `✅ Wait for claim...`.green
    );
    await walletUtils.delay(660000); // 11 minutes wait for claim to be ready

    await claimMON(wallet, cycleNumber);

    console.log(`✅ Cycle ${cycleNumber} completed successfully`.green);
    return true;
  } catch (error) {
    console.error(`❌ Cycle ${cycleNumber} failed: ${error.message}`.red);
    return false;
  }
}

async function runAprioriProcess(wallet, cycleCount = 1) {
  console.log(`🪫  Starting Apriori ⏩⏩⏩⏩`.blue);
  console.log(` `);
  console.log(`🧧 Account: ${wallet.address}`.green);

  let successCount = 0;

  for (let i = 1; i <= cycleCount; i++) {
    const success = await runCycle(wallet, i);
    if (success) successCount++;

    if (i < cycleCount) {
      const interCycleDelay = walletUtils.getRandomDelay();
      console.log(`⏳ Waiting ${interCycleDelay/1000} seconds before next cycle`.grey);
      await walletUtils.delay(interCycleDelay);
    }
  }

  console.log(`✅ Completed ${successCount} of ${cycleCount} cycles`.green);
  return successCount;
}

async function main() {
  try {
    const wallet = await walletUtils.getWallet();
    await runAprioriProcess(wallet, 1);
  } catch (error) {
    console.error(`❌ Main process error: ${error.message}`.red);
  }
}

// When run directly
if (require.main === module) {
  main().catch(error => {
    console.error(`❌ Unhandled error: ${error.message}`.red);
    process.exit(1);
  });
}

// Export function for use in multi-wallet script
module.exports = {
  runAprioriProcess,
  stakeMON,
  requestUnstakeAprMON,
  claimMON,
  main
};