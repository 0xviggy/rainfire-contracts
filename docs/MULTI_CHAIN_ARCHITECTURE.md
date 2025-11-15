# Multi-Chain Architecture Plan
**Rainfire Contracts: EVM + Solana + Extensible**

## 🎯 Vision

Deploy Rainfire yield farming protocol across multiple blockchains with:
- **Unified codebase** - Shared business logic, chain-specific implementations
- **Consistent UX** - Same frontend experience across all chains
- **Extensible design** - Easy to add new chains (Base, Arbitrum, etc.)
- **Modular testing** - Shared test scenarios, chain-specific adapters

---

## 🏗️ Monorepo Architecture

### Recommended: Turborepo

**Why Turborepo over alternatives:**
- Fast incremental builds with caching
- Simple configuration (compared to Nx)
- Built-in remote caching
- Great DX for multi-chain projects
- Works seamlessly with pnpm/npm workspaces

**Alternatives considered:**
- **Nx:** More features but heavier, overkill for this project
- **pnpm workspaces:** Too basic, no build orchestration
- **Lerna:** Deprecated in favor of modern solutions

### Directory Structure

```
rainfire-monorepo/
├── packages/
│   ├── contracts-evm/          # Hardhat + Solidity (existing)
│   │   ├── contracts/
│   │   ├── test/
│   │   ├── hardhat.config.ts
│   │   └── package.json
│   │
│   ├── contracts-solana/       # Anchor + Rust (new)
│   │   ├── programs/
│   │   │   ├── incum_token/
│   │   │   ├── master_chef/
│   │   │   └── presale/
│   │   ├── tests/
│   │   ├── Anchor.toml
│   │   └── package.json
│   │
│   ├── shared-types/           # TypeScript types for both chains
│   │   ├── src/
│   │   │   ├── farm.ts       # Common farm types
│   │   │   ├── token.ts      # Token interfaces
│   │   │   └── user.ts       # User position types
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── shared-utils/           # Shared utility functions
│   │   ├── src/
│   │   │   ├── math.ts       # APR calculations, etc.
│   │   │   ├── formatters.ts # Number/date formatting
│   │   │   └── constants.ts  # Common constants
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── chain-adapters/         # Chain-specific abstractions
│   │   ├── src/
│   │   │   ├── base.ts       # IChainAdapter interface
│   │   │   ├── evm.ts        # EVM implementation
│   │   │   └── solana.ts     # Solana implementation
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── frontend/               # Next.js + wagmi + Solana wallet adapter
│       ├── app/
│       ├── components/
│       ├── lib/
│       │   ├── chains/       # Chain configs
│       │   ├── contracts/    # Contract ABIs/IDLs
│       │   └── providers/    # Wallet providers
│       ├── next.config.js
│       └── package.json
│
├── turbo.json                  # Turborepo config
├── package.json                # Root package.json
├── pnpm-workspace.yaml         # pnpm workspace config
└── README.md
```

---

## 📦 Package Dependency Graph

```
┌─────────────────┐
│    frontend     │
└────────┬────────┘
         │
         ├──────────────┬──────────────┐
         ▼              ▼              ▼
┌────────────────┐ ┌──────────┐ ┌──────────────┐
│ chain-adapters │ │shared-   │ │shared-       │
│                │ │types     │ │utils         │
└───┬───────┬────┘ └──────────┘ └──────────────┘
    │       │
    ▼       ▼
┌────────┐ ┌────────────┐
│contracts│ │contracts-  │
│-evm     │ │solana      │
└────────┘ └────────────┘
```

**Build order:**
1. `shared-types` + `shared-utils` (no dependencies)
2. `contracts-evm` + `contracts-solana` (independent)
3. `chain-adapters` (depends on contracts + shared packages)
4. `frontend` (depends on all)

---

## 🔗 Chain Adapter Interface

### Base Interface

