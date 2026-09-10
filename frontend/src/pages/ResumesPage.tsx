import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Resume } from '../types';
import {
  FileText,
  UploadCloud,
  Download,
  Trash2,
  CheckCircle2,
  Eye,
  FileCheck,
  Sparkles,
  X
} from 'lucide-react';

export const ResumesPage: React.FC = () => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);

  const fetchResumes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/resumes');
      if (res.data.success) {
        setResumes(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch resumes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append('resume', file);

    setUploading(true);
    try {
      const res = await api.post('/resumes/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        fetchResumes();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload resume file.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSetPrimary = async (resumeId: string) => {
    try {
      await api.put(`/resumes/${resumeId}/primary`);
      fetchResumes();
    } catch (e) {
      alert('Failed to set primary resume.');
    }
  };

  const handleDelete = async (resumeId: string) => {
    if (!window.confirm('Are you sure you want to delete this resume?')) return;
    try {
      await api.delete(`/resumes/${resumeId}`);
      fetchResumes();
      if (selectedResume?._id === resumeId) setSelectedResume(null);
    } catch (e) {
      alert('Failed to delete resume.');
    }
  };

  const handleDownload = (resumeId: string, fileName: string) => {
    window.open(`/api/resumes/${resumeId}/download`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Resume & Version Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Store master candidate resumes, inspect extracted skills, and track customized C2C versions.
          </p>
        </div>
      </div>

      {/* Upload Box */}
      <div className="bg-white p-6 rounded-2xl border border-dashed border-slate-300 hover:border-blue-400 transition text-center shadow-sm">
        <UploadCloud className="w-10 h-10 text-blue-500 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-800">Upload Master Candidate Resume</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Supports PDF, DOCX, and plain text formats (up to 10MB). Text and key technical competencies will be automatically extracted.
        </p>

        <div className="mt-4">
          <label className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm transition">
            <span>{uploading ? 'Processing & Extracting...' : 'Select Resume File'}</span>
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Resumes List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Uploaded Resumes & Tailored Versions
          </h2>
          <span className="text-xs font-medium text-slate-500">{resumes.length} Available</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading resumes...</div>
        ) : resumes.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No resumes uploaded yet. Upload a master resume above to get started.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {resumes.map((r) => (
              <div key={r._id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition">
                <div className="flex items-start space-x-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{r.fileName}</h4>
                      {r.isPrimary && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Primary Master
                        </span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                        v{r.version} • {r.type}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-1">
                      Uploaded on {new Date(r.createdAt).toLocaleDateString()} • {(r.fileSize / 1024).toFixed(1)} KB
                    </div>

                    {/* Extracted skills snippet */}
                    {r.extractedSkills && r.extractedSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {r.extractedSkills.slice(0, 5).map((s, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                            {s}
                          </span>
                        ))}
                        {r.extractedSkills.length > 5 && (
                          <span className="text-[10px] text-slate-400">
                            +{r.extractedSkills.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-center flex-shrink-0">
                  {!r.isPrimary && (
                    <button
                      onClick={() => handleSetPrimary(r._id)}
                      className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-100 transition"
                      title="Set as candidate's primary resume"
                    >
                      Make Primary
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedResume(r)}
                    className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                    title="View Parsed Content"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDownload(r._id, r.fileName)}
                    className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded transition"
                    title="Download File"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(r._id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                    title="Delete Resume"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resume Content Inspection Modal */}
      {selectedResume && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedResume.fileName}</h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  Version {selectedResume.version} • {selectedResume.type}
                </div>
              </div>
              <button onClick={() => setSelectedResume(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Extracted Skills ({selectedResume.extractedSkills?.length || 0})
              </h4>
              <div className="flex flex-wrap gap-1 mb-3">
                {selectedResume.extractedSkills?.map((s, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <pre className="text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                {selectedResume.parsedText || 'No text extracted.'}
              </pre>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setSelectedResume(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
