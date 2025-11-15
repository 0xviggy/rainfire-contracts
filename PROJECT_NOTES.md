# Project Revival Notes: INCUM Farm
**Repository:** rainfire-contracts  
**Date:** November 14, 2025  
**Goal:** Revive dormant DeFi yield farm, build frontend, create economic simulation framework

---

## 📋 Table of Contents
1. [Project Discovery](#project-discovery)
2. [Technical Decisions](#technical-decisions)
3. [Modernization Process](#modernization-process)
4. [Setup Instructions](#setup-instructions)
5. [Architecture Overview](#architecture-overview)
6. [Testing Strategy](#testing-strategy)
7. [Economic Simulation Framework](#economic-simulation-framework)

---

## 🔍 Project Discovery

### Initial Repository State
- **Status:** Source-only repository with deployed contracts
- **Blockchain:** Polygon (Matic) Mainnet
- **Contract Status:** All verified on PolygonScan

### What We Found

**Contracts Present:**
```
contracts/
├── IncToken.sol          - ERC20 governance token (100k max supply)
├── MasterChefV2.sol       - Yield farming staking contract
├── Timelock.sol           - Governance timelock (Compound-style)
└── libs/                  - Custom ERC20, SafeERC20, interfaces

presale-contracts/
├── PIncToken.sol         - Presale token (30k max supply)
└── IncRedeem.sol         - PInc → Inc redemption contract
```

**Deployed Addresses (Polygon Mainnet):**
| Contract | Address |
|----------|---------|
| IncToken | 0xfE1a200637464FBC9B60Bc7AeCb9b86c0E1d486E |
| MasterChefV2 | 0xfcD73006121333C92D770662745146338E419556 |
| PIncToken | 0xfD30189bD6de5503bB1db60cf1136123EdEA837A |
| IncRedeem | 0xCcA55FAF3BF71dba92694877CB09c577A226aEaF |
| Timelock | 0x6a8af1dbFdb32dAc39BF8A386c03cC8857a107a8 |

**Missing:**
- ❌ No build configuration (Hardhat/Foundry)
- ❌ No compiled artifacts (ABIs, typechain)
- ❌ No tests
- ❌ No deployment scripts
- ❌ No frontend

---

## 🤔 Technical Decisions

### Interview Process: Key Questions & Answers

#### Q: "Why Hardhat over Foundry?"

**Initial Decision:** Started with Hardhat

**Reasoning Evolution:**
1. **First impulse:** JavaScript/TypeScript ecosystem alignment with Next.js frontend
2. **User pushback:** "Why not Foundry?" → Valid question
3. **Analysis:** 
   - Foundry is better for simple ABI extraction
   - Faster compilation
   - Lighter weight
   - Modern standard

4. **Pivotal question from user:** "What if we want to iterate on contracts and test economics?"

**Final Decision:** ✅ **Hardhat**

**Why Hardhat Won:**
- **Economic simulation requirements** - Need to script complex multi-user behaviors
- **TypeScript everywhere** - Tests, simulations, and frontend in one language
- **Time manipulation** - Easy mainnet forking + block/time travel
- **Frontend integration** - Typechain generates TypeScript types
- **Developer accessibility** - Frontend devs can contribute to contract tests
- **Rich ecosystem** - Plugins for gas reporting, coverage, verification

**Foundry would be better for:**
- Pure security auditing
- Fuzz testing
- Just extracting ABIs
- Gas optimization work
- Solidity purists

### Build Tool Selection Matrix

| Requirement | Hardhat | Foundry |
|-------------|---------|---------|
| Economic simulations | ✅ Excellent | ⚠️ Limited |
| TypeScript integration | ✅ Native | ❌ None |
| Time manipulation | ✅ Easy | ⚠️ Manual |
| Multi-user scenarios | ✅ Simple | ⚠️ Complex |
| Compilation speed | ⚠️ Slower | ✅ Very fast |
| Gas optimization | ⚠️ Good | ✅ Excellent |
| Fuzzing | ❌ Limited | ✅ Excellent |
| Frontend types | ✅ Typechain | ❌ Manual |

---

## 🔧 Modernization Process

### Phase 1: Dependency Setup

**Installed:**
```bash
npm install --save-dev \
  hardhat@^2.22.0 \
  @nomicfoundation/hardhat-toolbox \
  @nomicfoundation/hardhat-network-helpers \
  @openzeppelin/contracts \
  typescript \
  ts-node \
  @types/node \
  @types/mocha \
  @types/chai
```

**Why these versions:**
- Hardhat 2.22.0: Stable release with good tooling support
- OpenZeppelin Contracts: Latest v5.x with security improvements
- Network Helpers: Essential for time manipulation in economic tests

### Phase 2: Solidity Modernization

**Changes Made:**

#### 1. Solidity Version Update
```diff
- pragma solidity ^0.8.0;
+ pragma solidity ^0.8.20;
```

**Rationale:** 
- 0.8.20 has better optimizer
- Custom error support (gas savings)
- Latest bug fixes
- Still compatible with contract logic

#### 2. OpenZeppelin v5 Migration

**Import Path Changes:**
```diff
- import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
+ import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
```

**Why:** OpenZeppelin v5 reorganized directory structure for clarity

#### 3. Ownable Constructor Updates

**The Breaking Change:**
OpenZeppelin v5 requires explicit initial owner in Ownable constructor

```diff
- constructor(...) public {
+ constructor(...) Ownable(msg.sender) {
```

**Affected Files:**
- `MasterChefV2.sol` - Added `Ownable(msg.sender)`
- `IncRedeem.sol` - Added `Ownable(msg.sender)`
- `contracts/libs/ERC20.sol` - Added `Ownable(msg.sender)`

**Why this change:** Prevents accidental ownerless contracts (security improvement)

#### 4. Constructor Visibility Removed

```diff
- constructor(...) public {
+ constructor(...) {
```

**Why:** Constructor visibility is deprecated in Solidity 0.8.x

#### 5. SafeERC20 API Update

```diff
- address(token).functionCall(data, "SafeERC20: low-level call failed");
+ address(token).functionCall(data);
```

**Why:** OpenZeppelin v5 Address.functionCall only takes 2 parameters now

### Compilation Success

```
✅ Compiled 12 Solidity files successfully
✅ Generated 36 TypeScript typings
✅ Target: ethers-v6
```

**Artifacts Generated:**
- `artifacts/` - Compiled contracts with ABIs
- `typechain-types/` - TypeScript type definitions
- `cache/` - Hardhat compilation cache

---

## 📦 Setup Instructions

### Prerequisites
```bash
node >= 16.x (Note: v25.1.0 shows warning but works)
npm >= 8.x
```

### Installation

1. **Clone and Install:**
```bash
git clone https://github.com/RainfireTech/rainfire-contracts.git
cd rainfire-contracts
npm install
```

2. **Environment Setup:**
```bash
cp .env.example .env
# Edit .env with your values
```

**Required Environment Variables:**
```bash
# Required for mainnet forking (economic simulations)
POLYGON_RPC_URL=https://polygon-rpc.com

# Optional: For deployments
PRIVATE_KEY=your_private_key_here
POLYGONSCAN_API_KEY=your_polygonscan_api_key
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com

# Optional: For gas reporting
REPORT_GAS=false
```

3. **Compile Contracts:**
```bash
npx hardhat compile
```

4. **Run Tests:**
```bash
npx hardhat test
```

5. **Run Economic Simulations:**
```bash
npx hardhat test test/simulations/FarmEconomics.test.ts
```

---

## 🏗 Architecture Overview

### Contract Hierarchy

```
                    ┌─────────────┐
                    │  IncToken  │
                    │  (ERC20)    │
                    └──────┬──────┘
                           │
                           │ mints to
                           │
                    ┌──────▼──────┐
                    │ MasterChefV2│
                    │  (Staking)  │
                    └──────┬──────┘
                           │
                           │ manages
                           │
            ┌──────────────┼──────────────┐
            │              │              │
         Pool 0         Pool 1         Pool N
       (LP Token A)   (LP Token B)   (LP Token X)


    Presale Flow:
    ┌──────────────┐       ┌──────────────┐
    │  PIncToken  │──────▶│ IncRedeem   │
    │  (Presale)   │ 1:1   │  (Redemption)│
    └──────────────┘       └──────────────┘
```

### MasterChefV2 - Core Logic

**Pool Structure:**
```solidity
struct PoolInfo {
    IERC20 lpToken;           // LP token address
    uint256 allocPoint;       // Allocation points (pool weight)
    uint256 lastRewardBlock;  // Last reward distribution
    uint256 accIncPerShare;  // Accumulated INC per share
    uint16 depositFeeBP;      // Deposit fee (basis points)
    uint256 lpSupply;         // Total LP staked
}
```

**User Structure:**
```solidity
struct UserInfo {
    uint256 amount;      // LP tokens staked
    uint256 rewardDebt;  // Reward debt for calculation
}
```

**Reward Calculation:**
```
pending_reward = (user.amount * pool.accIncPerShare) / 1e12 - user.rewardDebt
```

**Key Parameters:**
- `incPerBlock`: INC emission rate (adjustable by owner)
- `totalAllocPoint`: Sum of all pool weights
- `incMaximumSupply`: 100,000 INC hard cap
- `emmissionEndBlock`: Automatically set when max supply reached

**Deposit Fees:**
- Maximum: 4.01% (401 basis points)
- Goes to: `feeAddress` (configurable)
- Purpose: Prevents flash loan attacks, rewards long-term stakers

### Token Economics

**INCUM (INC):**
- Max Supply: 100,000 tokens
- Pre-mint: 37,500 tokens (37.5%)
- Emission: Variable `incPerBlock` rate
- Hard cap: Enforced in MasterChef

**PIncum (PINC) - Presale:**
- Max Supply: 30,000 tokens
- Sale Price: Variable (1666 * 10^31 / 10^35 MATIC)
- Max per User: 600 PINC
- Duration: 3 days (in Polygon blocks)
- Redemption: 1:1 for INC via IncRedeem

### Security Features

1. **ReentrancyGuard** - All deposit/withdraw functions
2. **Deposit fees** - Prevents flash loan exploits
3. **Timelock** - 6 hour minimum delay for governance
4. **Hard cap** - Prevents infinite inflation
5. **Emergency withdraw** - Users can always recover funds

---

## 🧪 Testing Strategy

### Three-Tier Testing Approach

#### Tier 1: Unit Tests
**Purpose:** Verify individual contract functions work correctly

**Coverage:**
- Token minting/burning
- Pool creation
- Deposit/withdraw mechanics
- Reward calculations
- Access control

**Example:**
```typescript
describe("IncToken", () => {
  it("Should mint tokens to owner", async () => {
    const { incToken, owner, masterChef } = await loadFixture(deployFixture);
    await incToken.transferOwnership(masterChef.address);
    // ... test mint logic
  });
});
```

#### Tier 2: Integration Tests
**Purpose:** Verify contracts work together correctly

**Coverage:**
- Full deposit → stake → claim flow
- Multi-pool interactions
- Fee distribution
- Presale → redemption flow

**Example:**
```typescript
describe("Farm Integration", () => {
  it("Should handle full stake lifecycle", async () => {
    // Deploy all contracts
    // Create pool
    // User deposits LP tokens
    // Time passes
    // User claims rewards
    // Verify reward amounts
  });
});
```

#### Tier 3: Economic Simulations
**Purpose:** Test game theory, economics, and long-term behavior

**Coverage:**
- Multi-user scenarios (100s of users)
- Whale attacks
- APR decay over time
- Mercenary capital
- Pool balancing
- Emission schedule validation

**Framework:** Custom FarmSimulator class (see below)

---

## 📊 Economic Simulation Framework

### Design Goals

1. **Simulate Real User Behavior**
   - Retail investors (small, frequent transactions)
   - Whales (large, strategic moves)
   - Bots (MEV, arbitrage)
   - Mercenary capital (APR chasers)

2. **Test Economic Assumptions**
   - Is APR sustainable?
   - How do rewards decay?
   - What's the impact of deposit fees?
   - Pool balance over time

3. **Validate Game Theory**
   - First mover advantage
   - Liquidity mining incentives
   - Exit strategies
   - Pool migration patterns

### Simulation Architecture

```typescript
class FarmSimulator {
  // User archetypes
  private whales: Signer[];
  private retail: Signer[];
  private bots: Signer[];
  
  // Metrics tracking
  private metrics: {
    tvl: number[];
    apr: number[];
    incPrice: number[];
    activeUsers: number[];
  };
  
  // Simulation methods
  async simulateDay(day: number): Promise<void>
  async simulateWhaleAttack(): Promise<void>
  async simulateMercenaryCapital(): Promise<void>
  async exportMetrics(): Promise<void>
}
```

### Key Simulation Scenarios

#### Scenario 1: Whale Attack
**Question:** What happens when a whale dumps large amounts?

**Test:**
```typescript
it("Should handle whale dump gracefully", async () => {
  const simulator = new FarmSimulator();
  
  // Whale stakes 50% of pool
  await simulator.whaleStake(pool0, ethers.utils.parseEther("1000000"));
  
  // Time passes
  await time.increase(7 * 86400); // 7 days
  
  // Whale exits completely
  await simulator.whaleExit(pool0);
  
  // Measure impact
  const aprDrop = simulator.getAPRChange();
  const tvlDrop = simulator.getTVLChange();
  
  expect(aprDrop).to.be.lessThan(50); // <50% drop acceptable
  expect(tvlDrop).to.be.lessThan(60); // <60% TVL drop acceptable
});
```

#### Scenario 2: APR Decay Over Time
**Question:** How does APR change as more users join?

**Test:**
```typescript
it("Should show predictable APR decay", async () => {
  const simulator = new FarmSimulator();
  
  for (let day = 0; day < 365; day++) {
    // Simulate 10-50 new users per day
    await simulator.simulateNewUsers(randomInt(10, 50));
    
    // Record metrics
    await simulator.recordDailyMetrics(day);
    
    // Advance time
    await time.increase(86400); // 1 day
  }
  
  // Export data for analysis
  await simulator.exportToCSV("apr_decay_simulation.csv");
  
  // Verify APR stays above minimum threshold
  const finalAPR = simulator.getCurrentAPR(pool0);
  expect(finalAPR).to.be.greaterThan(10); // >10% APR target
});
```

#### Scenario 3: Mercenary Capital
**Question:** Do users chase highest APR pools?

**Test:**
```typescript
it("Should test mercenary capital behavior", async () => {
  const simulator = new FarmSimulator();
  
  // Create multiple pools with different APRs
  await simulator.createPools(5);
  
  // Simulate 100 mercenary users
  const mercenaries = await simulator.createMercenaryUsers(100);
  
  for (let i = 0; i < 30; i++) {
    // Each user finds highest APR pool
    for (const user of mercenaries) {
      const highestAPRPool = await simulator.findHighestAPRPool();
      await simulator.migrateToPool(user, highestAPRPool);
    }
    
    await time.increase(86400); // 1 day
  }
  
  // Verify pools naturally balance
  const poolAPRs = await simulator.getAllPoolAPRs();
  const aprSpread = Math.max(...poolAPRs) - Math.min(...poolAPRs);
  expect(aprSpread).to.be.lessThan(20); // Pools should converge
});
```

### Metrics & Analysis

**Tracked Metrics:**
```typescript
interface DailyMetrics {
  day: number;
  timestamp: number;
  
  // TVL metrics
  totalTVL: BigNumber;
  tvlPerPool: BigNumber[];
  
  // Token metrics
  incSupply: BigNumber;
  incPrice: number;
  emissionRate: BigNumber;
  
  // APR metrics
  aprPerPool: number[];
  weightedAvgAPR: number;
  
  // User metrics
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  
  // Behavioral metrics
  deposits: number;
  withdrawals: number;
  claims: number;
  avgStakeDuration: number;
}
```

**Export Formats:**
- CSV for spreadsheet analysis
- JSON for programmatic processing
- Charts (using Chart.js or similar)

### Time Manipulation Helpers

```typescript
// Hardhat network helpers
import { time } from "@nomicfoundation/hardhat-network-helpers";

// Fast-forward time
await time.increase(86400); // 1 day
await time.increase(30 * 86400); // 30 days
await time.increase(365 * 86400); // 1 year

// Fast-forward to specific time
await time.increaseTo(targetTimestamp);

// Get current block timestamp
const now = await time.latest();

// Mine blocks
await mine(1000); // Mine 1000 blocks
```

### Mainnet Forking for Realistic Tests

```typescript
// In hardhat.config.ts
networks: {
  hardhat: {
    forking: {
      url: "https://polygon-rpc.com",
      blockNumber: 50000000, // Pin to specific block
    },
  },
}

// In tests - use real LP tokens from Polygon
const QUICKSWAP_WMATIC_USDC = "0x6e7a5FAFcec6BB1e78bAE2A1F0B612012BF14827";
const lpToken = await ethers.getContractAt("IERC20", QUICKSWAP_WMATIC_USDC);

// Test with real liquidity conditions
```

---

## 📈 Next Steps

### Immediate Tasks

1. ✅ **Setup Complete** - Hardhat configured, contracts compiled
2. ✅ **Modernization Complete** - OpenZeppelin v5, Solidity 0.8.20
3. 🔄 **In Progress:** Basic test suite
4. ⏳ **TODO:** Economic simulation framework
5. ⏳ **TODO:** Frontend (Next.js + wagmi)

### Test Development Order

```
Phase 1: Foundation
├── Unit tests for IncToken
├── Unit tests for MasterChefV2
├── Unit tests for Presale contracts
└── Integration tests for full flow

Phase 2: Simulation Framework
├── FarmSimulator base class
├── User archetype generators
├── Metrics collection system
└── Data export utilities

Phase 3: Economic Scenarios
├── Whale attack simulation
├── APR decay simulation
├── Mercenary capital simulation
├── Pool balancing simulation
└── Long-term sustainability test

Phase 4: Analysis & Visualization
├── CSV exports for analysis
├── Chart generation
├── Report generation
└── Recommendations document
```

### Frontend Development

After testing framework is complete:

1. Initialize Next.js project
2. Configure wagmi + RainbowKit
3. Extract ABIs from artifacts
4. Build UI components
5. Connect to Polygon mainnet
6. Deploy frontend

See `FRONTEND_PLAN.md` for detailed frontend roadmap.

---

## 🎓 Key Learnings

### 1. Tool Selection Matters
- Don't default to familiar tools
- Ask "What is the actual use case?"
- Consider long-term maintainability
- Think about team composition

### 2. Modernization Strategy
- Update incrementally, not all at once
- Test after each major change
- Document breaking changes
- Keep deployment contracts separate

### 3. Economic Testing is Critical
- Unit tests verify code correctness
- Economic simulations verify game theory
- Time manipulation is powerful
- Real data (mainnet forking) adds confidence

### 4. Documentation as You Go
- Capture decisions in real-time
- Document "why" not just "what"
- Include failed approaches
- Make it searchable

---

## 📚 References

### Documentation
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts v5](https://docs.openzeppelin.com/contracts/5.x/)
- [ethers.js v6](https://docs.ethers.org/v6/)
- [wagmi v2](https://wagmi.sh)

### Deployed Contracts
- [IncToken on PolygonScan](https://polygonscan.com/address/0xfE1a200637464FBC9B60Bc7AeCb9b86c0E1d486E)
- [MasterChefV2 on PolygonScan](https://polygonscan.com/address/0xfcD73006121333C92D770662745146338E419556)

### Similar Projects
- [SushiSwap MasterChef](https://github.com/sushiswap/sushiswap)
- [PancakeSwap](https://github.com/pancakeswap)
- [QuickSwap](https://github.com/QuickSwap)

---

## 📝 Changelog

### 2025-11-14 - Initial Revival
- Discovered repository state
- Initialized Hardhat environment
- Modernized to Solidity 0.8.20
- Migrated to OpenZeppelin v5
- Successfully compiled all contracts
- Generated TypeScript types
- Created project documentation

---

**Status:** ✅ Ready for test development  
**Next Milestone:** Complete basic test suite  
**Timeline:** Economic simulation framework by end of week
