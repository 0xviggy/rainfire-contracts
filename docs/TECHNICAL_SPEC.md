# Technical Specification
**Rainfire Multi-Chain Yield Farming Protocol**

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [EVM Implementation](#evm-implementation)
3. [Solana Implementation](#solana-implementation)
4. [Chain Comparison Matrix](#chain-comparison-matrix)
5. [Chain-Agnostic Architecture](#chain-agnostic-architecture)
6. [Testing Infrastructure](#testing-infrastructure)
7. [Economic Model](#economic-model)
8. [Security Considerations](#security-considerations)

---

## 🎯 System Overview

### Core Protocol Components

**Token System:**
- **INCUM (INC)** - Main reward token (100k max supply)
- **PINCUM (PINC)** - Presale token (30k max supply, 1:1 redemption)

**Staking System:**
- **MasterChef** - Multi-pool staking & reward distribution
- **Pool Management** - LP token staking with configurable allocations
- **Reward Distribution** - Block-based emission with hard cap

**Governance:**
- **Timelock** - 6-hour minimum delay for admin actions
- **Ownable** - Admin control for pool management

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    INCUM Token (INC)                     │
│           Max Supply: 100k | Pre-mint: 37.5k            │
└────────────────────────┬────────────────────────────────┘
                         │ mints to
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   MasterChef Contract                    │
│   • Multi-pool staking (LP tokens)                      │
│   • Block-based reward distribution                     │
│   • Configurable allocation points                      │
│   • Deposit fees (max 4.01%)                           │
└────────────┬────────────────────────────────────────────┘
             │ manages
             ▼
      ┌──────┴──────┬──────────┐
      │             │          │
   Pool 0        Pool 1     Pool N
 (LP Token A)  (LP Token B) (LP Token X)
      │             │          │
      └──────┬──────┴──────────┘
             │ earns rewards
             ▼
      ┌─────────────┐
      │    Users    │
      └─────────────┘

Presale Flow:
┌──────────┐  buyPInc()  ┌──────────┐
│  Users   │──MATIC/SOL─▶│  PIncum  │
└──────────┘             └────┬─────┘
                              │ 1:1 swap
┌──────────┐  redeem()        │
│  Users   │◀────INCUM────────┤
└──────────┘                  ▼
                         ┌──────────┐
                         │ IncRedeem│
                         └──────────┘
```

---

## 🔷 EVM Implementation

### Technology Stack

- **Language:** Solidity 0.8.20
- **Framework:** Hardhat 2.22.0
- **Libraries:** OpenZeppelin Contracts v5.x
- **Testing:** Mocha, Chai, Hardhat Network Helpers
- **Type Generation:** TypeChain (ethers-v6)

### Contract Architecture

#### 1. IncToken.sol

```solidity
contract IncToken is ERC20('INCUM', 'INCUM') {
    constructor() {
        _mint(0x3a1D1114269d7a786C154FE5278bF5b1e3e20d31, 37500 * 10^18);
    }
    
    function mint(address _to, uint256 _amount) public onlyOwner {
        _mint(_to, _amount);
    }
}
```

**Key Features:**
- Standard ERC20 with minting capability
- Pre-mint: 37,500 tokens (37.5% of max supply)
- Only owner (MasterChef) can mint
- Hard cap enforced at MasterChef level

**Storage:**
- `mapping(address => uint256) _balances`
- `mapping(address => mapping(address => uint256)) _allowances`
- `uint256 _totalSupply`

#### 2. MasterChefV2.sol

```solidity
struct PoolInfo {
    IERC20 lpToken;           // LP token contract
    uint256 allocPoint;       // Allocation weight
    uint256 lastRewardBlock;  // Last reward distribution
    uint256 accIncPerShare;   // Accumulated INC per share (×1e12)
    uint16 depositFeeBP;      // Deposit fee (basis points)
    uint256 lpSupply;         // Total staked
}

struct UserInfo {
    uint256 amount;           // LP tokens staked
    uint256 rewardDebt;       // Reward accounting
}
```

**Core Functions:**

```solidity
function deposit(uint256 _pid, uint256 _amount) external nonReentrant;
function withdraw(uint256 _pid, uint256 _amount) external nonReentrant;
function pendingInc(uint256 _pid, address _user) external view returns (uint256);
function updatePool(uint256 _pid) public;
```

**Reward Calculation:**
```
pending = (user.amount × pool.accIncPerShare) / 1e12 - user.rewardDebt
```

**Emission Logic:**
```solidity
uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
uint256 incReward = multiplier * incPerBlock * pool.allocPoint / totalAllocPoint;

// Hard cap enforcement
if (inc.totalSupply() + incReward > incMaximumSupply) {
    incReward = incMaximumSupply - inc.totalSupply();
}

inc.mint(address(this), incReward);
pool.accIncPerShare += (incReward * 1e12) / pool.lpSupply;
```

**Security Features:**
- `ReentrancyGuard` on all state-changing functions
- Deposit fee (max 4.01%) prevents flash loan attacks
- `SafeERC20` for token transfers
- `nonDuplicated` modifier prevents duplicate pools

#### 3. PIncToken.sol (Presale)

```solidity
contract PIncToken is ERC20('PRE-INCUM', 'PINCUM'), ReentrancyGuard {
    uint256 public constant pincMaximumSupply = 30000 * 10^18;
    uint256 public constant maxPIncPurchase = 600 * 10^18;
    uint256 public salePriceE35 = 1666 * 10^31; // Scaled price
    
    function buyPInc() external payable nonReentrant {
        // Calculate PINC amount from MATIC
        uint256 pincAmount = (msg.value * salePriceE35) / 1e35;
        
        // Enforce user cap
        require(userPincTally[msg.sender] + pincAmount <= maxPIncPurchase);
        
        // Transfer PINC & MATIC
        IERC20(address(this)).transfer(msg.sender, pincAmount);
        payable(feeAddress).transfer(msg.value);
    }
}
```

**Sale Parameters:**
- Duration: 3 days (Polygon blocks)
- User limit: 600 PINC max
- Payment: MATIC
- Refunds: Automatic if over limit

#### 4. IncRedeem.sol

```solidity
function swapPIncForInc(uint256 swapAmount) external nonReentrant {
    require(block.number >= startBlock);
    pinc.transferFrom(msg.sender, BURN_ADDRESS, swapAmount); // Burn PINC
    IERC20(incAddress).transfer(msg.sender, swapAmount);     // Send INC
}
```

### EVM Gas Optimization

**Strategies Used:**
- Solidity 0.8.20 optimizer (200 runs)
- `uint256` packing where possible
- Minimal storage reads (cache in memory)
- `unchecked` for safe math operations
- Event emission over storage

**Typical Gas Costs:**
- Token transfer: ~50k gas
- Stake LP tokens: ~150k gas
- Claim rewards: ~100k gas
- Unstake: ~120k gas

---

## ◎ Solana Implementation

### Technology Stack

- **Language:** Rust 1.70+
- **Framework:** Anchor 0.29.0
- **Token Standard:** SPL Token
- **Testing:** Rust native tests + TypeScript (Anchor)
- **Deployment:** Anchor CLI

### Program Architecture

#### Account Structures

```rust
#[account]
pub struct GlobalState {
    pub authority: Pubkey,        // Admin
    pub inc_mint: Pubkey,         // INC token mint
    pub inc_per_slot: u64,        // Emission rate
    pub total_alloc_point: u64,   // Sum of pool weights
    pub start_slot: u64,          // Farming start
    pub emission_end_slot: u64,   // Farming end
    pub bump: u8,                 // PDA bump seed
}

#[account]
pub struct Pool {
    pub lp_mint: Pubkey,          // LP token mint
    pub lp_vault: Pubkey,         // LP token vault (PDA)
    pub alloc_point: u64,         // Pool weight
    pub last_reward_slot: u64,    // Last reward distribution
    pub acc_inc_per_share: u128,  // Scaled by 1e12
    pub deposit_fee_bp: u16,      // Basis points
    pub total_staked: u64,        // Total LP tokens
    pub bump: u8,
}

#[account]
pub struct UserStake {
    pub user: Pubkey,             // User wallet
    pub pool: Pubkey,             // Pool account
    pub amount: u64,              // LP tokens staked
    pub reward_debt: u128,        // Reward accounting
    pub bump: u8,
}
```

#### Program Derived Addresses (PDAs)

```rust
// Global state PDA
let (global_state, bump) = Pubkey::find_program_address(
    &[b"global_state"],
    program_id
);

// Pool PDA (one per LP mint)
let (pool, bump) = Pubkey::find_program_address(
    &[b"pool", lp_mint.as_ref()],
    program_id
);

// User stake PDA (one per user/pool combo)
let (user_stake, bump) = Pubkey::find_program_address(
    &[b"user_stake", user.as_ref(), pool.as_ref()],
    program_id
);

// LP vault PDA (holds staked LP tokens)
let (lp_vault, bump) = Pubkey::find_program_address(
    &[b"lp_vault", pool.as_ref()],
    program_id
);
```

#### Core Instructions

**1. Initialize Global State**
```rust
#[derive(Accounts)]
pub struct InitializeGlobal<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + GlobalState::SIZE,
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    pub inc_mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_global(
    ctx: Context<InitializeGlobal>,
    inc_per_slot: u64,
    start_slot: u64,
) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    global_state.authority = ctx.accounts.authority.key();
    global_state.inc_mint = ctx.accounts.inc_mint.key();
    global_state.inc_per_slot = inc_per_slot;
    global_state.start_slot = start_slot;
    global_state.bump = *ctx.bumps.get("global_state").unwrap();
    Ok(())
}
```

**2. Create Pool**
```rust
#[derive(Accounts)]
pub struct CreatePool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump,
        has_one = authority
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + Pool::SIZE,
        seeds = [b"pool", lp_mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,
    
    pub lp_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = authority,
        seeds = [b"lp_vault", pool.key().as_ref()],
        bump,
        token::mint = lp_mint,
        token::authority = pool
    )]
    pub lp_vault: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn create_pool(
    ctx: Context<CreatePool>,
    alloc_point: u64,
    deposit_fee_bp: u16,
) -> Result<()> {
    require!(deposit_fee_bp <= 401, ErrorCode::FeeTooHigh);
    
    let pool = &mut ctx.accounts.pool;
    pool.lp_mint = ctx.accounts.lp_mint.key();
    pool.lp_vault = ctx.accounts.lp_vault.key();
    pool.alloc_point = alloc_point;
    pool.last_reward_slot = Clock::get()?.slot;
    pool.deposit_fee_bp = deposit_fee_bp;
    pool.bump = *ctx.bumps.get("pool").unwrap();
    
    // Update global allocation
    let global_state = &mut ctx.accounts.global_state;
    global_state.total_alloc_point += alloc_point;
    
    Ok(())
}
```

**3. Stake Instruction**
```rust
#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(
        mut,
        seeds = [b"pool", pool.lp_mint.as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserStake::SIZE,
        seeds = [b"user_stake", user.key().as_ref(), pool.key().as_ref()],
        bump
    )]
    pub user_stake: Account<'info, UserStake>,
    
    #[account(
        mut,
        constraint = user_lp_account.mint == pool.lp_mint
    )]
    pub user_lp_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"lp_vault", pool.key().as_ref()],
        bump
    )]
    pub lp_vault: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let user_stake = &mut ctx.accounts.user_stake;
    let clock = Clock::get()?;
    
    // Update pool rewards
    update_pool(pool, &ctx.accounts.global_state, clock.slot)?;
    
    // Claim pending rewards if user has existing stake
    if user_stake.amount > 0 {
        let pending = calculate_pending(user_stake, pool)?;
        if pending > 0 {
            mint_inc_rewards(ctx, pending)?;
        }
    }
    
    // Transfer LP tokens from user to vault
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_lp_account.to_account_info(),
            to: ctx.accounts.lp_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        }
    );
    token::transfer(cpi_ctx, amount)?;
    
    // Apply deposit fee
    let net_amount = if pool.deposit_fee_bp > 0 {
        let fee = amount * pool.deposit_fee_bp as u64 / 10000;
        // Transfer fee to fee account (CPI)
        amount - fee
    } else {
        amount
    };
    
    // Update user stake
    user_stake.user = ctx.accounts.user.key();
    user_stake.pool = ctx.accounts.pool.key();
    user_stake.amount += net_amount;
    user_stake.reward_debt = (user_stake.amount as u128 * pool.acc_inc_per_share) / 1e12;
    user_stake.bump = *ctx.bumps.get("user_stake").unwrap();
    
    // Update pool total
    pool.total_staked += net_amount;
    
    Ok(())
}
```

**Helper Functions:**
```rust
fn update_pool(
    pool: &mut Pool,
    global_state: &GlobalState,
    current_slot: u64,
) -> Result<()> {
    if current_slot <= pool.last_reward_slot {
        return Ok(());
    }
    
    if pool.total_staked == 0 {
        pool.last_reward_slot = current_slot;
        return Ok(());
    }
    
    let slots_elapsed = current_slot - pool.last_reward_slot;
    let inc_reward = slots_elapsed * global_state.inc_per_slot 
        * pool.alloc_point / global_state.total_alloc_point;
    
    pool.acc_inc_per_share += (inc_reward as u128 * 1e12) / pool.total_staked as u128;
    pool.last_reward_slot = current_slot;
    
    Ok(())
}

