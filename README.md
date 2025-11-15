# Rainfire Contracts

A DeFi yield farming protocol on Polygon featuring INCUM token emissions through liquidity pool staking.

## 🌐 Deployed Contracts (Polygon Mainnet)

| Contract | Address | Description |
|----------|---------|-------------|
| **IncToken** | [0xfE1a200637464FBC9B60Bc7AeCb9b86c0E1d486E](https://polygonscan.com/address/0xfE1a200637464FBC9B60Bc7AeCb9b86c0E1d486E) | Main governance/reward token |
| **MasterChefV2** | [0xfcD73006121333C92D770662745146338E419556](https://polygonscan.com/address/0xfcD73006121333C92D770662745146338E419556) | Core staking & rewards contract |
| **PIncToken** | [0xfD30189bD6de5503bB1db60cf1136123EdEA837A](https://polygonscan.com/address/0xfD30189bD6de5503bB1db60cf1136123EdEA837A) | Presale token |
| **IncRedeem** | [0xCcA55FAF3BF71dba92694877CB09c577A226aEaF](https://polygonscan.com/address/0xCcA55FAF3BF71dba92694877CB09c577A226aEaF) | Presale redemption contract |
| **Timelock** | [0x6a8af1dbFdb32dAc39BF8A386c03cC8857a107a8](https://polygonscan.com/address/0x6a8af1dbFdb32dAc39BF8A386c03cC8857a107a8) | Governance timelock |

---

## 📁 Project Structure

```
rainfire-contracts/
├── contracts/
│   ├── IncToken.sol           # Main INCUM token (ERC20 with minting)
│   ├── MasterChefV2.sol       # Staking & reward distribution
│   ├── Timelock.sol           # Governance delay mechanism
│   └── libs/
│       ├── ERC20.sol          # Custom ERC20 implementation
│       ├── IERC20.sol         # ERC20 interface
│       ├── IERC20Metadata.sol # ERC20 metadata interface
│       └── SafeERC20.sol      # Safe token transfer library
│
├── presale-contracts/
│   ├── PIncToken.sol          # Presale PINCUM token
│   └── IncRedeem.sol          # PINCUM → INCUM redemption
│
└── test/
    ├── unit/
    │   └── IncToken.test.ts   # Token unit tests
    ├── integration/           # Integration tests (TBD)
    └── simulations/           # Economic simulations (TBD)
```

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

## 📖 Additional Documentation

- [Frontend Development Plan](./FRONTEND_PLAN.md) - UI/UX roadmap
- [Project Revival Notes](./PROJECT_NOTES.md) - Technical decisions & architecture
- [Renaming Documentation](./RENAMING_COMPLETE.md) - Rebranding details

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## ⚠️ Disclaimer

This software is provided "as is", without warranty of any kind. Use at your own risk. The contracts have not been formally audited. Always do your own research before interacting with smart contracts.
