'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Wallet, Check, X, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface WalletConnectProps {
  onConnect?: (address: string) => void;
  className?: string;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function WalletConnect({ onConnect, className = '' }: WalletConnectProps) {
  const { user } = useUser();
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();

    // Auto-connect deployer wallet if no other wallet is connected
    const deployerWallet = process.env.NEXT_PUBLIC_DEPLOYER_WALLET;
    if (deployerWallet && !address) {
      setAddress(deployerWallet);
      setIsConnected(true);
      fetchBalance(deployerWallet);
      if (onConnect) {
        onConnect(deployerWallet);
      }
    }
  }, []);

  // Check if user logged in with Web3 wallet via Clerk
  useEffect(() => {
    if (user?.web3Wallets && user.web3Wallets.length > 0) {
      const clerkWallet = user.web3Wallets[0].web3Wallet;
      if (clerkWallet) {
        setAddress(clerkWallet);
        setIsConnected(true);
        fetchBalance(clerkWallet);
        if (onConnect) {
          onConnect(clerkWallet);
        }
      }
    }
  }, [user]);

  const checkConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const account = accounts[0];
          setAddress(account);
          setIsConnected(true);
          fetchBalance(account);
          if (onConnect) {
            onConnect(account);
          }
        }
      } catch (err) {
        console.error('Error checking connection:', err);
      }
    }
  };

  const fetchBalance = async (addr: string) => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const balanceHex = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [addr, 'latest'],
        });
        const balanceWei = parseInt(balanceHex, 16);
        const balanceEth = (balanceWei / 1e18).toFixed(4);
        setBalance(balanceEth);
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('Please install MetaMask or another Web3 wallet');
      }

      // Request account access with timeout
      const accountsPromise = window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout. Please try again.')), 30000);
      });

      const accounts = await Promise.race([accountsPromise, timeoutPromise]) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock MetaMask and try again.');
      }

      const account = accounts[0];
      setAddress(account);
      setIsConnected(true);
      fetchBalance(account);

      // Try to switch to Arc Testnet
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x4CE5D2' }], // Arc Testnet chain ID in hex
        });
      } catch (switchError: any) {
        // Chain doesn't exist, try to add it
        if (switchError.code === 4902 || switchError.code === -32603) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x4CE5D2',
                  chainName: 'Arc Testnet',
                  nativeCurrency: {
                    name: 'ARC',
                    symbol: 'ARC',
                    decimals: 18,
                  },
                  rpcUrls: ['https://rpc.testnet.arc.network'],
                  blockExplorerUrls: ['https://testnet.arcscan.app'],
                },
              ],
            });
          } catch (addError) {
            console.log('Could not add Arc Testnet chain:', addError);
          }
        }
      }

      setShowModal(true);

      if (onConnect) {
        onConnect(account);
      }
    } catch (err: any) {
      let errorMessage = 'Failed to connect to MetaMask';

      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.code === 4001) {
        errorMessage = 'Connection request was rejected. Please try again.';
      } else if (err?.code === -32002) {
        errorMessage = 'A connection request is already pending. Please check MetaMask.';
      } else if (err?.code === -32603) {
        errorMessage = 'Internal error. Please refresh the page and try again.';
      }

      setError(errorMessage);
      console.error('Error connecting wallet:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
    setIsConnected(false);
    setBalance(null);
    setShowModal(false);
  };

  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAddress(accounts[0]);
          fetchBalance(accounts[0]);
          if (onConnect) {
            onConnect(accounts[0]);
          }
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (typeof window.ethereum !== 'undefined') {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, [onConnect]);

  if (isConnected && address) {
    return (
      <>
        <Button
          variant="outline"
          onClick={() => setShowModal(true)}
          className={`${className} border-green-200 bg-green-50 hover:bg-green-100 transition-colors`}
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <Wallet className="w-4 h-4 text-green-600" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
            <span className="font-mono text-sm font-medium text-green-700">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
            {balance && (
              <span className="text-xs text-green-600 ml-1">
                ({parseFloat(balance).toFixed(2)} ARC)
              </span>
            )}
          </div>
        </Button>

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Wallet Connected</DialogTitle>
                  <DialogDescription className="text-sm">
                    Your wallet is connected to Arc Testnet
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Wallet Address</label>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <code className="text-xs font-mono break-all text-gray-900">{address}</code>
                </div>
              </div>

              {balance && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Balance</label>
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <p className="text-2xl font-bold text-blue-900">{balance} ARC</p>
                    <p className="text-xs text-blue-600 mt-1">Arc Testnet Native Token</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Network</label>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Arc Testnet</p>
                    <p className="text-xs text-blue-600">Chain ID: 5042002</p>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 space-y-3">
                <Button
                  onClick={() => {
                    setShowModal(false);
                    // This will prompt MetaMask to switch accounts
                    if (typeof window.ethereum !== 'undefined') {
                      window.ethereum.request({
                        method: 'wallet_requestPermissions',
                        params: [{ eth_accounts: {} }],
                      }).then(() => {
                        window.ethereum.request({ method: 'eth_requestAccounts' });
                      });
                    }
                  }}
                  variant="outline"
                  className="w-full border-blue-200 hover:bg-blue-50"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Different Wallet
                </Button>

                <Button
                  onClick={disconnectWallet}
                  variant="destructive"
                  className="w-full"
                >
                  <X className="w-4 h-4 mr-2" />
                  Disconnect Wallet
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Button
        onClick={connectWallet}
        disabled={isConnecting}
        className={`${className} bg-[#0044FF] hover:bg-[#0033CC] text-white`}
      >
        {isConnecting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Connecting...
          </>
        ) : (
          'Connect Wallet'
        )}
      </Button>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <X className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </>
  );
}
