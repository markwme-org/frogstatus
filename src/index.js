#!/usr/bin/env node
'use strict';

const { loadConfig } = require('./config');
const { createClient } = require('./api');
const { createApp } = require('./ui');

async function main() {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    console.error(`\nError: ${err.message}\n`);
    process.exit(1);
  }

  const api = createClient(config);
  createApp(config, api);
}

main();
