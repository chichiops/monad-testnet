const prompts = require("prompts");
const fs = require("fs");
const path = require("path");
const colors = require("colors");
const { fork } = require("child_process");

// Function to read wallets and proxies from file
async function readWalletsAndProxies(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    
    const walletData = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('#')) continue;
      
      const parts = line.split('|');
      const privateKey = parts[0].trim();
      const proxy = parts.length > 1 ? parts[1].trim() : null;
      
      if (privateKey) {
        walletData.push({ privateKey, proxy, index: i + 1 });
      }
    }
    
    return walletData;
  } catch (error) {
    console.error(`Error reading wallets file: ${error.message}`);
    return [];
  }
}

// Format proxy string for use in HTTP requests
function formatProxy(proxyString) {
  if (!proxyString) return null;
  
  const proxyParts = proxyString.split(':');
  if (proxyParts.length >= 2) {
    const host = proxyParts[0];
    const port = proxyParts[1];
    
    if (proxyParts.length >= 4) {
      const username = proxyParts[2];
      const password = proxyParts[3];
      return `http://${username}:${password}@${host}:${port}`;
    } else {
      return `http://${host}:${port}`;
    }
  }
  return null;
}

// Function to run a script with wallet and proxy directly passed as arguments
function runScript(scriptPath, walletData, displayName = null) {
  return new Promise((resolve, reject) => {
    const moduleName = displayName || path.basename(scriptPath, path.extname(scriptPath));
    
    console.log(colors.cyan(`\n🔄 Running ${moduleName}...\n`));

    // Format proxy for environment variables
    const formattedProxy = formatProxy(walletData.proxy);
    
    // Use fork to pass wallet data directly
    const childProcess = fork(scriptPath, [], {
      env: { 
        ...process.env, 
        NODE_ENV: process.env.NODE_ENV || 'production',
        PRIVATE_KEY: walletData.privateKey,
        HTTP_PROXY: formattedProxy,
        HTTPS_PROXY: formattedProxy
      },
      stdio: ['inherit', 'pipe', 'pipe', 'ipc']
    });

    let output = '';
    
    childProcess.stdout.on('data', (data) => {
      const str = data.toString();
      output += str;
      console.log(str);
    });
    
    childProcess.stderr.on('data', (data) => {
      console.error(colors.red(`Error: ${data.toString()}`));
    });
    
    childProcess.on('exit', (code) => {
      if (code === 0) {
        console.log(colors.green(`✅ ${moduleName} completed successfully`));
        resolve();
      } else {
        console.error(colors.red(`⚠️ ${moduleName} failed with code ${code}`));
        // Still resolve to continue with next module
        resolve();
      }
    });
    
    childProcess.on('error', (error) => {
      console.error(colors.red(`Error running ${moduleName}: ${error.message}`));
      // Still resolve to continue with next module
      resolve();
    });
  });
}

