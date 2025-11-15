import { Wallet } from 'ethers';

/**
 * Generate a new Ethereum wallet address
 * Returns both the address and private key
 */
export function generateWallet(): { address: string; privateKey: string } {
  const wallet = Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

/**
 * Generate just the wallet address (for employee creation)
 * In production, you would store the private key securely
 */
export function generateWalletAddress(): string {
  const wallet = Wallet.createRandom();
  return wallet.address;
}

/**
 * Validate Ethereum address format
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
