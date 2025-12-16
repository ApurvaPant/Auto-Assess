import React from 'react';
// Layout Wrapper
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';

const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Global Background Effects */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-[120px] pointer-events-none" />
      <div className="fixed top-[20%] left-[20%] w-[30%] h-[30%] rounded-full bg-primary/5 blur-[150px] pointer-events-none opacity-50" />

      <Sidebar />
      <main className="md:pl-64 min-h-screen transition-all">
        <div className="container mx-auto p-8 max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
