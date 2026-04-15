import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { Button } from '../ui/Button';

const getPageMeta = (pathname) => {
  if (pathname === '/teacher')             return { title: 'Dashboard',      sub: 'Overview of your classroom' };
  if (pathname === '/teacher/generate')    return { title: 'Generate',       sub: 'Create new question packages' };
  if (pathname === '/teacher/results')     return { title: 'Results',        sub: 'Review student submissions' };
  if (pathname === '/teacher/classrooms')  return { title: 'Classrooms',     sub: 'Manage your classrooms' };
  if (pathname === '/teacher/assign')      return { title: 'Assignments',    sub: 'Manage and distribute assignments' };
  if (pathname.startsWith('/teacher/assign/')) return { title: 'Assignment Details', sub: 'Live student roster & submission status' };
  if (pathname === '/teacher/doubts')      return { title: 'Doubts',         sub: 'Respond to student questions' };
  return { title: 'AutoAssess', sub: '' };
};

const DashboardLayout = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { classroomId, classroomName } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const page = getPageMeta(pathname);

  // Redirect to classrooms page if no classroom selected (except when already on classrooms page)
  useEffect(() => {
    if (!classroomId && pathname !== '/teacher/classrooms') {
      navigate('/teacher/classrooms', { replace: true });
    }
  }, [classroomId, pathname, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="md:pl-[224px] min-h-screen flex flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-overlay/[0.06] bg-background/80 backdrop-blur-sm px-6 shrink-0">
          <div>
            {page.sub && <p className="text-[11px] text-text-muted leading-tight">{page.sub}</p>}
          </div>
          <div className="flex items-center gap-2">
            {classroomName && (
              <span className="text-[11px] font-medium text-text-muted bg-overlay/[0.05] border border-overlay/[0.07] rounded-md px-2 py-0.5">
                {classroomName}
              </span>
            )}
            <span className="text-[11px] font-medium text-text-muted bg-overlay/[0.05] border border-overlay/[0.07] rounded-md px-2 py-0.5">
              Teacher Portal
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8 text-text-muted hover:text-text-primary"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
