import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import csvParser from 'csv-parser';
import { Parser as Json2CsvParser } from 'json2csv';
import { Recruiter } from '../models/Recruiter';
import { Job } from '../models/Job';
import { isUSALocation } from '../services/usaFilter';
import { detectC2C } from '../services/c2cFilter';
import { logActivity } from '../services/activityLogger';
import { AuthenticatedRequest } from '../middleware/auth';

interface CsvRow {
  recruiterName?: string;
  name?: string;
  company?: string;
  email?: string;
  jobTitle?: string;
  title?: string;
  location?: string;
  jobUrl?: string;
  c2c?: string;
  skills?: string;
  phone?: string;
  notes?: string;
  [key: string]: any;
}

export const previewCsv = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No CSV file uploaded.' });
      return;
    }

    const rows: any[] = [];
    const stream = fs.createReadStream(req.file.path).pipe(csvParser());

    for await (const rawRow of stream) {
      // Normalize keys to lowercase trim
      const row: Record<string, string> = {};
      Object.keys(rawRow).forEach(k => {
        const cleanKey = k.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        row[cleanKey] = (rawRow[k] || '').trim();
      });

      const name = row['recruitername'] || row['name'] || row['fullname'] || '';
      const email = (row['email'] || row['recruiteremail'] || '').toLowerCase();
      const company = row['company'] || row['companyname'] || '';
      const jobTitle = row['jobtitle'] || row['title'] || row['role'] || 'Technical Recruiter';
      const location = row['location'] || 'USA';
      const jobUrl = row['joburl'] || row['url'] || row['link'] || '';
      const c2c = row['c2c'] || '';
      const skills = row['skills'] || '';
      const phone = row['phone'] || '';

      const isValid = Boolean(name && email && company && email.includes('@'));
      const missingFields: string[] = [];
      if (!name) missingFields.push('Name');
      if (!email) missingFields.push('Email');
      if (!company) missingFields.push('Company');

      rows.push({
        name,
        email,
        company,
        jobTitle,
        location,
        jobUrl,
        c2c,
        skills,
        phone,
        isValid,
        missingFields
      });
    }

    // Check duplicate emails in file and against database
    const seenEmails = new Set<string>();
    const existingRecruiters = await Recruiter.find({
      email: { $in: rows.filter(r => r.email).map(r => r.email) }
    }).distinct('email');
    const existingDbSet = new Set(existingRecruiters.map((e: string) => e.toLowerCase()));

    let duplicateCount = 0;
    let validCount = 0;
    let invalidCount = 0;

    const validatedRows = rows.map((r, idx) => {
      let isDuplicate = false;
      let duplicateReason = '';

      if (seenEmails.has(r.email)) {
        isDuplicate = true;
        duplicateReason = 'Duplicate email inside uploaded CSV';
        duplicateCount++;
      } else if (existingDbSet.has(r.email)) {
        isDuplicate = true;
        duplicateReason = 'Recruiter email already exists in database';
        duplicateCount++;
      } else if (r.email) {
        seenEmails.add(r.email);
      }

      if (!r.isValid) {
        invalidCount++;
      } else if (!isDuplicate) {
        validCount++;
      }

      return {
        ...r,
        rowNumber: idx + 1,
        isDuplicate,
        duplicateReason
      };
    });

    res.json({
      success: true,
      data: {
        tempFilePath: req.file.path,
        totalRows: rows.length,
        validCount,
        invalidCount,
        duplicateCount,
        rows: validatedRows.slice(0, 100) // Preview top 100
      }
    });
  } catch (err) {
    next(err);
  }
};

