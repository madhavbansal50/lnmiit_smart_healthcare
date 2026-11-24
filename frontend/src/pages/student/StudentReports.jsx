import React, { useState, useEffect } from 'react';
import { FileCheck, Upload, Download, Bot, AlertCircle, FileText, CheckCircle, ShieldAlert } from 'lucide-react';
import api from '../../services/api';

export const StudentReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const me = await api.get('/students/me');
      const studentId = me.data?.profile?.id;
      if (studentId) {
        const res = await api.get(`/reports/student/${studentId}`);
        setReports(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setUploadError('Please select a PDF file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File exceeds maximum size of 10 MB.');
      return;
    }

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    const formData = new FormData();
    formData.append('reportFile', file);
    if (title) formData.append('title', title);

    try {
      await api.post('/reports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadSuccess('Report uploaded successfully and processed by AI Summarizer!');
      setFile(null);
      setTitle('');
      setTimeout(() => {
        setUploadSuccess('');
        fetchReports();
      }, 1200);
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Failed to upload report');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Medical Diagnostic Reports & AI Summarizer
        </h2>
        <p className="text-sm text-slate-500">
          Upload PDF laboratory, radiology, or clinic reports for instant structured NLP clinical synthesis
        </p>
      </div>

      {/* Upload Box */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
          <Upload className="w-5 h-5 text-sky-600" />
          Upload New Diagnostic Report (PDF, Max 10MB)
        </h3>

        <form onSubmit={handleUpload} className="space-y-4">
          {uploadError && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold">
              {uploadError}
            </div>
          )}
          {uploadSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold">
              {uploadSuccess}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Report Title / Description</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Complete Blood Count (CBC) or Chest X-Ray"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select PDF File *</label>
              <input
                type="file"
                accept="application/pdf"
                required
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={uploading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-md shadow-sky-600/20 transition disabled:opacity-50"
            >
              {uploading ? 'Parsing & Summarizing...' : 'Upload & Analyze Report'}
            </button>
          </div>
        </form>
      </div>

      {/* Reports List */}
      <div className="space-y-5">
        <h3 className="font-bold text-slate-800 text-base">Your Processed Reports</h3>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
            No diagnostic reports uploaded yet.
          </div>
        ) : (
          reports.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-base">{r.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    File: <span className="font-mono text-slate-600">{r.fileName}</span> &bull; {Math.round(r.fileSize / 1024)} KB &bull; Uploaded {new Date(r.uploadDate).toLocaleDateString()}
                  </p>
                </div>
                <a
                  href={r.filePath}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                >
                  <Download className="w-3.5 h-3.5" /> Download Report
                </a>
              </div>

              {/* AI Structured Summary */}
              {r.summary ? (
                <div className="bg-gradient-to-br from-sky-50/60 to-white border border-sky-200/80 rounded-2xl p-5 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-sky-100 pb-2">
                    <span className="flex items-center gap-2 text-sky-800 font-bold text-xs uppercase tracking-wider">
                      <Bot className="w-4 h-4 text-sky-600" />
                      AI Diagnostic Synthesis ({r.summary.serviceStatus})
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      NLP Engine Validated
                    </span>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-slate-800 mb-1">Key Findings:</h5>
                    <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">{r.summary.keyFindings}</p>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-amber-800 mb-1">Abnormal Values Highlighted:</h5>
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 font-medium whitespace-pre-line leading-relaxed">
                      {r.summary.abnormalValues}
                    </div>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-slate-800 mb-1">Possible Clinical Concerns:</h5>
                    <p className="text-xs text-slate-700 leading-relaxed">{r.summary.possibleConcerns}</p>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-sky-900 mb-1">Questions to Ask Your Attending Doctor:</h5>
                    <div className="p-3 bg-sky-50/80 rounded-xl border border-sky-100 text-xs text-sky-950 whitespace-pre-line leading-relaxed">
                      {r.summary.questionsToAskDoctor}
                    </div>
                  </div>

                  {/* Medical Disclaimer */}
                  <div className="p-3 bg-slate-100/70 rounded-xl border border-slate-200 text-[11px] text-slate-500 italic">
                    <strong>Medical Disclaimer:</strong> {r.summary.disclaimer}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 text-slate-500 text-xs rounded-xl">
                  AI summary processing...
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
