// Run with: node --test __tests__/debug-server.test.js
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { request } from 'node:http';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SERVER_PATH = join(__dirname, '..', 'debug-server.js');
const PORT = 6143;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function startServer(cwd, sessionArg) {
  const args = [SERVER_PATH];
  if (sessionArg) args.push(sessionArg);
  return spawn(process.execPath, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
}

function waitForReady(proc) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    const timeout = setTimeout(() => reject(new Error('Server start timeout')), 5000);
    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      try {
        const parsed = JSON.parse(stdout.trim());
        clearTimeout(timeout);
        resolve(parsed);
      } catch {}
    });
    proc.on('error', (err) => { clearTimeout(timeout); reject(err); });
    proc.on('exit', (code) => {
      if (code !== 0) { clearTimeout(timeout); reject(new Error(`Server exited with code ${code}`)); }
    });
  });
}

function httpRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const opts = { method, hostname: url.hostname, port: url.port, path: url.pathname };
    if (body !== undefined) opts.headers = { 'Content-Type': 'application/json' };
    const req = request(opts, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body !== undefined) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

function killServer(proc) {
  return new Promise((resolve) => {
    if (!proc || proc.killed) return resolve();
    proc.on('exit', resolve);
    proc.kill('SIGTERM');
    setTimeout(() => { if (!proc.killed) proc.kill('SIGKILL'); }, 2000);
  });
}

describe('debug-server', () => {
  let tmpDir;

  before(() => {
    tmpDir = join('/tmp', `debug-server-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('Server starts and outputs JSON', () => {
    let proc;

    after(async () => { await killServer(proc); });

    it('should output JSON with port, logFile, and sessionId on startup', async () => {
      proc = startServer(tmpDir);
      const output = await waitForReady(proc);
      assert.strictEqual(output.port, PORT);
      assert.ok(typeof output.logFile === 'string');
      assert.ok(output.logFile.length > 0);
      assert.ok(typeof output.sessionId === 'string');
      assert.ok(output.sessionId.length > 0);
    });
  });

  describe('POST /ingest/:sessionId', () => {
    let proc;
    let serverInfo;

    before(async () => {
      proc = startServer(tmpDir);
      serverInfo = await waitForReady(proc);
    });

    after(async () => { await killServer(proc); });

    it('should return 200 with { ok: true } for valid JSON payload', async () => {
      const res = await httpRequest('POST', `/ingest/${serverInfo.sessionId}`, { level: 'info', msg: 'test' });
      assert.strictEqual(res.status, 200);
      const body = JSON.parse(res.body);
      assert.strictEqual(body.ok, true);
    });
  });

  describe('Log file creation', () => {
    let proc;
    let serverInfo;
    const sid = `logtest-${Date.now()}`;

    before(async () => {
      proc = startServer(tmpDir, sid);
      serverInfo = await waitForReady(proc);
    });

    after(async () => { await killServer(proc); });

    it('should create a JSONL log file with _session and _ts fields', async () => {
      const payload = { level: 'error', msg: 'something broke' };
      await httpRequest('POST', `/ingest/${sid}`, payload);

      assert.ok(existsSync(serverInfo.logFile), 'Log file should exist');
      const lines = readFileSync(serverInfo.logFile, 'utf-8').trim().split('\n');
      assert.strictEqual(lines.length, 1);
      const entry = JSON.parse(lines[0]);
      assert.strictEqual(entry.level, 'error');
      assert.strictEqual(entry.msg, 'something broke');
      assert.strictEqual(entry._session, sid);
      assert.ok(typeof entry._ts === 'number');
    });
  });

  describe('CORS headers', () => {
    let proc;

    before(async () => {
      proc = startServer(tmpDir);
      await waitForReady(proc);
    });

    after(async () => { await killServer(proc); });

    it('should include Access-Control-Allow-Origin: * on responses', async () => {
      const res = await httpRequest('POST', '/ingest/cors-test', { data: 1 });
      assert.strictEqual(res.headers['access-control-allow-origin'], '*');
    });
  });

  describe('OPTIONS preflight', () => {
    let proc;

    before(async () => {
      proc = startServer(tmpDir);
      await waitForReady(proc);
    });

    after(async () => { await killServer(proc); });

    it('should return 204 with CORS headers', async () => {
      const res = await httpRequest('OPTIONS', '/ingest/preflight');
      assert.strictEqual(res.status, 204);
      assert.strictEqual(res.headers['access-control-allow-origin'], '*');
      assert.ok(res.headers['access-control-allow-methods'].includes('POST'));
      assert.ok(res.headers['access-control-allow-headers'].includes('Content-Type'));
    });
  });

  describe('Invalid JSON', () => {
    let proc;

    before(async () => {
      proc = startServer(tmpDir);
      await waitForReady(proc);
    });

    after(async () => { await killServer(proc); });

    it('should return 400 for non-JSON body', async () => {
      const res = await httpRequest('POST', '/ingest/bad-json', 'this is not json');
      assert.strictEqual(res.status, 400);
      const body = JSON.parse(res.body);
      assert.strictEqual(body.error, 'Invalid JSON');
    });
  });

  describe('404 for unknown routes', () => {
    let proc;

    before(async () => {
      proc = startServer(tmpDir);
      await waitForReady(proc);
    });

    after(async () => { await killServer(proc); });

    it('should return 404 for GET /', async () => {
      const res = await httpRequest('GET', '/');
      assert.strictEqual(res.status, 404);
    });

    it('should return 404 for POST /unknown', async () => {
      const res = await httpRequest('POST', '/unknown', { data: 1 });
      assert.strictEqual(res.status, 404);
    });
  });

  describe('Custom session ID', () => {
    let proc;
    let serverInfo;
    const customSid = 'my-custom-session-42';

    before(async () => {
      proc = startServer(tmpDir, customSid);
      serverInfo = await waitForReady(proc);
    });

    after(async () => { await killServer(proc); });

    it('should use argv[2] as sessionId in output', () => {
      assert.strictEqual(serverInfo.sessionId, customSid);
    });

    it('should include custom session ID in log filename', () => {
      assert.ok(serverInfo.logFile.includes(`debug-${customSid}.log`));
    });
  });

  describe('Multiple logs append', () => {
    let proc;
    let serverInfo;
    const sid = `multi-${Date.now()}`;

    before(async () => {
      proc = startServer(tmpDir, sid);
      serverInfo = await waitForReady(proc);
    });

    after(async () => { await killServer(proc); });

    it('should append each POST as a separate JSONL line', async () => {
      const payloads = [
        { step: 1, action: 'init' },
        { step: 2, action: 'process' },
        { step: 3, action: 'done' },
      ];

      for (const payload of payloads) {
        const res = await httpRequest('POST', `/ingest/${sid}`, payload);
        assert.strictEqual(res.status, 200);
      }

      const lines = readFileSync(serverInfo.logFile, 'utf-8').trim().split('\n');
      assert.strictEqual(lines.length, 3);

      lines.forEach((line, i) => {
        const entry = JSON.parse(line);
        assert.strictEqual(entry.step, payloads[i].step);
        assert.strictEqual(entry.action, payloads[i].action);
        assert.strictEqual(entry._session, sid);
        assert.ok(typeof entry._ts === 'number');
      });
    });
  });
});