export const importCsv = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { rows, createJobs = true } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ success: false, message: 'No rows provided for import.' });
      return;
    }

    let importedRecruiters = 0;
    let importedJobs = 0;
    let skipped = 0;

    for (const r of rows) {
      if (!r.name || !r.email || !r.company || r.isDuplicate) {
        skipped++;
        continue;
      }

      const normalizedEmail = r.email.trim().toLowerCase();

      // Ensure no duplicate in DB
      const exists = await Recruiter.findOne({ email: normalizedEmail });
      if (exists) {
        skipped++;
        continue;
      }

      const recruiter = await Recruiter.create({
        name: r.name.trim(),
        email: normalizedEmail,
        company: r.company.trim(),
        jobTitle: r.jobTitle || 'Technical Recruiter',
        location: r.location || 'USA',
        phone: r.phone || '',
        source: 'CSV',
        verified: true,
        status: 'NEW'
      });
      importedRecruiters++;

      // Optionally create associated Job if jobUrl or title is present
      if (createJobs && (r.jobTitle || r.jobUrl)) {
        const isUSA = isUSALocation(r.location);
        const c2cDetection = detectC2C(r.c2c || '', r.jobTitle || '');

        await Job.create({
          title: r.jobTitle || 'C2C Software Engineer',
          company: r.company,
          location: r.location || 'USA',
          description: `Imported via CSV outreach for ${r.company}. Skills required: ${r.skills || 'Not specified'}`,
          skills: r.skills ? r.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
          employmentType: 'C2C',
          c2cStatus: r.c2c ? (r.c2c.toUpperCase().includes('YES') ? 'YES' : 'UNKNOWN') : c2cDetection.c2cStatus,
          c2cVerified: false,
          isUSA,
          source: 'CSV',
          sourceUrl: r.jobUrl || '',
          recruiterId: recruiter._id,
          status: 'NEW',
          createdBy: req.user?.id
        });
        importedJobs++;
      }
    }

    await logActivity(
      'CSV_IMPORTED',
      'Recruiter',
      '',
      `Imported ${importedRecruiters} recruiters and ${importedJobs} jobs via CSV`,
      req.user?.id
    );

    res.json({
      success: true,
      message: `Successfully imported ${importedRecruiters} recruiters and ${importedJobs} jobs (${skipped} skipped).`,
      data: {
        importedRecruiters,
        importedJobs,
        skipped
      }
    });
  } catch (err) {
    next(err);
  }
};

export const exportCsv = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type = 'recruiters', status } = req.query;

    if (type === 'jobs') {
      const filter: Record<string, any> = {};
      if (status) filter.status = status;

      const jobs = await Job.find(filter).populate('recruiterId', 'name email company').lean();
      const fields = [
        { label: 'Job Title', value: 'title' },
        { label: 'Company', value: 'company' },
        { label: 'Location', value: 'location' },
        { label: 'C2C Status', value: 'c2cStatus' },
        { label: 'USA Verified', value: 'isUSA' },
        { label: 'Status', value: 'status' },
        { label: 'Recruiter Name', value: 'recruiterId.name' },
        { label: 'Recruiter Email', value: 'recruiterId.email' },
        { label: 'Source URL', value: 'sourceUrl' }
      ];

      const parser = new Json2CsvParser({ fields });
      const csvData = parser.parse(jobs);

      res.header('Content-Type', 'text/csv');
      res.attachment(`jobs-export-${Date.now()}.csv`);
      res.send(csvData);
      return;
    }

    // Default: export recruiters
    const filter: Record<string, any> = {};
    if (status) filter.status = status;

    const recruiters = await Recruiter.find(filter).lean();
    const fields = [
      { label: 'Name', value: 'name' },
      { label: 'Email', value: 'email' },
      { label: 'Company', value: 'company' },
      { label: 'Job Title', value: 'jobTitle' },
      { label: 'Location', value: 'location' },
      { label: 'Phone', value: 'phone' },
      { label: 'Status', value: 'status' },
      { label: 'Verified', value: 'verified' },
      { label: 'LinkedIn', value: 'linkedinUrl' }
    ];

    const parser = new Json2CsvParser({ fields });
    const csvData = parser.parse(recruiters);

    res.header('Content-Type', 'text/csv');
    res.attachment(`recruiters-export-${Date.now()}.csv`);
    res.send(csvData);
  } catch (err) {
    next(err);
  }
};
