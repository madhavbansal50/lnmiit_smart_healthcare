import React, { useState, useEffect } from 'react';
import { UserCheck, Users, Activity, Cpu, ArrowUpRight, Clock, ShieldCheck, Heart } from 'lucide-react';
import api from '../../services/api';
import { VitalGaugeCard } from '../../components/common/VitalGaugeCard';
import { StatusBadge } from '../../components/common/Badge';
import { useVitals } from '../../context/VitalsContext';

export const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { bed1Vitals, bed2Vitals } = useVitals();

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
      </div>
    );
  }

  const { stats, devices, recentSessions, beds } = data || {};

  return (
    <div className="space-y-6">
      {/* Page Title & Overview */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            System Administration Overview
          </h2>
          <p className="text-sm text-slate-500">
            Real-time campus health monitoring and telemetry infrastructure status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Gateway Operational
          </span>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Doctors</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{stats?.totalDoctors ?? 0}</h3>
            <span className="text-[11px] text-sky-600 font-medium">Cardiology, General, Ortho & more</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Students</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{stats?.totalStudents ?? 0}</h3>
            <span className="text-[11px] text-emerald-600 font-medium">Profiles & digital baselines</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Sessions</p>
            <h3 className="text-2xl font-extrabold text-sky-600 mt-1">{stats?.activeSessions ?? 0}</h3>
            <span className="text-[11px] text-slate-500 font-medium">Beds occupied in clinic</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Connected Devices</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-1">
              {stats?.connectedDevices ?? 0} <span className="text-xs text-slate-400 font-normal">/ {stats?.totalDevices ?? 0}</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">ESP32 & Raspberry Pi nodes</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <Cpu className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Active Beds Real-Time Cards */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Activity className="w-5 h-5 text-sky-600" />
          Campus Clinic Bed Monitoring Units
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VitalGaugeCard
            bedNumber={1}
            vitals={bed1Vitals}
            patient={beds?.bed1?.student ? {
              name: `${beds.bed1.student.user.firstName} ${beds.bed1.student.user.lastName}`,
              rollNumber: beds.bed1.student.rollNumber
            } : null}
          />
          <VitalGaugeCard
            bedNumber={2}
            vitals={bed2Vitals}
            patient={beds?.bed2?.student ? {
              name: `${beds.bed2.student.user.firstName} ${beds.bed2.student.user.lastName}`,
              rollNumber: beds.bed2.student.rollNumber
            } : null}
          />
        </div>
      </div>

      {/* Two Column Layout: Devices Status & Recent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Status Table */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-600" />
              Sensor & Gateway Hardware Status
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase">
                  <th className="pb-2.5">Device Node</th>
                  <th className="pb-2.5">Bed / Type</th>
                  <th className="pb-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {devices?.map((dev) => (
                  <tr key={dev.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 font-semibold text-slate-800">
                      {dev.name}
                      <span className="block text-[10px] text-slate-400 font-mono">{dev.deviceId}</span>
                    </td>
                    <td className="py-3 text-slate-600">
                      {dev.bedNumber ? `Bed ${dev.bedNumber}` : 'System Gateway'}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={dev.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Monitoring Sessions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              Recent Monitoring Sessions
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase">
                  <th className="pb-2.5">Student</th>
                  <th className="pb-2.5">Bed</th>
                  <th className="pb-2.5">Doctor</th>
                  <th className="pb-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSessions?.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 font-semibold text-slate-800">
                      {s.student?.user?.firstName} {s.student?.user?.lastName}
                      <span className="block text-[10px] text-slate-400 font-mono">{s.student?.rollNumber}</span>
                    </td>
                    <td className="py-3 text-slate-600 font-semibold">Bed {s.bedNumber}</td>
                    <td className="py-3 text-slate-600">
                      Dr. {s.doctor?.user?.lastName}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        s.status === 'ACTIVE' ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
