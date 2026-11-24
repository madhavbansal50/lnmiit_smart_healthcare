import React, { useState, useEffect } from 'react';
import { Activity, Heart, Thermometer, ShieldCheck, Clock, Calendar } from 'lucide-react';
import api from '../../services/api';
import { RealtimeVitalsChart } from '../../components/charts/RealtimeVitalsChart';
import { useAuth } from '../../context/AuthContext';
import { useVitals } from '../../context/VitalsContext';

export const StudentHealth = () => {
  const { user } = useAuth();
  const { bed1History, bed2History } = useVitals();

  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [baseline, setBaseline] = useState(null);
  const [range, setRange] = useState('entire'); // '5m', '15m', '30m', 'entire'
  const [loading, setLoading] = useState(false);

  const studentId = user?.studentProfile?.id;

  const fetchVitalsHistory = async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      const res = await api.get(`/students/${studentId}/vitals/history`, {
        params: { range }
      });
      setVitalsHistory(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVitalsHistory();
  }, [studentId, range]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            My Physiological Telemetry & Vitals History
          </h2>
          <p className="text-sm text-slate-500">
            Interactive multi-parametric vital trends recorded from campus ESP32 sensor units
          </p>
        </div>

        {/* Time Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          {['5m', '15m', '30m', 'entire'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize ${
                range === r ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {r === 'entire' ? 'All Sessions' : `Last ${r}`}
            </button>
          ))}
        </div>
      </div>

      {/* Main Realtime Dynamic Chart */}
      <RealtimeVitalsChart
        data={vitalsHistory.length > 0 ? vitalsHistory : bed1History}
        title="Continuous Multi-Sensor Telemetry (Pulse, SpO₂, Temperature)"
      />

      {/* Clinical Metrics & Reference Standards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase">
            <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
            Heart Rate (MAX30102)
          </div>
          <p className="text-xs text-slate-600">
            Normal adult resting heart rate typically lies between <strong>60 and 100 BPM</strong>. Rates above 100 BPM indicate tachycardia; rates under 60 BPM indicate bradycardia.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase">
            <Activity className="w-4 h-4 text-sky-500" />
            Blood Oxygen SpO₂ (MAX30102)
          </div>
          <p className="text-xs text-slate-600">
            Optimal arterial oxygen saturation should remain <strong>&ge; 95%</strong>. Readings between 90-94% prompt attention monitoring; readings under 90% require emergency triage.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase">
            <Thermometer className="w-4 h-4 text-amber-500" />
            Body Temperature (LM35)
          </div>
          <p className="text-xs text-slate-600">
            Standard physiological core temperature ranges between <strong>36.5°C and 37.5°C</strong> (97.7°F - 99.5°F). Temperatures above 38.0°C indicate active pyrexia.
          </p>
        </div>
      </div>
    </div>
  );
};
