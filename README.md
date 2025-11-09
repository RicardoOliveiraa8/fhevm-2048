# 🎮 FHEVM 2048 React dApp

A React frontend for a Fully Homomorphic Encryption (FHE)-enabled 2048 game.  
This dApp allows players to play 2048, submit encrypted scores on-chain, and securely decrypt their leaderboard results.

---

## ✨ Features

- 🟪 React + TypeScript setup
- 🔒 FHE-based encrypted score submission
- 💼 Wallet integration with RainbowKit & Wagmi
- 🎨 Animated and responsive 2048 board
- 📊 Decrypted leaderboard view per player
- 🌐 Fully client-side, scores encrypted before submission
- ⏳ Game state preserved between moves until restart

---

## 🕹️ How to Play

**Objective:**  
Reach the **highest possible tile** on a 4×4 board by combining tiles with the same number. The game ends when no moves are possible (board is full and no adjacent tiles can merge).  

**Basic Rules:**  
1. Each move slides **all tiles** on the board in the chosen direction: `up`, `down`, `left`, or `right`.  
2. When two tiles of the same number collide, they **merge into one tile** with the sum of their values.  
3. Every move adds a **new random tile** (2 or 4) to an empty cell.  
4. The **score increases** by the value of merged tiles.  

**Game Flow in This dApp:**  
- Press **Start** to initialize the board and begin playing.  
- Use **arrow keys** to slide tiles.  
- Merged tiles immediately update your **score**.  
- If the board is full and no moves are possible, **Game Over** appears with your final score.  
- If you create a tile with **2048 or higher**, a **Victory** message appears with a blinking effect.  
- After the game ends, you can **encrypt and submit your score on-chain**.  
- Use **Restart** to start a new game anytime.

---

## 🚀 What is FHEVM?

FHEVM (Fully Homomorphic Encryption Virtual Machine) enables computation on encrypted data directly on Ethereum. This template demonstrates how to build dApps that can perform computations while keeping data private.

## ✨ Features

- **🔐 FHEVM Integration**: Built-in support for fully homomorphic encryption
- **⚛️ React + Next.js**: Modern, performant frontend framework
- **🎨 Tailwind CSS**: Utility-first styling for rapid UI development
- **🔗 RainbowKit**: Seamless wallet connection and management
- **🌐 Multi-Network Support**: Works on both Sepolia testnet and local Hardhat node
- **📦 Monorepo Structure**: Organized packages for SDK, contracts, and frontend

## 📋 Prerequinextjss

Before you begin, ensure you have:

- **Node.js** (v18 or higher)
- **pnpm** package manager
- **MetaMask** browser extension
- **Git** for cloning the repository

## 🛠️ Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd fhevm-2048

# Initialize submodules (includes fhevm-hardhat-template)
git submodule update --init --recursive

# Install dependencies
pnpm install
```

### 2. Environment Configuration

Set up your Hardhat environment variables by following the [FHEVM documentation](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup#set-up-the-hardhat-configuration-variables-optional):

- `MNEMONIC`: Your wallet mnemonic phrase
- `INFURA_API_KEY`: Your Infura API key for Sepolia

### 3. Start Development Environment

**Option A: Local Development (Recommended for testing)**

```bash
# Terminal 1: Start local Hardhat node
pnpm chain
# RPC URL: http://127.0.0.1:8545 | Chain ID: 31337

# Terminal 2: Deploy contracts to localhost
pnpm deploy:localhost

# Terminal 3: Start the frontend
pnpm start
```

**Option B: Sepolia Testnet**

```bash
# Deploy to Sepolia testnet
pnpm deploy:sepolia

# Start the frontend
pnpm start
```

### 4. Connect MetaMask

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. Click "Connect Wallet" and select MetaMask
3. If using localhost, add the Hardhat network to MetaMask:
   - **Network Name**: Hardhat Local
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: `ETH`

### ⚠️ Sepolia Production note

- In production, `NEXT_PUBLIC_ALCHEMY_API_KEY` must be set (see `packages/nextjs/scaffold.config.ts`). The app throws if missing.
- Ensure `packages/nextjs/contracts/deployedContracts.ts` points to your live contract addresses.
- Optional: set `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` for better WalletConnect reliability.
- Optional: add per-chain RPCs via `rpcOverrides` in `packages/nextjs/scaffold.config.ts`.

## 🔧 Troubleshooting

### Common MetaMask + Hardhat Issues

When developing with MetaMask and Hardhat, you may encounter these common issues:

#### ❌ Nonce Mismatch Error

**Problem**: MetaMask tracks transaction nonces, but when you restart Hardhat, the node resets while MetaMask doesn't update its tracking.

**Solution**:
1. Open MetaMask extension
2. Select the Hardhat network
3. Go to **Settings** → **Advanced**
4. Click **"Clear Activity Tab"** (red button)
5. This resets MetaMask's nonce tracking

#### ❌ Cached View Function Results

**Problem**: MetaMask caches smart contract view function results. After restarting Hardhat, you may see outdated data.

**Solution**:
1. **Restart your entire browser** (not just refresh the page)
2. MetaMask's cache is stored in extension memory and requires a full browser restart to clear

> 💡 **Pro Tip**: Always restart your browser after restarting Hardhat to avoid cache issues.

For more details, see the [MetaMask development guide](https://docs.metamask.io/wallet/how-to/run-devnet/).

## 📁 Project Structure

This template uses a monorepo structure with three main packages:

```
fhevm-2048/
├── packages/
│   ├── fhevm-hardhat-template/    # Smart contracts & deployment
│   ├── fhevm-sdk/                 # FHEVM SDK package
│   └── nextjs/                      # React frontend application
└── scripts/                       # Build and deployment scripts
```

### Key Components

#### 🔗 FHEVM Integration (`packages/nextjs/hooks`)
- **`useFHEGame2048.tsx`**: Example hook demonstrating FHEVM contract interaction
- Essential hooks for FHEVM-enabled smart contract communication
- Easily copyable to any FHEVM + React project

#### 🎣 Wallet Management (`packages/nextjs/hooks/helper/`)
- MetaMask wallet provider hooks
- Compatible with EIP-6963 standard
- Easily adaptable for other wallet providers

#### 🔧 Flexibility
- Replace `ethers.js` with `Wagmi` or other React-friendly libraries
- Modular architecture for easy customization
- Support for multiple wallet providers

## 📚 Additional Resources

### Official Documentation
- [FHEVM Documentation](https://docs.zama.ai/protocol/solidity-guides/) - Complete FHEVM guide
- [FHEVM Hardhat Guide](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat) - Hardhat integration
- [Relayer SDK Documentation](https://docs.zama.ai/protocol/relayer-sdk-guides/) - SDK reference
- [Environment Setup](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup#set-up-the-hardhat-configuration-variables-optional) - MNEMONIC & API keys

### Development Tools
- [MetaMask + Hardhat Setup](https://docs.metamask.io/wallet/how-to/run-devnet/) - Local development
- [React Documentation](https://reactjs.org/) - React framework guide

### Community & Support
- [FHEVM Discord](https://discord.com/invite/zama) - Community support
- [GitHub Issues](https://github.com/zama-ai/fhevm-react-template/issues) - Bug reports & feature requests

## 📄 License

This project is licensed under the **BSD-3-Clause-Clear License**. See the [LICENSE](LICENSE) file for details.
