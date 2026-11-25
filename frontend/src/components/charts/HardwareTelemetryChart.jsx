import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  Thermometer,
  Droplets,
  Radio,
  Gauge,
  Clock,
  Layers,
  Activity,
  Maximize2
} from 'lucide-react';

export const HardwareTelemetryChart = ({
  data = [],
  title = 'Hardware Sensor Telemetry Waveform',
  thresholds = {
    tempMax: 38.0,
    tempMin: 35.5,
    distanceMax: 90,
    forceMin: 5
  }
}) => {
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL', 'TEMP', 'HUMIDITY', 'DISTANCE', 'FORCE'

  // Normalize data safely
  const formattedData = data.map((d, index) => {
    const temp = d.temperature !== null && d.temperature !== undefined ? parseFloat(d.temperature) : null;
    const humidity = d.humidity !== null && d.humidity !== undefined ? parseFloat(d.humidity) : null;
    const distance = (d.distance !== null && d.distance !== undefined ? parseFloat(d.distance) : null) ?? 
                     (d.ultrasonicDistance !== null && d.ultrasonicDistance !== undefined ? parseFloat(d.ultrasonicDistance) : null);
    const force = (d.fsr !== null && d.fsr !== undefined ? parseFloat(d.fsr) : null) ?? 
                  (d.force !== null && d.force !== undefined ? parseFloat(d.force) : null);

    // Relative normalization for "ALL" tab view (0 - 100% scale)
    const normTemp = temp !== null ? Math.max(0, Math.min(100, ((temp - 20) / 25) * 100)) : null;
    const normHumidity = humidity !== null ? Math.max(0, Math.min(100, humidity)) : null;
    const normDistance = distance !== null ? Math.max(0, Math.min(100, (distance / 300) * 100)) : null;
    const normForce = force !== null ? Math.max(0, Math.min(100, (force / 400) * 100)) : null;

    return {
      index: index + 1,
      time: d.time || (d.timestamp ? new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : `T-${data.length - index}`),
      temperature: temp,
      humidity: humidity,
      ultrasonicDistance: distance,
      force: force,
      normTemp: normTemp !== null ? parseFloat(normTemp.toFixed(1)) : null,
      normHumidity: normHumidity !== null ? parseFloat(normHumidity.toFixed(1)) : null,
      normDistance: normDistance !== null ? parseFloat(normDistance.toFixed(1)) : null,
      normForce: normForce !== null ? parseFloat(normForce.toFixed(1)) : null
    };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl text-xs space-y-2 border border-slate-700 min-w-[200px]">
          <p className="font-semibold text-slate-300 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            Packet Timestamp: <span className="font-mono text-white">{label}</span>
          </p>

          <div className="space-y-1.5">
            {payload.map((entry, idx) => {
              let displayVal = entry.value;
              let unit = '';
              let labelName = entry.name;

              if (entry.dataKey === 'temperature' || entry.dataKey === 'normTemp') {
                displayVal = entry.payload.temperature ?? 'N/A';
                unit = '°C';
                labelName = 'Temperature';
              } else if (entry.dataKey === 'ultrasonicDistance' || entry.dataKey === 'normDistance') {
                displayVal = entry.payload.ultrasonicDistance ?? 'N/A';
                unit = 'cm';
                labelName = 'Ultrasonic Dist';
              } else if (entry.dataKey === 'force' || entry.dataKey === 'normForce') {
                displayVal = entry.payload.force ?? 'N/A';
                unit = 'N';
                labelName = 'Bed Force';
              }

              return (
                <div key={`entry-${idx}`} className="flex items-center justify-between gap-4 font-mono text-[11px]">
                  <span className="flex items-center gap-1.5 font-sans" style={{ color: entry.color }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    {labelName}:
                  </span>
                  <span className="font-bold text-white">
                    {displayVal} {unit}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
      {/* Header & Metric Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-600 animate-pulse" />
            {title}
          </h3>
          <p className="text-xs text-slate-500">
            Live multi-channel telemetry received via Node-RED WebSocket stream
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
              activeTab === 'ALL'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            All Sensors
          </button>
          <button
            onClick={() => setActiveTab('TEMP')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
              activeTab === 'TEMP'
                ? 'bg-amber-50 text-amber-700 shadow-sm border border-amber-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5 text-amber-500" />
            Temperature (°C)
          </button>
          <button
            onClick={() => setActiveTab('HUMIDITY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
              activeTab === 'HUMIDITY'
                ? 'bg-cyan-50 text-cyan-700 shadow-sm border border-cyan-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Droplets className="w-3.5 h-3.5 text-cyan-500" />
            Humidity (%)
          </button>
          <button
            onClick={() => setActiveTab('DISTANCE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
              activeTab === 'DISTANCE'
                ? 'bg-teal-50 text-teal-700 shadow-sm border border-teal-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-teal-500" />
            Ultrasonic (cm)
          </button>
          <button
            onClick={() => setActiveTab('FORCE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
              activeTab === 'FORCE'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-indigo-500" />
            Force (N)
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-80 w-full pt-1">
        {formattedData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
            <Radio className="w-8 h-8 animate-pulse text-slate-300" />
            <p className="text-xs font-semibold">Waiting for live sensor data stream from Node-RED...</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {activeTab === 'ALL' ? (
              <LineChart data={formattedData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  domain={[0, 100]}
                  tickLine={false}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                  formatter={(val) => {
                    if (val === 'normTemp') return 'Temperature (% of range)';
                    if (val === 'normDistance') return 'Ultrasonic Distance (% of range)';
                    if (val === 'normForce') return 'Force Pressure (% of range)';
                    return val;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="normTemp"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="normDistance"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="normForce"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            ) : activeTab === 'TEMP' ? (
              <AreaChart data={formattedData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} domain={['dataMin - 1', 'dataMax + 1']} tickLine={false} tickFormatter={(v) => `${v}°`} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={thresholds.tempMax} stroke="#ef4444" strokeDasharray="3 3" label={{ value: `Max (${thresholds.tempMax}°C)`, fill: '#ef4444', fontSize: 10 }} />
                <Area type="monotone" dataKey="temperature" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#tempGradient)" isAnimationActive={false} />
              </AreaChart>
            ) : activeTab === 'HUMIDITY' ? (
              <AreaChart data={formattedData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="humGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="humidity" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#humGradient)" isAnimationActive={false} />
              </AreaChart>
            ) : activeTab === 'DISTANCE' ? (
              <AreaChart data={formattedData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="distGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 'dataMax + 20']} tickLine={false} tickFormatter={(v) => `${v}cm`} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={thresholds.distanceMax} stroke="#ef4444" strokeDasharray="3 3" label={{ value: `Out of Bed (${thresholds.distanceMax}cm)`, fill: '#ef4444', fontSize: 10 }} />
                <Area type="monotone" dataKey="ultrasonicDistance" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#distGradient)" isAnimationActive={false} />
              </AreaChart>
            ) : (
              <AreaChart data={formattedData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="forceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 'dataMax + 10']} tickLine={false} tickFormatter={(v) => `${v}N`} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={thresholds.forceMin} stroke="#ef4444" strokeDasharray="3 3" label={{ value: `Vacant (<${thresholds.forceMin}N)`, fill: '#ef4444', fontSize: 10 }} />
                <Area type="monotone" dataKey="force" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#forceGradient)" isAnimationActive={false} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer Legend / Channel Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
          <span><strong>Temperature:</strong> LM35 Sensor (°C)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-600 shrink-0" />
          <span><strong>Ultrasonic:</strong> HC-SR04 Proximity (cm)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
          <span><strong>Force:</strong> FSR Bed Pressure (N)</span>
        </div>
      </div>
    </div>
  );
};
