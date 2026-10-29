const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const pkg = require('../package.json');
const { createApp } = require('../server');

async function withServer(run) {
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');

  try {
    await run(server.address().port);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

test('health endpoint reports ok and the package version', async () => {
  await withServer(async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.version, pkg.version);
  });
});

test('info endpoint exposes the version used by the dashboard', async () => {
  await withServer(async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/info`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.title, 'CI/CD Pipeline Using Docker');
    assert.equal(body.version, pkg.version);
    assert.equal(body.status, 'deployed');
    assert.equal(typeof body.releaseLabel, 'string');
    assert.ok(body.releaseLabel.length > 0);
    assert.equal(typeof body.startedAt, 'string');
    assert.ok(!Number.isNaN(Date.parse(body.startedAt)));
  });
});

test('homepage contains the title and both CI and CD sections', async () => {
  await withServer(async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /CI\/CD Pipeline Using Docker/);
    assert.match(html, /Continuous Integration/);
    assert.match(html, /Continuous Deployment/);
    assert.match(html, /Pipeline stages/);
    assert.match(html, /GitHub/);
    assert.match(html, /Jenkins/);
    assert.match(html, /Docker/);
  });
});