fn calculate_pending(user_stake: &UserStake, pool: &Pool) -> Result<u64> {
    let pending = (user_stake.amount as u128 * pool.acc_inc_per_share) / 1e12 
        - user_stake.reward_debt;
    Ok(pending as u64)
}
```

### Solana-Specific Considerations

**1. Account Rent:**
- All accounts must be rent-exempt
- Users pay SOL for account creation
- Typical account sizes: 200-500 bytes

**2. Transaction Limits:**
- Max compute units: 1.4M per transaction
- Max accounts per transaction: 64
- Complex operations may need multiple transactions

**3. Cross-Program Invocations (CPIs):**
- SPL Token transfers via CPI
- Mint authority must be PDA
- Sign with PDA seeds in CPI

**4. Precision:**
- No native 256-bit integers
- Use u128 for reward calculations (scaled by 1e12)
- Careful overflow checking with `checked_add`, `checked_mul`

---

## 📊 Chain Comparison Matrix

| Feature | EVM (Solidity) | Solana (Rust/Anchor) |
|---------|----------------|----------------------|
| **State Model** | Contract storage | Accounts (rent-exempt) |
| **Functions** | Contract methods | Instructions (stateless) |
| **Tokens** | ERC20 interface | SPL Token Program (CPI) |
| **Math** | Native 256-bit | u64/u128 (manual checks) |
| **Gas/Fees** | Per-operation gas | Compute units + rent |
| **Access Control** | `onlyOwner` modifier | Account constraints |
| **Reentrancy** | ReentrancyGuard | Not applicable |
| **Events** | `emit Event()` | `msg!()` or custom logging |
| **Testing** | Hardhat/Foundry | Anchor + TypeScript |
| **Time** | `block.number`, `block.timestamp` | `Clock::get()?.slot` |
| **Deployment** | Hardhat scripts | Anchor deploy |
| **Verification** | Etherscan API | Anchor verify |

### Key Differences

**State Management:**
- **EVM:** All state in contract storage, accessed via mappings
- **Solana:** Each user/pool has separate account, accessed via PDAs

**Token Operations:**
- **EVM:** Direct calls to ERC20 contract (`transfer()`, `approve()`)
- **Solana:** Cross-program invocation to SPL Token Program

**Precision:**
- **EVM:** Native 256-bit, no overflow concerns (0.8.x)
- **Solana:** u64/u128, must check overflow explicitly

**Cost Model:**
- **EVM:** Pay per operation (gas), refund for unused
- **Solana:** Pay for compute units + account rent (one-time)

**Reward Calculation:**
```solidity
// EVM: Same formula, different syntax
pending = (user.amount * pool.accIncPerShare) / 1e12 - user.rewardDebt;
```

```rust
// Solana: Same formula, explicit types
let pending = (user_stake.amount as u128 * pool.acc_inc_per_share) / 1e12 
    - user_stake.reward_debt;
