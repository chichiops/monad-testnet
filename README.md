## Monad Testnet Automation

This tool automates interactions with the Monad testnet, including various DeFi operations and token interactions.

## Features
- 💱 Perform token swaps
- 🏦 Stake MON
- 🦉 Deploy contract 
- 💎 Supprt Multi Akun $ Proxy 

```bash
MonadSwap/
├── modul/
│   ├── uniswap.js
│   ├── bebop.js
│   ├── apriori.js
│   ├── deploy.mjs
│   ├── izumi.js
│   ├── kitsu.js
│   ├── mono.js
│   ├── rubic.js
│   ├── magma.js
│   ├── bean.js
├── utils/
│   ├── wallet-utils.js
│   ├── config.js
│   ├── wallet-balancer.js
│   ├── transaction-logger.js
│   ├── retry-utils.js
├── main.js
├── wallets.txt
└── package.json
```
1. Clone the repository
```bash
git clone https://github.com/chichiops/MonadSwap.git
cd MonadSwap
```

2. Install dependencies
```bash
npm install prompts colors ethers https-proxy-agent node-fetch path fs axios
```

3. Set Private Key $ Proxy
```bash
private_key_1|host:port:username:password
private_key_2|host:port
private_key_3
```
4. Create and Use Screen
```bash
screen -S monad
```
`Press Ctrl + A, then D to keep the session running in the background`.

5. Run the bot
```bash
node main.js
```
## Node.js Cleanup & Reinstallation
```bash
 sudo apt remove --purge nodejs npm libnode-dev -y
 sudo apt autoremove -y
 sudo rm -rf /usr/include/node /usr/lib/node_modules ~/.npm ~/.nvm
 curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
 sudo apt install -y nodejs
 node -v && npm -v
```


