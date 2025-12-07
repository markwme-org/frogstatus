import { Router } from 'express';
import { execSync } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// VULNERABILITY 1: Hardcoded credentials (SAST will flag this)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'P@ssw0rd123!'; // Hardcoded password - SECURITY ISSUE

// VULNERABILITY 2: Insecure JWT secret (SAST will flag this)
const JWT_SECRET = 'my-super-secret-key'; // Hardcoded secret - SECURITY ISSUE

router.post('/admin/login', (req, res) => {
  const { username, password } = req.body;

  // VULNERABILITY 3: Weak authentication check
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    // VULNERABILITY 4: Using deprecated crypto.createCipher (SAST will flag this)
    // @ts-ignore - intentionally using deprecated API
    const cipher = crypto.createCipher('aes-192-cbc', JWT_SECRET);
    let token = cipher.update('admin-token', 'utf8', 'hex');
    token += cipher.final('hex');

    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// VULNERABILITY 5: Command Injection
router.post('/admin/ping', (req, res) => {
  const { host } = req.body;

  // SECURITY ISSUE: User input directly passed to shell command
  // This allows command injection via input like: "8.8.8.8; cat /etc/passwd"
  try {
    const result = execSync(`ping -c 1 ${host}`).toString();
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// VULNERABILITY 6: Path Traversal
router.get('/files/:filename', (req, res) => {
  const { filename } = req.params;

  // SECURITY ISSUE: No path sanitization - allows ../../../etc/passwd
  const filePath = path.join(__dirname, '../../uploads', filename);

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ success: true, content });
  } catch (error) {
    res.status(404).json({ success: false, error: 'File not found' });
  }
});

// VULNERABILITY 7: SQL Injection (simulated)
router.get('/users/search', (req, res) => {
  const { query } = req.query;

  // SECURITY ISSUE: String concatenation for SQL query
  // In a real app, this would be: db.query(`SELECT * FROM users WHERE name = '${query}'`)
  const sqlQuery = `SELECT * FROM users WHERE name = '${query}'`;

  // Simulated response
  res.json({
    success: true,
    query: sqlQuery,
    warning: 'This endpoint is vulnerable to SQL injection',
  });
});

// VULNERABILITY 8: Insecure random number generation
router.get('/generate-token', (req, res) => {
  // SECURITY ISSUE: Math.random() is not cryptographically secure
  const insecureToken = Math.random().toString(36).substring(2);

  res.json({
    token: insecureToken,
    warning: 'This token uses insecure randomness',
  });
});

// VULNERABILITY 9: Sensitive data exposure
router.get('/admin/config', (req, res) => {
  // SECURITY ISSUE: Exposing sensitive configuration
  const config = {
    databaseUrl: 'postgresql://admin:password123@db.example.com:5432/prod', // Exposed credentials
    apiKey: 'sk-1234567890abcdef', // Exposed API key
    awsAccessKey: 'AKIAIOSFODNN7EXAMPLE', // Exposed AWS key
    awsSecretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', // Exposed secret
  };

  res.json(config);
});

// VULNERABILITY 10: Regex DoS (ReDoS)
router.post('/validate-email', (req, res) => {
  const { email } = req.body;

  // SECURITY ISSUE: Vulnerable regex pattern can cause catastrophic backtracking
  const emailRegex = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;

  const isValid = emailRegex.test(email);
  res.json({ valid: isValid });
});

export default router;
