import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

import { SidebarContent } from './Sidebar';

export function MobileTopbar({ onMenu }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-5 md:hidden">
      <div className="flex items-center gap-2">
        <img src="/logo.png" alt="" className="h-9 w-9 object-contain" />
        <span className="text-sm font-semibold">SecureInbox</span>
      </div>
      <button
        type="button"
        onClick={onMenu}
        className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>
    </header>
  );
}

export function MobileDrawer({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-background md:hidden"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={onClose} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
