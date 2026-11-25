import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity,
  Thermometer,
  Droplets,
  Radio,
  Gauge,
  Play,
  Square,
  Clock,
  User,
  Sliders,
  CheckCircle,
  AlertTriangle,
  Settings,
  RefreshCw,
  ExternalLink,
  Check,
  ChevronRight,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useVitals } from '../../context/VitalsContext';
import {
  TemperatureSensorCard,
  HumiditySensorCard,
  UltrasonicSensorCard,
  ForceSensorCard
} from '../../components/common/HardwareSensorCards';
import { HardwareTelemetryChart } from '../../components/charts/HardwareTelemetryChart';
import { Modal } from '../../components/common/Modal';
import api from '../../services/api';

export const LiveMonitoring = () => {
  const [searchParams] = useSearchParams();
  const initialBed = parseInt(searchParams.get('bed') || '1', 10);

  const [activeBed, setActiveBed] = useState(initialBed);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [complaint, setComplaint] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [endSummary, setEndSummary] = useState('');

  // Configurable Sensor Alert Thresholds Modal
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
  const [thresholds, setThresholds] = useState(() => {
    try {
      const saved = localStorage.getItem('doctor_sensor_thresholds');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          tempMax: parsed.tempMax ?? 38.0,
          tempMin: parsed.tempMin ?? 35.5,
          humidityMax: parsed.humidityMax ?? 70,
          humidityMin: parsed.humidityMin ?? 30,
          distanceMax: parsed.distanceMax ?? 90,
          distanceMin: parsed.distanceMin ?? 10,
          forceMin: parsed.forceMin ?? 5
        };
      }
      return {
        tempMax: 38.0,
        tempMin: 35.5,
        humidityMax: 70,
        humidityMin: 30,
        distanceMax: 90,
        distanceMin: 10,
        forceMin: 5
      };
    } catch (e) {
      return {
        tempMax: 38.0,
        tempMin: 35.5,
        humidityMax: 70,
        humidityMin: 30,
        distanceMax: 90,
        distanceMin: 10,
        forceMin: 5
      };
    }
  });

  const [tempThresholds, setTempThresholds] = useState(thresholds);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { bed1Vitals, bed2Vitals, bed1History, bed2History, esp32Data } = useVitals();

  const fetchActiveSessions = async () => {
    try {
      const res = await api.get('/sessions/active');
      setActiveSessions(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const currentVitals = activeBed === 1 ? bed1Vitals : bed2Vitals;
  const currentHistory = activeBed === 1 ? bed1History : bed2History;
  const currentSession = activeSessions.find((s) => s.bedNumber === activeBed);
  const currentRawEsp32 = activeBed === 1 ? esp32Data?.esp32_1 : esp32Data?.esp32_2;

  // Stale packet detection (> 15 seconds)
  const lastPacketTime = currentVitals?.timestamp 
    ? new Date(currentVitals.timestamp) 
    : (esp32Data?.timestamp ? new Date(esp32Data.timestamp) : null);
  const secondsSincePacket = lastPacketTime
    ? Math.max(0, Math.floor((Date.now() - lastPacketTime.getTime()) / 1000))
    : null;
  const isStale = secondsSincePacket !== null && secondsSincePacket > 15;

  const isRealHardware = currentVitals?.isRealHardware === true || currentVitals?.source === 'HARDWARE' || esp32Data?.isLiveHardware === true;
  const isNodeRedOnline = isRealHardware && !isStale;
  const hasHardware = isRealHardware && !isStale && (currentVitals !== null || currentRawEsp32 !== null);

  // Strict hardware-only readings with seamless sync across VITALS_UPDATE and SENSOR_DATA_UPDATE
  const liveTemp = hasHardware ? (currentVitals?.temperature ?? currentRawEsp32?.temperature ?? null) : null;
  const liveHumidity = hasHardware ? (currentVitals?.humidity ?? currentRawEsp32?.humidity ?? null) : null;
  const liveDist = hasHardware ? (currentVitals?.ultrasonicDistance ?? currentVitals?.distance ?? currentRawEsp32?.distance ?? null) : null;
  const liveForce = hasHardware ? (currentVitals?.force ?? currentVitals?.fsr ?? currentRawEsp32?.fsr ?? null) : null;

  const openStart = async () => {
    setErrorMsg('');
    try {
      const res = await api.get('/doctors/patients');
      setStudents(res.data || []);
      if (res.data?.length > 0) {
        setSelectedStudentId(res.data[0].id);
      }
      setIsStartModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStart = async (e, force = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedStudentId) return;
    try {
      await api.post('/sessions/start', {
        studentId: selectedStudentId,
        bedNumber: activeBed,
        chiefComplaint: complaint || 'Continuous hardware sensor telemetry',
        forceEndExisting: force
      });
      setIsStartModalOpen(false);
      setComplaint('');
      setErrorMsg('');
      fetchActiveSessions();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to start session');
      fetchActiveSessions();
    }
  };

  const handleEnd = async (e) => {
    e.preventDefault();
    if (!currentSession) return;
    try {
      await api.put(`/sessions/${currentSession.id}/end`, {
        summary: endSummary || 'Session concluded. Normal stability.'
      });
      setIsEndModalOpen(false);
      fetchActiveSessions();
    } catch (err) {
      alert('Failed to end session');
    }
  };

  const handleSaveThresholds = (e) => {
    e.preventDefault();
    setThresholds(tempThresholds);
    try {
      localStorage.setItem('doctor_sensor_thresholds', JSON.stringify(tempThresholds));
    } catch (e) { }
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsThresholdModalOpen(false);
    }, 1000);
  };

  const handleResetThresholds = () => {
    const defaults = {
      tempMax: 38.0,
      tempMin: 35.5,
      humidityMax: 70,
      humidityMin: 30,
      distanceMax: 90,
      distanceMin: 10,
      forceMin: 5
    };
    setTempThresholds(defaults);
    setThresholds(defaults);
    localStorage.removeItem('doctor_sensor_thresholds');
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          SECTION A: TOP STATUS & LIVE CONTROL BAR
         ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-sky-600 animate-pulse" />
            Doctor Live Hardware Telemetry Monitor
          </h2>
          <p className="text-sm text-slate-500">
            Real-time multi-channel feed from Node-RED
          </p>
        </div>

        {/* Action Controls & Bed Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setTempThresholds(thresholds);
              setIsThresholdModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition border border-slate-200/80"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            Alert Thresholds
          </button>

          {/* Bed Switcher Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveBed(1)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${activeBed === 1
                  ? 'bg-white text-sky-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <span className={`h-2 w-2 rounded-full ${bed1Vitals?.isEmergency ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`} />
              Bed 1 Unit
            </button>
            <button
              onClick={() => setActiveBed(2)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${activeBed === 2
                  ? 'bg-white text-sky-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <span className={`h-2 w-2 rounded-full ${bed2Vitals?.isEmergency ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`} />
              Bed 2 Unit
            </button>
          </div>
        </div>
      </div>

      {/* Connection & Telemetry Status Strip */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 rounded-2xl p-4 text-white border border-slate-800 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          {/* Node-RED Status Indicator */}
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${hasHardware ? 'bg-emerald-400 animate-ping' : 'bg-red-400'}`} />
            <span className="text-slate-300 font-sans font-semibold">Node-RED Stream:</span>
            <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${hasHardware
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}>
              {hasHardware ? 'ONLINE (ACTIVE)' : 'DISCONNECTED'}
            </span>
          </div>

          {/* Hardware vs Demo Badge */}
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-sans font-semibold">Data Source:</span>
            <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${hasHardware
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-slate-700 text-slate-300 border border-slate-600'
              }`}>
              {hasHardware ? 'REAL HARDWARE (Node-RED)' : 'NO SENSOR CONNECTED (NULL)'}
            </span>
          </div>

          {/* Device ID */}
          <div className="hidden md:flex items-center gap-2 text-slate-400">
            <span>Device:</span>
            <span className="text-sky-300 font-bold">{hasHardware ? (currentVitals?.deviceId || `RPI_BED_${activeBed}`) : 'DISCONNECTED'}</span>
          </div>
        </div>

        {/* Packet Timestamp & Health Indicator */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>
              Last Packet: <strong className="text-white">{hasHardware && lastPacketTime ? lastPacketTime.toLocaleTimeString() : '--:--:--'}</strong>
              {hasHardware && secondsSincePacket !== null && (
                <span className={`ml-1.5 text-[11px] ${isStale ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                  ({secondsSincePacket}s ago)
                </span>
              )}
            </span>
          </div>

          {!hasHardware ? (
            <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-500/30 font-bold text-[10px]">
              NO HARDWARE STREAM
            </span>
          ) : isStale ? (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px]">
              DATA STALE
            </span>
          ) : null}
        </div>
      </div>

      {/* =========================================================================
          SECTION B: PATIENT & ACTIVE SESSION STRIP
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-sm border border-sky-200">
            B{activeBed}
          </div>
          <div>
            {currentSession ? (
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {currentSession.student?.user?.firstName} {currentSession.student?.user?.lastName}
                  <span className="font-mono text-xs text-slate-500 ml-2 font-normal">
                    ({currentSession.student?.rollNumber})
                  </span>
                </h4>
                <p className="text-xs text-slate-500">
                  Complaint: <strong className="text-slate-700">{currentSession.chiefComplaint}</strong> &bull; Admitted {new Date(currentSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ) : (
              <div>
                <h4 className="font-bold text-emerald-700 text-sm">Bed {activeBed} Available</h4>
                <p className="text-xs text-slate-500">Ready to admit patient for continuous hardware monitoring.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {currentSession ? (
            <button
              onClick={() => {
                setEndSummary('Vitals and telemetry stabilized within thresholds.');
                setIsEndModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-xl text-xs border border-red-200 transition"
            >
              <Square className="w-3.5 h-3.5" /> End Session
            </button>
          ) : (
            <button
              onClick={openStart}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-sky-600/20 transition"
            >
              <Play className="w-3.5 h-3.5" /> Start Patient Session
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          SECTION C: 4 DEDICATED SENSOR CARDS
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* 1. Temperature Sensor Card */}
        <TemperatureSensorCard
          temperature={liveTemp}
          history={hasHardware ? currentHistory : []}
          lastUpdated={hasHardware && lastPacketTime ? lastPacketTime.toLocaleTimeString() : null}
          thresholds={{ max: thresholds.tempMax, min: thresholds.tempMin }}
          isStale={!hasHardware || isStale}
        />

        {/* 2. Humidity Sensor Card */}
        <HumiditySensorCard
          humidity={liveHumidity}
          history={hasHardware ? currentHistory : []}
          lastUpdated={hasHardware && lastPacketTime ? lastPacketTime.toLocaleTimeString() : null}
          thresholds={{ max: thresholds.humidityMax ?? 70, min: thresholds.humidityMin ?? 30 }}
          isStale={!hasHardware || isStale}
        />

        {/* 3. Ultrasonic Distance Card */}
        <UltrasonicSensorCard
          distance={liveDist}
          history={hasHardware ? currentHistory : []}
          lastUpdated={hasHardware && lastPacketTime ? lastPacketTime.toLocaleTimeString() : null}
          thresholds={{ maxDistance: thresholds.distanceMax, minDistance: thresholds.distanceMin }}
          isStale={!hasHardware || isStale}
        />

        {/* 4. Force / Pressure Sensor Card */}
        <ForceSensorCard
          force={liveForce}
          history={hasHardware ? currentHistory : []}
          lastUpdated={hasHardware && lastPacketTime ? lastPacketTime.toLocaleTimeString() : null}
          thresholds={{ minForce: thresholds.forceMin }}
          isStale={!hasHardware || isStale}
        />
      </div>

      {/* =========================================================================
          SECTION D: DYNAMIC MULTI-CHANNEL TELEMETRY CHART
         ========================================================================= */}
      <HardwareTelemetryChart
        data={hasHardware ? currentHistory : []}
        title={`Bed ${activeBed} Hardware Telemetry Stream`}
        thresholds={thresholds}
      />

      {/* =========================================================================
          MODAL: CONFIGURE SENSOR THRESHOLDS
         ========================================================================= */}
      <Modal
        isOpen={isThresholdModalOpen}
        onClose={() => setIsThresholdModalOpen(false)}
        title="Configure Hardware Alert Thresholds"
      >
        <form onSubmit={handleSaveThresholds} className="space-y-4">
          <p className="text-xs text-slate-600">
            Customize the threshold boundaries for Bed {activeBed} telemetry. When incoming readings cross these values, the relevant sensor card will highlight and emit clinical alerts.
          </p>

          {/* Temperature thresholds */}
          <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <h5 className="font-bold text-slate-800 text-xs flex items-center gap-2">
              <Thermometer className="w-3.5 h-3.5 text-amber-600" />
              Temperature Thresholds (°C)
            </h5>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-500 font-semibold mb-1">Max Temp Alert (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={tempThresholds.tempMax}
                  onChange={(e) => setTempThresholds({ ...tempThresholds, tempMax: parseFloat(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 font-semibold mb-1">Min Temp Alert (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={tempThresholds.tempMin}
                  onChange={(e) => setTempThresholds({ ...tempThresholds, tempMin: parseFloat(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Humidity thresholds */}
          <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <h5 className="font-bold text-slate-800 text-xs flex items-center gap-2">
              <Droplets className="w-3.5 h-3.5 text-cyan-600" />
              Humidity Thresholds (%)
            </h5>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-500 font-semibold mb-1">Max Humidity Alert (%)</label>
                <input
                  type="number"
                  step="1"
                  value={tempThresholds.humidityMax ?? 70}
                  onChange={(e) => setTempThresholds({ ...tempThresholds, humidityMax: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 font-semibold mb-1">Min Humidity Alert (%)</label>
                <input
                  type="number"
                  step="1"
                  value={tempThresholds.humidityMin ?? 30}
                  onChange={(e) => setTempThresholds({ ...tempThresholds, humidityMin: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Ultrasonic distance thresholds */}
          <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <h5 className="font-bold text-slate-800 text-xs flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-teal-600" />
              Ultrasonic Proximity Thresholds (cm)
            </h5>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-500 font-semibold mb-1">Out-of-Bed Max Distance (cm)</label>
                <input
                  type="number"
                  step="1"
                  value={tempThresholds.distanceMax}
                  onChange={(e) => setTempThresholds({ ...tempThresholds, distanceMax: parseFloat(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 font-semibold mb-1">Obstruction Min Distance (cm)</label>
                <input
                  type="number"
                  step="1"
                  value={tempThresholds.distanceMin}
                  onChange={(e) => setTempThresholds({ ...tempThresholds, distanceMin: parseFloat(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Force threshold */}
          <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <h5 className="font-bold text-slate-800 text-xs flex items-center gap-2">
              <Gauge className="w-3.5 h-3.5 text-indigo-600" />
              Force Sensor Threshold (N)
            </h5>
            <div className="text-xs">
              <label className="block text-[11px] text-slate-500 font-semibold mb-1">Bed Vacant Trigger Limit (&lt; N)</label>
              <input
                type="number"
                step="1"
                value={tempThresholds.forceMin}
                onChange={(e) => setTempThresholds({ ...tempThresholds, forceMin: parseFloat(e.target.value) })}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {saveSuccess && (
            <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              Thresholds successfully saved!
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleResetThresholds}
              className="px-3 py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold"
            >
              Reset to Defaults
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsThresholdModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-xs shadow-md"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: START PATIENT MONITORING SESSION
         ========================================================================= */}
      <Modal
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        title={`Start Monitoring Session on Bed ${activeBed}`}
      >
        <form onSubmit={(e) => handleStart(e, false)} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs space-y-2">
              <div className="font-semibold">{errorMsg}</div>
              <button
                type="button"
                onClick={(e) => handleStart(e, true)}
                className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition text-xs shadow-sm flex items-center justify-center gap-2"
              >
                End Existing Session & Admit Patient Now
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Student / Patient *
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.user.firstName} {s.user.lastName} ({s.rollNumber}) &bull; {s.branch}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Chief Complaint / Clinical Notes
            </label>
            <textarea
              rows={3}
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="e.g. Mild pyrexia, bed rest observation after athletic event..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsStartModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-sky-600/20"
            >
              Start Session
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: END SESSION
         ========================================================================= */}
      <Modal
        isOpen={isEndModalOpen}
        onClose={() => setIsEndModalOpen(false)}
        title={`End Session — Bed ${activeBed}`}
      >
        <form onSubmit={handleEnd} className="space-y-4">
          <p className="text-xs text-slate-600">
            Provide a closing medical summary for this patient’s visit history.
          </p>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Final Summary
            </label>
            <textarea
              rows={3}
              value={endSummary}
              onChange={(e) => setEndSummary(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEndModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs shadow-md"
            >
              End Session & Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
