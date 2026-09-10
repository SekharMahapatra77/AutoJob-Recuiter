import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Candidate } from '../types';
import { UserCheck, Save, CheckCircle2, User, Mail, Phone, MapPin, Briefcase, Globe, Github, Linkedin } from 'lucide-react';

export const CandidatesPage: React.FC = () => {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    primarySkills: '',
    yearsOfExperience: 6,
    preferredRoles: '',
    preferredEmploymentType: 'C2C',
    portfolio: '',
    github: '',
    linkedin: '',
    summary: ''
  });

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        const res = await api.get('/candidates/current');
        if (res.data.success) {
          const c = res.data.data;
          setCandidate(c);
          setFormData({
            name: c.name || '',
            email: c.email || '',
            phone: c.phone || '',
            location: c.location || '',
            primarySkills: (c.primarySkills || []).join(', '),
            yearsOfExperience: c.yearsOfExperience || 6,
            preferredRoles: (c.preferredRoles || []).join(', '),
            preferredEmploymentType: c.preferredEmploymentType || 'C2C',
            portfolio: c.portfolio || '',
            github: c.github || '',
            linkedin: c.linkedin || '',
            summary: c.summary || ''
          });
        }
      } catch (err) {
        console.error('Failed to fetch candidate profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCandidate();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');

    try {
      const res = await api.put('/candidates/current', {
        ...formData,
        primarySkills: formData.primarySkills.split(',').map((s) => s.trim()).filter(Boolean),
        preferredRoles: formData.preferredRoles.split(',').map((r) => r.trim()).filter(Boolean)
      });
      if (res.data.success) {
        setCandidate(res.data.data);
        setSuccessMsg('Candidate profile updated successfully!');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update candidate profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-slate-400">Loading candidate profile...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Candidate Master Profile
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Source of truth for C2C applications. AI resume alignment strictly uses only information verified in this profile.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Full Legal / Consultant Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Current Location (USA)
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Years of Experience
            </label>
            <input
              type="number"
              min="0"
              max="40"
              value={formData.yearsOfExperience}
              onChange={(e) => setFormData({ ...formData, yearsOfExperience: Number(e.target.value) })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Primary Skills (Comma separated)
          </label>
          <input
            type="text"
            value={formData.primarySkills}
            onChange={(e) => setFormData({ ...formData, primarySkills: e.target.value })}
            placeholder="Node.js, TypeScript, React, MongoDB, AWS, Docker"
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            These skills serve as verified match anchors during job description keyword evaluation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Preferred Target Roles
            </label>
            <input
              type="text"
              value={formData.preferredRoles}
              onChange={(e) => setFormData({ ...formData, preferredRoles: e.target.value })}
              placeholder="Senior Backend Engineer, Full Stack Lead"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Preferred Engagement Type
            </label>
            <select
              value={formData.preferredEmploymentType}
              onChange={(e) => setFormData({ ...formData, preferredEmploymentType: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
            >
              <option value="C2C">Corp-to-Corp (C2C Only)</option>
              <option value="C2C_OR_1099">C2C or 1099</option>
              <option value="CONTRACT">Open Contract</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Portfolio URL
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={formData.portfolio}
                onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              GitHub Profile
            </label>
            <div className="relative">
              <Github className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={formData.github}
                onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              LinkedIn Profile
            </label>
            <div className="relative">
              <Linkedin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={formData.linkedin}
                onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Professional Summary
          </label>
          <textarea
            rows={3}
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Save className="w-4 h-4 mr-1.5" />
            <span>{saving ? 'Saving...' : 'Save Candidate Profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