// Function for a random delay
function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Main function with enhanced wallet handling
async function main() {
  console.log(colors.blue.bold("\n🚀 Enhanced Multi-Wallet Auto Executor\n"));

  const scripts = [
    { name: "Uniswap Swap", path: "./modul/uniswap.js" },
    { name: "Deploy Contract", path: "./modul/deploy.mjs" },
    { name: "Rubic Swap", path: "./modul/rubic.js" },
    { name: "Bean Swap", path: "./modul/bean.js" },
    { name: "Magma Staking", path: "./modul/magma.js" },
    { name: "Izumi Swap", path: "./modul/izumi.js" },
    { name: "aPriori Staking", path: "./modul/apriori.js" },
    { name: "Bebop Swap", path: "./modul/bebop.js" },
    { name: "Monorail", path: "./modul/mono.js" },
    { name: "Kitsu", path: "./modul/kitsu.js" },
  ];

  // Mode selection
  const { mode } = await prompts({
    type: "select",
    name: "mode",
    message: "Choose Mode:",
    choices: [
      { title: "Multi-Wallet Mode (from file)", value: "multi" },
      { title: "Single Wallet Mode (manual input)", value: "single" }
    ],
    initial: 0
  });

  let walletData = [];
  
  if (mode === "multi") {
    const { walletsFile } = await prompts({
      type: "text",
      name: "walletsFile",
      message: "Enter path to your wallets file (format: privateKey|proxy):",
      initial: "./wallets.txt"
    });

    walletData = await readWalletsAndProxies(walletsFile);
    
    if (walletData.length === 0) {
      console.error(colors.red("❌ No valid wallets found in the file. Please check the format."));
      process.exit(1);
    }
    
    console.log(colors.green(`✅ Loaded ${walletData.length} wallets from ${walletsFile}`));
  } else {
    // Single wallet mode with manual input
    const { privateKey } = await prompts({
      type: "password",
      name: "privateKey",
      message: "Enter your private key:",
      validate: value => value ? true : "Private key is required"
    });
    
    const { useProxy } = await prompts({
      type: "confirm",
      name: "useProxy",
      message: "Do you want to use a proxy?",
      initial: false
    });
    
    let proxy = null;
    if (useProxy) {
      const { proxyString } = await prompts({
        type: "text",
        name: "proxyString",
        message: "Enter your proxy (format: host:port or host:port:username:password):",
        validate: value => value ? true : "Proxy is required"
      });
      proxy = proxyString;
    }
    
    walletData = [{ privateKey, proxy, index: 1 }];
    console.log(colors.green(`✅ Using single wallet with ${proxy ? 'proxy' : 'no proxy'}`));
  }

  // Wallet order selection
  const { walletOrder } = await prompts({
    type: "select",
    name: "walletOrder",
    message: "Choose wallet execution order:",
    choices: [
      { title: "Sequential (1, 2, 3, ...)", value: "sequential" },
      { title: "Random order", value: "random" }
    ],
    initial: 0
  });

  if (walletOrder === "random") {
    walletData = walletData.sort(() => Math.random() - 0.5);
    console.log(colors.yellow("🔀 Wallets will be processed in random order"));
  }

  // Module selection
  const { selectedModules } = await prompts({
    type: "autocompleteMultiselect",
    name: "selectedModules",
    message: "Select modules to run:",
    choices: scripts.map(script => ({
      title: script.name,
      value: script,
      selected: true
    })),
    hint: "Use up/down arrows to navigate, space to select, enter to confirm",
    min: 1
  });

  // Module order selection
  const { moduleOrder } = await prompts({
    type: "select",
    name: "moduleOrder",
    message: "Choose module execution order:",
    choices: [
      { title: "Sequential (as selected)", value: "sequential" },
      { title: "Random order for each wallet", value: "random" }
    ],
    initial: 0
  });

  // Get loop count
  const { loopCount } = await prompts({
    type: "number",
    name: "loopCount",
    message: "How many times to run the modules for each wallet?",
    validate: value => (value > 0 ? true : "Please enter a number greater than 0"),
    initial: 1
  });

  // Delay settings
  const { customDelays } = await prompts({
    type: "confirm",
    name: "customDelays",
    message: "Do you want to customize delay settings?",
    initial: false
  });

  let delaySettings = {
    betweenModules: { min: 2000, max: 5000 },
    betweenWallets: { min: 10000, max: 30000 },
    betweenLoops: { min: 30000, max: 60000 }
  };

  if (customDelays) {
    const delayPrompts = await prompts([
      {
        type: "number",
        name: "betweenModulesMin",
        message: "Minimum delay between modules (seconds):",
        initial: 2,
        validate: value => (value >= 0 ? true : "Value must be 0 or positive")
      },
      {
        type: "number",
        name: "betweenModulesMax",
        message: "Maximum delay between modules (seconds):",
        initial: 5,
        validate: (value, prev) => (value >= prev.betweenModulesMin ? true : "Max must be >= min")
      },
      {
        type: "number",
        name: "betweenWalletsMin",
        message: "Minimum delay between wallets (seconds):",
        initial: 10,
        validate: value => (value >= 0 ? true : "Value must be 0 or positive")
      },
      {
        type: "number",
        name: "betweenWalletsMax",
        message: "Maximum delay between wallets (seconds):",
        initial: 30,
        validate: (value, prev) => (value >= prev.betweenWalletsMin ? true : "Max must be >= min")
      },
      {
        type: "number",
        name: "betweenLoopsMin",
        message: "Minimum delay between loops (seconds):",
        initial: 30,
        validate: value => (value >= 0 ? true : "Value must be 0 or positive")
      },
      {
        type: "number",
        name: "betweenLoopsMax",
        message: "Maximum delay between loops (seconds):",
        initial: 60,
        validate: (value, prev) => (value >= prev.betweenLoopsMin ? true : "Max must be >= min")
      }
    ]);

    delaySettings = {
      betweenModules: { 
        min: delayPrompts.betweenModulesMin * 1000, 
        max: delayPrompts.betweenModulesMax * 1000 
      },
      betweenWallets: { 
        min: delayPrompts.betweenWalletsMin * 1000, 
        max: delayPrompts.betweenWalletsMax * 1000 
      },
      betweenLoops: { 
        min: delayPrompts.betweenLoopsMin * 1000, 
        max: delayPrompts.betweenLoopsMax * 1000 
      }
    };
  }

  // Final confirmation
  const { confirmRun } = await prompts({
    type: "confirm",
    name: "confirmRun",
    message: `Ready to run ${selectedModules.length} modules for ${walletData.length} wallet(s) (${loopCount} loop(s)). Continue?`,
    initial: true
  });

  if (!confirmRun) {
    console.log(colors.yellow("Operation cancelled by user."));
    process.exit(0);
  }

  console.log(colors.green(`\n🚀 Starting execution: ${selectedModules.length} modules for ${walletData.length} wallet(s) (${loopCount} loop(s))\n`));

  try {
    // Create displayHeader function globally to ensure modules can access it
    if (typeof global.displayHeader !== 'function') {
      global.displayHeader = function() {
        console.log(colors.yellow("===================================="));
        console.log(colors.cyan("🚀 Monad Testnet Automation Script 🚀"));
        console.log(colors.green("📡 Auto Multi-Wallet Executor"));
        console.log(colors.yellow("===================================="));
      };
    }
    
    // Main execution loop
    for (let loop = 0; loop < loopCount; loop++) {
      console.log(colors.blue.bold(`\n🔄 Loop ${loop + 1} of ${loopCount}\n`));
      
      for (const wallet of walletData) {
        console.log(colors.yellow.bold(`\n👛 Processing wallet #${wallet.index}${wallet.proxy ? ' with proxy' : ''}`));
        
        // Determine module execution order for this wallet
        let modulesToRun = [...selectedModules];
        if (moduleOrder === "random") {
          modulesToRun = modulesToRun.sort(() => Math.random() - 0.5);
          console.log(colors.blue("🔀 Modules will be executed in random order for this wallet"));
        }
        
        // Run each module
        for (let i = 0; i < modulesToRun.length; i++) {
          const module = modulesToRun[i];
          
          try {
            await runScript(module.path, wallet, module.name);
          } catch (error) {
            console.error(colors.red(`⚠️ ${module.name} failed: ${error.message}`));
          }
          
          // Small delay between modules (if not the last module)
          if (i < modulesToRun.length - 1) {
            const moduleDelay = getRandomDelay(
              delaySettings.betweenModules.min, 
              delaySettings.betweenModules.max
            );
            console.log(colors.gray(`⏱️ Waiting ${moduleDelay/1000} seconds before next module...\n`));
            await new Promise(r => setTimeout(r, moduleDelay));
          }
        }
        
        // Delay between wallets (if not the last wallet)
        if (walletData.indexOf(wallet) < walletData.length - 1) {
          const walletDelay = getRandomDelay(
            delaySettings.betweenWallets.min, 
            delaySettings.betweenWallets.max
          );
          console.log(colors.gray(`\n⏱️ Waiting ${walletDelay/1000} seconds before next wallet...\n`));
          await new Promise(r => setTimeout(r, walletDelay));
        }
      }
      
      // Delay between loops (if not the last loop)
      if (loop < loopCount - 1) {
        const loopDelay = getRandomDelay(
          delaySettings.betweenLoops.min, 
          delaySettings.betweenLoops.max
        );
        console.log(colors.gray(`\n⏱️ Waiting ${loopDelay/1000} seconds before next loop...\n`));
        await new Promise(r => setTimeout(r, loopDelay));
      }
    }
    
    console.log(colors.green.bold("\n✅✅ All operations completed successfully! ✅✅\n"));
  } catch (error) {
    console.error(colors.red(`\n❌ Execution failed: ${error.message}\n`));
  }
}

