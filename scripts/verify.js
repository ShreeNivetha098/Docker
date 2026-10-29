const http = require('http');

const host = '127.0.0.1';
const port = process.env.APP_PORT || '3000';
const maxAttempts = 20;
const delayMs = 1000;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestHealth() {
  return new Promise((resolve, reject) => {
    const req = http.get({ host, port, path: '/health', timeout: 2000 }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        raw += chunk;
      });
      res.on('end', () => {
        let body = null;
        try {
          body = JSON.parse(raw);
        } catch (error) {
          body = null;
        }

        if (res.statusCode === 200 && body && body.status === 'ok') {
          resolve(body);
          return;
        }

        reject(new Error(`HTTP ${res.statusCode}: ${raw}`));
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timed out waiting for /health'));
    });
    req.on('error', reject);
  });
}

async function main() {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const body = await requestHealth();
      console.log(`SUCCESS: Verify received a healthy response from http://${host}:${port}/health`);
      console.log(JSON.stringify(body));
      return;
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
      if (attempt < maxAttempts) {
        await wait(delayMs);
      }
    }
  }

  console.error('FAILURE: The deployed application did not respond successfully.');
  if (lastError) {
    console.error(lastError.message);
  }
  process.exit(1);
}

main();
