# Rainfire Contracts

**Multi-chain DeFi yield farming protocol with chain-agnostic architecture**

A modular yield farming system designed to deploy across EVM chains (Polygon, Base, Arbitrum) and Solana, featuring unified business logic, chain-specific implementations, and a consistent user experience.

## 🌐 Current Deployment

### Polygon Mainnet (Production - Legacy Reference)

> **Note:** These contracts represent the original LITH token deployment on Polygon. The codebase has been modernized and rebranded to INCUM/Rainfire with multi-chain architecture support.

| Contract | Address | Description | Original Name |
|----------|---------|-------------|---------------|
| **IncToken** | [0xfE1a200637464FBC9B60Bc7AeCb9b86c0E1d486E](https://polygonscan.com/address/0xfE1a200637464FBC9B60Bc7AeCb9b86c0E1d486E) | ERC20 governance/reward token | LithToken |
| **MasterChefV2** | [0xfcD73006121333C92D770662745146338E419556](https://polygonscan.com/address/0xfcD73006121333C92D770662745146338E419556) | Staking & rewards distribution | MasterChefV2 |
| **PIncToken** | [0xfD30189bD6de5503bB1db60cf1136123EdEA837A](https://polygonscan.com/address/0xfD30189bD6de5503bB1db60cf1136123EdEA837A) | Presale token | PLithToken |
| **IncRedeem** | [0xCcA55FAF3BF71dba92694877CB09c577A226aEaF](https://polygonscan.com/address/0xCcA55FAF3BF71dba92694877CB09c577A226aEaF) | Presale redemption | LithRedeem |
| **Timelock** | [0x6a8af1dbFdb32dAc39BF8A386c03cC8857a107a8](https://polygonscan.com/address/0x6a8af1dbFdb32dAc39BF8A386c03cC8857a107a8) | Governance delay | Timelock |

### Planned Deployments

- **Solana:** Anchor programs (devnet testing)
- **Base:** EVM deployment
- **Arbitrum:** EVM deployment

---

## 🏗️ Multi-Chain Architecture

### Design Philosophy

Rainfire uses a **chain-agnostic architecture** with unified business logic and chain-specific implementations:

- **Shared Business Logic** - APR calculations, tokenomics, simulation scenarios
- **Chain Adapters** - Abstract blockchain differences behind common interface
- **Unified Frontend** - Same UI/UX across all chains (Polygon, Solana, Base, etc.)
- **Cross-Chain Testing** - Same economic tests run on all chains

### Current Structure (EVM Implementation)

```
rainfire-contracts/
├── contracts/                  # EVM Smart Contracts (Solidity 0.8.20)
│   ├── IncToken.sol           # ERC20 governance token
│   ├── MasterChefV2.sol       # Staking & rewards
│   ├── Timelock.sol           # Governance timelock
│   └── libs/                  # OpenZeppelin v5 compatible
│
├── presale-contracts/
│   ├── PIncToken.sol          # Presale token
│   └── IncRedeem.sol          # Redemption logic
│
├── test/
│   ├── unit/                  # Contract unit tests
│   ├── integration/           # Multi-contract flows
│   └── simulations/           # Economic game theory tests
│
└── docs/
    ├── TECHNICAL_SPEC.md      # Technical specification
    ├── LEARNING_GUIDE.md      # Development learnings
    └── MULTI_CHAIN_ARCHITECTURE.md  # Implementation plan
```

### Planned Monorepo Structure

```
rainfire-monorepo/
├── packages/
│   ├── contracts-evm/         # Hardhat/Solidity (Polygon, Base, Arbitrum)
│   ├── contracts-solana/      # Anchor/Rust (Solana mainnet)
│   ├── shared-types/          # Cross-chain TypeScript interfaces
│   ├── shared-utils/          # Business logic (chain-agnostic)
│   ├── chain-adapters/        # IChainAdapter implementations
│   └── frontend/              # Next.js (unified multi-chain UI)
│
├── turbo.json                 # Build orchestration
└── pnpm-workspace.yaml        # Package management
```

### Chain Adapter Pattern

```typescript
// Unified interface for all chains
interface IChainAdapter {
  chainType: 'evm' | 'solana';
  getFarmPools(): Promise<FarmPool[]>;
  stake(poolId: string, amount: bigint): Promise<string>;
  getPendingRewards(poolId: string, user: string): Promise<bigint>;
}

// Same component works on ALL chains
const FarmCard = ({ pool }) => {
  const { adapter } = useChain();
  await adapter.stake(pool.id, amount); // Works on Polygon AND Solana
};
```

---

## 🔗 Chain Comparison: EVM vs Solana vs Others

### Implementation Differences

| Feature | EVM (Polygon/Base/Arbitrum) | Solana | Other High-Volume Chains |
|---------|----------------------------|--------|--------------------------|
| **Language** | Solidity 0.8.20 | Rust + Anchor 0.29 | Varies (CosmWasm, Move) |
| **State Model** | Contract storage | Accounts (rent-exempt) | Depends on VM |
| **Token Standard** | ERC20 | SPL Token (CPI) | Native standards |
| **Math Precision** | Native 256-bit | u64/u128 (checked) | Varies |
| **Time Reference** | `block.number`, `block.timestamp` | `Clock::get()?.slot` | Chain-specific |
| **Cost Model** | Gas per operation | Compute units + rent | Varies |
| **Testing** | Hardhat + Mocha | Anchor + TypeScript | Framework-specific |
| **Block Time** | 2s (Polygon) | 0.4s (Solana) | Varies |

### Reward Calculation (Same Logic)

**EVM (Solidity):**
```solidity
uint256 pending = (user.amount * pool.accIncPerShare) / 1e12 - user.rewardDebt;
```

**Solana (Rust):**
```rust
let pending = (user_stake.amount as u128 * pool.acc_inc_per_share) / 1e12 
    - user_stake.reward_debt;
```

**Result:** Same tokenomics, different implementation

### Why Multi-Chain?

1. **Reach More Users** - Different chains have different user bases
2. **Optimize for Use Case** - High-frequency on Solana, security on Ethereum L2s
3. **Risk Diversification** - Not dependent on single chain
4. **Liquidity Aggregation** - Cross-chain liquidity via bridges

### Chain Selection Criteria

| Chain | Best For | Considerations |
|-------|----------|----------------|
| **Polygon** | Low fees, EVM compatibility | Centralization concerns |
| **Base** | Coinbase users, growing ecosystem | Newer chain |
| **Arbitrum** | Security (Ethereum L2), large TVL | Higher fees than sidechains |
| **Solana** | High throughput, low fees | Complex programming model |
| **Avalanche** | Subnets, custom chains | Validator requirements |

---

## 🪙 Tokenomics

### INCUM Token (INC)

**Contract:** `IncToken.sol`  
**Symbol:** `INCUM`  
**Decimals:** `18`

#### Supply & Distribution

| Metric | Value |
|--------|-------|
| **Maximum Supply** | 100,000 INCUM |
| **Pre-mint** | 37,500 INCUM (37.5%) |
| **Farming Emissions** | 62,500 INCUM (62.5%) |
| **Emission Model** | Variable rate via `incPerBlock` |

#### Key Features

- **Hard Cap:** 100k tokens enforced at contract level
- **Mintable:** Only MasterChefV2 can mint new tokens
- **Governance:** Ownable contract for future DAO control
- **No Burn:** No deflationary mechanism (all supply is final)

#### Pre-mint Allocation

```solidity
constructor() {
    _mint(0x3a1D1114269d7a786C154FE5278bF5b1e3e20d31, 37500 * 10^18);
}
```

- 37.5% pre-minted for team, development, and initial liquidity
- Remaining 62.5% distributed through farming rewards
- Emission automatically stops when max supply reached

---

### PINCUM Token (PINC) - Presale

**Contract:** `PIncToken.sol`  
**Symbol:** `PINCUM`  
**Decimals:** `18`

#### Presale Parameters

| Parameter | Value |
|-----------|-------|
| **Maximum Supply** | 30,000 PINCUM |
| **Sale Duration** | 3 days (Polygon blocks) |
| **Max per User** | 600 PINCUM |
| **Payment Token** | MATIC |
| **Price** | Variable (`salePriceE35`) |
| **Redemption** | 1:1 for INCUM via IncRedeem |

#### Presale Mechanics

1. **Buy PINCUM:** Users send MATIC to `buyPInc()` function
2. **Time-locked:** 3-day sale window (72 hours in blocks)
3. **User Limit:** Maximum 600 PINCUM per address
4. **Refunds:** Automatic MATIC refund if purchase exceeds limits
5. **Redemption:** Swap PINCUM → INCUM (1:1) after presale ends

```solidity
function buyPInc() external payable nonReentrant {
    // Presale active checks
    // Calculate PINCUM amount based on MATIC sent
    // Enforce user limits
    // Transfer PINCUM to buyer
    // Refund excess MATIC if needed
}
```

---

## 🏦 Smart Contract Architecture

### MasterChefV2 - Core Staking Contract

**Purpose:** Manages LP token staking and INCUM reward distribution across multiple pools.

#### Pool Structure

```solidity
struct PoolInfo {
    IERC20 lpToken;           // LP token contract address
    uint256 allocPoint;       // Weight for reward allocation
    uint256 lastRewardBlock;  // Last reward distribution block
    uint256 accIncPerShare;   // Accumulated INCUM per LP token (×1e12)
    uint16 depositFeeBP;      // Deposit fee in basis points (max 401 = 4.01%)
    uint256 lpSupply;         // Total LP tokens staked in pool
}
```

#### User Position

```solidity
struct UserInfo {
    uint256 amount;          // LP tokens staked by user
    uint256 rewardDebt;      // Internal accounting for reward calculation
}
```

#### Reward Calculation

```solidity
pending_reward = (user.amount × pool.accIncPerShare) / 1e12 - user.rewardDebt
```

**How it works:**
1. Each block, `incPerBlock` tokens are minted
2. Rewards distributed proportionally based on pool `allocPoint`
3. Within pool, distributed proportionally to staked LP tokens
4. User's `rewardDebt` tracks already-distributed rewards

#### Key Parameters

| Parameter | Description | Constraints |
|-----------|-------------|-------------|
| `incPerBlock` | INCUM emission rate per block | Adjustable by owner |
| `totalAllocPoint` | Sum of all pool weights | Auto-calculated |
| `startBlock` | Farming start block | Set at deployment |
| `emmissionEndBlock` | Farming end block | Auto-set when max supply reached |
| `depositFeeBP` | Deposit fee per pool | Max 4.01% (401 basis points) |

#### Core Functions

**For Users:**
```solidity
function deposit(uint256 _pid, uint256 _amount) external nonReentrant;
function withdraw(uint256 _pid, uint256 _amount) external nonReentrant;
function emergencyWithdraw(uint256 _pid) external nonReentrant;
function pendingInc(uint256 _pid, address _user) external view returns (uint256);
```

**For Admin:**
```solidity
function add(uint256 _allocPoint, IERC20 _lpToken, uint16 _depositFeeBP, bool _withUpdate) external onlyOwner;
function set(uint256 _pid, uint256 _allocPoint, uint16 _depositFeeBP, bool _withUpdate) external onlyOwner;
function setFeeAddress(address _feeAddress) external;
```

#### Deposit Flow

1. User approves LP token to MasterChefV2
2. User calls `deposit(poolId, amount)`
3. Contract updates pool rewards (mints new INCUM if needed)
4. Pending rewards automatically sent to user
5. Deposit fee deducted (if any) and sent to `feeAddress`
6. User's stake and `rewardDebt` updated

#### Withdrawal Flow

1. User calls `withdraw(poolId, amount)`
2. Contract updates pool rewards
3. Pending rewards sent to user
4. LP tokens transferred back to user
5. No withdrawal fee

#### Security Features

- **ReentrancyGuard:** Prevents reentrancy attacks
- **Deposit Fees:** Max 4.01% to prevent flash loan exploits
- **Emergency Withdraw:** Users can always recover LP tokens (forfeit rewards)
- **SafeERC20:** Handles non-standard ERC20 tokens
- **Supply Cap:** Emission automatically stops at 100k INCUM

---

### IncRedeem - Presale Redemption

**Purpose:** Swap PINCUM → INCUM (1:1) after presale ends.

```solidity
function swapPIncForInc(uint256 swapAmount) external nonReentrant {
    // Burn PINCUM from user
    // Transfer INCUM to user
    emit incSwap(msg.sender, swapAmount);
}
```

**Requirements:**
- Redemption can only start after `startBlock`
- Contract must hold sufficient INCUM
- User must have PINCUM balance
- User must approve PINCUM to IncRedeem contract

---

### Timelock - Governance Delay

**Purpose:** 6-hour minimum delay for admin actions, allowing community to react.

**Parameters:**
- `MINIMUM_DELAY`: 6 hours
- `MAXIMUM_DELAY`: 30 days
- `GRACE_PERIOD`: 14 days

**Flow:**
1. Admin queues transaction
2. Wait `delay` time period
3. Admin executes transaction (within grace period)
4. Community can monitor and react during delay

---

## ⚙️ Token Emission Economics

### Emission Model

```
incPerBlock × blocksElapsed × (pool.allocPoint / totalAllocPoint) × (user.stake / pool.lpSupply)
```

**Example:**
- `incPerBlock` = 10 INCUM
- Pool A: 60% allocation (600 allocPoints)
- Pool B: 40% allocation (400 allocPoints)
- User stakes 20% of Pool A
- User earns: 10 × 0.6 × 0.2 = **1.2 INCUM per block**

### APR Calculation

```
APR = (incPerBlock × blocksPerYear × poolAllocation × incPrice) / (poolTVL) × 100
```

Where:
- `blocksPerYear` ≈ 15,768,000 (2 second blocks on Polygon)
- `poolAllocation` = pool.allocPoint / totalAllocPoint
- `poolTVL` = (pool.lpSupply × lpTokenPrice)

### Emission Schedule

| Phase | Blocks | INCUM Emitted | Status |
|-------|--------|---------------|--------|
| Pre-mint | 0 | 37,500 | Instant |
| Farming | Variable | 62,500 | Until cap |
| Post-cap | ∞ | 0 | No new emissions |

**Automatic Shutdown:**
```solidity
if (inc.totalSupply() >= incMaximumSupply && emmissionEndBlock == type(uint256).max)
    emmissionEndBlock = block.number;
```

---

## 🔒 Security Features

### Smart Contract Security

1. **OpenZeppelin v5.x:** Battle-tested security primitives
2. **ReentrancyGuard:** All state-changing functions protected
3. **Ownable:** Admin functions restricted to owner
4. **SafeERC20:** Handles non-standard token transfers
5. **Deposit Fees:** Flash loan attack prevention
6. **Hard Cap:** Prevents infinite inflation

### Access Control

| Function | Access | Risk Level |
|----------|--------|------------|
| `mint()` | MasterChefV2 only | High |
| `add()` / `set()` | Owner | High |
| `setFeeAddress()` | Current feeAddress | Medium |
| `deposit()` / `withdraw()` | Any user | Low |
| `emergencyWithdraw()` | Any user | Low |

### Audit Status

- ⚠️ **Not audited** - Use at your own risk
- Based on audited SushiSwap MasterChef design
- Modernized to Solidity 0.8.20 + OpenZeppelin v5

---

## 🚀 Development Setup

### Prerequisites

```bash
node >= 16.x
npm >= 8.x
```

### Installation

```bash
git clone https://github.com/RainfireTech/rainfire-contracts.git
cd rainfire-contracts
npm install
```

### Compile Contracts

```bash
npx hardhat compile
```

### Run Tests

```bash
# All tests
npx hardhat test

# Specific test file
npx hardhat test test/unit/IncToken.test.ts

# With gas reporting
REPORT_GAS=true npx hardhat test
```

### Environment Variables

Create `.env` file:

```bash
POLYGON_RPC_URL=https://polygon-rpc.com
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com
PRIVATE_KEY=your_private_key_here
POLYGONSCAN_API_KEY=your_polygonscan_api_key
REPORT_GAS=false
```

---

## 📊 Token Flow Diagram

```
                    ┌─────────────┐
                    │  IncToken   │
                    │  (100k cap) │
                    └──────┬──────┘
                           │
                    mints to│
                           │
                    ┌──────▼──────────┐
                    │  MasterChefV2   │
                    │   (Staking)     │
                    └──────┬──────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
           Pool 0       Pool 1      Pool N
         (LP-A Stake) (LP-B Stake) (LP-X Stake)
              │            │            │
              └────────────┼────────────┘
                           │
                    earns INCUM
                           │
                    ┌──────▼──────┐
                    │    Users    │
                    └─────────────┘


    Presale Flow:

    ┌──────────────┐  buyPInc()  ┌──────────────┐
    │    Users     │───MATIC────▶│  PIncToken   │
    │              │◀──PINCUM────│  (Presale)   │
    └──────────────┘             └──────┬───────┘
                                        │ 1:1
                                        │
    ┌──────────────┐swapPIncForInc()   │
    │    Users     │◀──────INCUM───────┤
    │              │──────PINCUM───────▶│
    └──────────────┘   (burned)   ┌─────▼────────┐
                                  │  IncRedeem   │
                                  │ (Redemption) │
                                  └──────────────┘
```

---

## 🧪 Testing

### Test Structure

```
test/
├── unit/              # Unit tests for individual contracts
├── integration/       # Multi-contract interaction tests
└── simulations/       # Economic game theory simulations
```

### Test Coverage

- ✅ IncToken deployment & minting
- ✅ Ownership transfer
- ✅ ERC20 standard compliance
- 🔄 MasterChefV2 pool management (in progress)
- 🔄 Staking & reward distribution (in progress)
- 🔄 Economic simulations (planned)

---

---

## 🧪 Testing & Simulation Infrastructure

### Three-Tier Testing Strategy

**1. Unit Tests** - Verify individual contract functions
```bash
npx hardhat test test/unit/IncToken.test.ts
```
- ✅ 16 tests passing
- Coverage: Token minting, access control, ERC20 compliance

**2. Integration Tests** - Multi-contract interaction flows
```bash
npx hardhat test test/integration/
```
- Full deposit → stake → claim flows
- Multi-pool interactions
- Fee distribution

**3. Economic Simulations** - Game theory & behavioral testing
```bash
npx hardhat test test/simulations/
```
- **Whale attacks** - 50% stake → dump scenarios
- **APR decay** - Multi-user growth over 365 days
- **Mercenary capital** - APR-chasing behavior
- **Pool balancing** - Allocation optimization

### Simulation Capabilities

**Time Manipulation:**
```typescript
// Test 1 year of farm behavior in seconds
await time.increase(365 * 86400);
await mine(1000); // Mine blocks
```

**Mainnet Forking:**
```typescript
// Test with real QuickSwap LP tokens
const QUICKSWAP_WMATIC_USDC = "0x6e7a5FAF...";
await masterChef.add(1000, lpToken, 100, false);
```

**Metrics Export:**
```typescript
// Export daily APR/TVL data for analysis
await simulator.exportMetrics('whale_attack_results.csv');
```

### Chain-Agnostic Test Framework

```typescript
// Unified test adapter interface
interface ITestAdapter {
  setup(): Promise<void>;
  createPool(lpToken: string): Promise<string>;
  stake(user: TestUser, amount: bigint): Promise<void>;
  advanceTime(seconds: number): Promise<void>;
  getAPR(poolId: string): Promise<number>;
}

// Same test runs on BOTH chains
export function createWhaleAttackTest(adapter: ITestAdapter) {
  it('should handle 50% whale dump', async () => {
    await adapter.stake(whale, poolId, parseEther('500000'));
    await adapter.advanceTime(7 * 86400);
    const aprBefore = await adapter.getAPR(poolId);
    await adapter.unstake(whale, poolId, parseEther('500000'));
    const aprAfter = await adapter.getAPR(poolId);
    expect((aprBefore - aprAfter) / aprBefore * 100).to.be.lessThan(50);
  });
}

// Run on EVM
createWhaleAttackTest(new EVMTestAdapter());

// Run on Solana
createWhaleAttackTest(new SolanaTestAdapter());
```

**Benefits:**
- ✅ Ensures consistent behavior across chains
- ✅ Tests same economic scenarios
- ✅ Validates tokenomics before mainnet
- ✅ Identifies breaking edge cases

---

## 📚 Documentation

- **[TECHNICAL_SPEC.md](./docs/TECHNICAL_SPEC.md)** - Complete technical specification
  - Contract architecture & tokenomics
  - Multi-chain comparison (EVM vs Solana vs high-volume chains)
  - Chain adapter design patterns
  - Testing & simulation infrastructure
  - Security considerations & deployment checklists

- **[LEARNING_GUIDE.md](./docs/LEARNING_GUIDE.md)** - Development journey & key learnings
  - Tool selection rationale (Hardhat vs Foundry)
  - Modernization process (Solidity 0.8.20, OpenZeppelin v5)
  - Multi-chain architectural decisions
  - Economic simulation framework design
  - Common pitfalls avoided & best practices

- **[MULTI_CHAIN_ARCHITECTURE.md](./docs/MULTI_CHAIN_ARCHITECTURE.md)** - Implementation roadmap
  - Turborepo monorepo structure
  - Solana program architecture (Anchor/Rust)
  - Chain adapter interface & implementations
  - Frontend integration patterns
  - Phase-by-phase implementation guide

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## ⚠️ Disclaimer

This software is provided "as is", without warranty of any kind. Use at your own risk. The contracts have not been formally audited. Always do your own research before interacting with smart contracts.
