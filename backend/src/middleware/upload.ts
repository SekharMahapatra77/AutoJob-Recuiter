import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadBase = path.join(process.cwd(), 'uploads');
const resumeDir = path.join(uploadBase, 'resumes');
const csvDir = path.join(uploadBase, 'csv');

if (!fs.existsSync(uploadBase)) fs.mkdirSync(uploadBase, { recursive: true });
if (!fs.existsSync(resumeDir)) fs.mkdirSync(resumeDir, { recursive: true });
if (!fs.existsSync(csvDir)) fs.mkdirSync(csvDir, { recursive: true });

const resumeStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, resumeDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitized}`);
  }
});

const csvStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, csvDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

export const uploadResume = multer({
  storage: resumeStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf' || ext === '.docx' || ext === '.doc') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Word (.docx/.doc) documents are allowed.'));
    }
  }
});

export const uploadCsv = multer({
  storage: csvStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.csv' || file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed.'));
    }
  }
});
