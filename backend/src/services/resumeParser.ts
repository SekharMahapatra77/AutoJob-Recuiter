import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

const KNOWN_SKILLS = [
  'JavaScript', 'TypeScript', 'Node.js', 'Express.js', 'React', 'Next.js', 'Vue.js', 'Angular',
  'Python', 'Django', 'FastAPI', 'Flask', 'Java', 'Spring Boot', 'C#', '.NET', 'ASP.NET',
  'Go', 'Golang', 'Rust', 'PHP', 'Laravel', 'Ruby', 'Ruby on Rails',
  'MongoDB', 'PostgreSQL', 'MySQL', 'MSSQL', 'Redis', 'Cassandra', 'DynamoDB', 'Elasticsearch',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'Jenkins', 'GitHub Actions',
  'CI/CD', 'REST API', 'GraphQL', 'Microservices', 'Kafka', 'RabbitMQ', 'OAuth', 'JWT',
  'Linux', 'Bash', 'Git', 'HTML5', 'CSS3', 'Tailwind CSS', 'Redux', 'Zustand', 'Jest', 'Mocha',
  'Serverless', 'Lambda', 'OpenAPI', 'Swagger', 'CI/CD Pipelines', 'Agile', 'Scrum'
];

export const parseResumeFile = async (filePath: string): Promise<{ text: string; skills: string[] }> => {
  const ext = path.extname(filePath).toLowerCase();
  let extractedText = '';

  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    extractedText = pdfData.text;
  } else if (ext === '.docx') {
    const docxResult = await mammoth.extractRawText({ path: filePath });
    extractedText = docxResult.value;
  } else {
    // Plain text or fallback
    extractedText = fs.readFileSync(filePath, 'utf-8');
  }

  // Clean and normalize extracted text
  const cleanText = extractedText
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ +/g, ' ')
    .trim();

  // Extract skills found in text
  const detectedSkills: string[] = [];
  for (const skill of KNOWN_SKILLS) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(cleanText)) {
      detectedSkills.push(skill);
    }
  }

  return {
    text: cleanText,
    skills: detectedSkills
  };
};