```

---

## 🔗 Chain-Agnostic Architecture

### Interface Design

```typescript
// Unified interface for all chains
interface IChainAdapter {
  // Chain identification
  chainType: 'evm' | 'solana' | 'cosmos';
  chainId: string | number;
  
  // Wallet operations
  connectWallet(): Promise<string>;
  getAddress(): Promise<string | null>;
  
  // Token operations
  getTokenBalance(token: string, user: string): Promise<bigint>;
  approveToken(token: string, spender: string, amount: bigint): Promise<string>;
  
  // Farm operations
  getFarmPools(): Promise<FarmPool[]>;
  getUserPosition(poolId: string, user: string): Promise<UserPosition>;
  getPendingRewards(poolId: string, user: string): Promise<bigint>;
  stake(poolId: string, amount: bigint): Promise<string>;
  unstake(poolId: string, amount: bigint): Promise<string>;
  claim(poolId: string): Promise<string>;
  
  // Utilities
  formatUnits(amount: bigint, decimals: number): string;
  parseUnits(amount: string, decimals: number): bigint;
}
```

### Implementation Pattern

**EVM Adapter:**
```typescript
class EVMAdapter implements IChainAdapter {
  private provider: ethers.Provider;
  private signer: ethers.Signer | null;
  
  async stake(poolId: string, amount: bigint): Promise<string> {
    const masterChef = new ethers.Contract(MASTER_CHEF_ADDRESS, ABI, this.signer);
    const tx = await masterChef.deposit(poolId, amount);
    const receipt = await tx.wait();
    return receipt.hash;
  }
}
```

**Solana Adapter:**
```typescript
class SolanaAdapter implements IChainAdapter {
  private connection: Connection;
  private wallet: any;
  private program: Program;
  
