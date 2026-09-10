import React, { useState } from 'react';
import { api } from '../services/api';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Download,
  Check,
  X,
  FileCheck
} from 'lucide-react';

export const CsvManagerPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setPreviewData(null);
    setImportResult(null);

    const form = new FormData();
    form.append('file', selected);

    setPreviewing(true);
    try {
      const res = await api.post('/csv/preview', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setPreviewData(res.data.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to parse CSV file.');
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!previewData || !previewData.rows) return;

    setImporting(true);
    try {
      const res = await api.post('/csv/import', {
        rows: previewData.rows,
        createJobs: true
      });
      if (res.data.success) {
        setImportResult(res.data.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to import CSV records.');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = (type: 'recruiters' | 'jobs') => {
    window.open(
      `${import.meta.env.VITE_API_BASE_URL}/csv/export?type=${type}`,
      '_blank'
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            CSV Manager & Bulk Lead Importer
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Validate, deduplicate, and import bulk recruiter and job records with zero duplicate pollution.
          </p>
        </div>
        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button
            onClick={() => handleExport('recruiters')}
            className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Export Recruiters
          </button>
          <button
            onClick={() => handleExport('jobs')}
            className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Export Jobs
          </button>
        </div>
      </div>

      {/* Upload & Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-dashed border-slate-300 hover:border-blue-400 transition text-center shadow-sm">
          <UploadCloud className="w-10 h-10 text-blue-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">Upload Outreach CSV File</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Drag & drop or select your CSV. Our validator will normalize email addresses, check for existing recruiters in the database, and detect duplicates.
          </p>

          <div className="mt-4">
            <label className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm transition">
              <span>{previewing ? 'Parsing & Validating...' : 'Select CSV File'}</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={previewing}
                className="hidden"
              />
            </label>
          </div>
          {file && (
            <div className="mt-2 text-xs font-medium text-slate-600">
              Selected: <span className="font-semibold">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
            </div>
          )}
        </div>

        {/* Column Specs */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
            Supported CSV Columns:
          </h4>
          <ul className="space-y-1 text-[11px] list-disc pl-4 text-slate-600">
            <li><strong className="text-slate-800">Recruiter Name</strong> (or Name)</li>
            <li><strong className="text-slate-800">Company</strong></li>
            <li><strong className="text-slate-800">Email</strong> (normalized lowercase)</li>
            <li><strong>Job Title</strong> (or Role)</li>
            <li><strong>Location</strong> (USA state / remote)</li>
            <li><strong>Job URL</strong> (LinkedIn / posting link)</li>
            <li><strong>C2C</strong> (YES, NO, or open)</li>
            <li><strong>Skills</strong> (Comma separated)</li>
          </ul>
        </div>
      </div>

      {/* Validation Summary Cards */}
      {previewData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
              <div className="text-2xl font-bold text-slate-900">{previewData.totalRows}</div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase mt-1">Total Rows</div>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-center">
              <div className="text-2xl font-bold text-emerald-700">{previewData.validCount}</div>
              <div className="text-[11px] font-semibold text-emerald-600 uppercase mt-1">Valid & New</div>
            </div>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-center">
              <div className="text-2xl font-bold text-amber-700">{previewData.duplicateCount}</div>
              <div className="text-[11px] font-semibold text-amber-600 uppercase mt-1">Duplicates Blocked</div>
            </div>
            <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 text-center">
              <div className="text-2xl font-bold text-rose-700">{previewData.invalidCount}</div>
              <div className="text-[11px] font-semibold text-rose-600 uppercase mt-1">Missing Info</div>
            </div>
          </div>

          {/* Import Commit Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="text-xs text-slate-600">
              Ready to import <strong className="text-slate-900">{previewData.validCount}</strong> valid recruiter records and create matching C2C job cards.
            </div>
            <button
              onClick={handleImport}
              disabled={importing || previewData.validCount === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              {importing ? 'Importing...' : `Import ${previewData.validCount} Valid Records`}
            </button>
          </div>

          {importResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>
                Successfully imported {importResult.importedRecruiters} recruiters and {importResult.importedJobs} C2C jobs into database!
              </span>
            </div>
          )}

          {/* Preview Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
              CSV Rows Inspection Preview
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Recruiter Name</th>
                    <th className="py-2.5 px-3">Company</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Job Title</th>
                    <th className="py-2.5 px-3">Validation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewData.rows.map((r: any, idx: number) => {
                    const isOk = r.isValid && !r.isDuplicate;

                    return (
                      <tr key={idx} className={isOk ? 'hover:bg-slate-50' : 'bg-rose-50/30'}>
                        <td className="py-2 px-3 text-slate-400 font-mono text-[10px]">{r.rowNumber}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{r.name || '—'}</td>
                        <td className="py-2 px-3 text-slate-700">{r.company || '—'}</td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{r.email || '—'}</td>
                        <td className="py-2 px-3 text-slate-600">{r.jobTitle || '—'}</td>
                        <td className="py-2 px-3">
                          {isOk ? (
                            <span className="inline-flex items-center text-emerald-700 font-semibold text-[11px]">
                              <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Valid
                            </span>
                          ) : r.isDuplicate ? (
                            <span className="inline-flex items-center text-amber-700 font-semibold text-[11px]">
                              <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" /> Duplicate
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-rose-700 font-semibold text-[11px]">
                              <X className="w-3.5 h-3.5 mr-1 text-rose-600" /> Missing {r.missingFields?.join(', ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
