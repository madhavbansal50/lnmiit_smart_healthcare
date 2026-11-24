import React, { useState } from 'react';
import { Heart, Activity, Thermometer, AlertCircle, Clock, ShieldCheck, Cpu, Radio, Wifi, WifiOff } from 'lucide-react';
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
  const hr = vitals?.heartRate;
  const spo2 = vitals?.spo2;
  const temp = vitals?.temperature;
  const riskLevel = vitals?.riskLevel || 'NORMAL';
  const riskScore = vitals?.riskScore ?? (hasData ? 10 : 0);
  const explanation = vitals?.riskExplanation || (hasData ? 'Vital signs within normal physiological ranges.' : 'Awaiting sensor stream from Node-RED or hardware node.');
  const isEmergency = vitals?.isEmergency;
  const timestampStr = vitals?.timestamp
    ? new Date(vitals.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <div className={`bg-white rounded-2xl border transition-all duration-300 shadow-sm overflow-hidden ${isEmergency ? 'border-red-500 shadow-red-100 ring-2 ring-red-500/20' : 'border-slate-200'
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
              {hasData ? (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> ONLINE
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
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono border ${isRealHardware
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm'
              : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}>
              {isRealHardware ? (
                <>
                  <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                  REAL HARDWARE (Node-RED)
                </>
              ) : (
                <>
                  <Cpu className="w-3 h-3 text-amber-600" />
                  SIMULATED SENSOR
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
        {/* If NO sensor data available at all */}
        {!hasData ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
            <WifiOff className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="font-bold text-slate-700 text-sm">No Live Sensor Stream Available</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Waiting for live telemetry from Node-RED on <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px] font-mono text-slate-800">POST /api/iot/vitals</code> or from the hardware sensor simulator.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Heart Rate */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-rose-50/50 to-white border border-rose-100 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
                  <span className="flex items-center gap-1.5 text-rose-600 font-semibold">
                    <Heart className={`w-4 h-4 fill-rose-500 text-rose-500 ${isEmergency ? 'animate-pulse-heart' : ''}`} />
                    Heart Rate
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">MAX30102</span>
                </div>
                <div className="text-3xl font-extrabold text-slate-800 font-mono tracking-tight mt-1">
                  {hr ? hr.toFixed(0) : '--'}
                  <span className="text-xs font-semibold text-slate-500 ml-1.5">BPM</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Normal: 60 - 100 BPM</div>
              </div>

              {/* SpO2 */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-sky-50/50 to-white border border-sky-100 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
                  <span className="flex items-center gap-1.5 text-sky-600 font-semibold">
                    <Activity className="w-4 h-4 text-sky-500" />
                    Blood SpO₂
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">MAX30102</span>
                </div>
                <div className="text-3xl font-extrabold text-slate-800 font-mono tracking-tight mt-1">
                  {spo2 ? spo2.toFixed(1) : '--'}
                  <span className="text-xs font-semibold text-slate-500 ml-1.5">%</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Normal: 95 - 100%</div>
              </div>

              {/* Temperature */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50/50 to-white border border-amber-100 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
                  <span className="flex items-center gap-1.5 text-amber-600 font-semibold">
                    <Thermometer className="w-4 h-4 text-amber-500" />
                    Temperature
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">LM35</span>
                </div>
                <div className="text-3xl font-extrabold text-slate-800 font-mono tracking-tight mt-1">
                  {formatTemp(temp)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Normal: 36.5 - 37.5°C</div>
              </div>
            </div>

            {/* Risk Score & Clinical Explanation Bar */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                  Risk Assessment Index
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {riskScore} / 100
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${riskScore > 75 ? 'bg-red-500' :
                    riskScore > 40 ? 'bg-amber-500' :
                      riskScore > 20 ? 'bg-sky-500' : 'bg-emerald-500'
                    }`}
                  style={{ width: `${Math.min(100, Math.max(5, riskScore))}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <p className="text-slate-600 font-medium">
                  <strong className="text-slate-800">Explanation:</strong> {explanation}
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
              Node-RED Endpoint: <span className="text-slate-600 font-bold">/api/iot/vitals</span>
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
