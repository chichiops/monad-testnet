/**
 * Transaction logger for tracking script activity
 * Records all transactions and their status
 */

const fs = require("fs");
const path = require("path");
const colors = require("colors");
const config = require("./config");

// Define log levels
const LOG_LEVELS = {
  INFO: "INFO",
  SUCCESS: "SUCCESS",
  WARNING: "WARNING",
  ERROR: "ERROR"
};

// Storage for transaction data
const transactionHistory = [];

/**
 * Log a transaction
 * @param {string} walletAddress - Wallet address
 * @param {string} module - Module name (e.g., "Uniswap", "Apriori")
 * @param {string} action - Action performed (e.g., "Swap", "Stake")
 * @param {string} status - Transaction status
 * @param {string} txHash - Transaction hash (optional)
 * @param {string} details - Additional details (optional)
 */
function logTransaction(walletAddress, module, action, status, txHash = null, details = null) {
  const timestamp = new Date().toISOString();
  
  const logEntry = {
    timestamp,
    walletAddress: walletAddress.substring(0, 6) + "..." + walletAddress.substring(38),
    walletAddressFull: walletAddress,
    module,
    action,
    status,
    txHash,
    details
  };
  
  // Add to in-memory history
  transactionHistory.push(logEntry);
  
  // Write to file if enabled
  if (config.logging.enableFileLogging) {
    const logFile = config.logging.logFilePath || "./transaction-logs.txt";
    
    let logLine = `[${timestamp}] [${module}] [${status}] `;
    logLine += `Wallet ${logEntry.walletAddress} performed ${action}`;
    
    if (txHash) {
      logLine += ` - TX: ${txHash}`;
    }
    
    if (details) {
      logLine += ` - Details: ${details}`;
    }
    
    logLine += "\n";
    
    try {
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error(`Error writing to log file: ${error.message}`);
    }
  }
  
  return logEntry;
}

/**
 * Log a successful transaction
 */
function logSuccess(walletAddress, module, action, txHash = null, details = null) {
  console.log(colors.green(`✅ [${module}] ${action}${details ? ` - ${details}` : ''}`));
  return logTransaction(walletAddress, module, action, LOG_LEVELS.SUCCESS, txHash, details);
}

/**
 * Log a failed transaction
 */
function logError(walletAddress, module, action, details = null, txHash = null) {
  console.log(colors.red(`❌ [${module}] ${action} - ${details || 'Failed'}`));
  return logTransaction(walletAddress, module, action, LOG_LEVELS.ERROR, txHash, details);
}

/**
 * Log information (not a transaction)
 */
function logInfo(walletAddress, module, action, details = null) {
  console.log(colors.cyan(`ℹ️ [${module}] ${action}${details ? ` - ${details}` : ''}`));
  return logTransaction(walletAddress, module, action, LOG_LEVELS.INFO, null, details);
}

/**
 * Log a warning (not a transaction)
 */
function logWarning(walletAddress, module, action, details = null) {
  console.log(colors.yellow(`⚠️ [${module}] ${action}${details ? ` - ${details}` : ''}`));
  return logTransaction(walletAddress, module, action, LOG_LEVELS.WARNING, null, details);
}

/**
 * Get transaction history for a specific wallet
 * @param {string} walletAddress - Wallet address
 * @returns {Array} Transaction history for the wallet
 */
function getWalletHistory(walletAddress) {
  return transactionHistory.filter(entry => 
    entry.walletAddressFull.toLowerCase() === walletAddress.toLowerCase()
  );
}

/**
 * Get transaction history for a specific module
 * @param {string} module - Module name
 * @returns {Array} Transaction history for the module
 */
function getModuleHistory(module) {
  return transactionHistory.filter(entry => entry.module === module);
}

/**
 * Generate a summary report
 * @returns {Object} Summary statistics
 */
function generateSummary() {
  const walletsUsed = new Set(transactionHistory.map(entry => entry.walletAddressFull)).size;
  
  const moduleStats = {};
  transactionHistory.forEach(entry => {
    if (!moduleStats[entry.module]) {
      moduleStats[entry.module] = {
        total: 0,
        success: 0,
        error: 0
      };
    }
    
    moduleStats[entry.module].total++;
    
    if (entry.status === LOG_LEVELS.SUCCESS) {
      moduleStats[entry.module].success++;
    } else if (entry.status === LOG_LEVELS.ERROR) {
      moduleStats[entry.module].error++;
    }
  });
  
  // Calculate success rate
  Object.keys(moduleStats).forEach(module => {
    const stats = moduleStats[module];
    stats.successRate = stats.total > 0 ? 
      ((stats.success / stats.total) * 100).toFixed(2) + "%" : 
      "N/A";
  });
  
  return {
    totalTransactions: transactionHistory.length,
    walletsUsed,
    startTime: transactionHistory.length > 0 ? transactionHistory[0].timestamp : null,
    endTime: transactionHistory.length > 0 ? transactionHistory[transactionHistory.length - 1].timestamp : null,
    moduleStats
  };
}

/**
 * Create a CSV export of the transaction history
 * @param {string} outputPath - Path to save the CSV file
 */
function exportToCsv(outputPath = null) {
  if (!outputPath) {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    outputPath = path.join(process.cwd(), `transaction-history-${timestamp}.csv`);
  }
  
  let csvContent = "Timestamp,Wallet,Module,Action,Status,TxHash,Details\n";
  
  transactionHistory.forEach(entry => {
    const txHash = entry.txHash || "";
    const details = entry.details ? entry.details.replace(/,/g, ';') : "";
    
    csvContent += `${entry.timestamp},${entry.walletAddressFull},${entry.module},` +
      `${entry.action},${entry.status},${txHash},${details}\n`;
  });
  
  try {
    fs.writeFileSync(outputPath, csvContent);
    return outputPath;
  } catch (error) {
    console.error(`Error writing CSV file: ${error.message}`);
    return null;
  }
}

// Export functions
module.exports = {
  logTransaction,
  logSuccess,
  logError,
  logInfo,
  logWarning,
  getWalletHistory,
  getModuleHistory,
  generateSummary,
  exportToCsv,
  LOG_LEVELS
};