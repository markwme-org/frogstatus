'use strict';

// DEMO SEED (PR set): hardcoded credential, used to demonstrate secrets detection in a pull request.
// The token is a revoked GitHub PAT, injected from the secrets file by
// scripts/demo-seed.sh. It is never stored in this template.
const NOTIFY_TOKEN = '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';

module.exports = { NOTIFY_TOKEN };