  async stake(poolId: string, amount: bigint): Promise<string> {
    const tx = await this.program.methods
      .stake(new BN(amount.toString()))
      .accounts({
        user: this.wallet.publicKey,
        pool: new PublicKey(poolId),
        // ... other accounts
      })
      .rpc();
    return tx;
  }
}
```

### Frontend Integration

```typescript
// Chain provider
const ChainProvider = ({ children }) => {
  const [adapter, setAdapter] = useState<IChainAdapter | null>(null);
  
  const switchChain = (chainType: 'evm' | 'solana') => {
    if (chainType === 'evm') {
      setAdapter(new EVMAdapter(137, RPC_URL)); // Polygon
    } else {
      setAdapter(new SolanaAdapter(RPC_URL, 'mainnet-beta'));
    }
  };
  
  return (
    <ChainContext.Provider value={{ adapter, switchChain }}>
      {children}
    </ChainContext.Provider>
  );
};

// Universal component
const FarmCard = ({ pool }) => {
  const { adapter } = useChain();
  
  const handleStake = async (amount: string) => {
    const amountBN = adapter.parseUnits(amount, 18);
    const txHash = await adapter.stake(pool.id, amountBN);
    console.log('Staked! Tx:', txHash);
  };
  
  return <div>...</div>;
};
```

---

## 🧪 Testing Infrastructure

### Test Adapter Interface

```typescript
interface ITestAdapter {
  // Setup
  setup(): Promise<void>;
  deployContracts(): Promise<ContractAddresses>;
  