```typescript
// packages/chain-adapters/src/base.ts

export enum ChainType {
  EVM = 'evm',
  SOLANA = 'solana',
}

export interface IChainAdapter {
  // Chain info
  chainType: ChainType;
  chainId: string | number;
  chainName: string;
  
  // Wallet
  connectWallet(): Promise<string>; // Returns address
  disconnectWallet(): Promise<void>;
  getAddress(): Promise<string | null>;
  
  // Token operations
  getTokenBalance(tokenAddress: string, userAddress: string): Promise<bigint>;
  approveToken(tokenAddress: string, spenderAddress: string, amount: bigint): Promise<string>; // Returns tx hash
  
  // Farm operations
  getFarmPools(): Promise<FarmPool[]>;
  getUserPosition(poolId: string, userAddress: string): Promise<UserPosition>;
  getPendingRewards(poolId: string, userAddress: string): Promise<bigint>;
  
  // Transactions
  stake(poolId: string, amount: bigint): Promise<string>;
  unstake(poolId: string, amount: bigint): Promise<string>;
  claim(poolId: string): Promise<string>;
  
  // Utils
  formatUnits(amount: bigint, decimals: number): string;
  parseUnits(amount: string, decimals: number): bigint;
}

export interface FarmPool {
  id: string;
  lpTokenAddress: string;
  lpTokenName: string;
  tvl: bigint;
  apr: number;
  depositFeeBP: number;
  totalStaked: bigint;
}

export interface UserPosition {
  poolId: string;
  stakedAmount: bigint;
  pendingRewards: bigint;
  lastUpdateTime: number;
}
```

### EVM Implementation

```typescript
// packages/chain-adapters/src/evm.ts

import { ethers } from 'ethers';
import { IChainAdapter, ChainType, FarmPool, UserPosition } from './base';

export class EVMAdapter implements IChainAdapter {
  chainType = ChainType.EVM;
  chainId: number;
  chainName: string;
  
  private provider: ethers.Provider;
  private signer: ethers.Signer | null = null;
  
  constructor(chainId: number, rpcUrl: string) {
    this.chainId = chainId;
    this.chainName = this.getChainName(chainId);
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }
  
  async connectWallet(): Promise<string> {
    if (!window.ethereum) throw new Error('No wallet found');
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    this.signer = await provider.getSigner();
    
    return await this.signer.getAddress();
  }
  
  async getFarmPools(): Promise<FarmPool[]> {
    const masterChef = new ethers.Contract(
      MASTER_CHEF_ADDRESS,
      MASTER_CHEF_ABI,
      this.provider
    );
    
    const poolLength = await masterChef.poolLength();
    const pools: FarmPool[] = [];
    
    for (let i = 0; i < poolLength; i++) {
      const poolInfo = await masterChef.poolInfo(i);
      // ... fetch additional data
      pools.push({
        id: i.toString(),
        lpTokenAddress: poolInfo.lpToken,
        // ... map other fields
      });
    }
    
    return pools;
  }
  
  async stake(poolId: string, amount: bigint): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');
    
    const masterChef = new ethers.Contract(
      MASTER_CHEF_ADDRESS,
      MASTER_CHEF_ABI,
      this.signer
    );
    
    const tx = await masterChef.deposit(poolId, amount);
    const receipt = await tx.wait();
    return receipt.hash;
  }
  
  // ... implement other methods
}
```

### Solana Implementation

```typescript
// packages/chain-adapters/src/solana.ts

import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider } from '@project-serum/anchor';
import { IChainAdapter, ChainType, FarmPool, UserPosition } from './base';

export class SolanaAdapter implements IChainAdapter {
  chainType = ChainType.SOLANA;
  chainId: string;
  chainName = 'Solana';
  
  private connection: Connection;
  private wallet: any = null; // Solana wallet adapter
  private program: Program | null = null;
  
  constructor(rpcUrl: string, cluster: 'mainnet-beta' | 'devnet') {
    this.chainId = cluster;
    this.connection = new Connection(rpcUrl, 'confirmed');
  }
  
  async connectWallet(): Promise<string> {
    if (!window.solana) throw new Error('No Solana wallet found');
    
    await window.solana.connect();
    this.wallet = window.solana;
    
    return this.wallet.publicKey.toString();
  }
  
  async getFarmPools(): Promise<FarmPool[]> {
    if (!this.program) throw new Error('Program not initialized');
    
    // Fetch all pool accounts
    const pools = await this.program.account.pool.all();
    
    return pools.map((pool, index) => ({
      id: index.toString(),
      lpTokenAddress: pool.account.lpMint.toString(),
      lpTokenName: 'LP Token', // Fetch from SPL token metadata
      tvl: BigInt(pool.account.totalStaked.toString()),
      apr: this.calculateAPR(pool.account),
      depositFeeBP: pool.account.depositFeeBP,
      totalStaked: BigInt(pool.account.totalStaked.toString()),
    }));
  }
  
  async stake(poolId: string, amount: bigint): Promise<string> {
    if (!this.wallet || !this.program) throw new Error('Wallet/program not initialized');
    
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
  
  // ... implement other methods
}
```

