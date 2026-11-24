import React, { useState, useEffect } from 'react';
import { Clock, FileText, User, Calendar, CheckCircle, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import { RiskBadge } from '../../components/common/Badge';

export const StudentHistory = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
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
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
      </div>
    );
  }

  const { profile } = data || {};
  const sessions = profile?.sessions || [];
  const notes = profile?.clinicalNotes || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Campus Clinic Visit History & Medical Notes
        </h2>
        <p className="text-sm text-slate-500">
          Chronological timeline of campus medical room admissions, symptoms, and attending doctor advice
        </p>
      </div>

      {/* Sessions Timeline */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
          <Clock className="w-5 h-5 text-sky-600" />
          Completed Telemetry Monitoring Sessions
        </h3>

        {sessions.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">No monitoring sessions found.</p>
        ) : (
          <div className="divide-y divide-slate-100 space-y-4">
            {sessions.map((s) => (
              <div key={s.id} className="pt-4 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-slate-900 text-sm">
                      {new Date(s.startTime).toLocaleDateString()}
                    </span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="font-semibold text-slate-700">Bed {s.bedNumber} Unit</span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-slate-500">Duration: {s.durationMinutes || 25} mins</span>
                  </div>
                  <RiskBadge level={s.finalRiskLevel} size="sm" />
                </div>

                <p className="text-slate-700">
                  <strong>Chief Complaint:</strong> {s.chiefComplaint}
                </p>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-600">
                  <strong>Discharge Observation:</strong> {s.summary}
                </div>

                <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono pt-1">
                  <span>Pulse: {s.avgHeartRate || '--'} BPM</span>
                  <span>SpO₂: {s.avgSpo2 || '--'}%</span>
                  <span>Temp: {s.avgTemperature || '--'}°C</span>
                  <span>Doctor: Dr. {s.doctor?.user?.firstName} {s.doctor?.user?.lastName}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clinical Notes Shared by Doctor */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
          <FileText className="w-5 h-5 text-sky-600" />
          Physician Clinical Notes & Recommendations
        </h3>

        {notes.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">No clinical notes shared yet.</p>
        ) : (
          <div className="space-y-4">
            {notes.map((n) => (
              <div key={n.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-200/70 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-800 text-sm">
                    Dr. {n.doctor?.user?.firstName} {n.doctor?.user?.lastName}
                  </span>
                  <span className="text-slate-400">{new Date(n.createdAt).toLocaleDateString()}</span>
                </div>
                {n.diagnosis && (
                  <p><strong>Clinical Diagnosis:</strong> <span className="text-sky-700 font-bold">{n.diagnosis}</span></p>
                )}
                <p><strong>Observations:</strong> {n.clinicalObservations}</p>
                <p><strong>Instructions:</strong> {n.instructions}</p>
                {n.followUpRecommendation && (
                  <p className="text-amber-800 bg-amber-50/80 p-2.5 rounded-lg border border-amber-200/60">
                    <strong>Follow-Up:</strong> {n.followUpRecommendation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
