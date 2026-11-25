import React, { useState, useEffect } from 'react';
import {
  Activity,
  Thermometer,
  Droplets,
  Radio,
  Gauge,
  Clock,
  User,
  ShieldCheck,
  AlertTriangle,
  Stethoscope,
  Info,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVitals } from '../../context/VitalsContext';
import {
  TemperatureSensorCard,
  HumiditySensorCard,
  UltrasonicSensorCard,
  ForceSensorCard
} from '../../components/common/HardwareSensorCards';
import { HardwareTelemetryChart } from '../../components/charts/HardwareTelemetryChart';
import api from '../../services/api';

export const StudentLiveMonitoring = () => {
  const { user } = useAuth();
  const {
    assignedBed: socketAssignedBed,
    bed1Vitals,
    bed2Vitals,
    bed1History,
    bed2History,
    esp32Data
  } = useVitals();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Default sensor thresholds matching clinic standards
  const thresholds = {
    tempMax: 38.0,
    tempMin: 35.5,
    humidityMax: 70,
    humidityMin: 30,
    distanceMax: 90,
    distanceMin: 10,
    forceMin: 5
  };

  const fetchMyActiveSession = async () => {
    try {
      setLoading(true);
      const res = await api.get('/sessions/my-active');
      setSession(res.data || null);
    } catch (err) {
      console.error('Error fetching student active session:', err);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyActiveSession();
    const interval = setInterval(fetchMyActiveSession, 6000);
    return () => clearInterval(interval);
  }, []);

  // Determine assigned bed: prioritized from active session, fallback to socketAssignedBed
  const assignedBed = session?.bedNumber || socketAssignedBed || null;
  const isAdmitted = assignedBed !== null && session !== null;

  // Retrieve vitals strictly for the assigned bed (only the assigned bed is populated for students by backend)
  const currentVitals = assignedBed === 1 ? bed1Vitals : assignedBed === 2 ? bed2Vitals : null;
  const currentHistory = assignedBed === 1 ? bed1History : assignedBed === 2 ? bed2History : [];
  const currentRawEsp32 = assignedBed === 1 ? esp32Data?.esp32_1 : assignedBed === 2 ? esp32Data?.esp32_2 : null;

  // Stale packet detection (> 15 seconds)
  const lastPacketTime = currentVitals?.timestamp 
    ? new Date(currentVitals.timestamp) 
    : (esp32Data?.timestamp ? new Date(esp32Data.timestamp) : null);
  const secondsSincePacket = lastPacketTime
    ? Math.max(0, Math.floor((Date.now() - lastPacketTime.getTime()) / 1000))
    : null;
  const isStale = secondsSincePacket !== null && secondsSincePacket > 15;

  const isRealHardware = currentVitals?.isRealHardware === true || currentVitals?.source === 'HARDWARE' || esp32Data?.isLiveHardware === true;
  const hasHardware = isRealHardware && !isStale && (currentVitals !== null || currentRawEsp32 !== null);

  // Sensor values strictly derived from live hardware with fallback across telemetry channels
  const liveTemp = hasHardware ? (currentVitals?.temperature ?? currentRawEsp32?.temperature ?? null) : null;
  const liveHumidity = hasHardware ? (currentVitals?.humidity ?? currentRawEsp32?.humidity ?? null) : null;
  const liveDist = hasHardware ? (currentVitals?.ultrasonicDistance ?? currentVitals?.distance ?? currentRawEsp32?.distance ?? null) : null;
  const liveForce = hasHardware ? (currentVitals?.force ?? currentVitals?.fsr ?? currentRawEsp32?.fsr ?? null) : null;

  return (
    <div className="space-y-6">
      {/* =========================================================================
          SECTION 1: PAGE HEADER
         ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Stethoscope className="w-6 h-6 text-sky-600 animate-pulse" />
            My Live Patient Telemetry
          </h2>
          <p className="text-sm text-slate-500">
            Real-time physiological sensor feed streamed securely from your assigned clinic bed
          </p>
        </div>

        {isAdmitted && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-bold text-emerald-800">
              Active on Bed {assignedBed} Unit
            </span>
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 2: CONNECTION & HARDWARE STATUS STRIP
         ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 rounded-2xl p-4 text-white border border-slate-800 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          {/* Node-RED Stream Status */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                hasHardware ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-300 font-sans font-semibold">Sensor Stream:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                hasHardware
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {hasHardware ? 'ONLINE (ACTIVE)' : isAdmitted ? 'AWAITING SENSOR PACKETS' : 'DISCONNECTED'}
            </span>
          </div>

          {/* Data Source Badge */}
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-sans font-semibold">Data Pipeline:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                hasHardware
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-700 text-slate-300 border border-slate-600'
              }`}
            >
              {hasHardware ? 'REAL HARDWARE (Node-RED)' : 'NO HARDWARE STREAM'}
            </span>
          </div>

          {/* Assigned Unit Badge */}
          {isAdmitted && (
            <div className="hidden sm:flex items-center gap-2 text-slate-400">
              <span>Unit:</span>
              <span className="text-sky-300 font-bold">Bed {assignedBed} Sensor Node</span>
            </div>
          )}
        </div>

        {/* Packet Timestamp & Health Indicator */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>
              Last Packet:{' '}
              <strong className="text-white">
                {hasHardware && lastPacketTime ? lastPacketTime.toLocaleTimeString() : '--:--:--'}
              </strong>
              {hasHardware && secondsSincePacket !== null && (
                <span className={`ml-1.5 text-[11px] ${isStale ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                  ({secondsSincePacket}s ago)
                </span>
              )}
            </span>
          </div>

          {!hasHardware && isAdmitted ? (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px]">
              AWAITING HARDWARE STREAM
            </span>
          ) : isStale ? (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px]">
              DATA STALE
            </span>
          ) : null}
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: PATIENT & ASSIGNED BED DETAILS CARD
         ========================================================================= */}
      {isAdmitted ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center font-extrabold text-base border border-sky-200">
                B{assignedBed}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-base">
                    {user?.firstName} {user?.lastName}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    ADMITTED &bull; BED {assignedBed}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Roll: {user?.studentProfile?.rollNumber || session.student?.rollNumber || 'N/A'} &bull;{' '}
                  {user?.studentProfile?.branch || session.student?.branch || 'Campus Student'}
                </p>
              </div>
            </div>

            <div className="text-right text-xs">
              <p className="text-slate-400">Admitting Physician:</p>
              <p className="font-bold text-slate-800">
                {session.doctor?.user?.firstName
                  ? `Dr. ${session.doctor.user.firstName} ${session.doctor.user.lastName}`
                  : 'Campus Medical Officer'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 pt-1">
            <div>
              <span className="text-slate-400 block font-semibold">Chief Indication / Reason:</span>
              <span className="font-medium text-slate-800">
                {session.chiefComplaint || 'Continuous physiological monitoring'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold">Admission Time:</span>
              <span className="font-medium text-slate-800">
                {new Date(session.startTime).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold">Triage Risk Assessment:</span>
              <span
                className={`font-bold inline-block px-2 py-0.5 rounded-md text-[11px] mt-0.5 ${
                  session.peakRiskLevel === 'EMERGENCY'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : session.peakRiskLevel === 'ATTENTION'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {session.peakRiskLevel || 'NORMAL'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Not admitted notice */
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto border border-sky-100">
            <Info className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">No Active Clinical Bed Session</h3>
            <p className="text-xs text-slate-500 max-w-lg mx-auto mt-1 leading-relaxed">
              You are not currently admitted to an active monitoring bed in the campus clinic. When a campus medical officer admits you to a bed for continuous observation, your live hardware sensor telemetry will automatically stream here.
            </p>
          </div>
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
              Sensor telemetry is strictly role-isolated to protect patient privacy
            </span>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 4: 4 DEDICATED HARDWARE SENSOR CARDS
          (Exact same components, gauges, thresholds and card UI used by doctors)
         ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Gauge className="w-4 h-4 text-sky-600" />
            Physiological & Telemetry Sensors
          </h3>
          <span className="text-xs text-slate-400">
            {isAdmitted ? `Assigned Bed ${assignedBed} Stream` : 'Awaiting Admission'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* 1. Temperature Sensor Card (LM35) */}
          <TemperatureSensorCard
            temperature={liveTemp}
            history={hasHardware ? currentHistory : []}
            lastUpdated={hasHardware && lastPacketTime ? lastPacketTime.toLocaleTimeString() : null}
            thresholds={{ max: thresholds.tempMax, min: thresholds.tempMin }}
            isStale={!hasHardware || isStale}
          />

          {/* 2. Humidity Sensor Card (DHT) */}
          <HumiditySensorCard
            humidity={liveHumidity}
            history={hasHardware ? currentHistory : []}
            lastUpdated={hasHardware && lastPacketTime ? lastPacketTime.toLocaleTimeString() : null}
            thresholds={{ max: thresholds.humidityMax, min: thresholds.humidityMin }}
            isStale={!hasHardware || isStale}
          />

          {/* 3. Ultrasonic Distance Card (HC-SR04) */}
          <UltrasonicSensorCard
            distance={liveDist}
            history={hasHardware ? currentHistory : []}
            lastUpdated={hasHardware && lastPacketTime ? lastPacketTime.toLocaleTimeString() : null}
            thresholds={{ maxDistance: thresholds.distanceMax, minDistance: thresholds.distanceMin }}
            isStale={!hasHardware || isStale}
          />

          {/* 4. Force / Pressure Sensor Card (FSR) */}
          <ForceSensorCard
            force={liveForce}
            history={hasHardware ? currentHistory : []}
            lastUpdated={hasHardware && lastPacketTime ? lastPacketTime.toLocaleTimeString() : null}
            thresholds={{ minForce: thresholds.forceMin }}
            isStale={!hasHardware || isStale}
          />
        </div>
      </div>

      {/* =========================================================================
          SECTION 5: REAL-TIME MULTI-CHANNEL TELEMETRY CHART
         ========================================================================= */}
      <HardwareTelemetryChart
        data={hasHardware ? currentHistory : []}
        title={isAdmitted ? `Bed ${assignedBed} Hardware Telemetry Stream` : 'Hardware Telemetry Stream'}
        thresholds={thresholds}
      />
    </div>
  );
};