---

## 🔄 Frontend Integration

### Chain Provider Setup

```typescript
// packages/frontend/lib/providers/chain-provider.tsx

'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { EVMAdapter } from '@rainfire/chain-adapters';
import { SolanaAdapter } from '@rainfire/chain-adapters';
import { IChainAdapter, ChainType } from '@rainfire/chain-adapters';

interface ChainContextValue {
  adapter: IChainAdapter | null;
  chainType: ChainType | null;
  switchChain: (chainType: ChainType) => void;
  address: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const ChainContext = createContext<ChainContextValue>(null!);

export function ChainProvider({ children }: { children: React.ReactNode }) {
  const [adapter, setAdapter] = useState<IChainAdapter | null>(null);
  const [chainType, setChainType] = useState<ChainType | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  
  const switchChain = (newChainType: ChainType) => {
    if (newChainType === ChainType.EVM) {
      setAdapter(new EVMAdapter(137, process.env.NEXT_PUBLIC_POLYGON_RPC!));
    } else if (newChainType === ChainType.SOLANA) {
      setAdapter(new SolanaAdapter(process.env.NEXT_PUBLIC_SOLANA_RPC!, 'mainnet-beta'));
    }
    setChainType(newChainType);
  };
  
  const connect = async () => {
    if (!adapter) return;
    const addr = await adapter.connectWallet();
    setAddress(addr);
  };
  
  const disconnect = async () => {
    if (!adapter) return;
    await adapter.disconnectWallet();
    setAddress(null);
  };
  
  return (
    <ChainContext.Provider value={{ adapter, chainType, switchChain, address, connect, disconnect }}>
      {children}
    </ChainContext.Provider>
  );
}

export const useChain = () => useContext(ChainContext);
```

### Universal Farm Card Component

```typescript
// packages/frontend/components/farms/FarmCard.tsx

'use client';

import { useChain } from '@/lib/providers/chain-provider';
import { FarmPool } from '@rainfire/chain-adapters';
import { formatUnits } from '@rainfire/shared-utils';

interface FarmCardProps {
  pool: FarmPool;
}

export function FarmCard({ pool }: FarmCardProps) {
  const { adapter, address } = useChain();
  
  const handleStake = async (amount: string) => {
    if (!adapter) return;
    
    const amountBN = adapter.parseUnits(amount, 18);
    const txHash = await adapter.stake(pool.id, amountBN);
    
    console.log('Staked! Tx:', txHash);
  };
  
  return (
    <div className="border rounded-lg p-6">
      <h3 className="text-xl font-bold">{pool.lpTokenName}</h3>
      <div className="mt-4 space-y-2">
        <div className="flex justify-between">
          <span>TVL:</span>
          <span>${formatUnits(pool.tvl, 18)}</span>
        </div>
        <div className="flex justify-between">
          <span>APR:</span>
          <span className="text-green-500">{pool.apr.toFixed(2)}%</span>
        </div>
        <div className="flex justify-between">
          <span>Deposit Fee:</span>
          <span>{(pool.depositFeeBP / 100).toFixed(2)}%</span>
        </div>
      </div>
      
      {address ? (
        <button 
          onClick={() => handleStake('100')}
          className="mt-4 w-full bg-blue-500 text-white rounded-lg py-2"
        >
          Stake
        </button>
      ) : (
        <button className="mt-4 w-full bg-gray-300 rounded-lg py-2" disabled>
          Connect Wallet
        </button>
      )}
    </div>
  );
}
```

### Chain Selector Component

```typescript
// packages/frontend/components/layout/ChainSelector.tsx

'use client';

import { useChain } from '@/lib/providers/chain-provider';
import { ChainType } from '@rainfire/chain-adapters';

const CHAINS = [
  { type: ChainType.EVM, name: 'Polygon', icon: '🔷' },
  { type: ChainType.SOLANA, name: 'Solana', icon: '◎' },
];

export function ChainSelector() {
  const { chainType, switchChain } = useChain();
  
  return (
    <div className="flex gap-2">
      {CHAINS.map((chain) => (
        <button
          key={chain.type}
          onClick={() => switchChain(chain.type)}
          className={`px-4 py-2 rounded-lg ${
            chainType === chain.type 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200'
          }`}
        >
          {chain.icon} {chain.name}
        </button>
      ))}
    </div>
  );
}
```

