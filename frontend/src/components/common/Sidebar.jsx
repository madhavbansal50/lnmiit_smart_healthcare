import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UserCheck,
  Users,
  Activity,
  Cpu,
  Clock,
  FileText,
  AlertTriangle,
  Bot,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  Pill,
  FileCheck,
  Stethoscope,
  Radio
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = () => {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const role = user?.role || 'STUDENT';

  const navLinks = {
    ADMIN: [
      { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
      { name: 'Doctors', path: '/admin/doctors', icon: UserCheck },
      { name: 'Students / Patients', path: '/admin/students', icon: Users },
      { name: 'Node-RED Console', path: '/admin/nodered', icon: Radio },
      { name: 'Live Monitoring', path: '/doctor/monitoring', icon: Activity },
      { name: 'System Settings', path: '/admin/settings', icon: Settings }
    ],
    DOCTOR: [
      { name: 'Dashboard', path: '/doctor', icon: LayoutDashboard },
      { name: 'Patients', path: '/doctor/patients', icon: Users },
      { name: 'Live Monitoring', path: '/doctor/monitoring', icon: Activity },
      { name: 'Node-RED Console', path: '/admin/nodered', icon: Radio },
      { name: 'Monitoring Sessions', path: '/doctor/sessions', icon: Clock },
      { name: 'Prescriptions', path: '/doctor/prescriptions', icon: Pill },
      { name: 'Clinical Alerts', path: '/doctor/alerts', icon: AlertTriangle }
    ],
    STUDENT: [
      { name: 'Dashboard', path: '/student', icon: LayoutDashboard },
      { name: 'My Health', path: '/student/health', icon: Activity },
      { name: 'Live Monitoring', path: '/student/live', icon: Stethoscope },
      { name: 'Visit History', path: '/student/history', icon: Clock },
      { name: 'Prescriptions', path: '/student/prescriptions', icon: Pill },
      { name: 'Medical Reports', path: '/student/reports', icon: FileCheck },
      { name: 'AI Health Assistant', path: '/student/assistant', icon: Bot },
      { name: 'My Profile', path: '/student/profile', icon: User }
    ]
  };

  const links = navLinks[role] || navLinks.STUDENT;

  return (
    <aside
      className={`relative bg-white border-r border-slate-200 transition-all duration-300 flex flex-col shrink-0 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Sidebar Navigation */}
      <div className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 mb-2">
          {!collapsed ? (
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {role} NAVIGATION
            </p>
          ) : (
            <div className="h-4" />
          )}
        </div>

        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === '/admin' || link.path === '/doctor' || link.path === '/student'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 shadow-sm shadow-sky-100 border border-sky-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                } ${collapsed ? 'justify-center' : ''}`
              }
              title={collapsed ? link.name : ''}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{link.name}</span>}
            </NavLink>
          );
        })}
      </div>

      {/* Collapse Toggle Footer */}
      <div className="p-3 border-t border-slate-100 flex items-center justify-between">
        {!collapsed && (
          <div className="text-[11px] text-slate-400 pl-2">
            LNMIIT IoT Health v1.0
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition ml-auto"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
