import React from 'react';
import {
  Thermometer,
  Droplets,
  Radio,
  Gauge,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

/**
 * 1. Temperature Sensor Card
 */
export const TemperatureSensorCard = ({
  temperature = null,
  history = [],
  lastUpdated = null,
  thresholds = { max: 38.0, min: 35.5 },
  isStale = false
}) => {
  const val = temperature !== null && temperature !== undefined ? parseFloat(temperature) : null;
  const isCritical = val !== null && (val > thresholds.max + 0.5 || val < thresholds.min - 0.5);
  const isWarning = val !== null && !isCritical && (val > thresholds.max || val < thresholds.min);

  const status = isCritical ? 'CRITICAL' : isWarning ? 'WARNING' : val !== null ? 'NORMAL' : 'NO_DATA';

  const sparkData = history.slice(-15).map((h, i) => ({
    i,
    v: h.temperature ?? val ?? 36.8
  }));

  return (
    <div className={`relative bg-white rounded-3xl p-6 border transition-all duration-300 shadow-sm flex flex-col justify-between ${
      isCritical
        ? 'border-red-400 ring-2 ring-red-500/20 bg-red-50/10'
        : isWarning
        ? 'border-amber-400 ring-2 ring-amber-500/20 bg-amber-50/10'
        : 'border-slate-200 hover:border-slate-300'
    }`}>
      {/* Top row */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
              isCritical
                ? 'bg-red-50 text-red-600 border-red-200'
                : isWarning
                ? 'bg-amber-50 text-amber-600 border-amber-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <Thermometer className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Temperature Sensor</h4>
              <p className="text-[11px] text-slate-400 font-mono">LM35 / Analog Probe</p>
            </div>
          </div>

          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
            status === 'CRITICAL'
              ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
              : status === 'WARNING'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : status === 'NORMAL'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}>
            {status}
          </span>
        </div>

        {/* Large Value Display */}
        <div className="my-4 flex items-baseline justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight font-mono text-slate-900">
                {val !== null ? val.toFixed(1) : '--.-'}
              </span>
              <span className="text-xl font-bold text-slate-400">°C</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Body / Surface Temp
              {val !== null && (
                <span className="ml-1 text-[11px] text-slate-400">
                  ({((val * 9) / 5 + 32).toFixed(1)}°F)
                </span>
              )}
            </p>
          </div>

          {/* Sparkline */}
          <div className="h-14 w-28 shrink-0">
            {sparkData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke={isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#f59e0b'}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        {/* Threshold bar / Range */}
        <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
            <span>Range: 35.5 - 37.5°C</span>
            <span>Limit: {thresholds.max}°C</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden flex">
            <div className="bg-sky-400 h-full w-[25%]" title="Hypothermia" />
            <div className="bg-emerald-500 h-full w-[50%]" title="Normal" />
            <div className="bg-amber-400 h-full w-[15%]" title="Elevated" />
            <div className="bg-red-500 h-full w-[10%]" title="High Pyrexia" />
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100 mt-3 font-mono">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {lastUpdated || 'Awaiting stream'}
        </span>
        {isStale && <span className="text-amber-600 font-bold">STALE (15s+)</span>}
      </div>
    </div>
  );
};

/**
 * 2. Humidity Sensor Card (Relative Humidity %)
 */
export const HumiditySensorCard = ({
  humidity = null,
  history = [],
  lastUpdated = null,
  thresholds = { max: 70, min: 30 },
  isStale = false
}) => {
  const val = humidity !== null && humidity !== undefined ? parseFloat(humidity) : null;
  const isHigh = val !== null && val > thresholds.max;
  const isDry = val !== null && val < thresholds.min;
  const isAlert = isHigh || isDry;

  const status = val === null 
    ? 'NO_DATA' 
    : isHigh 
    ? 'HIGH HUMIDITY' 
    : isDry 
    ? 'DRY AIR' 
    : 'OPTIMAL';

  const sparkData = history.slice(-15).map((h, i) => ({
    i,
    v: h.humidity ?? val ?? 50
  }));

  return (
    <div className={`relative bg-white rounded-3xl p-6 border transition-all duration-300 shadow-sm flex flex-col justify-between ${
      isAlert
        ? 'border-cyan-400 ring-2 ring-cyan-500/20 bg-cyan-50/10'
        : 'border-slate-200 hover:border-slate-300'
    }`}>
      {/* Top row */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
              isAlert
                ? 'bg-cyan-50 text-cyan-600 border-cyan-200'
                : 'bg-cyan-50 text-cyan-700 border-cyan-200'
            }`}>
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Humidity Sensor</h4>
              <p className="text-[11px] text-slate-400 font-mono">DHT / Ambient</p>
            </div>
          </div>

          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
            status === 'HIGH HUMIDITY'
              ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
              : status === 'DRY AIR'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : status === 'OPTIMAL'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}>
            {status}
          </span>
        </div>

        {/* Large Value Display */}
        <div className="my-4 flex items-baseline justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight font-mono text-slate-900">
                {val !== null ? val.toFixed(1) : '--.-'}
              </span>
              <span className="text-xl font-bold text-slate-400">%</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Relative Ambient Humidity
            </p>
          </div>

          {/* Sparkline */}
          <div className="h-14 w-28 shrink-0">
            {sparkData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        {/* Threshold bar / Range */}
        <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
            <span>Range: {thresholds.min ?? 30}% - {thresholds.max ?? 70}%</span>
            <span>Limit: {thresholds.max ?? 70}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden flex">
            <div className="bg-amber-400 h-full w-[30%]" title="Dry (<30%)" />
            <div className="bg-emerald-500 h-full w-[35%]" title="Optimal (30-65%)" />
            <div className="bg-cyan-500 h-full w-[15%]" title="Elevated (65-80%)" />
            <div className="bg-blue-600 h-full w-[20%]" title="High (>80%)" />
          </div>
          <div className="flex justify-between text-[9px] text-slate-400 font-mono pt-0.5">
            <span>0% Dry</span>
            <span>45% Ideal</span>
            <span>100% Humid</span>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100 mt-3 font-mono">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {lastUpdated || 'Awaiting stream'}
        </span>
        {isStale && <span className="text-amber-600 font-bold">STALE (15s+)</span>}
      </div>
    </div>
  );
};

/**
 * 3. Ultrasonic Sensor Card (Distance in cm)
 */
export const UltrasonicSensorCard = ({
  distance = null,
  history = [],
  lastUpdated = null,
  thresholds = { maxDistance: 90, minDistance: 10 },
  isStale = false
}) => {
  const dist = distance !== null && distance !== undefined ? parseFloat(distance) : null;

  let stateLabel = 'NO_DATA';
  let badgeColor = 'bg-slate-100 text-slate-500 border-slate-200';
  let isAlert = false;

  if (dist !== null) {
    if (dist > thresholds.maxDistance) {
      stateLabel = 'OUT OF BED / VACANT';
      badgeColor = 'bg-red-50 text-red-700 border-red-200 animate-pulse';
      isAlert = true;
    } else if (dist < thresholds.minDistance) {
      stateLabel = 'OBSTRUCTION (<10cm)';
      badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
      isAlert = true;
    } else if (dist > 60) {
      stateLabel = 'EDGE OF BED / SITTING';
      badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
    } else {
      stateLabel = 'IN BED (OPTIMAL)';
      badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  }

  const sparkData = history.slice(-15).map((h, i) => ({
    i,
    v: h.ultrasonicDistance ?? dist ?? 32
  }));

  // Progress calculation: 0cm to 120cm
  const progressPercent = dist !== null ? Math.min(100, Math.max(5, (dist / 120) * 100)) : 0;

  return (
    <div className={`relative bg-white rounded-3xl p-6 border transition-all duration-300 shadow-sm flex flex-col justify-between ${
      isAlert
        ? 'border-red-400 ring-2 ring-red-500/20 bg-red-50/10'
        : 'border-slate-200 hover:border-slate-300'
    }`}>
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
              isAlert
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-teal-50 text-teal-700 border-teal-200'
            }`}>
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Ultrasonic Sensor</h4>
              <p className="text-[11px] text-slate-400 font-mono">HC-SR04 Proximity</p>
            </div>
          </div>

          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeColor}`}>
            {stateLabel}
          </span>
        </div>

        {/* Large Value Display */}
        <div className="my-4 flex items-baseline justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight font-mono text-slate-900">
                {dist !== null ? dist.toFixed(1) : '--.-'}
              </span>
              <span className="text-xl font-bold text-slate-400">cm</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Patient Bed Clearance
            </p>
          </div>

          {/* Sparkline */}
          <div className="h-14 w-28 shrink-0">
            {sparkData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke={isAlert ? '#ef4444' : '#0d9488'}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        {/* Visual Proximity Bar */}
        <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
            <span>Proximity Zones</span>
            <span>Target: &lt;60 cm</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden relative">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                dist > thresholds.maxDistance ? 'bg-red-500' : dist > 60 ? 'bg-amber-500' : 'bg-teal-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-slate-400 font-mono pt-0.5">
            <span>0 cm (Close)</span>
            <span>60 cm (Edge)</span>
            <span>120 cm (Away)</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100 mt-3 font-mono">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {lastUpdated || 'Awaiting stream'}
        </span>
        {isStale && <span className="text-amber-600 font-bold">STALE (15s+)</span>}
      </div>
    </div>
  );
};

/**
 * 4. Force Sensor Card (Force in N)
 */
export const ForceSensorCard = ({
  force = null,
  history = [],
  lastUpdated = null,
  thresholds = { minForce: 5 },
  isStale = false
}) => {
  const f = force !== null && force !== undefined ? parseFloat(force) : null;

  let stateLabel = 'NO_DATA';
  let badgeColor = 'bg-slate-100 text-slate-500 border-slate-200';
  let isAlert = false;

  if (f !== null) {
    if (f < thresholds.minForce) {
      stateLabel = 'BED VACANT (<5N)';
      badgeColor = 'bg-red-50 text-red-700 border-red-200 animate-pulse';
      isAlert = true;
    } else if (f < 20) {
      stateLabel = 'PARTIAL PRESSURE';
      badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
    } else {
      stateLabel = 'BED OCCUPIED';
      badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  }

  const sparkData = history.slice(-15).map((h, i) => ({
    i,
    v: h.force ?? f ?? 45
  }));

  // Progress percentage (0N to 80N)
  const forcePercent = f !== null ? Math.min(100, Math.max(3, (f / 80) * 100)) : 0;

  return (
    <div className={`relative bg-white rounded-3xl p-6 border transition-all duration-300 shadow-sm flex flex-col justify-between ${
      isAlert
        ? 'border-red-400 ring-2 ring-red-500/20 bg-red-50/10'
        : 'border-slate-200 hover:border-slate-300'
    }`}>
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
              isAlert
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}>
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Force / Pressure Sensor</h4>
              <p className="text-[11px] text-slate-400 font-mono">FSR Bed Mat</p>
            </div>
          </div>

          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeColor}`}>
            {stateLabel}
          </span>
        </div>

        {/* Large Value Display */}
        <div className="my-4 flex items-baseline justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight font-mono text-slate-900">
                {f !== null ? f.toFixed(1) : '--.-'}
              </span>
              <span className="text-xl font-bold text-slate-400">N</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Contact Load / Surface Force
            </p>
          </div>

          {/* Sparkline */}
          <div className="h-14 w-28 shrink-0">
            {sparkData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke={isAlert ? '#ef4444' : '#6366f1'}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        {/* Visual Force Level Meter */}
        <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
            <span>Surface Pressure Gauge</span>
            <span>{f !== null ? `${f.toFixed(1)} N` : '0 N'}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden relative">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                f < thresholds.minForce ? 'bg-red-500' : f < 20 ? 'bg-amber-500' : 'bg-indigo-600'
              }`}
              style={{ width: `${forcePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-slate-400 font-mono pt-0.5">
            <span>0 N (Vacant)</span>
            <span>25 N (Contact)</span>
            <span>80 N (Full Weight)</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100 mt-3 font-mono">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {lastUpdated || 'Awaiting stream'}
        </span>
        {isStale && <span className="text-amber-600 font-bold">STALE (15s+)</span>}
      </div>
    </div>
  );
};
