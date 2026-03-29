'use strict';
const axios = require('axios');
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const forge = require('node-forge');
const https = require('https');
const { URL } = require('url');

/**
 * Creates a JFrog API client.
 * Uses axios for HTTP calls, lodash for data manipulation,
 * jsonwebtoken for token decoding, and node-forge for TLS cert inspection.
 */
function createClient(config) {
  const http = axios.create({
    baseURL: config.url,
    headers: { Authorization: `Bearer ${config.accessToken}` },
    timeout: 15000,
  });

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
   * { issuer, validTo } using node-forge. Returns null on failure.
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
              if (!cert || !cert.raw) return resolve(null);
              const pem =
                '-----BEGIN CERTIFICATE-----\n' +
                Buffer.from(cert.raw).toString('base64').match(/.{1,64}/g).join('\n') +
                '\n-----END CERTIFICATE-----';
              const forgeCert = forge.pki.certificateFromPem(pem);
              resolve({
                issuer: forgeCert.issuer.getField('O')?.value || 'unknown',
                validTo: forgeCert.validity.notAfter.toISOString().slice(0, 10),
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