// Fix for displayHeader function that might be missing in some modules
function displayHeader() {
  console.log(colors.yellow("===================================="));
  console.log(colors.cyan("🚀 Monad Testnet Automation Script 🚀"));
  console.log(colors.green("📡 Auto Multi-Wallet Executor"));
  console.log(colors.yellow("===================================="));
}

// Export for modules that might need it
global.displayHeader = displayHeader;

// Start the program
main().catch(error => {
  console.error(colors.red(`Fatal error: ${error.message}`));
  process.exit(1);
});
if (process.argv.includes('--dashboard')) {
  const http = require('http');
  const server = http.createServer((req, res) => {
    const stats = txLogger.generateSummary();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    
    let html = '<html><head><title>Transaction Dashboard</title></head><body>';
    html += `<h1>Wallet Automation Dashboard</h1>`;
    html += `<p>Total Transactions: ${stats.totalTransactions}</p>`;
    html += `<p>Wallets Used: ${stats.walletsUsed}</p>`;
    
    html += `<h2>Module Statistics</h2><table border="1">`;
    html += `<tr><th>Module</th><th>Total</th><th>Success</th><th>Error</th><th>Success Rate</th></tr>`;
    
    Object.keys(stats.moduleStats).forEach(module => {
      const data = stats.moduleStats[module];
      html += `<tr><td>${module}</td><td>${data.total}</td><td>${data.success}</td>`;
      html += `<td>${data.error}</td><td>${data.successRate}</td></tr>`;
    });
    
    html += `</table></body></html>`;
    res.end(html);
  });
  
  server.listen(8080, () => {
    console.log('Dashboard running at http://localhost:8080');
  });
}