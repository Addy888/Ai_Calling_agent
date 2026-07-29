'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Contact,
  Megaphone,
  FileText,
  MessageSquare,
  BookOpen,
  Phone,
  BarChart3,
  Settings,
  Bot,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const companyNavigation = [
  { name: 'Dashboard', href: '/company', icon: LayoutDashboard },
  { name: 'Contacts', href: '/company/contacts', icon: Contact },
  { name: 'Campaigns', href: '/company/campaigns', icon: Megaphone },
  { name: 'Scripts', href: '/company/scripts', icon: FileText },
  { name: 'Prompts', href: '/company/prompts', icon: MessageSquare },
  { name: 'Knowledge Base', href: '/company/knowledge-base', icon: BookOpen },
  { name: 'AI Agents', href: '/company/ai-agents', icon: Bot },
  { name: 'Analytics', href: '/company/analytics', icon: BarChart3 },
  { name: 'Call History', href: '/company/calls', icon: Phone },
];

const bottomNavigation = [
  { name: 'Settings', href: '/company/settings', icon: Settings },
  { name: 'Profile', href: '/company/profile', icon: User },
];

interface CompanySidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function CompanySidebar({ collapsed = false, onToggle }: CompanySidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/company'
      ? pathname === '/company'
      : pathname.startsWith(href);

  return (
    <div
      className={cn(
        'flex h-full flex-col border-r bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo / Brand */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <Link href="/company" className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-emerald-700 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
              <Phone className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm truncate">Company Portal</span>
              <span className="text-xs text-muted-foreground truncate">AI Calling Platform</span>
            </div>
          </Link>
        )}
        {collapsed && (
          <Link href="/company" className="flex items-center justify-center w-full">
            <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-emerald-700 rounded-lg flex items-center justify-center shadow-lg">
              <Phone className="w-4 h-4 text-white" />
            </div>
          </Link>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto">
        {companyNavigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
              isActive(item.href)
                ? 'bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-400 shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
            title={collapsed ? item.name : undefined}
          >
            <item.icon
              className={cn(
                'h-5 w-5 flex-shrink-0',
                isActive(item.href) && 'text-green-600 dark:text-green-400'
              )}
            />
            {!collapsed && <span>{item.name}</span>}
          </Link>
        ))}
      </nav>

      {/* Bottom Navigation (Settings + Profile) */}
      <div className="border-t p-3 space-y-0.5">
        {bottomNavigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
              isActive(item.href)
                ? 'bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-400 shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              collapsed && 'justify-center'
            )}
            title={collapsed ? item.name : undefined}
          >
            <item.icon
              className={cn(
                'h-5 w-5 flex-shrink-0',
                isActive(item.href) && 'text-green-600 dark:text-green-400'
              )}
            />
            {!collapsed && <span>{item.name}</span>}
          </Link>
        ))}

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground mt-1',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
