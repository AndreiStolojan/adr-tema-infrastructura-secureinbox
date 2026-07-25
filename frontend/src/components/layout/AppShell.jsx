import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';

import { MobileDrawer, MobileTopbar } from './MobileNav';
import { PageTransition } from './PageTransition';
import { Sidebar } from './Sidebar';

export function AppShell() {
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => setNavOpen(false), [location.pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopbar onMenu={() => setNavOpen(true)} />
        <main className="flex min-w-0 flex-1 flex-col px-5 py-6 md:py-8">
          <div className="w-full space-y-6">
            <AnimatePresence mode="wait" initial={false}>
              <PageTransition key={location.pathname}>
                <Outlet />
              </PageTransition>
            </AnimatePresence>
          </div>
        </main>
      </div>
      <MobileDrawer open={navOpen} onClose={() => setNavOpen(false)} />
    </div>
  );
}
