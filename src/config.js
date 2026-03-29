'use strict';
const { readFileSync } = require('fs');
const { join } = require('path');
const { homedir } = require('os');

/**
 * Loads JFrog CLI configuration from ~/.jfrog/jfrog-cli.conf.v6.
 * Returns { url, accessToken, serverId }.
 */
function loadConfig() {
  const configPath = join(homedir(), '.jfrog', 'jfrog-cli.conf.v6');
  let raw;
  try {
    raw = readFileSync(configPath, 'utf-8');
  } catch {
    throw new Error('JFrog CLI not configured. Run: jf c add');
  }
  const config = JSON.parse(raw);
  const server = (config.servers || []).find(s => s.isDefault) || config.servers?.[0];
  if (!server) throw new Error('No JFrog server found in CLI config.');
  return {
    url: server.url.replace(/\/$/, ''),
    accessToken: server.accessToken,
    serverId: server.serverId || 'default',
  };
}

module.exports = { loadConfig };