  // Time manipulation
  advanceTime(seconds: number): Promise<void>;
  advanceBlocks(blocks: number): Promise<void>;
  
  // User simulation
  createUser(): Promise<TestUser>;
  fundUser(user: TestUser, amount: bigint): Promise<void>;
  
  // Farm operations
  createPool(lpToken: string, allocPoints: number): Promise<string>;
  stake(user: TestUser, poolId: string, amount: bigint): Promise<void>;
  unstake(user: TestUser, poolId: string, amount: bigint): Promise<void>;
  getPendingRewards(user: TestUser, poolId: string): Promise<bigint>;
  
  // Metrics
  getTVL(poolId: string): Promise<bigint>;
  getAPR(poolId: string): Promise<number>;
}
```

### Shared Economic Tests

```typescript
// Test runs on BOTH chains
export function createWhaleAttackTest(adapter: ITestAdapter) {
  describe('Whale Attack Simulation', () => {
    it('should handle 50% whale dump gracefully', async () => {
      await adapter.setup();
      const whale = await adapter.createUser();
      const poolId = await adapter.createPool(LP_TOKEN, 1000);
      
      // Whale stakes 50%
      await adapter.stake(whale, poolId, parseEther('500000'));
      await adapter.advanceTime(7 * 86400); // 7 days
      
      const aprBefore = await adapter.getAPR(poolId);
      
      // Whale dumps
      await adapter.unstake(whale, poolId, parseEther('500000'));
      
      const aprAfter = await adapter.getAPR(poolId);
      const aprDrop = ((aprBefore - aprAfter) / aprBefore) * 100;
      
      expect(aprDrop).toBeLessThan(50); // <50% drop acceptable
    });
  });
}

