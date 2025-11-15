# Frontend Development Plan
**Rainfire (INCUM) - Yield Farm Interface**

## 📊 Project Overview

This is a DeFi yield farming project deployed on Polygon network featuring:

- **INCUM (INC)** - Main governance/reward token (100k max supply)
- **MasterChefV2** - Staking contract for LP tokens to earn INC rewards
- **PIncToken (PINCUM)** - Presale token (30k max supply)
- **IncRedeem** - Swap presale tokens for actual INC tokens
- **Timelock** - Governance timelock contract

### Deployed Contracts (Polygon Mainnet)

| Contract | Address |
|----------|---------|
| IncToken | [0xfE1a200637464FBC9B60Bc7AeCb9b86c0E1d486E](https://polygonscan.com/address/0xfE1a200637464FBC9B60Bc7AeCb9b86c0E1d486E) |
| MasterChefV2 | [0xfcD73006121333C92D770662745146338E419556](https://polygonscan.com/address/0xfcD73006121333C92D770662745146338E419556) |
| PIncToken | [0xfD30189bD6de5503bB1db60cf1136123EdEA837A](https://polygonscan.com/address/0xfD30189bD6de5503bB1db60cf1136123EdEA837A) |
| IncRedeem | [0xCcA55FAF3BF71dba92694877CB09c577A226aEaF](https://polygonscan.com/address/0xCcA55FAF3BF71dba92694877CB09c577A226aEaF) |
| Timelock | [0x6a8af1dbFdb32dAc39BF8A386c03cC8857a107a8](https://polygonscan.com/address/0x6a8af1dbFdb32dAc39BF8A386c03cC8857a107a8) |

---

## 🎯 10-Step Action Plan

### Phase 1: Project Setup

#### ✅ Step 1: Set up Next.js + Wagmi Frontend Project
**Goal:** Create a modern Web3 frontend foundation

**Tech Stack:**
- Next.js 14 (App Router)
- TypeScript
- wagmi v2
- viem
- RainbowKit
- Tailwind CSS

**Commands:**
```bash
npx create-next-app@latest incum-frontend --typescript --tailwind --app
cd incum-frontend
npm install wagmi viem @rainbow-me/rainbowkit @tanstack/react-query
```

**Deliverables:**
- Initialized Next.js project
- Configured wagmi + RainbowKit
- Basic project structure

---

#### ✅ Step 2: Generate ABIs from Solidity Contracts
**Goal:** Extract contract interfaces for frontend interaction

**Contracts to Extract:**
- `IncToken.sol`
- `MasterChefV2.sol`
- `PIncToken.sol`
- `IncRedeem.sol`

**Process:**
1. Compile contracts with solc or Hardhat
2. Extract ABIs from compilation artifacts
3. Save as TypeScript constants or JSON files

**Deliverables:**
- `src/abis/IncToken.ts`
- `src/abis/MasterChefV2.ts`
- `src/abis/PIncToken.ts`
- `src/abis/IncRedeem.ts`

---

#### ✅ Step 3: Create Contract Configuration File
**Goal:** Centralize contract addresses and ABIs

**File:** `src/config/contracts.ts`

**Include:**
- Contract addresses for Polygon mainnet
- Exported ABIs
- Type-safe contract configuration
- Chain configuration (Polygon - chainId: 137)

**Deliverables:**
- Typed contract configuration
- Easy import for all components

---

### Phase 2: Core Features

#### ✅ Step 4: Build Dashboard Page
**Goal:** Overview of farm statistics

**Route:** `/` or `/dashboard`

**Features:**
- Total Value Locked (TVL) across all pools
- Total INC supply vs max supply (100k)
- Current emission rate (INC per block)
- Number of active pools
- Total stakers count
- Emission end block countdown

**Data Sources:**
- MasterChefV2: `poolLength()`, `incPerBlock`, `totalAllocPoint`
- IncToken: `totalSupply()`
- Aggregate pool data for TVL

**Deliverables:**
- Dashboard component with stats cards
- Real-time data updates

---

#### ✅ Step 5: Build Farms Page with Pool List
**Goal:** Display all staking pools and enable staking/unstaking

**Route:** `/farms`

**Features:**
- List all pools from MasterChefV2
- For each pool display:
  - LP token name/symbol
  - TVL in USD
  - APR calculation (based on INC price and pool allocation)
  - Deposit fee (if any)
  - User's staked amount
  - User's pending INC rewards
- Stake/Deposit functionality
- Unstake/Withdraw functionality
- "Harvest" (claim rewards) button

**Key Functions:**
- `poolInfo(uint256)` - Get pool data
- `userInfo(uint256, address)` - Get user stake info
- `pendingInc(uint256, address)` - Get pending rewards
- `deposit(uint256, uint256)` - Stake LP tokens
- `withdraw(uint256, uint256)` - Unstake LP tokens

**Deliverables:**
- Farm list component
- Stake/Unstake modals
- Approve + Deposit flow

---

#### ✅ Step 6: Build User Portfolio View
**Goal:** Show user's complete staking positions

**Route:** `/portfolio` or section on dashboard

**Features:**
- List of all user's active positions across pools
- Total staked value (USD)
- Total pending INC rewards
- Total claimed INC rewards (if trackable)
- "Harvest All" functionality
- Position history/timeline

**Data Sources:**
- Loop through all pools
- Check `userInfo` for each pool
- Aggregate pending rewards

**Deliverables:**
- Portfolio component
- Harvest all functionality
- Position cards

---

#### ✅ Step 7: Build Presale/Redeem Page
**Goal:** Interface for presale viewing and PINCUM redemption

**Route:** `/presale` or `/redeem`

**Features:**
- Presale stats:
  - PINCUM total supply
  - PINCUM remaining
  - Start/End blocks
  - Presale price
- User's PINCUM balance
- Redemption interface:
  - Input amount to redeem
  - Show equivalent INC amount (1:1)
  - "Redeem" button (calls `swapPIncForInc`)
- Show if presale is active/ended

**Key Functions:**
- PIncToken: `balanceOf(address)`, `pincRemaining`, `startBlock`, `endBlock`
- IncRedeem: `swapPIncForInc(uint256)`

**Deliverables:**
- Presale info display
- Redemption interface
- Transaction handling

---

#### ✅ Step 8: Add Token Stats and Analytics
**Goal:** Detailed INC token information and visualizations

**Route:** `/analytics` or section on dashboard

**Features:**
- Token stats:
  - Current price (fetch from DEX or oracle)
  - Market cap
  - Circulating supply
  - Max supply (100k INC)
  - Total minted / progress bar
  - Emission schedule visualization
- Charts:
  - Price history (if available)
  - Supply growth over time
  - TVL history
  - APR trends per pool

**Data Sources:**
- On-chain: IncToken supply data
- Price feeds: DEX (QuickSwap/SushiSwap on Polygon) or CoinGecko API
- Historical data: TheGraph subgraph or event logs

**Libraries:**
- Recharts or Chart.js for visualizations

**Deliverables:**
- Analytics page with charts
- Token stats component

---

### Phase 3: Infrastructure & Polish

#### ✅ Step 9: Implement Wallet Connection and Network Validation
**Goal:** Ensure proper wallet connectivity and network handling

**Features:**
- RainbowKit connect button
- Network validation (must be Polygon mainnet - chainId 137)
- Auto-prompt to switch network if wrong chain
- Display connection status
- Handle disconnection gracefully
- Show wallet address and balance

**Implementation:**
- Configure wagmi with Polygon chain
- Use `useNetwork` and `useSwitchNetwork` hooks
- Add network guard to protected pages

**Deliverables:**
- Wallet connection flow
- Network switching prompts
- Error handling

---

#### ✅ Step 10: Add Documentation and Setup Instructions
**Goal:** Make project easy to run and maintain

**Files to Create:**
- `frontend/README.md` - Setup and run instructions
- `frontend/.env.example` - Environment variables template
- `frontend/CONTRIBUTING.md` - Development guidelines

**Documentation Include:**
- Installation steps
- Environment variables needed:
  - RPC URLs (Polygon)
  - WalletConnect Project ID
  - API keys (if any)
- Development commands
- Build and deployment instructions
- Architecture overview
- Component structure

**Deliverables:**
- Complete README
- Example .env file
- Developer documentation

---

## 🛠 Tech Stack Summary

### Frontend Framework
- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type safety

### Web3 Integration
- **wagmi v2** - React hooks for Ethereum
- **viem** - TypeScript Ethereum library
- **RainbowKit** - Wallet connection UI

### Styling
- **Tailwind CSS** - Utility-first CSS
- **Headless UI** - Unstyled accessible components (optional)

### Data Visualization
- **Recharts** or **Chart.js** - Charts and graphs

### State Management
- **TanStack Query (React Query)** - Async state management (comes with wagmi)
- **Zustand** - Client state (optional)

### RPC Provider
- Polygon public RPC
- Or Alchemy/Infura/QuickNode for better reliability

---

## 📁 Suggested Project Structure

```
incum-frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Dashboard
│   │   ├── farms/
│   │   │   └── page.tsx          # Farms list
│   │   ├── portfolio/
│   │   │   └── page.tsx          # User portfolio
│   │   ├── presale/
│   │   │   └── page.tsx          # Presale/Redeem
│   │   ├── analytics/
│   │   │   └── page.tsx          # Analytics
│   │   └── layout.tsx            # Root layout
│   ├── components/
│   │   ├── wallet/
│   │   │   └── ConnectButton.tsx
│   │   ├── farms/
│   │   │   ├── FarmCard.tsx
│   │   │   ├── StakeModal.tsx
│   │   │   └── UnstakeModal.tsx
│   │   ├── portfolio/
│   │   │   └── PositionCard.tsx
│   │   ├── dashboard/
│   │   │   └── StatsCard.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── Footer.tsx
│   ├── config/
│   │   ├── contracts.ts          # Contract addresses & ABIs
│   │   ├── chains.ts             # Chain configuration
│   │   └── wagmi.ts              # Wagmi config
│   ├── abis/
│   │   ├── IncToken.ts
│   │   ├── MasterChefV2.ts
│   │   ├── PIncToken.ts
│   │   └── IncRedeem.ts
│   ├── hooks/
│   │   ├── useIncToken.ts
│   │   ├── useMasterChef.ts
│   │   ├── useFarmData.ts
│   │   └── useTokenPrice.ts
│   ├── utils/
│   │   ├── formatters.ts         # Number/date formatting
│   │   ├── calculations.ts       # APR calculations
│   │   └── constants.ts
│   └── types/
│       └── contracts.ts
├── public/
│   └── images/
├── .env.example
├── .env.local
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

---

## 🔑 Key Contract Functions Reference

### IncToken
- `totalSupply()` → uint256
- `balanceOf(address)` → uint256
- `mint(address, uint256)` - Only owner

### MasterChefV2
- `poolLength()` → uint256
- `poolInfo(uint256)` → PoolInfo struct
- `userInfo(uint256, address)` → UserInfo struct
- `pendingInc(uint256, address)` → uint256
- `deposit(uint256, uint256)` - Stake LP tokens
- `withdraw(uint256, uint256)` - Unstake LP tokens
- `emergencyWithdraw(uint256)` - Emergency unstake
- `incPerBlock` → uint256 (public variable)
- `totalAllocPoint` → uint256 (public variable)

### PIncToken (Presale)
- `balanceOf(address)` → uint256
- `buyPInc()` - Payable, buy with MATIC
- `pincRemaining` → uint256
- `startBlock` → uint256
- `endBlock` → uint256
- `salePriceE35` → uint256

### IncRedeem
- `swapPIncForInc(uint256)` - Redeem PINCUM for INCUM
- `startBlock` → uint256

---

## 🎨 UI/UX Considerations

### Design Principles
- Clean, modern interface
- Dark mode support
- Mobile responsive
- Fast loading times
- Clear error messages
- Transaction status feedback

### User Flow
1. Connect wallet → Auto-check network
2. View dashboard → See farm overview
3. Browse farms → Select pool
4. Approve LP token → Stake
5. Track portfolio → Harvest rewards
6. Redeem PINCUM (if applicable)

---

## 🚀 Development Workflow

### Phase 1: Setup (Steps 1-3)
Estimated time: 1-2 days
- Initialize project
- Configure Web3 tools
- Extract ABIs

### Phase 2: Core Features (Steps 4-8)
Estimated time: 5-7 days
- Build main pages
- Implement contract interactions
- Add analytics

### Phase 3: Polish (Steps 9-10)
Estimated time: 2-3 days
- Network handling
- Testing
- Documentation

**Total Estimated Time:** 8-12 days

---

## 📝 Environment Variables

Create `.env.local` with:

```bash
# RPC URLs
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-rpc.com

# WalletConnect (required for RainbowKit)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Optional: Price feeds
NEXT_PUBLIC_COINGECKO_API_KEY=
```

---

## 🧪 Testing Checklist

- [ ] Wallet connects on Polygon mainnet
- [ ] Network switch prompts correctly
- [ ] All pool data loads correctly
- [ ] Staking/unstaking works
- [ ] Reward claiming works
- [ ] PINCUM redemption works
- [ ] APR calculations are accurate
- [ ] Mobile responsive
- [ ] Error handling works
- [ ] Transaction feedback is clear

---

## 📚 Resources

- [wagmi Documentation](https://wagmi.sh)
- [RainbowKit Documentation](https://www.rainbowkit.com)
- [Polygon Documentation](https://docs.polygon.technology)
- [PolygonScan](https://polygonscan.com)

---

## 🔄 Future Enhancements

- Historical data via TheGraph subgraph
- Portfolio tracking across sessions
- Price alerts
- Governance interface (Timelock)
- Multi-language support
- Advanced analytics
- Integration with portfolio trackers
