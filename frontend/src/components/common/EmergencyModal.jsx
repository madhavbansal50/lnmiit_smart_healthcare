import React from 'react';
import { AlertTriangle, Heart, Activity, Thermometer, CheckCircle, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useVitals } from '../../context/VitalsContext';

export const EmergencyModal = () => {
  const { currentEmergencyAlert, dismissEmergencyModal, acknowledgeAlert } = useVitals();
  const navigate = useNavigate();

  if (!currentEmergencyAlert) return null;

  const { id, bedNumber, studentName, rollNumber, vitals, explanation, sessionId } = currentEmergencyAlert;

  const handleViewPatient = () => {
    dismissEmergencyModal();
    if (sessionId) {
      navigate(`/doctor/monitoring?bed=${bedNumber}`);
    } else {
      navigate('/doctor/patients');
    }
  };

  const handleAcknowledge = () => {
    acknowledgeAlert(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/70 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border-2 border-red-500 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Emergency Beacon Bar */}
        <div className="bg-red-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-700 rounded-lg animate-pulse">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider font-extrabold text-red-200">
                CRITICAL EMERGENCY ALERT
              </div>
              <h3 className="text-lg font-bold">
                Bed {bedNumber} — {studentName || 'Student Patient'}
              </h3>
            </div>
          </div>
          <button
            onClick={dismissEmergencyModal}
            className="p-1.5 text-red-200 hover:text-white hover:bg-red-700 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between text-sm text-slate-600 bg-red-50 p-3 rounded-xl border border-red-100">
            <div>
              <span className="font-semibold text-slate-700">Patient:</span> {studentName} ({rollNumber})
            </div>
            <div>
              <span className="font-semibold text-slate-700">Location:</span> Bed {bedNumber} Sensor Box
            </div>
          </div>

          {/* Vitals Snapshot */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                <Heart className="w-4 h-4 text-rose-500" /> Pulse
              </div>
              <div className={`text-2xl font-bold font-mono ${vitals?.heartRate > 150 || vitals?.heartRate < 40 ? 'text-red-600' : 'text-slate-800'}`}>
                {vitals?.heartRate ? vitals.heartRate.toFixed(0) : '--'}
                <span className="text-xs font-normal text-slate-500 ml-1">BPM</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                <Activity className="w-4 h-4 text-sky-500" /> SpO₂
              </div>
              <div className={`text-2xl font-bold font-mono ${vitals?.spo2 < 90 ? 'text-red-600' : 'text-slate-800'}`}>
                {vitals?.spo2 ? vitals.spo2.toFixed(1) : '--'}
                <span className="text-xs font-normal text-slate-500 ml-1">%</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                <Thermometer className="w-4 h-4 text-amber-500" /> Temp
              </div>
              <div className={`text-2xl font-bold font-mono ${vitals?.temperature > 39.4 ? 'text-red-600' : 'text-slate-800'}`}>
                {vitals?.temperature ? vitals.temperature.toFixed(1) : '--'}
                <span className="text-xs font-normal text-slate-500 ml-1">°C</span>
              </div>
            </div>
          </div>

          {/* Clinical Trigger Reason */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-1">
              Automated Risk Engine Trigger
            </h4>
            <p className="text-sm text-amber-950 font-medium">
              {explanation}
            </p>
          </div>

          {/* Medical Disclaimer */}
          <p className="text-xs text-slate-400 italic text-center">
            Automated sensor alert generated via LNMIIT IoT edge thresholds. Does not replace physical physician evaluation.
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleAcknowledge}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition text-sm"
            >
              <CheckCircle className="w-4 h-4" /> Acknowledge Alert
            </button>
            <button
              onClick={handleViewPatient}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg shadow-red-600/20 transition text-sm"
            >
              View Live Patient <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
