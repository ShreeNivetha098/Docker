const express = require('express');
const path = require('path');
const pkg = require('./package.json');

const publicDir = path.join(__dirname, 'public');
const startedAt = new Date().toISOString();

function createApp() {
  const app = express();

  app.get('/health', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({
      status: 'ok',
      version: pkg.version
    });
  });

  app.get('/api/info', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({
      title: 'CI/CD Pipeline Using Docker',
      version: pkg.version,
      releaseLabel: pkg.releaseLabel || 'Release',
      status: 'deployed',
      startedAt
    });
  });

  app.use(express.static(publicDir, {
    etag: false,
    maxAge: 0,
    setHeaders(res) {
      res.setHeader('Cache-Control', 'no-store');
    }
  }));

  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  // Listen on all interfaces so Docker port publishing can reach the app.
  createApp().listen(port, '0.0.0.0', () => {
    console.log(`CI/CD Pipeline Using Docker is running at http://localhost:${port}`);
    console.log(`Version ${pkg.version} (${pkg.releaseLabel || 'Release'})`);
  });
}

module.exports = { createApp };
