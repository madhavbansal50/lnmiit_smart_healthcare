import React from 'react';
import {
  Thermometer,
  Droplets,
  Radio,
  Gauge,
  AlertCircle,
  Clock,
  CheckCircle,
  HelpCircle,
  Activity,
  Layers,
  Zap,
  Cpu
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

export const ESP32DeviceView = ({
  deviceId = 'esp32_1',
  deviceName = 'ESP32 Device 1',
  data = null,
  history = [],
  lastUpdated = null,
  isStale = false
}) => {
  const temp = data?.temperature !== undefined && data?.temperature !== null ? parseFloat(data.temperature) : null;
  const humidity = data?.humidity !== undefined && data?.humidity !== null ? parseFloat(data.humidity) : null;
  const distance = (data?.distance !== undefined && data?.distance !== null ? parseFloat(data.distance) : null) ?? 
                   (data?.ultrasonicDistance !== undefined && data?.ultrasonicDistance !== null ? parseFloat(data.ultrasonicDistance) : null);
  const fsr = (data?.fsr !== undefined && data?.fsr !== null ? parseFloat(data.fsr) : null) ?? 
              (data?.force !== undefined && data?.force !== null ? parseFloat(data.force) : null);

  const timestampStr = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  // Mini sparkline data
  const sparkData = history.slice(-15).map((h, i) => ({
    i,
    temp: h.temperature ?? temp,
    humidity: h.humidity ?? humidity,
    distance: h.distance ?? h.ultrasonicDistance ?? distance,
    fsr: h.fsr ?? h.force ?? fsr
  }));

  // Status evaluations
  const getTempStatus = () => {
    if (temp === null) return { text: 'UNAVAILABLE', color: 'slate', isAvailable: false };
    if (temp > 38.0) return { text: 'HIGH TEMP', color: 'red', isAvailable: true };
    if (temp > 37.5) return { text: 'ELEVATED', color: 'amber', isAvailable: true };
    if (temp < 35.0) return { text: 'LOW TEMP', color: 'blue', isAvailable: true };
    return { text: 'NORMAL', color: 'emerald', isAvailable: true };
  };

  const getHumidityStatus = () => {
    if (humidity === null) return { text: 'UNAVAILABLE', color: 'slate', isAvailable: false };
    if (humidity > 70) return { text: 'HIGH HUMIDITY', color: 'blue', isAvailable: true };
    if (humidity < 30) return { text: 'DRY AIR', color: 'amber', isAvailable: true };
    return { text: 'OPTIMAL', color: 'teal', isAvailable: true };
  };

  const getDistanceStatus = () => {
    if (distance === null) return { text: 'UNAVAILABLE', color: 'slate', isAvailable: false };
    if (distance < 60) return { text: 'IN BED (OPTIMAL)', color: 'emerald', isAvailable: true };
    if (distance < 100) return { text: 'BED EDGE', color: 'amber', isAvailable: true };
    return { text: 'AWAY / VACANT', color: 'sky', isAvailable: true };
  };

  const getFsrStatus = () => {
    if (fsr === null) return { text: 'UNAVAILABLE', color: 'slate', isAvailable: false };
    if (fsr > 20) return { text: 'BED OCCUPIED', color: 'emerald', isAvailable: true };
    if (fsr > 5) return { text: 'LIGHT CONTACT', color: 'amber', isAvailable: true };
    return { text: 'BED VACANT', color: 'slate', isAvailable: true };
  };

  const tempStatus = getTempStatus();
  const humStatus = getHumidityStatus();
  const distStatus = getDistanceStatus();
  const fsrStatus = getFsrStatus();

  return (
    <div className="space-y-4">
      {/* 4 Sensor Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. TEMPERATURE CARD */}
        <div className={`bg-white rounded-3xl p-5 border transition-all duration-300 shadow-sm flex flex-col justify-between ${
          tempStatus.color === 'red'
            ? 'border-red-400 ring-2 ring-red-500/20 bg-red-50/10'
            : tempStatus.color === 'amber'
            ? 'border-amber-400 ring-2 ring-amber-500/20'
            : tempStatus.isAvailable
            ? 'border-slate-200 hover:border-slate-300'
            : 'border-dashed border-slate-300 bg-slate-50/50'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                  tempStatus.color === 'red' ? 'bg-red-50 text-red-600 border-red-200' :
                  tempStatus.color === 'amber' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                  tempStatus.isAvailable ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}>
                  <Thermometer className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">Temperature</h4>
                  <p className="text-[10px] text-slate-400 font-mono">LM35 / Analog</p>
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                tempStatus.color === 'red' ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' :
                tempStatus.color === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                tempStatus.color === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {tempStatus.text}
              </span>
            </div>

            {/* Value */}
            <div className="my-2">
              {temp !== null ? (
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                    {temp.toFixed(1)}
                  </span>
                  <span className="text-base font-bold text-slate-400">°C</span>
                  <span className="text-xs text-slate-400 ml-2">
                    ({((temp * 9) / 5 + 32).toFixed(1)}°F)
                  </span>
                </div>
              ) : (
                <div className="py-2 space-y-1">
                  <div className="text-xl font-bold font-mono text-slate-400">--.- °C</div>
                  <p className="text-[11px] text-slate-400 italic flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" /> Sensor Unavailable
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sparkline & Footer */}
          <div className="pt-2 border-t border-slate-100 mt-2">
            {temp !== null && sparkData.length > 2 && (
              <div className="h-6 w-full mb-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparkData}>
                    <Line type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Target: 35.5 - 37.5°C</span>
              {timestampStr && <span>{timestampStr}</span>}
            </div>
          </div>
        </div>

        {/* 2. HUMIDITY CARD */}
        <div className={`bg-white rounded-3xl p-5 border transition-all duration-300 shadow-sm flex flex-col justify-between ${
          humStatus.isAvailable ? 'border-slate-200 hover:border-slate-300' : 'border-dashed border-slate-300 bg-slate-50/50'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                  humStatus.isAvailable ? 'bg-cyan-50 text-cyan-600 border-cyan-200' : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}>
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">Relative Humidity</h4>
                  <p className="text-[10px] text-slate-400 font-mono">DHT / Ambient</p>
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                humStatus.color === 'teal' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                humStatus.color === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                humStatus.color === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {humStatus.text}
              </span>
            </div>

            {/* Value */}
            <div className="my-2">
              {humidity !== null ? (
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                    {humidity.toFixed(1)}
                  </span>
                  <span className="text-base font-bold text-slate-400">%</span>
                </div>
              ) : (
                <div className="py-2 space-y-1">
                  <div className="text-xl font-bold font-mono text-slate-400">--.- %</div>
                  <p className="text-[11px] text-slate-400 italic flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" /> Sensor Unavailable
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sparkline & Footer */}
          <div className="pt-2 border-t border-slate-100 mt-2">
            {humidity !== null && sparkData.length > 2 && (
              <div className="h-6 w-full mb-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparkData}>
                    <Line type="monotone" dataKey="humidity" stroke="#06b6d4" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Ambient: 30 - 60%</span>
              {timestampStr && <span>{timestampStr}</span>}
            </div>
          </div>
        </div>

        {/* 3. DISTANCE (ULTRASONIC) CARD */}
        <div className={`bg-white rounded-3xl p-5 border transition-all duration-300 shadow-sm flex flex-col justify-between ${
          distStatus.isAvailable ? 'border-slate-200 hover:border-slate-300' : 'border-dashed border-slate-300 bg-slate-50/50'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                  distStatus.isAvailable ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}>
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">Ultrasonic Sensor</h4>
                  <p className="text-[10px] text-slate-400 font-mono">HC-SR04 Proximity</p>
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                distStatus.color === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                distStatus.color === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                distStatus.color === 'sky' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {distStatus.text}
              </span>
            </div>

            {/* Value */}
            <div className="my-2">
              {distance !== null ? (
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                    {distance.toFixed(1)}
                  </span>
                  <span className="text-base font-bold text-slate-400">cm</span>
                </div>
              ) : (
                <div className="py-2 space-y-1">
                  <div className="text-xl font-bold font-mono text-slate-400">--.- cm</div>
                  <p className="text-[11px] text-slate-400 italic flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" /> Sensor Unavailable
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sparkline & Footer */}
          <div className="pt-2 border-t border-slate-100 mt-2">
            {distance !== null && sparkData.length > 2 && (
              <div className="h-6 w-full mb-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparkData}>
                    <Line type="monotone" dataKey="distance" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Target: &lt; 60 cm</span>
              {timestampStr && <span>{timestampStr}</span>}
            </div>
          </div>
        </div>

        {/* 4. FSR / FORCE SENSOR CARD */}
        <div className={`bg-white rounded-3xl p-5 border transition-all duration-300 shadow-sm flex flex-col justify-between ${
          fsrStatus.isAvailable ? 'border-slate-200 hover:border-slate-300' : 'border-dashed border-slate-300 bg-slate-50/50'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                  fsrStatus.isAvailable ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}>
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">FSR / Force Sensor</h4>
                  <p className="text-[10px] text-slate-400 font-mono">Bed Pressure Mat</p>
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                fsrStatus.color === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                fsrStatus.color === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {fsrStatus.text}
              </span>
            </div>

            {/* Value */}
            <div className="my-2">
              {fsr !== null ? (
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                    {fsr.toFixed(1)}
                  </span>
                  <span className="text-base font-bold text-slate-400">N</span>
                </div>
              ) : (
                <div className="py-2 space-y-1">
                  <div className="text-xl font-bold font-mono text-slate-400">--.- N</div>
                  <p className="text-[11px] text-slate-400 italic flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" /> Sensor Unavailable
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sparkline & Footer */}
          <div className="pt-2 border-t border-slate-100 mt-2">
            {fsr !== null && sparkData.length > 2 && (
              <div className="h-6 w-full mb-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparkData}>
                    <Line type="monotone" dataKey="fsr" stroke="#6366f1" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Threshold: &gt; 20 N</span>
              {timestampStr && <span>{timestampStr}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

