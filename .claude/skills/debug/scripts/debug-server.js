#!/usr/bin/env node

import { createServer } from 'node:http';
import { mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

const PORT = 6143;
const HOST = '127.0.0.1';
const sessionId = process.argv[2] || String(Date.now());
const logDir = join(process.cwd(), '.claude', 'tmp');
const logFile = join(logDir, `debug-${sessionId}.log`);

mkdirSync(logDir, { recursive: true });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const server = createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    return res.end();
  }

  const match = req.url?.match(/^\/ingest\/([^/]+)$/);
  if (req.method !== 'POST' || !match) {
    res.writeHead(404, corsHeaders);
    return res.end(JSON.stringify({ error: 'Not found' }));
  }

  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      appendFileSync(logFile, JSON.stringify({ ...parsed, _session: match[1], _ts: Date.now() }) + '\n');
      res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch {
      res.writeHead(400, corsHeaders);
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Kill the existing process or choose a different port.`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, HOST, () => {
  console.log(JSON.stringify({ port: PORT, logFile, sessionId }));
});

const shutdown = () => { server.close(() => process.exit(0)); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
