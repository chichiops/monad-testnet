/**
 * Configuration file for the multi-wallet script
 * Centralizes all configurable options
 */

// Import colors for console output styling
const colors = require("colors");

module.exports = {
  // Network configuration
  network: {
    rpcUrls: [
      "https://testnet-rpc.monad.xyz",
      "https://testnet-rpc.monorail.xyz",
      "https://monad-testnet.drpc.org"
    ],
    explorerUrl: "https://testnet.monadexplorer.com/tx/",
    chainId: 10143
  },
  
  // Contract addresses
  contracts: {
    uniswapRouter: "0xCa810D095e90Daae6e867c19DF6D9A8C56db2c89",
    weth: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701",
    apriori: "0xb2f82D0f38dc453D596Ad40A37799446Cc89274A",
    kitsu: "0x2c9C959516e9AAEdB2C748224a41249202ca8BE7",
    monorail: "0xC995498c22a012353FAE7eCC701810D673E25794"
  },
  
  // Token addresses
  tokens: {
    "DAC": "0x0f0bdebf0f83cd1ee3974779bcb7315f9808c714",
    "USDT": "0x88b8e2161dedc77ef4ab7585569d2415a1c1055d",
    "WETH": "0x836047a99e11f376522b447bffb6e3495dd0637c",
    "MUK": "0x989d38aeed8408452f0273c7d4a17fef20878e62",
    "USDC": "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
    "CHOG": "0xE0590015A873bF326bd645c3E1266d4db41C4E6B",
  },
  
  // Default transaction parameters
  transaction: {
    gasLimitStake: 500000,
    gasLimitUnstake: 800000,
    gasLimitClaim: 800000,
    gasLimitSwap: 210000
  },
  
  // Amount ranges for transactions
  amounts: {
    swap: {
      min: 0.01,
      max: 0.05
    },
    stake: {
      min: 0.01,
      max: 0.05
    },
    kitsuStake: 0.1
  },
  
  // Delay settings (in milliseconds)
  delays: {
    betweenModules: {
      min: 2000,
      max: 5000
    },
    betweenWallets: {
      min: 10000,
      max: 30000
    },
    betweenLoops: {
      min: 30000, 
      max: 60000
    },
    unstakeKitsu: 5 * 60 * 1000,
    claimPeriod: 11 * 60 * 1000
  },
  
  // Logging options
  logging: {
    enableFileLogging: true,
    logFilePath: "./transaction-logs.txt",
    consoleColors: true
  },
  
  // Retry settings
  retry: {
    maxAttempts: 3,
    delayBetweenAttempts: 5000
  },

  // Console colors configuration
  colors: {
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
    info: colors.cyan,
    highlight: colors.magenta,
    muted: colors.grey,
    title: colors.blue.bold
  }
};