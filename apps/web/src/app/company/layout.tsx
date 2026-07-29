'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CompanySidebar } from '@/components/layout/company-sidebar';
import { CompanyHeader } from '@/components/layout/company-header';
import { Toaster } from '@/components/ui/toaster';
import { authService } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export default function CompanyDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }

    const user = authService.getUser();
    const roles: string[] = (user?.roles || []).map((r: any) =>
      typeof r === 'string' ? r : r?.slug || r?.name || ''
    );

    // Super-admin must use /dashboard, not /company
    if (roles.includes('super-admin')) {
      router.push('/dashboard');
      return;
    }

    setAuthorized(true);
  }, [router]);

  if (!mounted || !authorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleMobileSidebarToggle = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={handleMobileSidebarToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:relative lg:translate-x-0',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <CompanySidebar collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <CompanyHeader
          onMenuToggle={handleMobileSidebarToggle}
          isMobileMenuOpen={mobileSidebarOpen}
        />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 lg:p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      <Toaster />
    </div>
  );
}
