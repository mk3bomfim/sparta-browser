const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TOR_VERSION = '13.5.7';
const platform = process.platform;
const arch = process.arch;

let torUrl = '';
let extractBinary = '';

if (platform === 'win32') {
  torUrl = `https://archive.torproject.org/tor-package-archive/torbrowser/${TOR_VERSION}/tor-expert-bundle-windows-x86_64-${TOR_VERSION}.tar.gz`;
  extractBinary = 'Tor/tor.exe';
} else if (platform === 'darwin') {
  const macArch = arch === 'arm64' ? 'aarch64' : 'x86_64';
  torUrl = `https://archive.torproject.org/tor-package-archive/torbrowser/${TOR_VERSION}/tor-expert-bundle-macos-${macArch}-${TOR_VERSION}.tar.gz`;
  extractBinary = 'tor';
} else if (platform === 'linux') {
  torUrl = `https://archive.torproject.org/tor-package-archive/torbrowser/${TOR_VERSION}/tor-expert-bundle-linux-x86_64-${TOR_VERSION}.tar.gz`;
  extractBinary = 'tor';
} else {
  console.error(`Unsupported platform: ${platform}`);
  process.exit(1);
}

const DOWNLOAD_PATH = path.join(__dirname, 'resources', 'tor-bundle.tar.gz');
const EXTRACT_PATH = path.join(__dirname, 'resources', 'tor');

// Ensure resources directory exists
if (!fs.existsSync(path.dirname(EXTRACT_PATH))) {
  fs.mkdirSync(path.dirname(EXTRACT_PATH), { recursive: true });
}
if (!fs.existsSync(EXTRACT_PATH)) {
  fs.mkdirSync(EXTRACT_PATH, { recursive: true });
}

console.log('Downloading Tor Expert Bundle...');
console.log(`URL: ${torUrl}`);
console.log(`Destination: ${DOWNLOAD_PATH}`);

const file = fs.createWriteStream(DOWNLOAD_PATH);

https.get(torUrl, (response) => {
  if (response.statusCode === 302 || response.statusCode === 301) {
    https.get(response.headers.location, (redirectResponse) => {
      redirectResponse.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('Download complete!');
        extractTor();
      });
    });
  } else {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('Download complete!');
      extractTor();
    });
  }
}).on('error', (err) => {
  fs.unlink(DOWNLOAD_PATH, () => {});
  console.error('Download error:', err.message);
});

function extractTor() {
  console.log('\nExtracting Tor...');
  try {
    const extractCmd = `tar -xzf "${DOWNLOAD_PATH}" -C "${EXTRACT_PATH}"`;
    console.log(`Running: ${extractCmd}`);
    execSync(extractCmd, { stdio: 'inherit' });
    console.log('\n✓ Tor extracted successfully!');
    
    // Clean up bundle
    fs.unlinkSync(DOWNLOAD_PATH);
    console.log('✓ Cleanup complete');

    // On macOS and Linux, chmod +x the executable files
    if (platform !== 'win32') {
      const binaries = [
        path.join(EXTRACT_PATH, 'tor'),
        path.join(EXTRACT_PATH, 'pluggable_transports', 'lyrebird'),
        path.join(EXTRACT_PATH, 'pluggable_transports', 'snowflake-client')
      ];
      binaries.forEach(bin => {
        if (fs.existsSync(bin)) {
          execSync(`chmod +x "${bin}"`);
          console.log(`✓ Marked executable: ${bin}`);
        }
      });
    }
  } catch (error) {
    console.error('Extraction error:', error.message);
  }
}
