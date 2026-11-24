import React, { useState, useEffect } from 'react';
import { Pill, Plus, Search, User, FileText, CheckCircle, Calendar } from 'lucide-react';
import api from '../../services/api';
import { Modal } from '../../components/common/Modal';

export const DoctorPrescriptions = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { medicineName: 'Paracetamol', dosage: '650 mg', frequency: 'Twice daily', duration: '3 days', instructions: 'Take after meals' }
  ]);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const res = await api.get('/doctors/patients');
      setPatients(res.data || []);
      if (res.data?.length > 0) {
        setSelectedStudentId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleAddRow = () => {
    setItems([
      ...items,
      { medicineName: '', dosage: '', frequency: 'Twice daily', duration: '3 days', instructions: 'Take after meals' }
    ]);
  };

  const handleRemoveRow = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/prescriptions', {
        studentId: selectedStudentId,
        diagnosis,
        notes,
        items
      });
      setSuccessMsg('Prescription successfully created and dispatched to student portal!');
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMsg('');
        setDiagnosis('');
        setNotes('');
        fetchPatients();
      }, 1200);
    } catch (err) {
      alert('Failed to issue prescription');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Digital Prescription Management
          </h2>
          <p className="text-sm text-slate-500">
            Issue and audit digital medical prescriptions with dosage, frequency, and instructions
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md shadow-sky-600/20 transition"
        >
          <Plus className="w-4 h-4" /> Issue New Prescription
        </button>
      </div>

      {/* Patients with active prescriptions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {patients.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{p.user.firstName} {p.user.lastName}</h4>
                <p className="text-xs text-slate-400 font-mono">{p.rollNumber} &bull; {p.branch}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedStudentId(p.id);
                  setIsModalOpen(true);
                }}
                className="px-3 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold rounded-lg text-xs"
              >
                + Prescribe
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <div><strong>Allergies:</strong> {p.allergies || 'None reported'}</div>
              <div><strong>Chronic:</strong> {p.chronicConditions || 'None reported'}</div>
              <div><strong>Total Historical Prescriptions:</strong> {p._count?.prescriptions || 0}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Issue Digital Prescription" maxWidth="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {successMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold">
              {successMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Student *</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.user.firstName} {p.user.lastName} ({p.rollNumber})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Diagnosis / Indication</label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g. Viral Pharyngitis"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700">Prescription Medicines *</label>
              <button
                type="button"
                onClick={handleAddRow}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700"
              >
                + Add Medication
              </button>
            </div>
            <div className="space-y-2.5 max-h-60 overflow-y-auto">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs items-center">
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Medicine Name"
                      required
                      value={item.medicineName}
                      onChange={(e) => handleItemChange(idx, 'medicineName', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Dosage"
                      required
                      value={item.dosage}
                      onChange={(e) => handleItemChange(idx, 'dosage', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Frequency"
                      required
                      value={item.frequency}
                      onChange={(e) => handleItemChange(idx, 'frequency', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Duration"
                      required
                      value={item.duration}
                      onChange={(e) => handleItemChange(idx, 'duration', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Instructions"
                      value={item.instructions}
                      onChange={(e) => handleItemChange(idx, 'instructions', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="text-red-500 hover:text-red-700 text-sm font-bold"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-sky-600/20"
            >
              Issue Digital Prescription
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
