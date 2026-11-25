import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle, Clock, Heart, Activity, Thermometer, ArrowRight, Trash2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { RiskBadge } from '../../components/common/Badge';
import { useVitals } from '../../context/VitalsContext';

export const DoctorAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const { acknowledgeAlert } = useVitals();
  const navigate = useNavigate();

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/doctors/dashboard');
      setAlerts(res.data?.recentAlerts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleAck = async (id) => {
    await acknowledgeAlert(id);
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isAcknowledged: true } : a))
    );
  };

  const handleDelete = async (id) => {
    try {
      setDeletingId(id);
      await api.delete(`/doctors/alerts/${id}`);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Failed to delete alert:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all alerts?')) return;
    try {
      setLoading(true);
      await api.delete('/doctors/alerts');
      setAlerts([]);
    } catch (err) {
      console.error('Failed to clear alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            Clinical Triage & Emergency Alerts
          </h2>
          <p className="text-sm text-slate-500">
            Real-time audit log of continuous physiological telemetry breaches and physician acknowledgements
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAlerts}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition border border-slate-200 flex items-center gap-1.5"
            title="Refresh alerts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {alerts.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-xl text-xs border border-red-200 transition flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All Alerts
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
            No alerts logged currently. All clinic beds are operating within normal limits.
          </div>
        ) : (
          alerts.map((alert) => {
            let vitalsSnap = null;
            try {
              if (alert.vitalsSnapshot) vitalsSnap = JSON.parse(alert.vitalsSnapshot);
            } catch (e) {}

            return (
              <div
                key={alert.id}
                className={`bg-white rounded-2xl border p-5 shadow-sm transition space-y-3 ${
                  alert.riskLevel === 'EMERGENCY'
                    ? 'border-red-300 ring-1 ring-red-100'
                    : 'border-amber-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <RiskBadge level={alert.riskLevel} size="md" />
                    <h3 className="font-bold text-slate-900 text-sm">
                      Bed {alert.bedNumber} &bull; {alert.session?.student?.user?.firstName || 'Patient'} {alert.session?.student?.user?.lastName || ''}
                    </h3>
                  </div>

                  <span className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(alert.createdAt).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-slate-700 font-medium">
                  {alert.explanation}
                </p>

                {/* Vitals Snapshot (Dynamically rendered actual channels) */}
                {vitalsSnap && (
                  <div className="flex flex-wrap gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                    {vitalsSnap.temperature !== null && vitalsSnap.temperature !== undefined && (
                      <div className="flex-1 min-w-[90px] text-center">
                        <span className="text-slate-400 block text-[10px]">Temperature</span>
                        <strong className="text-slate-800 font-mono text-sm">{parseFloat(vitalsSnap.temperature).toFixed(1)}°C</strong>
                      </div>
                    )}
                    {vitalsSnap.humidity !== null && vitalsSnap.humidity !== undefined && (
                      <div className="flex-1 min-w-[90px] text-center">
                        <span className="text-slate-400 block text-[10px]">Humidity</span>
                        <strong className="text-slate-800 font-mono text-sm">{parseFloat(vitalsSnap.humidity).toFixed(1)}%</strong>
                      </div>
                    )}
                    {(vitalsSnap.ultrasonicDistance !== null && vitalsSnap.ultrasonicDistance !== undefined || vitalsSnap.distance !== null && vitalsSnap.distance !== undefined) && (
                      <div className="flex-1 min-w-[90px] text-center">
                        <span className="text-slate-400 block text-[10px]">Proximity</span>
                        <strong className="text-slate-800 font-mono text-sm">{parseFloat(vitalsSnap.ultrasonicDistance ?? vitalsSnap.distance).toFixed(1)} cm</strong>
                      </div>
                    )}
                    {(vitalsSnap.force !== null && vitalsSnap.force !== undefined || vitalsSnap.fsr !== null && vitalsSnap.fsr !== undefined) && (
                      <div className="flex-1 min-w-[90px] text-center">
                        <span className="text-slate-400 block text-[10px]">Bed Force</span>
                        <strong className="text-slate-800 font-mono text-sm">{parseFloat(vitalsSnap.force ?? vitalsSnap.fsr).toFixed(1)} N</strong>
                      </div>
                    )}
                    {vitalsSnap.heartRate !== null && vitalsSnap.heartRate !== undefined && (
                      <div className="flex-1 min-w-[90px] text-center">
                        <span className="text-slate-400 block text-[10px]">Heart Rate</span>
                        <strong className="text-slate-800 font-mono text-sm">{parseFloat(vitalsSnap.heartRate).toFixed(0)} BPM</strong>
                      </div>
                    )}
                    {vitalsSnap.spo2 !== null && vitalsSnap.spo2 !== undefined && (
                      <div className="flex-1 min-w-[90px] text-center">
                        <span className="text-slate-400 block text-[10px]">SpO₂</span>
                        <strong className="text-slate-800 font-mono text-sm">{parseFloat(vitalsSnap.spo2).toFixed(1)}%</strong>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
                  <div className="text-xs">
                    {alert.isAcknowledged ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Acknowledged by {alert.acknowledgedBy || 'Doctor'}
                      </span>
                    ) : (
                      <span className="text-amber-600 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4 text-amber-500" /> Pending Physician Acknowledgment
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!alert.isAcknowledged && (
                      <button
                        onClick={() => handleAck(alert.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition"
                      >
                        Acknowledge
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(alert.id)}
                      disabled={deletingId === alert.id}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-lg text-xs inline-flex items-center gap-1 border border-red-200 transition"
                      title="Delete this alert"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>

                    <button
                      onClick={() => navigate(`/doctor/monitoring?bed=${alert.bedNumber}`)}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg text-xs inline-flex items-center gap-1 shadow-sm transition"
                    >
                      View Live Bed <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
