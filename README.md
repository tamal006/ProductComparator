<div align="center">

# 🤖 Product Comparator AI Agent

### Universal AI-Powered Buying Assistant with Blockchain Payments

[![Solidity](https://img.shields.io/badge/Solidity-0.8.19-363636?logo=solidity)](https://soliditylang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Avalanche](https://img.shields.io/badge/Avalanche-Fuji_Testnet-E84142?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU0IiBoZWlnaHQ9IjI1NCIgdmlld0JveD0iMCAwIDI1NCAyNTQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjI1NCIgaGVpZ2h0PSIyNTQiIHJ4PSI0MiIgZmlsbD0iI0U4NDE0MiIvPjwvc3ZnPg==)](https://test.snowtrace.io/)
[![Groq](https://img.shields.io/badge/Groq-LLaMA_3.3_70B-F55036)](https://groq.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Compare any two products with AI-powered analysis, real-time Indian market prices, and on-chain payment verification — all from your terminal or browser.**

[Features](#-features) · [Architecture](#-architecture) · [Quick Start](#-quick-start) · [Demo](#-demo-workflow) · [Smart Contract](#-smart-contract)

</div>

---

## ✨ Features

### 🧠 Multi-Agent AI Analysis (15-Point Verdict)
- **3 AI agents** (Agent A, Agent B, Judge) debate and produce a structured comparison
- Powered by **Groq** inference (LLaMA 3.3-70b) for sub-second reasoning
- Outputs: trust scores, consensus scores, category winners, regret analysis, long-term insights, personalized recommendations, and more

### 💰 Best Price Finder (India)
| Platform | Type |
|----------|------|
| Amazon India | E-commerce |
| Flipkart | E-commerce |
| Blinkit | Quick Commerce |
| Swiggy Instamart | Quick Commerce |
| JioMart | Retail |

- Live scraping with **AI-powered fallback** for accurate MRP prices
- All prices in **₹ INR** — full retail MRP, never EMI
- Direct buy links to the cheapest platform

### 🔗 x402 Blockchain Payment Protocol
- ERC20 token micro-payments on **Avalanche Fuji Testnet**
- Payment verification via on-chain `Transfer` event parsing
- Supports **MetaMask**, **Core Wallet**, and **QR Code** payments

### 🌐 Dual Interface
- **CLI Agent** — Run comparisons from your terminal with beautifully formatted output
- **Web Dashboard** — Premium dark-themed UI with product images, score cards, price grids, and buy links

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│    ┌──────────────┐              ┌────────────────────┐          │
│    │  CLI Agent   │              │   Web Dashboard    │          │
│    │  agent.js    │              │  dashboard.html    │          │
│    └──────┬───────┘              └────────┬───────────┘          │
│           │           REST API           │                      │
└───────────┼──────────────────────────────┼──────────────────────┘
            │                              │
┌───────────▼──────────────────────────────▼──────────────────────┐
│                       BACKEND (Express)                          │
│  ┌─────────────┐ ┌────────────────┐ ┌────────────────────┐      │
│  │  Payment    │ │  Data Pipeline │ │    AI Engine        │      │
│  │  Verifier   │ │                │ │                     │      │
│  │  ERC20 Tx   │ │  Reviews ──┐   │ │  Agent A ──┐       │      │
│  │  Parsing    │ │  YouTube ──┼───┼─▶  Agent B ──┼─▶ Judge│      │
│  │             │ │  Prices  ──┘   │ │            ┘       │      │
│  │             │ │  Images ──────┘│ │                     │      │
│  └──────┬──────┘ └────────────────┘ └────────────────────┘      │
│         │                                                        │
└─────────┼────────────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────┐
│        AVALANCHE FUJI TESTNET            │
│   ProductComparatorPayment.sol           │
│   ├── Tiered Subscriptions               │
│   ├── Per-Query Micro-Payments           │
│   ├── Refund System (1hr window)         │
│   ├── Rate Limiting                      │
│   ├── Revenue Sharing                    │
│   └── Emergency Pause                    │
│                                          │
│   Contract: 0x4d9718e7235CC8c11E26...    │
└──────────────────────────────────────────┘
```

---

## 📂 Project Structure

```
product-comparator-agent/
├── agent/
│   └── agent.js              # CLI agent — x402 payment flow + formatted output
├── backend/
│   ├── server.js              # Express API — orchestrates the full pipeline
│   ├── aiEngine.js            # Groq-powered multi-agent reasoning (A/B/Judge)
│   ├── priceScraper.js        # Best Price Finder — live scraping + AI fallback
│   ├── imageFetcher.js        # Product image search (Bing, Google, Amazon)
│   ├── payment.js             # ERC20 on-chain transaction verification
│   ├── scraper.js             # E-commerce review scraper
│   ├── youtube.js             # YouTube opinion aggregator
│   └── tokenABI.json          # Full ERC20 smart contract ABI
├── contracts/
│   └── ProductPay.sol         # Advanced Solidity payment contract (350+ lines)
├── frontend/
│   ├── dashboard.html         # Web dashboard — premium dark-themed UI
│   └── index.html             # Payment portal (MetaMask, Core, QR)
├── scripts/
│   └── deploy.js              # Hardhat deployment script
├── .env                       # Environment variables
├── hardhat.config.js          # Hardhat configuration
└── package.json
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MetaMask or Core Wallet browser extension
- AVAX on Fuji Testnet ([faucet](https://faucet.avax.network/))

### 1. Clone & Install

```bash
git clone https://github.com/your-username/product-comparator-agent.git
cd product-comparator-agent
npm install
```

### 2. Configure Environment

Create a `.env` file:

```env
PORT=3000
GROQ_API_KEY=your_groq_api_key
CONTRACT_ADDRESS=0x4d9718e7235CC8c11E26829eCCa34EB19Aa5cb68
RECEIVER_ADDRESS=0xA645E5D0724d84c7949F312e9eBd7d7eBd05B15A
```

### 3. Start the Server

```bash
npm start
```

### 4. Use the CLI Agent

```bash
# Compare any two products
node agent/agent.js "compare iPhone 15 vs Samsung S24 for camera"

# Works across any category
node agent/agent.js "compare arata curl cream vs manetain curl cream for curly hair"
node agent/agent.js "compare MacBook Air M3 vs Dell XPS 14 for programming"
node agent/agent.js "compare Tesla Model 3 vs BYD Seal for daily driving"
```

### 5. Use the Web Dashboard

Open **http://localhost:3000** in your browser for the full visual experience.

---

## 🎬 Demo Workflow

```
1. User submits query
   ┌──────────────────────────────────────────────────────┐
   │ > compare iPhone 15 vs Samsung S24 for camera        │
   └──────────────────────────────────────────────────────┘

2. Server responds with 402 Payment Required
   ┌──────────────────────────────────────────────────────┐
   │ 💳 Payment Required: 0.00001 Tokens                  │
   │ 🌐 Pay at: http://localhost:3000/pay                  │
   └──────────────────────────────────────────────────────┘

3. User pays via MetaMask / Core Wallet / QR Code
   → ERC20 token transfer on Avalanche Fuji Testnet
   → Transaction verified on-chain

4. Pipeline executes:
   📝 Scrape Reviews → 🎥 YouTube Opinions →
   💰 Price Scraping (5 platforms) → 🖼️ Product Images →
   🧠 Multi-Agent AI Reasoning

5. Results displayed:
   ┌──────────────────────────────────────────────────────┐
   │ 👑 WINNER: iPhone 15                                  │
   │ 📊 Trust: 8.5/10 | Consensus: 7/10 | Value: 8/10    │
   │                                                       │
   │ 💰 BEST PRICE FINDER                                 │
   │ ★ Amazon    — ₹61,999 MRP                            │
   │   Flipkart  — ₹62,499 MRP                            │
   │   JioMart   — ₹63,999 MRP                            │
   │ 🔗 Buy: https://amazon.in/...                        │
   └──────────────────────────────────────────────────────┘
```

---

## 📋 AI Analysis Output (15 Points)

| # | Field | Description |
|---|-------|-------------|
| 1 | Product Overview | Category-aware summary of both products |
| 2 | Key Factors | Dynamic comparison criteria based on product type |
| 3 | Feature Comparison | Side-by-side feature table |
| 4 | Trust Score | Penalizes promotional/fake reviews (0–10) |
| 5 | Consensus Score | Agreement across sources (0–10) |
| 6 | Common Complaints | Top recurring issues from real users |
| 7 | Regret Analysis | "I wish I bought..." pattern detection |
| 8 | Category Winners | Per-category verdict (camera, battery, etc.) |
| 9 | Value Score | Price-to-performance ratio |
| 10 | Long-Term Insights | Durability and ownership experience |
| 11 | Personalized Recommendation | Tailored to user's stated use case |
| 12 | Confidence Score | AI's confidence in its recommendation |
| 13 | Final Winner | Clear verdict with reasoning |
| 14 | 30-Second Summary | Quick decision paragraph |
| 15 | Price Verdict | Best value factoring in prices across platforms |

---

## 📜 Smart Contract

**Deployed on Avalanche Fuji Testnet**

| Field | Value |
|-------|-------|
| Contract Address | [`0x4d9718e7235CC8c11E26829eCCa34EB19Aa5cb68`](https://testnet.snowtrace.io/address/0x4d9718e7235CC8c11E26829eCCa34EB19Aa5cb68) |
| Network | Avalanche Fuji C-Chain (Chain ID: 43113) |
| Solidity Version | 0.8.19 |
| Contract | `ProductComparatorPayment.sol` |

### Contract Features

- **Tiered Subscriptions** — Free (3 queries), Basic (50/mo), Pro (500/mo), Enterprise (unlimited)
- **Per-Query Micro-Payments** — Pay-as-you-go with configurable pricing
- **Refund System** — Users can request refunds within a 1-hour window
- **Rate Limiting** — Configurable cooldown between queries
- **Facilitator Revenue Sharing** — Automatic % split (x402 pattern)
- **Emergency Pause/Unpause** — Owner can halt all operations
- **On-Chain Analytics** — `getAnalytics()` returns total revenue, queries, payments
- **Reentrancy Protection** — OpenZeppelin `ReentrancyGuard`

### Compile & Deploy

```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network fuji
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| AI Inference | [Groq](https://groq.com/) — LLaMA 3.3-70b-versatile |
| Blockchain | Avalanche Fuji Testnet (ERC20 tokens) |
| Backend | Node.js, Express |
| Scraping | Axios, Cheerio |
| Smart Contract | Solidity 0.8.19, OpenZeppelin, Hardhat |
| Frontend | Vanilla HTML/CSS/JS, ethers.js |
| Wallets | MetaMask, Core Wallet, QR Code |

---

## 🔑 Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `GROQ_API_KEY` | API key for Groq inference |
| `CONTRACT_ADDRESS` | Deployed ERC20 token contract address |
| `RECEIVER_ADDRESS` | Wallet address that receives payments |

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

**Built for the hackathon with ❤️ on Avalanche**

</div>
