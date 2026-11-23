const http = require('http');
const https = require('https');
const net = require('net');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const AdmZip = require('adm-zip');

const XRAY_URL = 'https://github.com/XTLS/Xray-core/releases/download/v26.10.31/Xray-linux-64.zip';
const dir = __dirname;
const xrayBin = path.join(dir, 'xray');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ok');
});

server.on('upgrade', (req, socket, head) => {
  if (!req.url.startsWith('/xray-ws')) { socket.destroy(); return; }
  const upstream = net.connect(3001, '127.0.0.1', () => {
    let raw = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
    for (let i = 0; i < req.rawHeaders.length; i += 2) raw += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
    raw += '\r\n';
    upstream.write(raw);
    if (head && head.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});

server.listen(3000, () => console.log('listening on 3000'));

function download(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('too many redirects'));
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(download(res.headers.location, dest, redirects + 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      const out = fs.createWriteStream(dest);
      res.pipe(out);
      out.on('finish', () => out.close(resolve));
      out.on('error', reject);
    }).on('error', reject);
  });
}

async function startXray() {
  try {
    if (!fs.existsSync(xrayBin)) {
      console.log('downloading xray...');
      const zipPath = path.join(dir, 'xray.zip');
      await download(XRAY_URL, zipPath);
      console.log('download done, extracting...');
      const zip = new AdmZip(zipPath);
      zip.extractEntryTo('xray', dir, false, true);
      fs.chmodSync(xrayBin, 0o755);
      fs.unlinkSync(zipPath);
      console.log('xray extracted');
    }
    const child = spawn(xrayBin, ['run', '-c', path.join(dir, 'config.json')], { cwd: dir, stdio: 'inherit' });
    child.on('exit', (code) => { console.error('xray exited', code); });
    console.log('xray started');
  } catch (e) {
    console.error('xray setup failed:', e && e.message ? e.message : e);
  }
}

startXray();
