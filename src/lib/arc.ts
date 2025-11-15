import { ethers, JsonRpcProvider, Wallet, Contract } from 'ethers';

// ERC20 ABI for USDC
const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
];

class ArcClient {
  private static instance: ArcClient;
  private provider: JsonRpcProvider;
  private signer: Wallet | null = null;
  private usdcContract: Contract | null = null;

  private constructor() {
    const rpcUrl = process.env.ARC_RPC_URL || 'https://rpc-arc-testnet.circle.com';
    this.provider = new JsonRpcProvider(rpcUrl);

    // Initialize signer if private key is available
    if (process.env.ETHER_PRIVATE_KEY && process.env.ETHER_PRIVATE_KEY !== '0xYOUR_PRIVATE_KEY_HERE') {
      try {
        this.signer = new Wallet(process.env.ETHER_PRIVATE_KEY, this.provider);
        console.log('Arc signer initialized:', this.signer.address);
      } catch (error) {
        console.warn('Failed to initialize signer:', error);
      }
    }
  }

  public static getInstance(): ArcClient {
    if (!ArcClient.instance) {
      ArcClient.instance = new ArcClient();
    }
    return ArcClient.instance;
  }

  public getProvider(): JsonRpcProvider {
    return this.provider;
  }

  public getSigner(): Wallet {
    if (!this.signer) {
      throw new Error('Signer not initialized. ETHER_PRIVATE_KEY is not set.');
    }
    return this.signer;
  }

  public hasSigner(): boolean {
    return this.signer !== null;
  }
}

export function getProvider(): JsonRpcProvider {
  return ArcClient.getInstance().getProvider();
}

export function getSigner(): Wallet {
  return ArcClient.getInstance().getSigner();
}

export function hasSigner(): boolean {
  return ArcClient.getInstance().hasSigner();
}

export function getUSDCContract(): Contract {
  const usdcAddress = process.env.USDC_CONTRACT_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  const provider = getProvider();

  return new Contract(usdcAddress, ERC20_ABI, provider);
}

export function getUSDCContractWithSigner(): Contract {
  const usdcAddress = process.env.USDC_CONTRACT_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  const signer = getSigner();

  return new Contract(usdcAddress, ERC20_ABI, signer);
}

export async function getUSDCBalance(address: string): Promise<string> {
  try {
    const contract = getUSDCContract();
    const balance = await contract.balanceOf(address);
    const decimals = await contract.decimals();

    // Convert to human-readable format
    return ethers.formatUnits(balance, decimals);
  } catch (error) {
    console.error('Error getting USDC balance:', error);
    return '0';
  }
}

export async function getNetworkInfo(): Promise<{
  chainId: number;
  blockNumber: number;
  gasPrice: string;
}> {
  try {
    const provider = getProvider();
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    const feeData = await provider.getFeeData();

    return {
      chainId: Number(network.chainId),
      blockNumber,
      gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : '0',
    };
  } catch (error) {
    console.error('Error getting network info:', error);
    throw error;
  }
}

export async function transferUSDC(to: string, amount: string): Promise<string> {
  try {
    const contract = getUSDCContractWithSigner();
    const decimals = await contract.decimals();
    const amountInWei = ethers.parseUnits(amount, decimals);

    const tx = await contract.transfer(to, amountInWei);
    console.log('Transfer transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transfer confirmed in block:', receipt.blockNumber);

    return tx.hash;
  } catch (error) {
    console.error('Error transferring USDC:', error);
    throw new Error(`Failed to transfer USDC: ${(error as Error).message}`);
  }
}

// Placeholder for batch payer contract (to be deployed later)
export function getBatchPayerContract(): Contract {
  throw new Error('BatchPayer contract not yet deployed. Deploy contract first.');
}

export default ArcClient;
