import React, { useState, useEffect, useRef } from 'react';
import { Bell, Heart, Activity, Check, User, LogOut, ChevronDown, ShieldAlert, Cpu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVitals } from '../../context/VitalsContext';
import api from '../../services/api';
import { getSocket } from '../../services/socket';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { bed1Vitals, bed2Vitals } = useVitals();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const notifRef = useRef(null);
  const userRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const socket = getSocket();

    const handleNewNotif = () => {
      fetchNotifications();
    };

    socket.on('NOTIFICATION', handleNewNotif);
    socket.on('EMERGENCY_ALERT', handleNewNotif);

    return () => {
      socket.off('NOTIFICATION', handleNewNotif);
      socket.off('EMERGENCY_ALERT', handleNewNotif);
    };
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const markSingleRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Mark single read error:', err);
    }
  };

  const roleColors = {
    ADMIN: 'bg-purple-100 text-purple-700 border-purple-200',
    DOCTOR: 'bg-sky-100 text-sky-700 border-sky-200',
    STUDENT: 'bg-emerald-100 text-emerald-700 border-emerald-200'
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-brand-700 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
            <Heart className="w-5 h-5 fill-white/20 animate-pulse-heart" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                LNMIIT SMART HEALTHCARE
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                JAIPUR
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-none mt-1">
              IoT Sensor Monitoring & Patient Portal
            </p>
          </div>
        </div>

        {/* Center: Live Bed Vital Status Indicators */}
        <div className="hidden md:flex items-center gap-3">
          {/* Bed 1 Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <span className="flex h-2 w-2 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                bed1Vitals?.isEmergency ? 'bg-red-400' : 'bg-emerald-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                bed1Vitals?.isEmergency ? 'bg-red-500' : 'bg-emerald-500'
              }`} />
            </span>
            <span className="font-semibold text-slate-700">Bed 1:</span>
            {bed1Vitals ? (
              <span className="font-mono text-slate-600 flex items-center gap-1.5">
                {bed1Vitals.source === 'HARDWARE' && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    HW
                  </span>
                )}
                {bed1Vitals.heartRate?.toFixed(0)} BPM | {bed1Vitals.spo2?.toFixed(1)}% | {bed1Vitals.temperature?.toFixed(1)}°C
              </span>
            ) : (
              <span className="text-slate-400">Connecting...</span>
            )}
          </div>

          {/* Bed 2 Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <span className="flex h-2 w-2 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                bed2Vitals?.isEmergency ? 'bg-red-400' : 'bg-emerald-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                bed2Vitals?.isEmergency ? 'bg-red-500' : 'bg-emerald-500'
              }`} />
            </span>
            <span className="font-semibold text-slate-700">Bed 2:</span>
            {bed2Vitals ? (
              <span className="font-mono text-slate-600 flex items-center gap-1.5">
                {bed2Vitals.source === 'HARDWARE' && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    HW
                  </span>
                )}
                {bed2Vitals.heartRate?.toFixed(0)} BPM | {bed2Vitals.spo2?.toFixed(1)}% | {bed2Vitals.temperature?.toFixed(1)}°C
              </span>
            ) : (
              <span className="text-slate-400">Available</span>
            )}
          </div>
        </div>

        {/* Right Nav: Notifications & Profile */}
        <div className="flex items-center gap-2.5">
          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-800">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-sky-600 hover:text-sky-700 font-semibold"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markSingleRead(n.id)}
                        className={`p-3.5 hover:bg-slate-50 cursor-pointer transition flex items-start gap-3 ${
                          !n.isRead ? 'bg-sky-50/40' : ''
                        }`}
                      >
                        <div className={`p-2 rounded-lg text-white mt-0.5 shrink-0 ${
                          n.type === 'EMERGENCY' ? 'bg-red-500' :
                          n.type === 'ATTENTION' ? 'bg-amber-500' :
                          n.type === 'PRESCRIPTION' ? 'bg-emerald-500' : 'bg-sky-500'
                        }`}>
                          <Activity className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{n.title}</p>
                          <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {!n.isRead && (
                          <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0 mt-1.5" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl hover:bg-slate-100 transition"
            >
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-xs border border-sky-200">
                {user?.firstName?.[0] || 'U'}
              </div>
              <div className="text-left hidden lg:block">
                <div className="text-xs font-semibold text-slate-800 leading-tight">
                  {user?.role === 'DOCTOR' ? `Dr. ${user?.lastName}` : `${user?.firstName} ${user?.lastName}`}
                </div>
                <div className="text-[10px] text-slate-500 capitalize">
                  {user?.role?.toLowerCase()}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 py-1">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold border ${roleColors[user?.role] || 'bg-slate-100 text-slate-700'}`}>
                    {user?.role} PORTAL
                  </span>
                </div>

                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