// Run on EVM
const evmAdapter = new EVMTestAdapter();
createWhaleAttackTest(evmAdapter);

// Run on Solana
const solanaAdapter = new SolanaTestAdapter();
createWhaleAttackTest(solanaAdapter);
```

### EVM Time Manipulation

```typescript
import { time, mine } from "@nomicfoundation/hardhat-network-helpers";

// Fast-forward time
await time.increase(86400); // 1 day
await time.increaseTo(targetTimestamp);

// Mine blocks
await mine(1000);

// Get current time
const now = await time.latest();
```

### Solana Time Manipulation

```typescript
// Solana test validator
await provider.connection.rpcRequest('warp', [seconds]);

// Or advance slots
await provider.connection.commitment('processed');
```

---

## 💰 Economic Model

### Token Supply

| Token | Max Supply | Initial Distribution |
|-------|------------|---------------------|
| INCUM | 100,000 | 37,500 pre-mint (37.5%) |
| PINCUM | 30,000 | Presale (redeemable 1:1) |

### Emission Schedule

**Formula:**
```
rewards_per_block = incPerBlock × (pool.allocPoint / totalAllocPoint)
```

**Example:**
- `incPerBlock` = 10 INC
- Pool A: 60% allocation (600 points)
- Pool B: 40% allocation (400 points)
- Total: 1000 points

Pool A earns: 10 × 0.6 = **6 INC per block**  
Pool B earns: 10 × 0.4 = **4 INC per block**

### APR Calculation

```
APR = (incPerBlock × blocksPerYear × poolAllocation × incPrice) / (poolTVL) × 100
```

**Variables:**
- `blocksPerYear`:
  - Polygon: ~15,768,000 (2s blocks)
  - Solana: ~157,680,000 (0.4s slots)
- `poolAllocation` = pool.allocPoint / totalAllocPoint
- `poolTVL` = pool.lpSupply × lpTokenPrice
- `incPrice` = Market price of INC token

**Example:**
```
incPerBlock = 10 INC
blocksPerYear = 15,768,000
poolAllocation = 0.6 (60%)
incPrice = $0.50
poolTVL = $1,000,000

APR = (10 × 15,768,000 × 0.6 × 0.50) / 1,000,000 × 100
    = 47,304,000 / 1,000,000 × 100
    = 4.73% APR
```

### Hard Cap Enforcement

```solidity
// EVM
if (inc.totalSupply() + incReward > incMaximumSupply) {
    incReward = incMaximumSupply - inc.totalSupply();
}

// Auto-stop emissions
if (inc.totalSupply() >= incMaximumSupply) {
    emmissionEndBlock = block.number;
}
```

```rust
// Solana
if global_state.inc_minted + inc_reward > INC_MAXIMUM_SUPPLY {
    inc_reward = INC_MAXIMUM_SUPPLY - global_state.inc_minted;
}