---

## 🧪 Unified Testing Framework

### Test Adapter Interface

```typescript
// packages/shared-types/src/testing.ts

export interface ITestAdapter {
  // Setup
  setup(): Promise<void>;
  teardown(): Promise<void>;
  
  // Deploy contracts/programs
  deployContracts(): Promise<ContractAddresses>;
  
  // Time manipulation
  advanceTime(seconds: number): Promise<void>;
  advanceBlocks(blocks: number): Promise<void>;
  getCurrentTime(): Promise<number>;
  
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

export interface TestUser {
  address: string;
  signer: any; // ethers.Signer or Keypair
}

export interface ContractAddresses {
  token: string;
  masterChef: string;
  pools: string[];
}
```

### EVM Test Adapter

```typescript
// packages/contracts-evm/test/adapters/EVMTestAdapter.ts

import { ethers } from 'hardhat';
import { ITestAdapter, TestUser, ContractAddresses } from '@rainfire/shared-types';

export class EVMTestAdapter implements ITestAdapter {
  private token: any;
  private masterChef: any;
  
  async setup(): Promise<void> {
    // Reset Hardhat network
    await ethers.provider.send("hardhat_reset", []);
  }
  
  async deployContracts(): Promise<ContractAddresses> {
    const IncToken = await ethers.getContractFactory("IncToken");
    this.token = await IncToken.deploy();
    
    const MasterChef = await ethers.getContractFactory("MasterChefV2");
    this.masterChef = await MasterChef.deploy(
      await this.token.getAddress(),
      FEE_ADDRESS,
      INC_PER_BLOCK,
      START_BLOCK
    );
    
    return {
      token: await this.token.getAddress(),
      masterChef: await this.masterChef.getAddress(),
      pools: [],
    };
  }
  
  async advanceTime(seconds: number): Promise<void> {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  }
  
  async createUser(): Promise<TestUser> {
    const [signer] = await ethers.getSigners();
    return {
      address: await signer.getAddress(),
      signer,
    };
  }
  
  async stake(user: TestUser, poolId: string, amount: bigint): Promise<void> {
    await this.masterChef.connect(user.signer).deposit(poolId, amount);
  }
  
  // ... implement other methods
}
```

### Solana Test Adapter

```typescript
// packages/contracts-solana/tests/adapters/SolanaTestAdapter.ts

import * as anchor from '@project-serum/anchor';
import { ITestAdapter, TestUser, ContractAddresses } from '@rainfire/shared-types';

export class SolanaTestAdapter implements ITestAdapter {
  private program: anchor.Program;
  private provider: anchor.AnchorProvider;
  
  async setup(): Promise<void> {
    this.provider = anchor.AnchorProvider.env();
    anchor.setProvider(this.provider);
    this.program = anchor.workspace.MasterChef;
  }
  
  async deployContracts(): Promise<ContractAddresses> {
    // Anchor automatically deploys programs in test mode
    const tokenMint = await createMint(/* ... */);
    const masterChef = await this.program.account.globalState.fetch();
    
    return {
      token: tokenMint.toString(),
      masterChef: this.program.programId.toString(),
      pools: [],
    };
  }
  
  async advanceTime(seconds: number): Promise<void> {
    // Solana test validator time manipulation
    await this.provider.connection.rpcRequest('warp', [seconds]);
  }
  
  async createUser(): Promise<TestUser> {
    const keypair = anchor.web3.Keypair.generate();
    
    // Airdrop SOL
    await this.provider.connection.confirmTransaction(
      await this.provider.connection.requestAirdrop(
        keypair.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      )
    );
    
    return {
      address: keypair.publicKey.toString(),
      signer: keypair,
    };
  }
  
  async stake(user: TestUser, poolId: string, amount: bigint): Promise<void> {
    await this.program.methods
      .stake(new anchor.BN(amount.toString()))
      .accounts({
        user: user.signer.publicKey,
        // ... other accounts
      })
      .signers([user.signer])
      .rpc();
  }
  
  // ... implement other methods
}
```

### Shared Economic Tests

