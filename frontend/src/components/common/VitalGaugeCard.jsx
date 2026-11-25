import React, { useState } from 'react';
import { Thermometer, Droplets, Activity, Radio, Gauge, AlertCircle, Clock, ShieldCheck, Cpu, Wifi, WifiOff } from 'lucide-react';
import { RiskBadge } from './Badge';

export const VitalGaugeCard = ({
  bedNumber,
  vitals,
  patient,
  onStartSession,
  onEndSession,
  isDoctorView = false
}) => {
  const [useFahrenheit, setUseFahrenheit] = useState(false);

  const formatTemp = (celsius) => {
    if (celsius === null || celsius === undefined) return '--';
    if (useFahrenheit) {
      return ((celsius * 9) / 5 + 32).toFixed(1) + '°F';
    }
    return celsius.toFixed(1) + '°C';
  };

  const hasData = vitals !== null && vitals !== undefined;
  const isRealHardware = vitals?.source === 'HARDWARE' || vitals?.isRealHardware === true;
  const temp = vitals?.temperature;
  const humidity = vitals?.humidity;
  const ultrasonic = vitals?.ultrasonicDistance;
  const force = vitals?.force;
  const riskLevel = vitals?.riskLevel || 'NORMAL';
  const riskScore = vitals?.riskScore ?? (hasData ? 10 : 0);
  const explanation = vitals?.riskExplanation || (hasData ? 'Hardware telemetry within standard operating parameters.' : 'Awaiting sensor stream from Node-RED.');
  const isEmergency = vitals?.isEmergency;
  const timestampStr = vitals?.timestamp
    ? new Date(vitals.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  // Stale detection (> 15 seconds)
  const isStale = vitals?.timestamp && (Date.now() - new Date(vitals.timestamp).getTime() > 15000);

  return (
    <div className={`bg-white rounded-2xl border transition-all duration-300 shadow-sm overflow-hidden ${
      isEmergency ? 'border-red-500 shadow-red-100 ring-2 ring-red-500/20' : 'border-slate-200'
    }`}>
      {/* Card Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-sm border border-sky-200">
            B{bedNumber}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-base">Bed {bedNumber} Sensor Unit</h3>
              {hasData && !isStale ? (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> ONLINE
                </span>
              ) : isStale ? (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  STALE
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                  <WifiOff className="w-3 h-3" /> OFFLINE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {patient ? (
                <span>Patient: <strong className="text-slate-700">{patient.name || patient.studentName}</strong> ({patient.rollNumber})</span>
              ) : (
                <span className="text-emerald-600 font-medium">Bed Available for Patient</span>
              )}
            </p>
          </div>
        </div>

        {/* Right Header Status Badges */}
        <div className="flex items-center gap-2">
          {/* Data Source Badge: Hardware vs Simulator */}
          {hasData && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono border ${
              isRealHardware && !isStale
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}>
              {isRealHardware && !isStale ? (
                <>
                  <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                  LIVE HARDWARE
                </>
              ) : (
                <>
                  <Cpu className="w-3 h-3 text-amber-600" />
                  SIMULATOR / DEMO
                </>
              )}
            </span>
          )}

          <RiskBadge level={riskLevel} size="md" />

          <button
            onClick={() => setUseFahrenheit(!useFahrenheit)}
            className="text-[11px] font-semibold px-2 py-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="Toggle Celsius / Fahrenheit"
          >
            {useFahrenheit ? '°F' : '°C'}
          </button>
        </div>
      </div>

      {/* Main Vitals Readings */}
      <div className="p-5 space-y-4">
        {!hasData ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
            <WifiOff className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="font-bold text-slate-700 text-sm">No Live Sensor Stream Available</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Waiting for live telemetry from Node-RED on <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px] font-mono text-slate-800">POST /api/iot/vitals</code> or WebSocket.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* 1. Temperature Sensor */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50/50 to-white border border-amber-100 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
                  <span className="flex items-center gap-1.5 text-amber-600 font-semibold">
                    <Thermometer className="w-4 h-4 text-amber-500" />
                    Temperature
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">LM35</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 font-mono tracking-tight mt-1">
                  {formatTemp(temp)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Normal: 35.5 - 37.5°C</div>
              </div>

              {/* 2. Humidity Sensor */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-50/50 to-white border border-cyan-100 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
                  <span className="flex items-center gap-1.5 text-cyan-600 font-semibold">
                    <Droplets className="w-4 h-4 text-cyan-500" />
                    Humidity
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">DHT</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 font-mono tracking-tight mt-1">
                  {humidity !== null && humidity !== undefined ? parseFloat(humidity).toFixed(1) : '--.-'}
                  <span className="text-xs font-semibold text-slate-500 ml-1.5">%</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Ambient: 30 - 60%</div>
              </div>

              {/* 3. Ultrasonic Sensor */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/50 to-white border border-emerald-100 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
                  <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                    <Radio className="w-4 h-4 text-emerald-500" />
                    Ultrasonic
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">HC-SR04</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 font-mono tracking-tight mt-1">
                  {ultrasonic !== null && ultrasonic !== undefined ? parseFloat(ultrasonic).toFixed(1) : '--.-'}
                  <span className="text-xs font-semibold text-slate-500 ml-1.5">cm</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Target: &lt; 60 cm</div>
              </div>

              {/* 4. Force / Pressure Sensor */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-100 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
                  <span className="flex items-center gap-1.5 text-indigo-600 font-semibold">
                    <Gauge className="w-4 h-4 text-indigo-500" />
                    Force / Pressure
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">FSR Mat</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 font-mono tracking-tight mt-1">
                  {force !== null && force !== undefined ? parseFloat(force).toFixed(1) : '--.-'}
                  <span className="text-xs font-semibold text-slate-500 ml-1.5">N</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">&gt; 20 N (Occupied)</div>
              </div>
            </div>

            {/* Risk Score & Clinical Explanation Bar */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                  Hardware Telemetry Status
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {riskScore} / 100
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    riskScore > 75 ? 'bg-red-500' :
                    riskScore > 40 ? 'bg-amber-500' :
                    riskScore > 20 ? 'bg-sky-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, riskScore))}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <p className="text-slate-600 font-medium">
                  <strong className="text-slate-800">Status:</strong> {explanation}
                </p>

                {timestampStr && (
                  <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 ml-auto">
                    <Clock className="w-3 h-3" />
                    Last Packet: {timestampStr}
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        {/* Action Button for Doctor */}
        {isDoctorView && (
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <div className="text-[11px] text-slate-400 font-mono">
              Live Ingest: <span className="text-slate-600 font-bold">POST /api/iot/vitals</span>
            </div>

            <div className="flex items-center gap-3">
              {patient ? (
                <button
                  onClick={onEndSession}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-700 border border-slate-200 transition"
                >
                  End Monitoring Session
                </button>
              ) : (
                <button
                  onClick={onStartSession}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-600/20 transition"
                >
                  Start Monitoring Session
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
