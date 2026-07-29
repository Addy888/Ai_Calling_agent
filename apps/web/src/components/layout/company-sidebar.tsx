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
} from 'lucide-react';

const companyNavigation = [
  { name: 'Dashboard', href: '/company', icon: LayoutDashboard },
  { name: 'Contacts', href: '/company/contacts', icon: Contact },
  { name: 'Campaigns', href: '/company/campaigns', icon: Megaphone },
  { name: 'Scripts', href: '/company/scripts', icon: FileText },
  { name: 'Prompts', href: '/company/prompts', icon: MessageSquare },
  { name: 'Knowledge Base', href: '/company/knowledge-base', icon: BookOpen },
  { name: 'AI Agents', href: '/company/ai-agents', icon: Bot },
  { name: 'Call History', href: '/company/calls', icon: Phone },
  { name: 'Analytics', href: '/company/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/company/settings', icon: Settings },
];

interface CompanySidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function CompanySidebar({ collapsed = false, onToggle }: CompanySidebarProps) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        'flex h-full flex-col border-r bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <Link href="/company" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center shadow-lg">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base">Company Portal</span>
              <span className="text-xs text-muted-foreground">AI Calling Platform</span>
            </div>
          </Link>
        )}
        {collapsed && (
          <Link href="/company" className="flex items-center justify-center w-full">
            <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center shadow-lg">
              <Phone className="w-5 h-5 text-white" />
            </div>
          </Link>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {companyNavigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/company' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-green-600 dark:text-green-400')} />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <button
          onClick={onToggle}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground',
            collapsed && 'justify-center'
          )}
        >
          {collapsed ? '→' : '← Collapse'}
        </button>
      </div>
    </div>
  );
}
