'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  Contact,
  Megaphone,
  FileText,
  MessageSquare,
  BookOpen,
  Mic,
  Phone,
  BarChart3,
  Settings,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Brain,
  Database,
  Bot,
  Activity,
  Sliders,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Companies', href: '/dashboard/companies', icon: Building2 },
  { name: 'Users', href: '/dashboard/users', icon: Users },
  { name: 'Contacts', href: '/dashboard/contacts', icon: Contact },
  { name: 'Campaigns', href: '/dashboard/campaigns', icon: Megaphone },
  { name: 'Scripts', href: '/dashboard/scripts', icon: FileText },
  { name: 'Prompts', href: '/dashboard/prompts', icon: MessageSquare },
  { name: 'Memory', href: '/dashboard/memory', icon: Brain },
  { name: 'Knowledge Engine', href: '/dashboard/knowledge-engine', icon: Database },
  { name: 'Knowledge Base', href: '/dashboard/knowledge-base', icon: BookOpen },
  { name: 'AI Agents', href: '/dashboard/ai-agents', icon: Bot },
  { name: 'Runtime Monitor', href: '/dashboard/runtime-monitor', icon: Activity },
  { name: 'Runtime Config', href: '/dashboard/runtime-config', icon: Sliders },
  { name: 'Voice Library', href: '/dashboard/voice-library', icon: Mic },
  { name: 'Call History', href: '/dashboard/calls', icon: Phone },
  { name: 'Reports', href: '/dashboard/reports', icon: FileSpreadsheet },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
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
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base">AI Calling</span>
              <span className="text-xs text-muted-foreground">Enterprise Platform</span>
            </div>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="flex items-center justify-center w-full">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
              <Phone className="w-5 h-5 text-white" />
            </div>
          </Link>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-blue-600 dark:text-blue-400')} />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <Link
          href="/dashboard/settings"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
            pathname.startsWith('/dashboard/settings')
              ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings className={cn('h-5 w-5 flex-shrink-0', pathname.startsWith('/dashboard/settings') && 'text-blue-600 dark:text-blue-400')} />
          {!collapsed && <span>Settings</span>}
        </Link>

        {onToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="w-full mt-2 justify-center"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
