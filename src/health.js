'use strict';

// DEMO SEED: deliberately insecure endpoints, used to demonstrate SAST.
// Never deploy. Applied/removed by scripts/demo-seed.sh.
const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();

// Command injection: user input flows straight into a shell command.
app.get('/ping', (req, res) => {
  exec('ping -c 1 ' + req.query.host, (err, stdout) => res.send(stdout));
});

// Path traversal: user input flows straight into a file path.
app.get('/logs/:file', (req, res) => {
  fs.readFile(path.join('/var/log/frogstatus', req.params.file), 'utf8', (err, data) => res.send(data));
});

// Code injection and reflected XSS: user input evaluated, then echoed unescaped.
app.get('/calc', (req, res) => {
  res.send(String(eval(req.query.expr)));
});

module.exports = app;
