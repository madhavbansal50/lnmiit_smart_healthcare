import React, { useState, useEffect } from 'react';
import { Pill, User, Calendar, FileText, CheckCircle, Printer } from 'lucide-react';
import api from '../../services/api';

export const StudentPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const me = await api.get('/students/me');
      const studentId = me.data?.profile?.id;
      if (studentId) {
        const res = await api.get(`/prescriptions/student/${studentId}`);
        setPrescriptions(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            My Digital Medical Prescriptions
          </h2>
          <p className="text-sm text-slate-500">
            Official prescriptions issued by LNMIIT campus clinic medical officers
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
        >
          <Printer className="w-3.5 h-3.5" /> Print Prescriptions
        </button>
      </div>

      <div className="space-y-5">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading prescriptions...</div>
        ) : prescriptions.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
            No active prescriptions issued yet.
          </div>
        ) : (
          prescriptions.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold border border-sky-100">
                    <Pill className="w-5 h-5 text-sky-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      Prescription #{p.id.slice(0, 8).toUpperCase()}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Prescribed by <strong>Dr. {p.doctor?.user?.firstName} {p.doctor?.user?.lastName}</strong> ({p.doctor?.specialization})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {p.status}
                  </span>
                </div>
              </div>

              {p.diagnosis && (
                <div className="text-xs text-slate-700">
                  <strong className="text-slate-900">Diagnosis / Indication:</strong> {p.diagnosis}
                </div>
              )}

              {/* Medication Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Medication</th>
                      <th className="py-2.5 px-3">Dosage</th>
                      <th className="py-2.5 px-3">Frequency</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {p.items?.map((it) => (
                      <tr key={it.id} className="text-slate-700">
                        <td className="py-3 px-3 font-bold text-slate-900">{it.medicineName}</td>
                        <td className="py-3 px-3 font-semibold text-slate-700">{it.dosage}</td>
                        <td className="py-3 px-3 text-slate-600">{it.frequency}</td>
                        <td className="py-3 px-3 text-slate-600">{it.duration}</td>
                        <td className="py-3 px-3 text-slate-500 italic">{it.instructions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {p.notes && (
                <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <strong>Doctor Advice:</strong> {p.notes}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
