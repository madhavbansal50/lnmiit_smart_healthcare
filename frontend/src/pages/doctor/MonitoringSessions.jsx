import React, { useState, useEffect } from 'react';
import { Clock, Activity, Search, Calendar, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { RiskBadge } from '../../components/common/Badge';

export const MonitoringSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/sessions');
      setSessions(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const filteredSessions = sessions.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const fullName = `${s.student?.user?.firstName || ''} ${s.student?.user?.lastName || ''}`.toLowerCase();
    const roll = (s.student?.rollNumber || '').toLowerCase();
    const bed = `bed ${s.bedNumber}`.toLowerCase();
    return fullName.includes(q) || roll.includes(q) || bed.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Clinic Monitoring Sessions Archive
          </h2>
          <p className="text-sm text-slate-500">
             Visit summaries and triage records
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name, roll number, or bed..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 font-sans"
            />
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {filteredSessions.length} sessions logged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-400 font-semibold uppercase text-[11px]">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Bed</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Attending Doctor</th>
                <th className="py-3 px-4">Peak Risk</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    Loading sessions...
                  </td>
                </tr>
              ) : filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    No sessions recorded.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {s.student?.user?.firstName} {s.student?.user?.lastName}
                      <span className="block text-[11px] font-mono text-slate-400 font-normal">{s.student?.rollNumber}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">Bed {s.bedNumber}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(s.startTime).toLocaleDateString()}
                      <span className="block text-[11px] text-slate-400">
                        {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {s.durationMinutes || 25} mins
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      Dr. {s.doctor?.user?.firstName} {s.doctor?.user?.lastName}
                    </td>
                    <td className="py-3 px-4">
                      <RiskBadge level={s.peakRiskLevel} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        s.status === 'ACTIVE' ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate(`/doctor/patients/${s.studentId}`)}
                        className="text-xs text-sky-600 hover:text-sky-700 font-semibold inline-flex items-center gap-1"
                      >
                        Patient Profile <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