// Auto-stop emissions
if global_state.inc_minted >= INC_MAXIMUM_SUPPLY {
    global_state.emission_end_slot = clock.slot;
}
```

---

## 🔒 Security Considerations

### EVM Security

**1. Reentrancy Protection:**
```solidity
function deposit(uint256 _pid, uint256 _amount) external nonReentrant {
    // All state changes before external calls
    updatePool(_pid);
    safeIncTransfer(msg.sender, pending);
    pool.lpToken.safeTransferFrom(msg.sender, address(this), _amount);
}
```

**2. Deposit Fees:**
- Max 4.01% to prevent flash loan attacks
- Fee sent to separate address
- Applied before reward calculation

**3. Emergency Withdraw:**
```solidity
function emergencyWithdraw(uint256 _pid) external nonReentrant {
    // Users can always recover LP tokens
    // Forfeits pending rewards
}
```

**4. SafeERC20:**
- Handles non-standard ERC20 tokens
- Reverts on failed transfers
- Checks return values

### Solana Security

**1. Account Validation:**
```rust
#[account(
    mut,
    seeds = [b"pool", lp_mint.key().as_ref()],
    bump = pool.bump,
    has_one = lp_mint,  // Ensures correct LP mint
    has_one = lp_vault  // Ensures correct vault
)]
pub pool: Account<'info, Pool>,
```

**2. Signer Checks:**
```rust
#[account(mut)]
pub user: Signer<'info>,  // Must sign transaction
```

**3. Overflow Protection:**
```rust
let new_amount = user_stake.amount
    .checked_add(net_amount)
    .ok_or(ErrorCode::Overflow)?;
```

**4. PDA Authority:**
```rust
// Only program can sign for PDAs
let seeds = &[
    b"lp_vault",
    pool.key().as_ref(),
    &[pool.bump]
];

let signer = &[&seeds[..]];

// CPI with PDA as authority
token::transfer(
    CpiContext::new_with_signer(
        token_program,
        accounts,
        signer
    ),
    amount
)?;
```

### Common Vulnerabilities

**Mitigated:**
- ✅ Reentrancy (ReentrancyGuard / Solana architecture)
- ✅ Integer overflow (0.8.x / checked math)
- ✅ Flash loan attacks (deposit fees)
- ✅ Unauthorized access (Ownable / account constraints)
- ✅ Front-running (slippage not applicable)

**Still Considerations:**
- ⚠️ Admin key compromise (use multisig)
- ⚠️ Oracle manipulation (if using price feeds)
- ⚠️ Governance attacks (use timelock)

---

## 📈 Performance & Optimization

### EVM Optimizations

**Gas Savings:**
- Cache storage reads in memory variables
- Use `unchecked` for safe operations
- Pack structs efficiently (uint256 alignment)
- Emit events instead of storing data

**Example:**
```solidity
// Before: 3 SLOAD operations
pool.accIncPerShare = pool.accIncPerShare + reward;

// After: 2 SLOAD, 1 SSTORE
uint256 accInc = pool.accIncPerShare; // Cache
accInc += reward;
pool.accIncPerShare = accInc;
```

### Solana Optimizations

**Compute Unit Savings:**
- Minimize account reads
- Use zero-copy deserialization for large accounts
- Batch operations when possible
- Use smaller integer types where appropriate

**Example:**
```rust
// Use u64 instead of u128 when possible
pub total_staked: u64,  // Instead of u128

// Zero-copy for large arrays
#[account(zero_copy)]
pub struct PoolMetrics {
    pub historical_apr: [u64; 365],
}
```

---

## 🚀 Deployment Checklist

### EVM Deployment

- [ ] Set correct `incPerBlock` emission rate
- [ ] Set correct `startBlock`
- [ ] Transfer IncToken ownership to MasterChef
- [ ] Create initial pools with correct allocations
- [ ] Set deposit fees (if any)
- [ ] Transfer MasterChef ownership to Timelock
- [ ] Verify contracts on Polygonscan
- [ ] Test all functions on testnet first

### Solana Deployment

- [ ] Set correct `inc_per_slot` emission rate
- [ ] Set correct `start_slot`
- [ ] Initialize global state
- [ ] Set mint authority to MasterChef PDA
- [ ] Create initial pools
- [ ] Fund fee accounts with SOL for rent
- [ ] Verify program with `anchor verify`
- [ ] Test on devnet first

---

**Last Updated:** November 15, 2025  
**Version:** 2.0.0 (Multi-chain)  
**Status:** EVM Production | Solana Development
