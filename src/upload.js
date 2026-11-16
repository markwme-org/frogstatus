'use strict';

// DEMO SEED (PR set): deliberately insecure endpoints, used to demonstrate SAST in a pull request.
// Never deploy. Applied/removed by scripts/demo-seed.sh.
const express = require('express');
const { execSync } = require('child_process');
const fs = require('fs');

const router = express.Router();

// Command injection: user input flows straight into a shell command.
router.get('/archive', (req, res) => {
  res.send(execSync('tar -czf /tmp/out.tgz ' + req.query.dir).toString());
});

// Code injection: user input is evaluated.
router.get('/filter', (req, res) => {
  res.send(String(eval(req.query.rule)));
});

// Path traversal: user input flows straight into a file path.
router.get('/download', (req, res) => {
  res.send(fs.readFileSync('/srv/uploads/' + req.query.name, 'utf8'));
});

module.exports = router;