```typescript
// packages/shared-tests/src/economic/whale-attack.test.ts

import { ITestAdapter } from '@rainfire/shared-types';

export function createWhaleAttackTest(adapter: ITestAdapter) {
  describe('Whale Attack Simulation', () => {
    let whale: TestUser;
    let poolId: string;
    
    beforeEach(async () => {
      await adapter.setup();
      await adapter.deployContracts();
      
      whale = await adapter.createUser();
      await adapter.fundUser(whale, parseEther('1000000'));
      
      poolId = await adapter.createPool(LP_TOKEN, 1000);
    });
    
    it('should handle 50% whale dump gracefully', async () => {
      // Whale stakes 50% of target TVL
      const stakeAmount = parseEther('500000');
      await adapter.stake(whale, poolId, stakeAmount);
      
      // Advance 7 days
      await adapter.advanceTime(7 * 86400);
      
      // Record APR before dump
      const aprBefore = await adapter.getAPR(poolId);
      
      // Whale exits completely
      await adapter.unstake(whale, poolId, stakeAmount);
      
      // Record APR after dump
      const aprAfter = await adapter.getAPR(poolId);
      
      const aprDrop = ((aprBefore - aprAfter) / aprBefore) * 100;
      
      // Assert APR doesn't crash completely
      expect(aprDrop).toBeLessThan(50); // <50% drop acceptable
      expect(aprAfter).toBeGreaterThan(10); // Stays above 10% APR
    });
  });
}
```

### Using Shared Tests

```typescript
// packages/contracts-evm/test/economic/whale-attack.test.ts

import { EVMTestAdapter } from '../adapters/EVMTestAdapter';
import { createWhaleAttackTest } from '@rainfire/shared-tests/economic/whale-attack';

const adapter = new EVMTestAdapter();
createWhaleAttackTest(adapter);
```

```typescript
// packages/contracts-solana/tests/economic/whale-attack.test.ts

import { SolanaTestAdapter } from '../adapters/SolanaTestAdapter';
import { createWhaleAttackTest } from '@rainfire/shared-tests/economic/whale-attack';

const adapter = new SolanaTestAdapter();
createWhaleAttackTest(adapter);
```

---

## 🚀 Solana Program Architecture

### Program Structure

```
programs/
├── incum-token/           # SPL token program
│   ├── src/
│   │   ├── lib.rs
│   │   ├── instructions/
│   │   │   ├── initialize.rs
│   │   │   └── mint.rs
│   │   └── state/
│   │       └── token_metadata.rs
│   └── Cargo.toml
│
├── master-chef/           # Staking program
│   ├── src/
│   │   ├── lib.rs
│   │   ├── instructions/
│   │   │   ├── initialize_global.rs
│   │   │   ├── create_pool.rs
│   │   │   ├── stake.rs
│   │   │   ├── unstake.rs
│   │   │   └── claim.rs
│   │   ├── state/
│   │   │   ├── global_state.rs
│   │   │   ├── pool.rs
│   │   │   └── user.rs
│   │   └── errors.rs
│   └── Cargo.toml
│
└── presale/               # Presale program
    ├── src/
    │   ├── lib.rs
    │   ├── instructions/
    │   │   ├── initialize.rs
    │   │   ├── buy.rs
    │   │   └── redeem.rs
    │   └── state/
    │       ├── presale_config.rs
    │       └── user_allocation.rs
    └── Cargo.toml
```

### Key Account Structures

```rust
// programs/master-chef/src/state/global_state.rs

#[account]
pub struct GlobalState {
    pub authority: Pubkey,
    pub inc_mint: Pubkey,
    pub inc_per_block: u64,
    pub total_alloc_point: u64,
    pub start_slot: u64,
    pub emission_end_slot: u64,
    pub bump: u8,
}

#[account]
pub struct Pool {
    pub lp_mint: Pubkey,
    pub lp_vault: Pubkey,
    pub alloc_point: u64,
    pub last_reward_slot: u64,
    pub acc_inc_per_share: u128, // Scaled by 1e12
    pub deposit_fee_bp: u16,
    pub total_staked: u64,
    pub bump: u8,
}

#[account]
pub struct UserStake {
    pub user: Pubkey,
    pub pool: Pubkey,
    pub amount: u64,
    pub reward_debt: u128,
    pub bump: u8,
}
```

### Key Instructions

