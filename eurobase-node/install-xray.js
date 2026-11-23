const https = require('https');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const XRAY_URL = 'https://github.com/XTLS/Xray-core/releases/download/v26.10.31/Xray-linux-64.zip';
const outDir = path.join(__dirname, 'xray-bin');
const zipPath = path.join(outDir, 'xray.zip');

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

(async () => {
  try {
    fs.mkdirSync(outDir, { recursive: true });
    console.log('postinstall: downloading xray...');
    await download(XRAY_URL, zipPath);
    const zip = new AdmZip(zipPath);
    zip.extractEntryTo('xray', outDir, false, true);
    fs.chmodSync(path.join(outDir, 'xray'), 0o755);
    fs.unlinkSync(zipPath);
    console.log('postinstall: xray ready');
  } catch (e) {
    console.error('postinstall xray failed:', e && e.message ? e.message : e);
  }
})();
