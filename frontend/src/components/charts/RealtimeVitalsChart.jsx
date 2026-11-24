import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { Heart, Activity, Thermometer, Clock } from 'lucide-react';

export const RealtimeVitalsChart = ({ data = [], title = 'Real-Time Vitals Stream' }) => {
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL', 'HR', 'SPO2', 'TEMP'
  const [timeRange, setTimeRange] = useState('LIVE'); // 'LIVE', '5m', '15m', '30m', 'ENTIRE'

  // Format data safely
  const formattedData = data.map((d) => ({
    ...d,
    time: d.time || new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    heartRate: parseFloat(d.heartRate),
    spo2: parseFloat(d.spo2),
    temperature: parseFloat(d.temperature)
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 backdrop-blur-sm text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700">
          <p className="font-semibold text-slate-300 flex items-center gap-1.5 border-b border-slate-700 pb-1">
            <Clock className="w-3.5 h-3.5 text-sky-400" /> {label}
          </p>
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="font-medium" style={{ color: entry.color }}>
                {entry.name}:
              </span>
              <span className="font-mono font-bold">
                {entry.value} {entry.name === 'Heart Rate' ? 'BPM' : entry.name === 'SpO2' ? '%' : '°C'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-bold text-slate-800 text-base">{title}</h3>
          <p className="text-xs text-slate-500">Live dynamic plotting from ESP32 & IoT Edge Service</p>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              activeTab === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All Metrics
          </button>
          <button
            onClick={() => setActiveTab('HR')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
              activeTab === 'HR' ? 'bg-rose-50 text-rose-700 shadow-sm border border-rose-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-500" /> Pulse
          </button>
          <button
            onClick={() => setActiveTab('SPO2')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
              activeTab === 'SPO2' ? 'bg-sky-50 text-sky-700 shadow-sm border border-sky-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-sky-500" /> SpO₂
          </button>
          <button
            onClick={() => setActiveTab('TEMP')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
              activeTab === 'TEMP' ? 'bg-amber-50 text-amber-700 shadow-sm border border-amber-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5 text-amber-500" /> Temp
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 w-full pt-2">
        {formattedData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">
            Waiting for live vital stream data...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />

              {(activeTab === 'ALL' || activeTab === 'HR') && (
                <Line
                  type="monotone"
                  dataKey="heartRate"
                  name="Heart Rate"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#ef4444' }}
                  isAnimationActive={false}
                />
              )}

              {(activeTab === 'ALL' || activeTab === 'SPO2') && (
                <Line
                  type="monotone"
                  dataKey="spo2"
                  name="SpO2"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#0284c7' }}
                  isAnimationActive={false}
                />
              )}

              {(activeTab === 'ALL' || activeTab === 'TEMP') && (
                <Line
                  type="monotone"
                  dataKey="temperature"
                  name="Temperature"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#f59e0b' }}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend & Stream Details */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Heart Rate (BPM)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-600" /> SpO₂ (%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Temp (°C)
          </span>
        </div>
        <div className="font-mono text-[11px] text-slate-400">
          Continuous WebSocket stream
        </div>
      </div>
    </div>
  );
};