```rust
// programs/master-chef/src/instructions/stake.rs

pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let user_stake = &mut ctx.accounts.user_stake;
    
    // Update pool rewards
    update_pool(pool, Clock::get()?.slot)?;
    
    // Claim pending rewards if user has existing stake
    if user_stake.amount > 0 {
        let pending = calculate_pending(user_stake, pool)?;
        if pending > 0 {
            transfer_inc_rewards(ctx, pending)?;
        }
    }
    
    // Transfer LP tokens from user to vault
    transfer_lp_tokens(ctx, amount)?;
    
    // Apply deposit fee if applicable
    let net_amount = if pool.deposit_fee_bp > 0 {
        let fee = amount * pool.deposit_fee_bp as u64 / 10000;
        transfer_fee(ctx, fee)?;
        amount - fee
    } else {
        amount
    };
    
    // Update user stake
    user_stake.amount += net_amount;
    user_stake.reward_debt = (user_stake.amount as u128 * pool.acc_inc_per_share) / 1e12;
    
    // Update pool total
    pool.total_staked += net_amount;
    
    Ok(())
}
```

### PDA (Program Derived Address) Seeds

```rust
// Find global state PDA
let (global_state, bump) = Pubkey::find_program_address(
    &[b"global_state"],
    &program_id
);

// Find pool PDA
let (pool, bump) = Pubkey::find_program_address(
    &[b"pool", lp_mint.as_ref()],
    &program_id
);

// Find user stake PDA
let (user_stake, bump) = Pubkey::find_program_address(
    &[b"user_stake", user.as_ref(), pool.as_ref()],
    &program_id
);
```

---

## 📊 Migration Strategy: EVM → Solana

### Key Differences

| Aspect | EVM (Solidity) | Solana (Rust/Anchor) |
|--------|----------------|----------------------|
| **State** | Contract storage | Accounts (owned by programs) |
| **Functions** | Contract methods | Instructions (stateless) |
| **Access Control** | `onlyOwner` modifier | Account constraints in `Context` |
| **Tokens** | ERC20 interface | SPL Token Program (CPI) |
| **Math** | Native 256-bit | u64/u128 with manual overflow checks |
| **Events** | `emit Event(...)` | `msg!()` or custom event logging |
| **Reentrancy** | ReentrancyGuard | Not applicable (no reentrancy) |

### Adaptation Checklist

**Token (IncToken → SPL Token):**
- ✅ Create SPL token mint
- ✅ Mint authority = MasterChef program PDA
- ✅ Metadata using Metaplex Token Metadata
- ⚠️ No custom `mint()` function (use SPL CPI)

**MasterChef:**
- ✅ GlobalState account for emission parameters
- ✅ Pool accounts (one per LP token)
- ✅ UserStake accounts (PDA per user/pool combo)
- ✅ Update pool rewards before every stake/unstake
- ✅ Cross-program invocations (CPIs) to SPL Token
- ⚠️ Use u128 for reward calculations (scaled by 1e12)
- ⚠️ Rent-exempt accounts (users pay rent)

**Presale:**
- ✅ PresaleConfig account (start/end slots, pricing)
- ✅ UserAllocation account (track per-user purchases)
- ✅ SOL payment instead of MATIC
- ✅ Transfer SOL to fee account via CPI to System Program
- ⚠️ No refunds (Solana typically fails transaction instead)

**Timelock:**
- ⚠️ Consider using Squads multisig instead of custom timelock
- ⚠️ Or implement scheduled transactions using Clockwork

---

## 🛠️ Turborepo Configuration

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "artifacts/**", ".next/**", "target/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "deploy": {
      "dependsOn": ["build", "test"],
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### Root package.json

```json
{
  "name": "rainfire-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev --parallel",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^1.13.0",
    "typescript": "^5.3.0"
  },
  "packageManager": "pnpm@8.15.0"
}
```

### pnpm-workspace.yaml

```yaml
packages:
  - 'packages/*'
```

---

## 📝 Implementation Roadmap

### Phase 1: Monorepo Setup (Week 1)

- [ ] Initialize Turborepo structure
- [ ] Migrate existing contracts-evm package
- [ ] Create shared-types package
- [ ] Create shared-utils package
- [ ] Set up build pipelines
- [ ] Test cross-package imports

### Phase 2: Solana Development (Week 2-3)

- [ ] Initialize Anchor workspace
- [ ] Implement SPL token program
- [ ] Implement MasterChef program
- [ ] Implement presale program
- [ ] Write Anchor tests
- [ ] Deploy to devnet

