'use strict';
const blessed = require('blessed');
const _ = require('lodash');

// The build name to query. Defaults to 'frogstatus' but can be overridden
// via the FROGSTATUS_BUILD_NAME environment variable.
const BUILD_NAME = process.env.FROGSTATUS_BUILD_NAME || 'frogstatus';

// Colour / style constants for consistent theming
const COLORS = {
  headerBg: 'navy',
  headerFg: 'white',
  statusBg: '#1a1a1a',
  statusFg: '#aaaaaa',
  tableBg: 'black',
  tableFg: 'white',
  selectedBg: 'blue',
  selectedFg: 'white',
  pass: 'green',
  fail: 'red',
  warn: 'yellow',
  border: '#444444',
  popupBg: '#111111',
  popupBorder: 'cyan',
};

/**
 * Format an ISO date string (or raw date string from Artifactory) as
 * a short human-readable "YYYY-MM-DD HH:MM" string.
 */
function formatDate(raw) {
  if (!raw) return 'n/a';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw).slice(0, 16);
    const pad = n => String(n).padStart(2, '0');
    return (
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}`
    );
  } catch {
    return String(raw).slice(0, 16);
  }
}

/**
 * Extracts a flat list of violation objects from an Xray scan summary response.
 * Each item: { component, version, severity, cve }
 */
function extractViolations(scanData) {
  if (!scanData) return [];
  // Xray v1 summary/build response: { artifacts: [ { general, issues, licenses } ] }
  const artifacts = _.get(scanData, 'artifacts', []);
  const violations = [];
  for (const artifact of artifacts) {
    const issues = _.get(artifact, 'issues', []);
    for (const issue of issues) {
      const severity = _.get(issue, 'severity', 'Unknown');
      const cves = _.get(issue, 'cves', []);
      const components = _.get(issue, 'components', []);
      const cveStr = cves.length > 0 ? cves[0].cve || 'n/a' : 'n/a';
      if (components.length > 0) {
        for (const comp of components) {
          const name = comp.component_id || comp.id || 'unknown';
          // component_id is usually "pkg:npm/lodash:4.17.19" or "lodash:4.17.19"
          const parts = name.split(':');
          const pkg = parts[parts.length - 2] || name;
          const ver = parts[parts.length - 1] || '';
          violations.push({ component: pkg, version: ver, severity, cve: cveStr });
        }
      } else {
        violations.push({ component: 'unknown', version: '', severity, cve: cveStr });
      }
    }
  }
  // Deduplicate and sort by severity
  const severityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3, Unknown: 4 };
  return _.orderBy(
    _.uniqBy(violations, v => `${v.component}:${v.version}:${v.cve}`),
    [v => severityOrder[v.severity] ?? 99],
    ['asc']
  );
}

/**
 * Returns a blessed tag colour string for a severity level.
 */
function severityColor(severity) {
  switch ((severity || '').toLowerCase()) {
    case 'critical': return '{red-fg}';
    case 'high':     return '{#ff8800-fg}';
    case 'medium':   return '{yellow-fg}';
    case 'low':      return '{cyan-fg}';
    default:         return '{white-fg}';
  }
}

/**
 * Main entry point for the blessed TUI.
 */
function createApp(config, api) {
  // ─── Screen ────────────────────────────────────────────────────────────────
  const screen = blessed.screen({
    smartCSR: true,
    title: 'FrogStatus',
    fullUnicode: true,
    forceUnicode: true,
  });

  // ─── Header (3 rows tall) ──────────────────────────────────────────────────
  const header = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: 3,
    tags: true,
    style: {
      fg: COLORS.headerFg,
      bg: COLORS.headerBg,
      bold: true,
    },
  });

  // ─── Main content area ─────────────────────────────────────────────────────
  // Positioned below header, above status bar.
  const contentBox = blessed.box({
    top: 3,
    left: 0,
    width: '100%',
    height: '100%-4',   // header=3, statusBar=1
    style: {
      fg: COLORS.tableFg,
      bg: COLORS.tableBg,
    },
  });

  // Message box shown while loading or on error (inside contentBox)
  const messageBox = blessed.box({
    parent: contentBox,
    top: 2,
    left: 2,
    width: '100%-4',
    height: 3,
    tags: true,
    content: '{yellow-fg}Loading...{/yellow-fg}',
    style: { fg: 'white', bg: COLORS.tableBg },
  });

  // Builds list table (inside contentBox)
  const buildsTable = blessed.listtable({
    parent: contentBox,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    tags: true,
    hidden: true,
    keys: true,
    mouse: true,
    align: 'left',
    style: {
      fg: COLORS.tableFg,
      bg: COLORS.tableBg,
      header: {
        fg: 'white',
        bg: '#003366',
        bold: true,
      },
      cell: {
        fg: COLORS.tableFg,
        bg: COLORS.tableBg,
        selected: {
          fg: COLORS.selectedFg,
          bg: COLORS.selectedBg,
        },
      },
    },
    // Column widths
    columnWidth: [32, 10, 22],
  });

  // ─── Detail popup (overlay) ────────────────────────────────────────────────
  const detailBox = blessed.box({
    top: 'center',
    left: 'center',
    width: '90%',
    height: '85%',
    hidden: true,
    tags: true,
    border: { type: 'line' },
    style: {
      fg: 'white',
      bg: COLORS.popupBg,
      border: { fg: COLORS.popupBorder },
    },
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    mouse: true,
    scrollbar: {
      ch: '|',
      track: { bg: '#222222' },
      style: { fg: '#888888' },
    },
    label: ' Xray Scan Detail ',
  });

  // ─── Help overlay ─────────────────────────────────────────────────────────
  const helpBox = blessed.box({
    top: 'center',
    left: 'center',
    width: 52,
    height: 16,
    hidden: true,
    tags: true,
    border: { type: 'line' },
    style: {
      fg: 'white',
      bg: '#222222',
      border: { fg: 'cyan' },
    },
    label: ' Help ',
    content: [
      '',
      '  {bold}Key Bindings{/bold}',
      '',
      '  {cyan-fg}j / ↓{/cyan-fg}       Move selection down',
      '  {cyan-fg}k / ↑{/cyan-fg}       Move selection up',
      '  {cyan-fg}Enter{/cyan-fg}       Open Xray scan detail',
      '  {cyan-fg}Esc / b{/cyan-fg}     Go back / close popup',
      '  {cyan-fg}r{/cyan-fg}           Refresh current view',
      '  {cyan-fg}?{/cyan-fg}           Toggle this help',
      '  {cyan-fg}q / C-c{/cyan-fg}     Quit',
      '',
      '  Press {cyan-fg}Esc{/cyan-fg} or {cyan-fg}?{/cyan-fg} to close.',
      '',
    ].join('\n'),
  });

  // ─── Status bar (1 row, pinned to bottom) ──────────────────────────────────
  const statusBar = blessed.box({
    bottom: 0,
    left: 0,
    width: '100%',
    height: 1,
    tags: true,
    content: ' {bold}j/k{/bold}:navigate  {bold}Enter{/bold}:detail  {bold}r{/bold}:refresh  {bold}q{/bold}:quit  {bold}?{/bold}:help',
    style: {
      fg: COLORS.statusFg,
      bg: COLORS.statusBg,
    },
  });

  // Append elements to screen
  screen.append(header);
  screen.append(contentBox);
  screen.append(detailBox);
  screen.append(helpBox);
  screen.append(statusBar);

  // ─── State ────────────────────────────────────────────────────────────────
  // buildRows: Array of { name, number, started } — raw data for the table
  let buildRows = [];
  // selectedIndex tracks which data row the user has highlighted.
  // buildsTable uses 0-based rows including header, so row 0 = header.
  let currentView = 'builds'; // 'builds' | 'detail'

  // ─── Header rendering ─────────────────────────────────────────────────────
  function renderHeader(tokenInfo) {
    const line1 = ` {bold}FrogStatus{/bold}  server: ${config.serverId}  ${config.url}`;
    let line2 = '';
    if (tokenInfo) {
      line2 = ` token: ${tokenInfo.subject}  expires: ${tokenInfo.expiry}`;
    }
    header.setContent(`${line1}\n${line2}`);
    screen.render();
  }

  // ─── Builds list view ─────────────────────────────────────────────────────

  /**
   * Loads all build numbers for BUILD_NAME, populates the table.
   */
  async function loadBuilds() {
    currentView = 'builds';
    detailBox.hide();
    buildsTable.hide();
    messageBox.show();
    messageBox.setContent('{yellow-fg}Loading builds...{/yellow-fg}');
    screen.render();

    try {
      const numbers = await api.getBuildNumbers(BUILD_NAME);

      if (numbers.length === 0) {
        messageBox.setContent(
          `{yellow-fg}No builds found for "${BUILD_NAME}".{/yellow-fg}\n` +
          `{white-fg}Set FROGSTATUS_BUILD_NAME to change the build name.{/white-fg}`
        );
        screen.render();
        return;
      }

      // Build row data: { name, number, started }
      buildRows = numbers.map(n => ({
        name: BUILD_NAME,
        number: n.uri.replace(/^\//, ''),
        started: n.started || '',
      }));

      renderBuildsTable();

    } catch (err) {
      messageBox.show();
      buildsTable.hide();
      messageBox.setContent(
        `{red-fg}Error loading builds:{/red-fg}\n{white-fg}${err.message}{/white-fg}`
      );
      screen.render();
    }
  }

  /**
   * Renders the builds listtable from buildRows data.
   */
  function renderBuildsTable() {
    const total = buildRows.length;
    // Build the 2D array: first row is header, rest are data
    const tableData = [
      // Header row
      ['  NAME', 'NUMBER', 'STARTED'],
      // Data rows
      ...buildRows.map(row => [
        `  ${row.name}`,
        row.number,
        formatDate(row.started),
      ]),
    ];

    buildsTable.setData(tableData);

    // Update content-area title bar
    const titleBar = ` Builds: {bold}${BUILD_NAME}{/bold}  [{white-fg}${total}{/white-fg} builds]`;
    // We use a separate label line at the top of contentBox
    // (re-use messageBox as a title strip when table is visible)
    messageBox.hide();
    buildsTable.show();

    // Set a descriptive label — patch it onto the contentBox top area via
    // a thin label box above the table.
    statusBar.setContent(
      ` {bold}j/k{/bold}:navigate  {bold}Enter{/bold}:detail  {bold}r{/bold}:refresh  {bold}q{/bold}:quit  {bold}?{/bold}:help` +
      `   {#888888-fg}build: ${BUILD_NAME}  (${total} runs){/}`
    );

    buildsTable.select(1); // select first data row (index 0 is header)
    buildsTable.focus();
    screen.render();
  }

  // ─── Detail popup view ────────────────────────────────────────────────────

  /**
   * Opens the Xray scan detail popup for the currently selected build row.
   */
  async function openDetail() {
    const idx = buildsTable.selected; // 0-based, 0 = header row
    if (idx < 1 || idx > buildRows.length) return;

    const row = buildRows[idx - 1];
    currentView = 'detail';

    detailBox.setContent('{yellow-fg}Loading Xray scan...{/yellow-fg}');
    detailBox.show();
    detailBox.focus();
    screen.render();

    try {
      const scanData = await api.getBuildScan(row.name, row.number);
      renderDetailContent(row, scanData);
    } catch (err) {
      detailBox.setContent(`{red-fg}Error: ${err.message}{/red-fg}`);
      screen.render();
    }
  }

  /**
   * Renders the content of the detail popup from scan data.
   */
  function renderDetailContent(row, scanData) {
    const violations = extractViolations(scanData);

    // Header section
    const lines = [
      '',
      `  {bold}Build:{/bold}   ${row.name}`,
      `  {bold}Number:{/bold}  ${row.number}`,
      `  {bold}Started:{/bold} ${formatDate(row.started)}`,
      '',
    ];

    if (!scanData) {
      lines.push('  {yellow-fg}No Xray scan data available for this build.{/yellow-fg}');
      lines.push('  {#888888-fg}(Build may not be indexed by Xray yet){/}');
    } else if (violations.length === 0) {
      lines.push('  {green-fg}✓ No violations found — build is clean.{/green-fg}');

      // Show policy summary if present
      const policies = _.get(scanData, 'artifacts[0].licenses', []);
      if (policies.length > 0) {
        lines.push('');
        lines.push(`  {#888888-fg}Licenses: ${policies.map(l => l.name || l).join(', ')}{/}`);
      }
    } else {
      const critCount = violations.filter(v => v.severity === 'Critical').length;
      const highCount = violations.filter(v => v.severity === 'High').length;

      lines.push(
        `  {red-fg}✗ ${violations.length} violation(s) found{/red-fg}` +
        (critCount ? `  {red-fg}[${critCount} Critical]{/red-fg}` : '') +
        (highCount ? `  {#ff8800-fg}[${highCount} High]{/}` : '')
      );
      lines.push('');

      // Column widths
      const COL_PKG  = 30;
      const COL_VER  = 16;
      const COL_SEV  = 10;
      const COL_CVE  = 22;

      const pad = (s, n) => String(s).slice(0, n).padEnd(n);

      // Table header
      lines.push(
        `  {bold}{#003366-bg}${pad('PACKAGE', COL_PKG)} ${pad('VERSION', COL_VER)} ${pad('SEVERITY', COL_SEV)} ${'CVE / ID'.padEnd(COL_CVE)}{/bold}{/}`
      );
      lines.push(`  ${'─'.repeat(COL_PKG + COL_VER + COL_SEV + COL_CVE + 3)}`);

      for (const v of violations) {
        const col = severityColor(v.severity);
        const endCol = `{/${col.slice(1, -1).replace('-fg', '')}-fg}`;
        lines.push(
          `  ${col}${pad(v.component, COL_PKG)} ${pad(v.version, COL_VER)} ${pad(v.severity, COL_SEV)} ${String(v.cve).slice(0, COL_CVE).padEnd(COL_CVE)}${endCol}`
        );
      }
    }

    lines.push('');
    lines.push('  {#888888-fg}Press Esc or b to go back.{/}');
    lines.push('');

    detailBox.setContent(lines.join('\n'));
    detailBox.scrollTo(0);
    screen.render();
  }

  // ─── Key bindings ─────────────────────────────────────────────────────────

  // Global quit
  screen.key(['q', 'C-c'], () => process.exit(0));

  // Help toggle
  screen.key(['?'], () => {
    if (helpBox.hidden) {
      helpBox.show();
      helpBox.focus();
    } else {
      helpBox.hide();
      if (currentView === 'detail') {
        detailBox.focus();
      } else {
        buildsTable.focus();
      }
    }
    screen.render();
  });

  // Close help on Escape when help is visible
  helpBox.key(['escape', '?', 'q'], () => {
    helpBox.hide();
    if (currentView === 'detail') {
      detailBox.focus();
    } else {
      buildsTable.focus();
    }
    screen.render();
  });

  // Navigate in builds table (j/k supplement blessed's built-in arrow handling)
  buildsTable.key(['j', 'down'], () => {
    buildsTable.down(1);
    screen.render();
  });
  buildsTable.key(['k', 'up'], () => {
    buildsTable.up(1);
    screen.render();
  });

  // Enter on builds table → open detail
  buildsTable.key(['enter'], () => {
    openDetail();
  });

  // Also support mouse click on a row → open detail
  buildsTable.on('select', (_item, idx) => {
    if (idx >= 1) {
      openDetail();
    }
  });

  // Escape / b anywhere → go back
  screen.key(['escape', 'b'], () => {
    if (!helpBox.hidden) {
      helpBox.hide();
      screen.render();
      return;
    }
    if (currentView === 'detail') {
      currentView = 'builds';
      detailBox.hide();
      buildsTable.show();
      buildsTable.focus();
      statusBar.setContent(
        ` {bold}j/k{/bold}:navigate  {bold}Enter{/bold}:detail  {bold}r{/bold}:refresh  {bold}q{/bold}:quit  {bold}?{/bold}:help`
      );
      screen.render();
    }
  });

  // Scroll in detail popup
  detailBox.key(['j', 'down'], () => { detailBox.scroll(1); screen.render(); });
  detailBox.key(['k', 'up'],   () => { detailBox.scroll(-1); screen.render(); });
  detailBox.key(['enter', 'escape', 'b'], () => {
    currentView = 'builds';
    detailBox.hide();
    buildsTable.show();
    buildsTable.focus();
    screen.render();
  });

  // Refresh
  screen.key(['r'], () => {
    if (!helpBox.hidden) return;
    if (currentView === 'detail') {
      openDetail();
    } else {
      loadBuilds();
    }
  });

  // ─── Initialise ───────────────────────────────────────────────────────────

  // Render a placeholder header immediately, then enrich with token info
  renderHeader(null);
  const tokenInfo = api.decodeToken();
  renderHeader(tokenInfo);

  // Start loading builds
  loadBuilds();

  screen.render();
}

module.exports = { createApp };
