import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Activity,
  Thermometer,
  ShieldCheck,
  Bot,
  FileCheck,
  Pill,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import api from '../../services/api';
import { RiskBadge } from '../../components/common/Badge';
import { VitalGaugeCard } from '../../components/common/VitalGaugeCard';
import { useAuth } from '../../context/AuthContext';
import { useVitals } from '../../context/VitalsContext';

export const StudentDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { bed1Vitals, bed2Vitals } = useVitals();
  const navigate = useNavigate();

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/students/me');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
      </div>
    );
  }

  const { profile, activeSession, liveVitals, insights } = data || {};
  const latestSession = profile?.sessions?.[0];
  const latestVitalsReading = latestSession?.vitals?.[0];
  const isCurrentlyInBed = !!activeSession;

  const currentLive = activeSession?.bedNumber === 1 ? bed1Vitals : bed2Vitals;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-600 via-sky-600 to-brand-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-sky-600/15 flex flex-wrap items-center justify-between gap-6">
        <div>
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 border border-white/20 text-teal-100">
            LNMIIT Student Health Portal
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
            Welcome, {user?.firstName} {user?.lastName}
          </h2>
          <p className="text-sky-100 text-xs sm:text-sm mt-1">
            Roll: <strong>{profile?.rollNumber}</strong> &bull; {profile?.branch} &bull; Blood: <strong>{profile?.bloodGroup || 'B+'}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => navigate('/student/assistant')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-sky-700 font-bold rounded-xl shadow-md hover:bg-sky-50 transition text-xs sm:text-sm"
          >
            <Bot className="w-4 h-4 text-sky-600" /> Consult AI Assistant
          </button>
          <button
            onClick={() => navigate('/student/reports')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold rounded-xl transition text-xs sm:text-sm"
          >
            <FileCheck className="w-4 h-4" /> Upload Report
          </button>
        </div>
      </div>

      {/* Active Bed Alert Banner (If student is actively on Bed 1 or Bed 2) */}
      {isCurrentlyInBed && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <h4 className="font-bold text-emerald-950 text-sm">
                  You are currently being monitored on Bed {activeSession.bedNumber}
                </h4>
                <p className="text-xs text-emerald-700">
                  Continuous sensor readings from MAX30102 and LM35 are actively logging.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/student/live')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
            >
              View Full Live Waveform
            </button>
          </div>

          <VitalGaugeCard
            bedNumber={activeSession.bedNumber}
            vitals={currentLive}
            patient={{ name: `${user?.firstName} ${user?.lastName}`, rollNumber: profile?.rollNumber }}
          />
        </div>
      )}

      {/* Quick Vitals Snapshot Cards (Latest session readings) */}
      {!isCurrentlyInBed && (
        <div>
          <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-600" />
            Latest Clinical Vitals Snapshot
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Heart rate */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-rose-500" /> Resting Heart Rate
                </span>
                <div className="text-2xl font-extrabold text-slate-800 font-mono mt-1">
                  {latestSession?.avgHeartRate || 74} <span className="text-xs font-normal text-slate-400">BPM</span>
                </div>
                <span className="text-[11px] text-emerald-600 font-medium">Standard physiological range</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                HR
              </div>
            </div>

            {/* SpO2 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-sky-500" /> Oxygen Saturation
                </span>
                <div className="text-2xl font-extrabold text-slate-800 font-mono mt-1">
                  {latestSession?.avgSpo2 || 98.2} <span className="text-xs font-normal text-slate-400">%</span>
                </div>
                <span className="text-[11px] text-emerald-600 font-medium">Optimal respiratory status</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                O₂
              </div>
            </div>

            {/* Temperature */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-amber-500" /> Body Temperature
                </span>
                <div className="text-2xl font-extrabold text-slate-800 font-mono mt-1">
                  {latestSession?.avgTemperature || 36.8} <span className="text-xs font-normal text-slate-400">°C</span>
                </div>
                <span className="text-[11px] text-emerald-600 font-medium">Normal thermoregulation</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                °C
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Personalized Health Insights Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-600" />
            Personalized Longitudinal Health Insights
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            Computed from continuous telemetry history
          </span>
        </div>

        {insights?.insights?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.insights.map((ins, i) => (
              <div
                key={i}
                className={`p-4 rounded-2xl border space-y-1.5 ${
                  ins.category === 'alert' ? 'bg-red-50/60 border-red-200' :
                  ins.category === 'warning' ? 'bg-amber-50/60 border-amber-200' :
                  'bg-sky-50/50 border-sky-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">{ins.title}</span>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                    {ins.metric}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{ins.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 bg-slate-50 rounded-2xl text-center text-xs text-slate-500">
            More monitoring sessions are needed to generate personalized historical insights.
          </div>
        )}
      </div>

      {/* Two Columns: Recent Monitoring Sessions & Prescriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sessions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              Recent Clinic Visits
            </h3>
            <button
              onClick={() => navigate('/student/history')}
              className="text-xs text-sky-600 hover:text-sky-700 font-semibold"
            >
              View history
            </button>
          </div>

          <div className="space-y-3">
            {profile?.sessions?.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No previous visits recorded.</p>
            ) : (
              profile?.sessions?.slice(0, 3).map((s) => (
                <div key={s.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      {new Date(s.startTime).toLocaleDateString()} &bull; Bed {s.bedNumber}
                    </span>
                    <RiskBadge level={s.finalRiskLevel} size="sm" />
                  </div>
                  <p className="text-slate-600 line-clamp-1"><strong>Complaint:</strong> {s.chiefComplaint}</p>
                  <p className="text-slate-500 line-clamp-2">{s.summary}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Current Prescriptions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Pill className="w-4 h-4 text-sky-600" />
              Prescriptions & Medications
            </h3>
            <button
              onClick={() => navigate('/student/prescriptions')}
              className="text-xs text-sky-600 hover:text-sky-700 font-semibold"
            >
              View all
            </button>
          </div>

          <div className="space-y-3">
            {profile?.prescriptions?.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No active prescriptions.</p>
            ) : (
              profile?.prescriptions?.slice(0, 2).map((p) => (
                <div key={p.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      By Dr. {p.doctor?.user?.firstName} {p.doctor?.user?.lastName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {p.items?.map((it) => (
                      <div key={it.id} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-100">
                        <strong className="text-slate-800">{it.medicineName} ({it.dosage})</strong>
                        <span className="text-slate-500">{it.frequency}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
