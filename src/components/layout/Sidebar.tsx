'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Gauge,
  UsersRound,
  Wallet,
  DollarSign,
  ArrowUpRight,
  Sparkles,
  Settings,
  ChevronDown,
  ChevronRight,
  Activity,
  BarChart3,
  Bot,
  Repeat,
  FileChartLine,
  ArrowDownUp,
  Search,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  subItems?: { name: string; href: string }[];
}

interface SidebarProps {
  collapsed: boolean;
  onSearchClick: () => void;
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard/overview',
    icon: Gauge,
  },
  {
    name: 'Employees',
    href: '/dashboard/employees',
    icon: UsersRound,
  },
  {
    name: 'Transactions',
    href: '/dashboard/transactions',
    icon: ArrowDownUp,
  },
  {
    name: 'Analytics',
    href: '/dashboard/analytics',
    icon: FileChartLine,
  },
  {
    name: 'AI Agents',
    href: '/dashboard/ai-agents',
    icon: Sparkles,
  },
  {
    name: 'Pay Runs',
    href: '/dashboard/pay-runs',
    icon: Repeat,
  },
  {
    name: 'Wallet',
    href: '/dashboard/wallet',
    icon: Wallet,
  },
];

export default function Sidebar({ collapsed, onSearchClick }: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (itemName: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemName)
        ? prev.filter((name) => name !== itemName)
        : [...prev, itemName]
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          'fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-40',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <Image
                src="/paystream-logo.svg"
                alt="Paystream AI"
                width={32}
                height={32}
                className="flex-shrink-0"
              />
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold text-foreground">Paystream AI</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold text-[#0044FF] bg-[#EEFF00] rounded-md">
                  Beta
                </span>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="relative mx-auto">
              <Image
                src="/paystream-logo.svg"
                alt="Paystream AI"
                width={32}
                height={32}
              />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#EEFF00] rounded-full border border-white" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-2 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          {/* Search Button */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onSearchClick}
                  className="flex items-center justify-center h-10 w-full rounded-lg transition-colors text-[#737E9C] hover:bg-[#0044FF] hover:bg-opacity-10 hover:text-[#0044FF]"
                >
                  <Search className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Search Employees</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={onSearchClick}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors text-[#737E9C] hover:bg-[#0044FF] hover:bg-opacity-10 hover:text-[#0044FF]"
            >
              <Search className="w-4 h-4" />
              <span className="font-normal">Search</span>
            </button>
          )}

          {/* Divider */}
          <div className="my-2 border-b border-gray-200" />

          {navigation.map((item, index) => {
            const isActive = pathname === item.href;
            const isExpanded = expandedItems.includes(item.name);
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const needsSpacingAfter = item.name === 'Pay Runs' || item.name === 'AI Assistant';

            // Check if any sub-item is active
            const isSubItemActive = hasSubItems && item.subItems!.some((sub) => pathname === sub.href);

            return (
              <div key={item.name}>
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center justify-center h-10 rounded-lg transition-colors',
                          isActive || isSubItemActive
                            ? 'bg-[#0044FF] text-white'
                            : 'text-[#737E9C] hover:bg-[#0044FF] hover:bg-opacity-10 hover:text-[#0044FF]'
                        )}
                      >
                        <item.icon className="w-4 h-4" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.name}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <>
                    {/* Main nav item */}
                    {hasSubItems ? (
                      <button
                        onClick={() => toggleExpanded(item.name)}
                        className={cn(
                          'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors',
                          isActive || isSubItemActive
                            ? 'bg-[#0044FF] text-white'
                            : 'text-[#737E9C] hover:bg-[#0044FF] hover:bg-opacity-10 hover:text-[#0044FF]'
                        )}
                      >
                        <item.icon className="w-4 h-4" />
                        <span className={cn(isActive || isSubItemActive ? 'font-semibold' : 'font-normal')}>
                          {item.name}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 ml-auto" />
                        ) : (
                          <ChevronRight className="w-4 h-4 ml-auto" />
                        )}
                      </button>
                    ) : (
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                          isActive
                            ? 'bg-[#0044FF] text-white'
                            : 'text-[#737E9C] hover:bg-[#0044FF] hover:bg-opacity-10 hover:text-[#0044FF]'
                        )}
                      >
                        <item.icon className="w-4 h-4" />
                        <span className={cn(isActive ? 'font-semibold' : 'font-normal')}>
                          {item.name}
                        </span>
                      </Link>
                    )}

                    {/* Sub-items */}
                    {hasSubItems && isExpanded && (
                      <div className="ml-7 mt-1 space-y-1">
                        {item.subItems!.map((subItem) => {
                          const isSubActive = pathname === subItem.href;
                          return (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              className={cn(
                                'block px-3 py-2 rounded-lg text-sm transition-colors',
                                isSubActive
                                  ? 'bg-[#0044FF] text-white'
                                  : 'text-[#737E9C] hover:bg-[#0044FF] hover:bg-opacity-10 hover:text-[#0044FF]'
                              )}
                            >
                              {subItem.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}

                    {/* Spacing divider */}
                    {needsSpacingAfter && (
                      <div className="my-2 border-b border-gray-200" />
                    )}
                  </>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </TooltipProvider>
  );
}
