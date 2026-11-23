const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const XRAY_URL = 'https://github.com/XTLS/Xray-core/releases/download/v26.10.31/Xray-linux-64.zip';
const dir = __dirname;
const xrayBin = path.join(dir, 'xray');

function ensureXray() {
  if (fs.existsSync(xrayBin)) return;
  console.log('downloading xray...');
  execSync(`curl -fsSL -o xray.zip ${XRAY_URL} && unzip -o xray.zip xray && chmod +x xray && rm -f xray.zip`, { cwd: dir, stdio: 'inherit' });
}

ensureXray();
const child = spawn(xrayBin, ['run', '-c', path.join(dir, 'config.json')], { cwd: dir, stdio: 'inherit' });
child.on('exit', (code) => { console.error('xray exited', code); process.exit(code || 1); });

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
