import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Resume, Job } from '../types';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Briefcase,
  ArrowRight,
  Download,
  Copy,
  Mail,
  RefreshCw,
  Send,
  ShieldCheck,
  X
} from 'lucide-react';

export const AIMatcherPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Customized resume generation modal
  const [customizing, setCustomizing] = useState(false);
  const [customizedData, setCustomizedData] = useState<any>(null);
  const [customizedModalOpen, setCustomizedModalOpen] = useState(false);

  // Email generation modal
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailData, setEmailData] = useState<{ subject: string; body: string }>({ subject: '', body: '' });
  const [duplicateCheck, setDuplicateCheck] = useState<any>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [resumesRes, jobsRes] = await Promise.all([
          api.get('/resumes'),
          api.get('/jobs?limit=100')
        ]);

        if (resumesRes.data.success) {
          const resList: Resume[] = resumesRes.data.data;
          setResumes(resList);
          const primary = resList.find((r) => r.isPrimary) || resList[0];
          if (primary) setSelectedResumeId(primary._id);
        }

        if (jobsRes.data.success) {
          const jobList: Job[] = jobsRes.data.data.jobs;
          setJobs(jobList);

          // Check if jobId passed in navigation state
          const stateJobId = (location.state as any)?.jobId;
          if (stateJobId) {
            setSelectedJobId(stateJobId);
          } else if (jobList.length > 0) {
            setSelectedJobId(jobList[0]._id);
          }
        }
      } catch (e) {
        console.error('Failed to load initial matcher data:', e);
      }
    };
    loadInitialData();
  }, [location.state]);

  const handleAnalyzeMatch = async () => {
    if (!selectedResumeId || !selectedJobId) {
      alert('Please select both a resume and a target job.');
      return;
    }

    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      const res = await api.post('/ai/analyze-match', {
        resumeId: selectedResumeId,
        jobId: selectedJobId
      });
      if (res.data.success) {
        setAnalysisResult(res.data.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error analyzing resume match.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateCustomizedResume = async () => {
    if (!selectedResumeId || !selectedJobId) return;

    setCustomizing(true);
    try {
      const res = await api.post('/ai/customize-resume', {
        resumeId: selectedResumeId,
        jobId: selectedJobId,
        saveAsVersion: true
      });
      if (res.data.success) {
        setCustomizedData(res.data.data);
        setCustomizedModalOpen(true);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate tailored resume.');
    } finally {
      setCustomizing(false);
    }
  };

  const handleOpenEmailGenerator = async () => {
    if (!selectedJobId) return;

    setGeneratingEmail(true);
    const targetJob = jobs.find((j) => j._id === selectedJobId);

    try {
      const res = await api.post('/ai/generate-email', {
        jobId: selectedJobId,
        recruiterId: targetJob?.recruiterId?._id || targetJob?.recruiterId
      });

      if (res.data.success) {
        setEmailData(res.data.data);
        setEmailModalOpen(true);

        // Pre-run duplicate check
        const recruiterEmail = targetJob?.recruiterId?.email || '';
        if (recruiterEmail) {
          const dupRes = await api.post('/outreach/check-duplicate', {
            recipientEmail: recruiterEmail,
            jobId: selectedJobId,
            recruiterId: targetJob?.recruiterId?._id || targetJob?.recruiterId
          });
          if (dupRes.data.success) {
            setDuplicateCheck(dupRes.data.data);
          }
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate outreach email.');
    } finally {
      setGeneratingEmail(false);
    }
  };

  const handleSendOutreachFromModal = async () => {
    const targetJob = jobs.find((j) => j._id === selectedJobId);
    const recipientEmail = targetJob?.recruiterId?.email;
    const recruiterId = targetJob?.recruiterId?._id || targetJob?.recruiterId;

    if (!recipientEmail || !recruiterId) {
      alert('This job does not have an associated recruiter with a verified email address. Please assign a recruiter to this job first.');
      return;
    }

    if (duplicateCheck?.isDuplicate) {
      alert(`Outreach blocked by duplicate prevention: ${duplicateCheck.reason}`);
      return;
    }

    setSendingEmail(true);
    try {
      const res = await api.post('/outreach/send', {
        recruiterId,
        jobId: selectedJobId,
        recipientEmail,
        subject: emailData.subject,
        body: emailData.body,
        attachmentId: selectedResumeId
      });

      if (res.data.success) {
        alert('Outreach email sent and follow-ups scheduled successfully!');
        setEmailModalOpen(false);
        navigate('/outreach');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to dispatch outreach email.');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-600" />
            AI Resume Matcher & Alignment Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Truthful, non-hallucinatory keyword alignment, gap analysis, and tailored C2C resume generation.
          </p>
        </div>
      </div>

      {/* Select Controls Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" />
              Select Candidate Resume
            </label>
            <select
              value={selectedResumeId}
              onChange={(e) => setSelectedResumeId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white font-medium text-slate-800"
            >
              {resumes.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.fileName} (v{r.version} • {r.type} {r.isPrimary ? '• Primary' : ''})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-blue-600" />
              Select Target Job Opportunity
            </label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white font-medium text-slate-800"
            >
              {jobs.map((j) => (
                <option key={j._id} value={j._id}>
                  {j.title} @ {j.company} [C2C: {j.c2cStatus}]
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleAnalyzeMatch}
            disabled={analyzing || !selectedResumeId || !selectedJobId}
            className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Match Against Job Requirements...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze Match
              </>
            )}
          </button>
        </div>
      </div>

      {/* Analysis Results Display */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Match Score Banner */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-6">
              {/* Radial / Score Pill */}
              <div className="relative w-24 h-24 flex items-center justify-center rounded-full bg-blue-50 border-4 border-blue-500 text-blue-700">
                <span className="text-2xl font-black">{analysisResult.analysis.matchScore}%</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Target Alignment Score
                </span>
                <h2 className="text-lg font-bold text-slate-900">
                  {analysisResult.job.title} at {analysisResult.job.company}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Resume: <span className="font-semibold text-slate-700">{analysisResult.resume.fileName}</span>
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    C2C: {analysisResult.job.c2cStatus}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    USA: {analysisResult.job.isUSA ? 'Verified' : 'Review'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
              <button
                onClick={handleGenerateCustomizedResume}
                disabled={customizing}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center justify-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                <span>{customizing ? 'Generating...' : 'Generate Customized Resume'}</span>
              </button>

              <button
                onClick={handleOpenEmailGenerator}
                disabled={generatingEmail}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center justify-center gap-1.5"
              >
                <Mail className="w-4 h-4" />
                <span>{generatingEmail ? 'Drafting...' : 'Generate AI Outreach Email'}</span>
              </button>
            </div>
          </div>

          {/* Matched vs Missing Skills Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Matched Skills */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Matched Skills & Technologies ({analysisResult.analysis.matchedSkills.length})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {analysisResult.analysis.matchedSkills.map((s: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                  >
                    ✓ {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Missing or Weak Skills */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-3 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Missing or Unmatched Job Keywords ({analysisResult.analysis.missingSkills.length})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {analysisResult.analysis.missingSkills.length > 0 ? (
                  analysisResult.analysis.missingSkills.map((s: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                    >
                      ! {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">
                    Excellent alignment! No prominent missing skills identified.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Recommendations & Truthfulness Guarantee */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                Relevant Experience Alignment
              </h3>
              <ul className="space-y-2 text-xs text-slate-600">
                {analysisResult.analysis.relevantExperience.map((item: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                Truthful Alignment Recommendations
              </h3>
              <ul className="space-y-2 text-xs text-slate-600">
                {analysisResult.analysis.potentialImprovements.map((item: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2 text-[11px] text-slate-600">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  Strict Non-Hallucination Guard active: Never fabricates companies, degrees, or unverified skills.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customized Resume Comparison Modal */}
      {customizedModalOpen && customizedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  Customized Version Generated
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Side-by-Side Truthful Resume Comparison
                </h3>
              </div>
              <button onClick={() => setCustomizedModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Change Log */}
            <div className="my-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-900">
              <div className="font-bold mb-1">Applied Truthful Refinements:</div>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                {customizedData.customized.changeLog?.map((change: string, idx: number) => (
                  <li key={idx}>{change}</li>
                ))}
              </ul>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto min-h-[300px]">
              {/* Original */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-col">
                <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">Original Resume</h4>
                <div className="flex-1 overflow-y-auto text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed bg-white p-3 rounded border border-slate-200">
                  {customizedData.originalText}
                </div>
              </div>

              {/* Customized */}
              <div className="border border-emerald-200 rounded-xl p-3 bg-emerald-50/40 flex flex-col">
                <h4 className="text-xs font-bold text-emerald-700 uppercase mb-2">
                  Tailored C2C Resume (Target-Aligned)
                </h4>
                <div className="flex-1 overflow-y-auto text-xs text-slate-800 whitespace-pre-wrap font-mono leading-relaxed bg-white p-3 rounded border border-emerald-200">
                  {customizedData.customized.customizedResumeText}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
              <button
                onClick={() => setCustomizedModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              {customizedData.savedResume && (
                <button
                  onClick={() =>
                    window.open(
                      `${import.meta.env.VITE_API_BASE_URL}/resumes/${customizedData.savedResume._id}/download`,
                      '_blank'
                    )
                  }
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Tailored Version</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Outreach Email Generator Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                  AI Personalized Outreach Email
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Review, Edit & Send C2C Introduction
                </h3>
              </div>
              <button onClick={() => setEmailModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Duplicate Check Warning Banner */}
            {duplicateCheck?.isDuplicate && (
              <div className="my-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Duplicate Outreach Blocked:</div>
                  <div>{duplicateCheck.reason}</div>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Body (Editable)
                </label>
                <textarea
                  rows={10}
                  value={emailData.body}
                  onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none font-sans leading-relaxed"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="text-[11px] text-slate-400">
                Attaches selected candidate resume automatically.
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setEmailModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendOutreachFromModal}
                  disabled={sendingEmail || duplicateCheck?.isDuplicate}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingEmail ? 'Sending...' : 'Send Outreach Email'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
