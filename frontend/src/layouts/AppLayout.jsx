import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { SimulatorBar } from '../components/common/SimulatorBar';
import { EmergencyModal } from '../components/common/EmergencyModal';

export const AppLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      {/* Top Demo IoT Simulator Bar */}
      <SimulatorBar />

      {/* Main Healthcare Navigation Bar */}
      <Navbar />

      {/* Emergency Modal Notification */}
      <EmergencyModal />

      {/* Body Layout: Sidebar + Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
