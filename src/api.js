'use strict';
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const https = require('https');
const { URL } = require('url');

/**
 * Creates a JFrog API client.
 * Uses the built-in fetch for HTTP calls, lodash for data manipulation,
 * jsonwebtoken for token decoding, and the built-in TLS socket for cert inspection.
 */
function createClient(config) {
  const http = {
    async get(path) {
      const res = await fetch(new URL(path, config.url), {
        headers: { Authorization: `Bearer ${config.accessToken}` },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
      return { data: await res.json() };
    },
  };

  /**
   * Returns an array of build name strings from Artifactory.
   */
  async function listBuilds() {
    const res = await http.get('/artifactory/api/build');
    return _.get(res, 'data.builds', []).map(b => b.uri.replace(/^\//, ''));
  }

  /**
   * Returns the last 20 build numbers for a given build name,
   * sorted descending by numeric value.
   */
  async function getBuildNumbers(buildName) {
    const res = await http.get(`/artifactory/api/build/${encodeURIComponent(buildName)}`);
    const numbers = _.get(res, 'data.buildsNumbers', []);
    return _.orderBy(
      numbers,
      [b => parseInt(b.uri.replace(/^\//, ''), 10)],
      ['desc']
    ).slice(0, 20);
  }

  /**
   * Returns the Xray scan summary for a specific build+number, or null on error.
   */
  async function getBuildScan(buildName, buildNumber) {
    try {
      const res = await http.get(
        `/xray/api/v1/summary/build?build_name=${encodeURIComponent(buildName)}&build_number=${encodeURIComponent(buildNumber)}`
      );
      return res.data;
    } catch {
      return null;
    }
  }

  /**
   * Decodes (does not verify) the access token JWT.
   * Returns { subject, expiry } or null.
   */
  function decodeToken() {
    try {
      const decoded = jwt.decode(config.accessToken);
      if (!decoded) return null;
      return {
        subject: decoded.sub || 'unknown',
        expiry: decoded.exp
          ? new Date(decoded.exp * 1000).toISOString().slice(0, 10)
          : 'n/a',
      };
    } catch {
      return null;
    }
  }

  /**
   * Fetches the TLS certificate from the JFrog host and returns
   * { issuer, validTo } from the TLS peer certificate. Returns null on failure.
   */
  function getCertInfo() {
    return new Promise(resolve => {
      try {
        const parsed = new URL(config.url);
        const req = https.request(
          { host: parsed.hostname, port: 443, method: 'HEAD' },
          res => {
            try {
              const cert = res.socket.getPeerCertificate();
              if (!cert || !cert.valid_to) return resolve(null);
              resolve({
                issuer: cert.issuer?.O || 'unknown',
                validTo: new Date(cert.valid_to).toISOString().slice(0, 10),
              });
            } catch {
              resolve(null);
            }
          }
        );
        req.on('error', () => resolve(null));
        req.end();
      } catch {
        resolve(null);
      }
    });
  }

  return { listBuilds, getBuildNumbers, getBuildScan, decodeToken, getCertInfo };
}

module.exports = { createClient };
