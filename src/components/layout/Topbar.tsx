'use client';

import { PanelLeft, User, ChevronDown } from 'lucide-react';
import { useUser, UserButton } from '@clerk/nextjs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import WalletConnect from '@/components/wallet/WalletConnect';

interface TopbarProps {
  onToggleSidebar?: () => void;
}

export default function Topbar({ onToggleSidebar }: TopbarProps) {
  const { user, isLoaded } = useUser();

  return (
    <div className="h-16 bg-white border-b border-gray-200 sticky top-0 z-50 px-6">
      <div className="h-full flex items-center justify-between gap-4">
        {/* Left side - Sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          aria-label="Toggle Sidebar"
        >
          <PanelLeft className="w-5 h-5" />
        </Button>

        {/* Right side - Wallet Connect & User Profile */}
        <div className="flex items-center gap-3">
          <WalletConnect />
          {isLoaded && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.imageUrl} alt={user.fullName || 'User'} />
                    <AvatarFallback className="bg-[#0044FF] text-white text-sm font-semibold">
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none">
                      {user.fullName || 'User'}
                    </p>
                    <p className="text-xs text-muted-foreground leading-none">
                      {user.primaryEmailAddress?.emailAddress}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                  <UserButton
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        rootBox: 'w-full',
                        userButtonBox: 'w-full',
                      },
                    }}
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="icon">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-muted">
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
