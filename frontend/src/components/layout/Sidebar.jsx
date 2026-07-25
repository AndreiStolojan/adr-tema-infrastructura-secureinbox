import { motion } from 'framer-motion';
import { Database, Inbox, LayoutDashboard, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { springSoft } from '@/lib/motion';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/inbox', label: 'Inbox', icon: Inbox },
];

const initials = (name, email) =>
  String(name || email || '?')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

function NavItem({ to, label, icon: Icon, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'block rounded-sm outline-none transition-colors',
          isActive
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )
      }
    >
      {({ isActive }) => (
        <motion.span
          whileTap={{ scale: 0.97 }}
          className={cn(
            'relative flex min-h-[44px] items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium',
            !isActive && 'hover:bg-accent'
          )}
        >
          {isActive && (
            <motion.span
              layoutId="sidebar-active"
              transition={springSoft}
              className="absolute inset-0 rounded-sm bg-[#0d2654]"
            />
          )}
          <Icon className="relative h-4.5 w-4.5" />
          <span className="relative">{label}</span>
        </motion.span>
      )}
    </NavLink>
  );
}

export function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center px-5 py-5">
        <img src="/logo.png" alt="SecureInbox" className="h-14 w-14 object-contain" />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map((item) => (
          <NavItem key={item.to} {...item} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="mx-3 mb-3 rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center gap-2 text-xs font-medium">
          <Database className="h-4 w-4 text-primary" />
          Local demo dataset
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Fictitious messages stored in MongoDB.
        </p>
      </div>

      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex min-h-[48px] w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left hover:bg-accent">
            <Avatar>
              <AvatarFallback>{initials(user?.name, user?.email)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.name || 'User'}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel>Demo account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={logout}>
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-52 shrink-0 border-r border-border bg-background md:block">
      <SidebarContent />
    </aside>
  );
}
