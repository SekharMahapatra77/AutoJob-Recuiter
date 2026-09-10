import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DuplicateLog } from '../types';
import { ShieldAlert, CheckCircle2, AlertOctagon } from 'lucide-react';

export const DuplicateLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<DuplicateLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/outreach/duplicate-logs');
        if (res.data.success) {
          setLogs(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load duplicate logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-rose-600" />
          Duplicate Prevention Audit Logs
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Audit trail of prevented duplicate submissions, protecting your email deliverability and recruiter relations.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Attempted Email</th>
                <th className="py-3 px-4">Recruiter / Company</th>
                <th className="py-3 px-4">Associated Job</th>
                <th className="py-3 px-4">Blocked Date</th>
                <th className="py-3 px-4">Prevention Reason</th>
                <th className="py-3 px-4 text-center">Action Taken</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading duplicate logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No duplicate outreach attempts recorded. The prevention engine is actively monitoring all dispatches.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono text-slate-900 font-semibold text-[11px]">
                      {log.recruiterEmail}
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-800">
                      {log.recruiterId ? (
                        <div>
                          <div>{log.recruiterId.name}</div>
                          <div className="text-[10px] text-slate-400">{log.recruiterId.company}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      {log.jobId ? (
                        <div>
                          <div className="font-semibold text-slate-800">{log.jobId.title}</div>
                          <div className="text-[10px] text-slate-400">{log.jobId.company}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">General Contact</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(log.attemptedAt).toLocaleString()}
                    </td>

                    <td className="py-3 px-4 max-w-sm text-slate-700">
                      <div className="text-[11px] leading-relaxed font-medium text-rose-900 bg-rose-50/60 p-2 rounded border border-rose-100">
                        {log.reason}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        <AlertOctagon className="w-3 h-3 mr-1 text-rose-600" />
                        {log.action}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
