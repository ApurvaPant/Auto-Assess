import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, PlusCircle, ClipboardList, LogOut,
  BarChart2, School, ArrowRightLeft, MessageCircle, Zap, ChevronRight, UserSearch,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const navSections = [
  {
    label: 'Workspace',
    items: [
      { icon: School,          label: 'Classrooms', to: '/teacher/classrooms' },
      { icon: LayoutDashboard, label: 'Dashboard',  to: '/teacher', exact: true },
    ],
  },
  {
    label: 'Tools',
    items: [
      { icon: Zap,             label: 'Generate',    to: '/teacher/generate' },
      { icon: ClipboardList,   label: 'Assignments', to: '/teacher/assign' },
      { icon: BarChart2,       label: 'Results',         to: '/teacher/results' },
      { icon: UserSearch,      label: 'Student Analysis', to: '/teacher/student-analysis' },
      { icon: MessageCircle,   label: 'Doubts',          to: '/teacher/doubts' },
    ],
  },
];

const NavItem = ({ icon: Icon, label, to, exact }) => (
  <NavLink to={to} end={exact}>
    {({ isActive }) => (
      <span className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer select-none",
        isActive
          ? "text-text-primary bg-overlay/[0.08]"
          : "text-text-muted hover:text-text-primary hover:bg-overlay/[0.04]"
      )}>
        {/* Left accent bar */}
        <span className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-full transition-all duration-200",
          isActive ? "h-5 bg-primary opacity-80" : "h-0 opacity-0"
        )} />

        <Icon className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors duration-200",
          isActive ? "text-text-primary" : "text-text-muted group-hover:text-text-secondary"
        )} />

        <span className="flex-1 leading-none">{label}</span>

        {isActive && (
          <ChevronRight className="h-3.5 w-3.5 opacity-30 shrink-0" />
        )}
      </span>
    )}
  </NavLink>
);

const Sidebar = () => {
  const { logout, classroomName, clearClassroom } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/teacher/login');
  };

  const handleSwitchClassroom = () => {
    clearClassroom();
    navigate('/teacher/classrooms');
  };

  // Get initials for avatar
  const initials = 'TC';

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[224px] hidden md:flex md:flex-col bg-surface border-r border-overlay/[0.06] overflow-hidden">

      {/* Subtle ambient top glow */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-primary/[0.03] to-transparent" />

      {/* ── Brand ─────────────────────────────────────────────── */}
      <div className="flex h-14 items-center px-4 shrink-0 border-b border-overlay/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="relative h-8 w-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/[0.15] flex items-center justify-center shadow-sm">
            <span className="text-[13px] font-black text-primary tracking-tight">A</span>
            {/* Glow dot */}
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary/60 border-2 border-surface shadow-sm" />
          </div>
          <div className="leading-none">
            <p className="text-sm font-bold text-text-primary tracking-tight">AutoAssess</p>
            <p className="text-[10px] text-text-muted tracking-wide">Teacher Portal</p>
          </div>
        </div>
      </div>

      {/* ── Nav ───────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-4 scrollbar-none">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-[0.08em] opacity-60">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-overlay/[0.06] p-2.5 space-y-1.5">

        {/* Classroom card */}
        {classroomName ? (
          <button
            onClick={handleSwitchClassroom}
            className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-overlay/[0.04] border border-overlay/[0.07] hover:bg-overlay/[0.07] hover:border-overlay/[0.12] transition-all duration-200"
          >
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/[0.15] flex items-center justify-center shrink-0">
              <School className="h-3.5 w-3.5 text-primary/70" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[10px] text-text-muted leading-none mb-0.5">Current Classroom</p>
              <p className="text-xs font-semibold text-text-primary truncate leading-none">{classroomName}</p>
            </div>
            <ArrowRightLeft className="h-3.5 w-3.5 text-text-muted opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
          </button>
        ) : (
          <button
            onClick={handleSwitchClassroom}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-overlay/[0.1] hover:bg-overlay/[0.04] transition-colors text-text-muted hover:text-text-primary"
          >
            <School className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs font-medium">Select a Classroom</span>
          </button>
        )}

        {/* Divider */}
        <div className="h-px bg-overlay/[0.05] mx-1" />

        {/* Profile row */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-overlay/[0.04] transition-colors group">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-overlay/20 to-overlay/5 border border-overlay/[0.12] flex items-center justify-center shrink-0 text-[11px] font-bold text-text-secondary">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-text-primary truncate leading-tight">Teacher</p>
            <p className="text-[10px] text-text-muted truncate leading-tight">Administrator</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-text-muted hover:bg-error/[0.08] hover:text-error border border-transparent hover:border-error/[0.12] transition-all duration-200"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0 group-hover:-translate-x-0.5 transition-transform" />
          <span>Sign out</span>
        </button>

      </div>
    </aside>
  );
};

export default Sidebar;