### Phase 3: Chain Adapters (Week 4)

- [ ] Implement IChainAdapter interface
- [ ] Build EVMAdapter class
- [ ] Build SolanaAdapter class
- [ ] Create unified test adapter
- [ ] Write shared economic tests
- [ ] Run tests on both chains

### Phase 4: Frontend (Week 5-6)

- [ ] Initialize Next.js in monorepo
- [ ] Set up wagmi for EVM
- [ ] Set up Solana wallet adapter
- [ ] Implement ChainProvider
- [ ] Build universal components
- [ ] Add chain selector UI
- [ ] Test on both chains

### Phase 5: Testing & Polish (Week 7)

- [ ] Economic simulations on both chains
- [ ] Cross-chain comparison tests
- [ ] Performance optimization
- [ ] Documentation
- [ ] Deployment guides

---

## 🔮 Future Chain Extensions

### Adding New EVM Chain (e.g., Base)

```typescript
// packages/chain-adapters/src/evm.ts

export const SUPPORTED_CHAINS = {
  POLYGON: { chainId: 137, name: 'Polygon' },
  BASE: { chainId: 8453, name: 'Base' },
  ARBITRUM: { chainId: 42161, name: 'Arbitrum' },
};

// Just deploy contracts and add chain config
// No adapter code changes needed!
```

### Adding Non-EVM Chain (e.g., Cosmos)

1. Create new adapter: `packages/chain-adapters/src/cosmos.ts`
2. Implement `IChainAdapter` interface
3. Add chain selector option in frontend
4. Deploy contracts on Cosmos
5. Done!

---

## 📚 Key Dependencies

### Shared Packages

```json
{
  "dependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0"
  }
}
```

### contracts-evm

```json
{
  "dependencies": {
    "hardhat": "^2.22.0",
    "@openzeppelin/contracts": "^5.4.0",
    "ethers": "^6.11.0"
  }
}
```

### contracts-solana

```json
{
  "dependencies": {
    "@project-serum/anchor": "^0.29.0",
    "@solana/web3.js": "^1.91.0",
    "@solana/spl-token": "^0.4.0"
  }
}
```

### frontend

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "wagmi": "^2.5.0",
    "viem": "^2.8.0",
    "@solana/wallet-adapter-react": "^0.15.0",
    "@solana/wallet-adapter-wallets": "^0.19.0",
    "@rainbow-me/rainbowkit": "^2.0.0",
    "tailwindcss": "^3.4.0"
  }
}
```

---

## ✅ Success Criteria

**Technical:**
- ✅ Contracts deploy on both EVM and Solana
- ✅ Frontend works seamlessly on both chains
- ✅ Same test scenarios pass on both chains
- ✅ Build time < 30 seconds for incremental changes
- ✅ Zero code duplication between chains (business logic in shared packages)

**User Experience:**
- ✅ Users can switch chains without page reload
- ✅ Same UI/UX across all chains
- ✅ Transaction feedback is clear and consistent
- ✅ Wallet connection is smooth

**Developer Experience:**
- ✅ Adding new chain takes < 1 day
- ✅ Clear documentation for contributors
- ✅ Fast local development (turbo dev)
- ✅ Automated testing in CI/CD

---

## 🎓 Key Architectural Decisions

### Why This Architecture?

1. **Monorepo** - Easier to keep chains in sync, shared code reuse
2. **Adapter Pattern** - Abstract chain differences behind common interface
3. **Turborepo** - Fast builds, intelligent caching
4. **Shared Tests** - Ensures consistency across chains
5. **Component Composition** - UI works on any chain without modification

### Trade-offs

**Pros:**
- ✅ Massive code reuse
- ✅ Consistent UX
- ✅ Easy to add chains
- ✅ Single deployment pipeline

**Cons:**
- ⚠️ Initial setup complexity
- ⚠️ Learning curve for multiple ecosystems
- ⚠️ Some chain-specific optimizations harder to implement

---

## 📖 Next Steps

1. **Review this document** with team
2. **Decide on Phase 1 timeline** (monorepo setup)
3. **Assign Solana development** (Phase 2)
4. **Plan frontend work** (Phase 4)
5. **Set up CI/CD** for multi-chain testing

---

**Last Updated:** November 15, 2025  
**Status:** 📋 Planning Phase  
**Next Milestone:** Monorepo initialization
