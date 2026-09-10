import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Briefcase,
  Users,
  Send,
  Inbox,
  CheckCircle2,
  Clock,
  ThumbsUp,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  AlertCircle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [metricsRes, analyticsRes, activitiesRes] = await Promise.all([
          api.get('/analytics/metrics'),
          api.get('/analytics/detailed'),
          api.get('/activity?limit=7')
        ]);

        if (metricsRes.data.success) setMetrics(metricsRes.data.data);
        if (analyticsRes.data.success) setAnalytics(analyticsRes.data.data);
        if (activitiesRes.data.success) setActivities(activitiesRes.data.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-500">Loading SaaS Dashboard metrics...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Jobs',
      value: metrics?.totalJobs ?? 0,
      sub: `${metrics?.qualifiedC2CJobs ?? 0} Qualified C2C (USA)`,
      icon: Briefcase,
      color: 'blue'
    },
    {
      title: 'Recruiters',
      value: metrics?.totalRecruiters ?? 0,
      sub: 'Verified IT Staffing Contacts',
      icon: Users,
      color: 'indigo'
    },
    {
      title: 'Emails Sent',
      value: metrics?.emailsSent ?? 0,
      sub: 'Targeted C2C Submissions',
      icon: Send,
      color: 'sky'
    },
    {
      title: 'Replies Received',
      value: metrics?.repliesCount ?? 0,
      sub: `${metrics?.replyRate ?? 0}% Reply Rate`,
      icon: Inbox,
      color: 'purple'
    },
    {
      title: 'Positive Replies',
      value: metrics?.positiveRepliesCount ?? 0,
      sub: `${metrics?.positiveRate ?? 0}% Positive Ratio`,
      icon: ThumbsUp,
      color: 'emerald'
    },
    {
      title: 'Follow-ups Due',
      value: metrics?.followUpsDue ?? 0,
      sub: 'Scheduled touches awaiting dispatch',
      icon: Clock,
      color: 'amber'
    },
    {
      title: 'Interested Leads',
      value: metrics?.interestedLeads ?? 0,
      sub: 'Active client interviews & rate requests',
      icon: CheckCircle2,
      color: 'green'
    }
  ];

  const STATUS_COLORS: Record<string, string> = {
    QUALIFIED: '#10b981',
    OUTREACH_READY: '#3b82f6',
    CONTACTED: '#6366f1',
    NEW: '#94a3b8',
    REVIEWING: '#f59e0b',
    DISQUALIFIED: '#ef4444',
    CLOSED: '#64748b'
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Outreach Operations Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time pipeline analytics, USA C2C opportunities, and recruiter engagement.
          </p>
        </div>
        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            Live Database Sync
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm hover:shadow-md transition duration-150 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
                  {card.title}
                </span>
                <div className="p-2 rounded-lg bg-slate-50 text-slate-700 border border-slate-100">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {card.value}
                </div>
                <div className="mt-1 text-[11px] font-medium text-slate-500 truncate">
                  {card.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1: Outreach Over Time & Campaign Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Outreach Trend Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Outreach Volume & Reply Activity</h2>
              <p className="text-xs text-slate-500">Sent emails vs incoming replies over past 14 days</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center text-blue-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 mr-1.5" /> Sent
              </span>
              <span className="flex items-center text-emerald-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 mr-1.5" /> Replied
              </span>
            </div>
          </div>
          <div className="h-64">
            {analytics?.outreachTrend && analytics.outreachTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.outreachTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="replyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="_id" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                      border: 'none'
                    }}
                  />
                  <Area type="monotone" dataKey="sent" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#sentGrad)" name="Emails Sent" />
                  <Area type="monotone" dataKey="replied" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#replyGrad)" name="Replies Received" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                No outreach activity recorded yet in this time window.
              </div>
            )}
          </div>
        </div>

        {/* Campaign Funnel Bar Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900">Campaign Outreach Funnel</h2>
            <p className="text-xs text-slate-500">Pipeline progression from target to positive leads</p>
          </div>
          <div className="h-64">
            {analytics?.funnel ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.funnel} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 10, fill: '#334155' }} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                      border: 'none'
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                    {analytics.funnel.map((_entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={['#64748b', '#3b82f6', '#8b5cf6', '#10b981'][index % 4]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>
      </div>

      {/* Charts Row 2: Status Distribution & Real-time Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job Status Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900">Opportunity Status Distribution</h2>
            <p className="text-xs text-slate-500">Active breakdown across USA C2C postings</p>
          </div>
          <div className="h-60">
            {analytics?.jobStatusDistribution && analytics.jobStatusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.jobStatusDistribution}
                    dataKey="count"
                    nameKey="_id"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {analytics.jobStatusDistribution.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={STATUS_COLORS[entry._id] || '#94a3b8'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                      border: 'none'
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-[11px] text-slate-600 font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                No job status data.
              </div>
            )}
          </div>
        </div>

        {/* Real-time Activity Feed */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent SaaS Operations Audit</h2>
              <p className="text-xs text-slate-500">Audit trail of jobs, outreach, AI actions, and duplicate blocks</p>
            </div>
            <span className="text-xs text-slate-400 font-medium">Auto-recorded</span>
          </div>

          <div className="divide-y divide-slate-100">
            {activities.length > 0 ? (
              activities.map((act) => {
                const dateStr = new Date(act.createdAt).toLocaleString();
                const isBlocked = act.action.includes('BLOCKED');
                const isEmail = act.action.includes('EMAIL') || act.action.includes('SENT');
                const isReply = act.action.includes('REPLY');

                return (
                  <div key={act._id} className="py-3 flex items-start space-x-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                        isBlocked
                          ? 'bg-rose-100 text-rose-700'
                          : isReply
                          ? 'bg-emerald-100 text-emerald-700'
                          : isEmail
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isBlocked ? '!' : isReply ? '↩' : '✓'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">
                        {act.details}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span className="font-medium text-slate-500">{act.action}</span>
                        <span>•</span>
                        <span>{dateStr}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No recent activity logs recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
