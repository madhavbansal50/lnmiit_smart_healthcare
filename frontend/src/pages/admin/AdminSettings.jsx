import React, { useState, useEffect } from 'react';
import { Settings, Plus, ShieldAlert, Heart, Activity, Thermometer, Check } from 'lucide-react';
import api from '../../services/api';
import { Modal } from '../../components/common/Modal';

export const AdminSettings = () => {
  const [specializations, setSpecializations] = useState([]);
  const [isAddSpecOpen, setIsAddSpecOpen] = useState(false);
  const [specName, setSpecName] = useState('');
  const [specDesc, setSpecDesc] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchSpecs = async () => {
    try {
      const res = await api.get('/admin/specializations');
      setSpecializations(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSpecs();
  }, []);

  const handleAddSpec = async (e) => {
    e.preventDefault();
    if (!specName) return;

    try {
      await api.post('/admin/specializations', { name: specName, description: specDesc });
      setSuccessMsg('Specialization added successfully!');
      setSpecName('');
      setSpecDesc('');
      setTimeout(() => {
        setIsAddSpecOpen(false);
        setSuccessMsg('');
        fetchSpecs();
      }, 1000);
    } catch (err) {
      alert('Failed to add specialization');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          System & Clinic Configurations
        </h2>
        <p className="text-sm text-slate-500">
          Manage clinical thresholds, medical domains, and hospital triage parameters
        </p>
      </div>

      {/* Emergency Threshold Reference */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          Campus Medical Emergency Thresholds (Configured in Risk Engine)
        </div>
        <p className="text-xs text-slate-500">
          When continuous vitals exceed these parameters, an immediate <span className="text-red-600 font-bold">EMERGENCY_ALERT</span> event is broadcast via Socket.IO to attending doctors.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-red-50/60 border border-red-200">
            <div className="flex items-center gap-2 text-red-700 font-bold text-xs uppercase mb-1">
              <Heart className="w-4 h-4" /> Heart Rate Limits
            </div>
            <div className="text-sm text-slate-800 font-medium">
              &gt; <strong>150 BPM</strong> (Severe Tachycardia)
            </div>
            <div className="text-sm text-slate-800 font-medium">
              &lt; <strong>40 BPM</strong> (Severe Bradycardia)
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Sensor: MAX30102</div>
          </div>

          <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200">
            <div className="flex items-center gap-2 text-sky-700 font-bold text-xs uppercase mb-1">
              <Activity className="w-4 h-4" /> Blood SpO₂ Critical Floor
            </div>
            <div className="text-sm text-slate-800 font-medium">
              &lt; <strong>90.0%</strong> (Severe Hypoxemia)
            </div>
            <div className="text-sm text-slate-800 font-medium">
              &lt; 94.0% triggers Attention risk
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Sensor: MAX30102</div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
            <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase mb-1">
              <Thermometer className="w-4 h-4" /> Hyperpyrexia Threshold
            </div>
            <div className="text-sm text-slate-800 font-medium">
              &gt; <strong>39.4°C</strong> (102.9°F High Pyrexia)
            </div>
            <div className="text-sm text-slate-800 font-medium">
              &gt; 38.0°C triggers Attention risk
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Sensor: LM35</div>
          </div>
        </div>
      </div>

      {/* Specializations Management */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Doctor Specializations / Medical Domains</h3>
            <p className="text-xs text-slate-500">Domains available when onboarding doctors and triaging student appointments</p>
          </div>
          <button
            onClick={() => setIsAddSpecOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-xs transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Add Specialization
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          {specializations.map((s) => (
            <div key={s.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="font-bold text-slate-800 text-xs">{s.name}</h4>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{s.description || 'Campus clinic domain'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Add Specialization Modal */}
      <Modal isOpen={isAddSpecOpen} onClose={() => setIsAddSpecOpen(false)} title="Add Medical Specialization">
        <form onSubmit={handleAddSpec} className="space-y-4">
          {successMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold">
              {successMsg}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Specialization Name *</label>
            <input
              type="text"
              required
              value={specName}
              onChange={(e) => setSpecName(e.target.value)}
              placeholder="e.g. Ophthalmology, Sports Medicine"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description / Focus Area</label>
            <textarea
              rows={2}
              value={specDesc}
              onChange={(e) => setSpecDesc(e.target.value)}
              placeholder="Brief description of clinical scope..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddSpecOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-xl text-xs shadow-md"
            >
              Save Specialization
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
