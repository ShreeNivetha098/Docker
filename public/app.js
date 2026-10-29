const statusEl = document.getElementById('status');
const versionEl = document.getElementById('version');
const releaseEl = document.getElementById('release');
const startedEl = document.getElementById('started');

function showDown(message) {
  statusEl.textContent = 'Not responding';
  statusEl.className = 'status status-down';
  startedEl.textContent = message;
}

async function loadInfo() {
  try {
    const response = await fetch('/api/info', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('The status request failed.');
    }

    const info = await response.json();
    statusEl.textContent = 'Deployed';
    statusEl.className = 'status status-live';
    versionEl.textContent = `v${info.version}`;
    releaseEl.textContent = info.releaseLabel;
    startedEl.textContent = `Container process started ${info.startedAt}`;
  } catch (error) {
    showDown('Open this page at http://localhost:3000 after the container is running.');
  }
}

loadInfo();
