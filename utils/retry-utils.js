/**
 * Utilities for retrying failed transactions
 */

const { ethers } = require("ethers");
const colors = require("colors");
const config = require("./config");
const txLogger = require("./transaction-logger");

/**
 * Wait for a specified time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} A promise that resolves after the delay
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Result of the function call
 */
async function retryWithBackoff(fn, options = {}) {
  const maxRetries = options.maxRetries || config.retry.maxAttempts;
  const initialDelay = options.initialDelay || config.retry.delayBetweenAttempts;
  const maxDelay = options.maxDelay || 30000; // Max 30 seconds
  const factor = options.factor || 2; // Exponential factor
  const wallet = options.wallet;
  const moduleName = options.moduleName || "Unknown";
  const actionName = options.actionName || "Transaction";
  
  let attempt = 1;
  let lastError;
  
  while (attempt <= maxRetries) {
    try {
      // If first attempt, log information
      if (attempt === 1 && wallet) {
        txLogger.logInfo(
          wallet.address,
          moduleName,
          `Starting ${actionName}`,
          null
        );
      }
      
      // If retry, log the retry attempt
      if (attempt > 1 && wallet) {
        txLogger.logWarning(
          wallet.address,
          moduleName,
          `Retrying ${actionName}`,
          `Attempt ${attempt}/${maxRetries}`
        );
      }
      
      // Execute the function
      const result = await fn();
      
      // Log success if wallet provided
      if (wallet && attempt > 1) {
        let txHash = null;
        if (result && result.hash) {
          txHash = result.hash;
        } else if (result && result.transactionHash) {
          txHash = result.transactionHash;
        }
        
        txLogger.logSuccess(
          wallet.address,
          moduleName,
          actionName,
          txHash,
          `Completed successfully on retry attempt ${attempt}`
        );
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Check if we should retry based on error type
      if (!shouldRetry(error)) {
        // Log error if wallet provided
        if (wallet) {
          txLogger.logError(
            wallet.address,
            moduleName,
            actionName,
            `Fatal error: ${error.message}`,
            null
          );
        }
        
        throw error; // Don't retry on fatal errors
      }
      
      // Log the error
      if (wallet) {
        txLogger.logWarning(
          wallet.address,
          moduleName,
          actionName,
          `Error on attempt ${attempt}: ${error.message}`
        );
      }
      
      // Last attempt - throw the error
      if (attempt === maxRetries) {
        // Log final error if wallet provided
        if (wallet) {
          txLogger.logError(
            wallet.address,
            moduleName,
            actionName,
            `Failed after ${maxRetries} attempts: ${error.message}`,
            null
          );
        }
        
        throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Calculate delay with exponential backoff
      const backoffDelay = Math.min(initialDelay * Math.pow(factor, attempt - 1), maxDelay);
      
      // Apply jitter (randomness) to avoid thundering herd problem
      const jitter = Math.random() * 0.3 + 0.85; // 0.85 to 1.15
      const actualDelay = Math.floor(backoffDelay * jitter);
      
      console.log(`Retrying in ${actualDelay}ms... (Attempt ${attempt}/${maxRetries})`.yellow);
      await delay(actualDelay);
      
      attempt++;
    }
  }
}

/**
 * Determine if we should retry based on the error
 * @param {Error} error - The error that occurred
 * @returns {boolean} Whether the operation should be retried
 */
function shouldRetry(error) {
  // Error message patterns that indicate we should retry
  const retryableErrors = [
    // Network errors
    /network error/i,
    /timeout/i,
    /connection refused/i,
    /connection reset/i,
    /connection closed/i,
    /not connected/i,
    /etimedout/i,
    /econnrefused/i,
    /econnreset/i,
    /unexpected end of file/i,
    
    // JSON-RPC errors
    /server error/i,
    /invalid json response/i,
    /too many requests/i,
    /rate limited/i,
    /server busy/i,
    
    // Transaction errors
    /transaction underpriced/i,
    /transaction replaced/i,
    /nonce too low/i,
    /insufficient funds for gas/i,
    /gas price too low/i,
    
    // General blockchain errors
    /cannot estimate gas/i,
    /execution reverted/i,
    /intrinsic gas too low/i
  ];
  
  const errorMessage = error.message.toLowerCase();
  
  // Check if the error matches any retryable pattern
  return retryableErrors.some(pattern => pattern.test(errorMessage));
}

/**
 * Retry a transaction with a new gas price
 * @param {Function} txFunction - Function that returns a transaction
 * @param {Object} wallet - Ethers.js wallet instance
 * @param {Object} options - Options for the retry
 * @returns {Promise} Transaction result
 */
async function retryWithIncreasedGas(txFunction, wallet, options = {}) {
  const maxRetries = options.maxRetries || 3;
  const initialGasMultiplier = options.initialGasMultiplier || 1.1; // 10% increase
  const maxGasMultiplier = options.maxGasMultiplier || 2.0; // Maximum 2x increase
  const moduleName = options.moduleName || "Unknown";
  const actionName = options.actionName || "Transaction";
  
  let attempt = 1;
  let lastError;
  
  while (attempt <= maxRetries) {
    try {
      // Calculate gas price multiplier - increase with each attempt
      const multiplierIncrement = (maxGasMultiplier - initialGasMultiplier) / (maxRetries - 1);
      const gasMultiplier = initialGasMultiplier + (multiplierIncrement * (attempt - 1));
      
      // Log the attempt
      if (attempt > 1) {
        txLogger.logWarning(
          wallet.address,
          moduleName,
          actionName,
          `Retrying with ${(gasMultiplier * 100).toFixed(0)}% gas price (Attempt ${attempt}/${maxRetries})`
        );
      }
      
      // Execute transaction with increased gas
      const result = await txFunction(gasMultiplier);
      
      // Log success only if this was a retry
      if (attempt > 1) {
        txLogger.logSuccess(
          wallet.address,
          moduleName,
          actionName,
          result.hash || result.transactionHash,
          `Completed successfully with ${(gasMultiplier * 100).toFixed(0)}% gas price on attempt ${attempt}`
        );
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Check if error is gas-related
      const isGasError = /gas/i.test(error.message) || 
                         /underpriced/i.test(error.message) ||
                         /fee/i.test(error.message);
      
      // If not a gas error or last attempt, don't retry
      if (!isGasError || attempt === maxRetries) {
        txLogger.logError(
          wallet.address,
          moduleName,
          actionName,
          `Failed: ${error.message}`,
          null
        );
        
        throw error;
      }
      
      // Log warning
      txLogger.logWarning(
        wallet.address,
        moduleName,
        actionName,
        `Gas error on attempt ${attempt}: ${error.message}`
      );
      
      // Wait before retry
      await delay(2000);
      attempt++;
    }
  }
}

module.exports = {
  retryWithBackoff,
  retryWithIncreasedGas,
  shouldRetry,
  delay
};