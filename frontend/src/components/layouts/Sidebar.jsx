import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, List, Code, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = () => {
  const { logout } = useAuth();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', to: '/teacher' },
    { icon: PlusCircle, label: 'Generate', to: '/teacher/generate' },
    { icon: List, label: 'Assignments', to: '/teacher/assign' }, // Assuming this exists or mapping to create
    { icon: Code, label: 'Results', to: '/teacher/results' },
    { icon: Code, label: 'Student Codes', to: '/teacher/codes' },
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/5 bg-surface/30 backdrop-blur-xl text-text-primary hidden md:flex md:flex-col shadow-2xl shadow-black/20">
      <div className="flex h-16 items-center border-b border-white/5 px-6">
        <span className="text-xl font-bold text-primary tracking-tight">AutoAssess</span>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/teacher'} // Only exact match for root dashboard
              className={({ isActive }) =>
                cn(
                  "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-white shadow-md shadow-primary/30"
                    : "text-text-muted hover:bg-gray-50 hover:text-primary"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="border-t border-white/5 p-4">
        <button
          onClick={logout}
          className="flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium text-text-muted hover:bg-gray-800 hover:text-error transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
