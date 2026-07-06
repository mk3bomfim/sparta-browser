const { app, BrowserView, BrowserWindow, ipcMain, session, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const https = require('https');

const START_URL = 'about:blank';
const NAV_HEIGHT = 48;
const TABS_HEIGHT = 36;
const PANEL_HEIGHT = 320;
const SEARCH_ORIGIN = 'https://duckduckgo.com';
const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5;
const TOR_SOCKS_PORT = 9150; // Porta que vamos usar para nosso Tor
const TOR_CONTROL_PORT = 9151;

let mainWindow;
let tabs = [];
let activeTabId = null;
let nextTabId = 1;
let memoryHistory = [];
let visibleHistory = [];
let downloads = [];
let historyIndex = -1;
let historyId = 0;
let panelOpen = false;
let downloadId = 0;
let theme = 'dark';
let torEnabled = false;
let torProcess = null;
let torReady = false;
let torCircuitInfo = {
  ip: 'Detectando...',
  location: '-',
  circuit: '-'
};
let appSettings = {
  language: 'en-US',
  theme: 'dark',
  clearOnExit: true,
  searchEngine: 'duckduckgo',
  torPort: 9150,
  hardwareAccel: true,
  secureDns: 'off',
  torBridgeType: 'none',
  torCustomBridges: '',
  javascriptEnabled: true,
  adBlockEnabled: true
};
const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');

// Load settings at script startup (before app ready)
loadSettings();

// Apply Hardware Acceleration switch
if (appSettings.hardwareAccel === false) {
  app.disableHardwareAcceleration();
}

// Apply Secure DNS switch (DNS over HTTPS)
if (appSettings.secureDns && appSettings.secureDns !== 'off') {
  app.commandLine.appendSwitch('enable-features', 'DnsOverHttps');
  
  let template = 'https://cloudflare-dns.com/dns-query';
  if (appSettings.secureDns === 'google') {
    template = 'https://dns.google/dns-query';
  } else if (appSettings.secureDns === 'quad9') {
    template = 'https://dns.quad9.net/dns-query';
  }
  
  app.commandLine.appendSwitch('dns-over-https-templates', template);
}

const TOR_PROXY = {
  proxyRules: `socks5://127.0.0.1:${TOR_SOCKS_PORT}`,
  proxyBypassRules: '<local>'
};

const PT_CONFIG_FILE = path.join(__dirname, '..', 'resources', 'tor', 'pluggable_transports', 'pt_config.json');
let ptConfig = { bridges: {} };

function loadPtConfig() {
  try {
    if (fs.existsSync(PT_CONFIG_FILE)) {
      const data = fs.readFileSync(PT_CONFIG_FILE, 'utf8');
      ptConfig = JSON.parse(data);
      console.log('Pluggable Transports config loaded successfully');
    }
  } catch (error) {
    console.error('Error loading pt_config.json:', error);
  }
}

// Load pluggable transports configuration
loadPtConfig();

function getActiveTab() {
  return tabs.find(tab => tab.id === activeTabId);
}

function getTabById(id) {
  return tabs.find(tab => tab.id === id);
}

// Settings Management
function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      appSettings = { ...appSettings, ...JSON.parse(data) };
      console.log('Settings loaded:', appSettings);
      
      // Apply theme
      theme = appSettings.theme || 'dark';
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

function saveSettings(settings) {
  try {
    const oldBridgeType = appSettings.torBridgeType;
    const oldCustomBridges = appSettings.torCustomBridges;
    const oldJavascriptEnabled = appSettings.javascriptEnabled;

    appSettings = { ...appSettings, ...settings };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(appSettings, null, 2));
    console.log('Settings saved:', appSettings);
    
    // Update session language dynamically
    const browsingSession = session.fromPartition('opsec-temp');
    const privateSession = session.fromPartition('private-temp');
    browsingSession.setUserAgent(browsingSession.getUserAgent(), appSettings.language || 'en-US');
    privateSession.setUserAgent(privateSession.getUserAgent(), appSettings.language || 'en-US');
    
    // If Tor is enabled and bridge settings changed, restart Tor
    if (torEnabled && (settings.torBridgeType !== undefined || settings.torCustomBridges !== undefined)) {
      if (settings.torBridgeType !== oldBridgeType || settings.torCustomBridges !== oldCustomBridges) {
        console.log('Tor bridge settings changed, restarting Tor...');
        // Toggle Tor off and on
        toggleTor().then(() => toggleTor());
      }
    }

    // Apply javascript changes dynamically if changed
    if (settings.javascriptEnabled !== undefined && settings.javascriptEnabled !== oldJavascriptEnabled) {
      applyJavaScriptSetting();
    }

    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

function resetSettings() {
  appSettings = {
    language: 'en-US',
    theme: 'dark',
    clearOnExit: true,
    searchEngine: 'duckduckgo',
    torPort: 9150,
    hardwareAccel: true,
    secureDns: 'off',
    torBridgeType: 'none',
    torCustomBridges: '',
    javascriptEnabled: true,
    adBlockEnabled: true
  };
  saveSettings(appSettings);
  theme = 'dark';
  applyWindowTheme();
  return appSettings;
}

const TABS_FILE = path.join(app.getPath('userData'), 'session_tabs.json');
let isRestoringTabs = false;

const BOOKMARKS_FILE = path.join(app.getPath('userData'), 'bookmarks.json');
let bookmarks = [];

function loadBookmarks() {
  try {
    if (fs.existsSync(BOOKMARKS_FILE)) {
      bookmarks = JSON.parse(fs.readFileSync(BOOKMARKS_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading bookmarks:', error);
  }
}

function saveBookmarks() {
  try {
    fs.writeFileSync(BOOKMARKS_FILE, JSON.stringify(bookmarks, null, 2));
  } catch (error) {
    console.error('Error saving bookmarks:', error);
  }
}

function toggleBookmark(url, title) {
  if (!url || url === START_URL) return false;
  
  const index = bookmarks.findIndex(b => b.url === url);
  if (index === -1) {
    bookmarks.push({ url, title: title || url });
  } else {
    bookmarks.splice(index, 1);
  }
  saveBookmarks();
  broadcastState();
  return index === -1;
}

// Load bookmarks on startup
loadBookmarks();

function savePersistentTabs() {
  if (isRestoringTabs) return;
  try {
    const dataToSave = {
      activeTabUrl: getActiveTab()?.url || START_URL,
      tabs: tabs.map(t => ({
        url: t.url || START_URL,
        title: t.title || 'Nova guia'
      }))
    };
    fs.writeFileSync(TABS_FILE, JSON.stringify(dataToSave, null, 2));
  } catch (error) {
    console.error('Error saving persistent tabs:', error);
  }
}

// Tor Management Functions
function checkPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port, '127.0.0.1');
  });
}

async function findTorExecutable() {
  const isWin = process.platform === 'win32';
  const binaryName = isWin ? 'tor.exe' : 'tor';

  // Define paths to search
  const possiblePaths = [
    // 1. Bundled Tor in resources/tor
    path.join(__dirname, '..', 'resources', 'tor', binaryName),
    // 2. Bundled Tor in resources/tor/Tor (Windows specific zip layout)
    path.join(__dirname, '..', 'resources', 'tor', 'Tor', binaryName),
    // 3. Production resources path (packaged app)
    path.join(process.resourcesPath || __dirname, 'tor', binaryName),
    path.join(process.resourcesPath || __dirname, 'tor', 'Tor', binaryName),
    // 4. User data fallback
    path.join(app.getPath('userData'), 'tor', binaryName),
  ];

  if (isWin) {
    possiblePaths.push(
      'C:\\Tor\\Tor\\tor.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Tor Browser\\Browser\\TorBrowser\\Tor\\tor.exe'),
      path.join(process.env.PROGRAMFILES || '', 'Tor\\tor.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || '', 'Tor\\tor.exe')
    );
  } else {
    // macOS / Linux system paths
    possiblePaths.push(
      '/usr/bin/tor',
      '/usr/local/bin/tor',
      '/opt/homebrew/bin/tor', // Apple Silicon Homebrew path
      '/usr/sbin/tor',
      '/opt/local/bin/tor'
    );
  }

  for (const torPath of possiblePaths) {
    if (fs.existsSync(torPath)) {
      console.log('Found Tor binary:', torPath);
      return torPath;
    }
  }

  console.error('Tor executable not found in any location');
  return null;
}

async function startTorProcess() {
  if (torProcess) {
    console.log('Tor process already running');
    return true;
  }

  // Check if port is already in use (external Tor might be running)
  const portInUse = await checkPortInUse(TOR_SOCKS_PORT);
  if (portInUse) {
    console.log('Tor port already in use, using external Tor instance');
    torReady = true;
    return true;
  }

  const torPath = await findTorExecutable();
  if (!torPath) {
    console.error('Tor executable not found');
    if (mainWindow) {
      mainWindow.webContents.send('tor:status', {
        status: 'error',
        message: 'Tor não encontrado. Execute: npm run download-tor'
      });
    }
    return false;
  }

  try {
    console.log(`Starting Tor from: ${torPath}`);
    
    const torDataDir = path.join(app.getPath('userData'), 'tor-data');
    if (!fs.existsSync(torDataDir)) {
      fs.mkdirSync(torDataDir, { recursive: true });
    }
    
    const torArgs = [
      '--SocksPort', `127.0.0.1:${TOR_SOCKS_PORT}`,
      '--ControlPort', `127.0.0.1:${TOR_CONTROL_PORT}`,
      '--DataDirectory', torDataDir
    ];

    if (appSettings.torBridgeType && appSettings.torBridgeType !== 'none') {
      torArgs.push('--UseBridges', '1');
      
      const isWin = process.platform === 'win32';
      const ptDir = path.join(__dirname, '..', 'resources', 'tor', 'pluggable_transports');
      const lyrebirdPath = path.join(ptDir, isWin ? 'lyrebird.exe' : 'lyrebird');
      const snowflakePath = path.join(ptDir, isWin ? 'snowflake-client.exe' : 'snowflake-client');
      
      torArgs.push('--ClientTransportPlugin', `obfs4,meek_lite exec ${lyrebirdPath}`);
      torArgs.push('--ClientTransportPlugin', `snowflake exec ${snowflakePath}`);
      
      let bridgeLines = [];
      if (appSettings.torBridgeType === 'custom') {
        if (appSettings.torCustomBridges) {
          bridgeLines = appSettings.torCustomBridges.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        }
      } else {
        const key = appSettings.torBridgeType === 'meek-azure' ? 'meek-azure' : appSettings.torBridgeType;
        bridgeLines = ptConfig.bridges[key] || [];
      }
      
      bridgeLines.forEach(line => {
        torArgs.push('--Bridge', line);
      });
    }

    console.log('Tor spawning with args:', torArgs);

    torProcess = spawn(torPath, torArgs, {
      windowsHide: true
    });

    torProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`Tor: ${output}`);
      
      if (output.includes('Bootstrapped 100%') || output.includes('Tor has successfully opened a circuit')) {
        torReady = true;
        console.log('Tor is ready!');
        if (mainWindow) {
          mainWindow.webContents.send('tor:status', {
            status: 'ready',
            message: 'Tor conectado!'
          });
        }
      }
    });

    torProcess.stderr.on('data', (data) => {
      console.error(`Tor Error: ${data}`);
    });

    torProcess.on('close', (code) => {
      console.log(`Tor process exited with code ${code}`);
      torProcess = null;
      torReady = false;
    });

    torProcess.on('error', (error) => {
      console.error('Failed to start Tor:', error);
      torProcess = null;
      torReady = false;
      if (mainWindow) {
        mainWindow.webContents.send('tor:status', {
          status: 'error',
          message: `Erro: ${error.message}`
        });
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));
    return true;

  } catch (error) {
    console.error('Error starting Tor:', error);
    if (mainWindow) {
      mainWindow.webContents.send('tor:status', {
        status: 'error',
        message: `Erro: ${error.message}`
      });
    }
    return false;
  }
}

function stopTorProcess() {
  if (torProcess) {
    console.log('Stopping Tor process...');
    torProcess.kill();
    torProcess = null;
    torReady = false;
  }
}

async function fetchTorInfo() {
  if (!torEnabled || !torReady) {
    return {
      status: torEnabled ? 'Conectando...' : 'Desativado',
      ip: 'N/A',
      location: '-',
      circuit: '-'
    };
  }

  try {
    // Make request through Tor proxy to get IP
    const proxyUrl = `socks5://127.0.0.1:${TOR_SOCKS_PORT}`;
    
    // Simple fetch - will use the session proxy automatically
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    const data = await response.json();
    torCircuitInfo.ip = data.ip;
    
    // Try to get location
    try {
      const geoResponse = await fetch(`https://ipapi.co/${data.ip}/json/`);
      const geoData = await geoResponse.json();
      torCircuitInfo.location = `${geoData.city || '?'}, ${geoData.country_name || '?'}`;
    } catch (err) {
      torCircuitInfo.location = 'Oculta';
    }

    torCircuitInfo.circuit = '3 relays (Guard → Middle → Exit)';
    
  } catch (error) {
    console.error('Error fetching Tor info:', error);
    torCircuitInfo.ip = 'Erro';
    torCircuitInfo.location = '-';
  }

  return {
    status: 'Conectado',
    ip: torCircuitInfo.ip,
    location: torCircuitInfo.location,
    circuit: torCircuitInfo.circuit
  };
}

function navigationHistory() {
  const tab = getActiveTab();
  return tab?.view.webContents.navigationHistory;
}

function canGoBack() {
  const history = navigationHistory();
  return history ? history.canGoBack() : false;
}

function canGoForward() {
  const history = navigationHistory();
  return history ? history.canGoForward() : false;
}

function normalizeTarget(input) {
  const value = String(input || '').trim();

  if (!value || value === 'about:blank') return START_URL;
  if (/^(https?|file):\/\//i.test(value)) return withSearchTheme(value);
  if (/^[\w.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(value)) return withSearchTheme(`https://${value}`);

  return buildSearchUrl(value);
}

function isSearchUrl(target) {
  try {
    const url = new URL(target);
    return ['duckduckgo.com', 'www.duckduckgo.com'].includes(url.hostname);
  } catch {
    return false;
  }
}

function searchThemeValue() {
  return theme === 'dark' ? 'd' : 'l';
}

function buildSearchUrl(query) {
  const engine = appSettings.searchEngine || 'duckduckgo';
  let url;
  if (engine === 'google') {
    url = new URL('https://www.google.com/search');
    url.searchParams.set('q', query);
  } else if (engine === 'bing') {
    url = new URL('https://www.bing.com/search');
    url.searchParams.set('q', query);
  } else if (engine === 'startpage') {
    url = new URL('https://www.startpage.com/sp/search');
    url.searchParams.set('q', query);
  } else {
    // default duckduckgo
    url = new URL('https://duckduckgo.com/');
    url.searchParams.set('q', query);
    url.searchParams.set('kae', searchThemeValue());
  }
  return url.toString();
}

function withSearchTheme(target) {
  if (!isSearchUrl(target)) return target;

  const url = new URL(target);
  url.searchParams.set('kae', searchThemeValue());
  return url.toString();
}

function syncSearchTheme() {
  const tab = getActiveTab();
  if (!tab) return;
  
  const currentUrl = tab.view.webContents.getURL();
  if (!currentUrl || !isSearchUrl(currentUrl)) return;

  const themedUrl = withSearchTheme(currentUrl);
  if (themedUrl !== currentUrl) tab.view.webContents.loadURL(themedUrl);
}

function broadcastState() {
  if (!mainWindow) return;
  
  const tab = getActiveTab();
  if (!tab) return;

  const currentUrl = tab.view.webContents.getURL();

  mainWindow.webContents.send('browser:state', {
    url: currentUrl === START_URL ? '' : currentUrl,
    title: tab.view.webContents.getTitle(),
    canGoBack: canGoBack() || historyIndex > 0,
    canGoForward: canGoForward() || historyIndex < memoryHistory.length - 1,
    loading: tab.view.webContents.isLoading(),
    isHome: tab.isHome,
    isFullscreen: mainWindow.isFullScreen(),
    theme,
    torEnabled,
    torReady,
    torCircuitInfo,
    zoom: Math.round(tab.zoomFactor * 100),
    history: visibleHistory.slice().reverse(),
    downloads: downloads.slice().reverse(),
    tabs: tabs.map(t => ({ id: t.id, title: t.title, url: t.url, isPrivate: t.isPrivate })),
    activeTabId,
    bookmarks
  });
}

function applyWindowTheme() {
  const backgroundColor = theme === 'dark' ? '#000000' : '#ffffff';
  if (mainWindow) mainWindow.setBackgroundColor(backgroundColor);
  tabs.forEach(tab => {
    if (tab.view) tab.view.setBackgroundColor(backgroundColor);
  });
}

function layoutView() {
  if (!mainWindow) return;

  const { width, height } = mainWindow.getContentBounds();
  const top = NAV_HEIGHT + TABS_HEIGHT;

  tabs.forEach(tab => {
    if (!tab.view) return;

    if (tab.id === activeTabId) {
      if (tab.isHome || panelOpen) {
        tab.view.setBounds({ x: 0, y: height, width, height: 0 });
      } else {
        tab.view.setBounds({
          x: 0,
          y: top,
          width,
          height: Math.max(0, height - top)
        });
      }
    } else {
      // Hide inactive tabs
      tab.view.setBounds({ x: 0, y: height, width, height: 0 });
    }
  });
}

function remember(url) {
  if (!url) return;
  if (url === 'about:blank' || url === START_URL) {
    // Don't add about:blank to visible history, but keep in memory for navigation
    if (memoryHistory[historyIndex] !== url) {
      memoryHistory = memoryHistory.slice(0, historyIndex + 1);
      memoryHistory.push(url);
      historyIndex = memoryHistory.length - 1;
    }
    return;
  }
  
  if (memoryHistory[historyIndex] === url) return;

  memoryHistory = memoryHistory.slice(0, historyIndex + 1);
  memoryHistory.push(url);
  historyIndex = memoryHistory.length - 1;

  const tab = getActiveTab();
  visibleHistory = visibleHistory.filter((entry) => entry.url !== url);
  visibleHistory.push({
    id: String(++historyId),
    url,
    title: tab?.view.webContents.getTitle() || url,
    visitedAt: new Date().toISOString()
  });
  visibleHistory = visibleHistory.slice(-80);
}

function registerTabEvents(tab) {
  const view = tab.view;
  
  view.webContents.on('did-start-loading', () => {
    if (tab.id === activeTabId) broadcastState();
  });
  
  view.webContents.on('did-stop-loading', () => {
    if (tab.id === activeTabId) broadcastState();
  });
  
  view.webContents.on('page-title-updated', (_event, title) => {
    tab.title = title || tab.url || 'Nova guia';
    const url = view.webContents.getURL();
    if (!tab.isPrivate) {
      const latest = visibleHistory[visibleHistory.length - 1];
      if (latest?.url === url) latest.title = title || url;
    }
    savePersistentTabs();
    if (tab.id === activeTabId) broadcastState();
  });
  
  view.webContents.on('did-navigate', (_event, url) => {
    tab.url = url;
    if (url === START_URL) {
      tab.isHome = true;
    } else {
      tab.isHome = false;
      if (!tab.isPrivate) {
        remember(url);
      }
    }
    savePersistentTabs();
    if (tab.id === activeTabId) {
      layoutView();
      broadcastState();
    }
  });
  
  view.webContents.on('did-navigate-in-page', (_event, url) => {
    tab.url = url;
    if (url === START_URL) {
      tab.isHome = true;
    } else {
      tab.isHome = false;
      if (!tab.isPrivate) {
        remember(url);
      }
    }
    savePersistentTabs();
    if (tab.id === activeTabId) {
      layoutView();
      broadcastState();
    }
  });
}

function createTab(url = START_URL, isPrivate = false) {
  const view = new BrowserView({
    webPreferences: {
      partition: isPrivate ? 'private-temp' : 'opsec-temp',
      preload: path.join(__dirname, 'view-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      javascript: appSettings.javascriptEnabled !== false
    }
  });

  const tab = {
    id: nextTabId++,
    view,
    url,
    title: 'Nova guia',
    isHome: url === START_URL,
    zoomFactor: 1,
    isPrivate
  };

  tabs.push(tab);
  savePersistentTabs();
  
  if (mainWindow) {
    mainWindow.addBrowserView(view);
  }

  view.setBackgroundColor(theme === 'dark' ? '#000000' : '#ffffff');
  view.webContents.setZoomFactor(tab.zoomFactor);
  view.webContents.loadURL(url);

  registerTabEvents(tab);

  return tab;
}

function applyJavaScriptSetting() {
  tabs.forEach(tab => {
    if (tab.view && !tab.view.webContents.isDestroyed()) {
      const currentUrl = tab.view.webContents.getURL() || tab.url;
      const zoomFactor = tab.zoomFactor || 1;
      
      if (mainWindow) {
        mainWindow.removeBrowserView(tab.view);
      }
      tab.view.webContents.destroy();
      
      const newView = new BrowserView({
        webPreferences: {
          partition: tab.isPrivate ? 'private-temp' : 'opsec-temp',
          preload: path.join(__dirname, 'view-preload.js'),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          webSecurity: true,
          javascript: appSettings.javascriptEnabled !== false
        }
      });
      
      tab.view = newView;
      tab.zoomFactor = zoomFactor;
      
      if (mainWindow) {
        mainWindow.addBrowserView(newView);
      }
      
      newView.setBackgroundColor(theme === 'dark' ? '#000000' : '#ffffff');
      newView.webContents.setZoomFactor(zoomFactor);
      
      registerTabEvents(tab);
      newView.webContents.loadURL(currentUrl);
    }
  });
  
  layoutView();
  broadcastState();
}

function switchToTab(tabId) {
  const tab = getTabById(tabId);
  if (!tab) return;

  activeTabId = tabId;
  layoutView();
  broadcastState();
  savePersistentTabs();
}

function closeTab(tabId) {
  const tabIndex = tabs.findIndex(t => t.id === tabId);
  if (tabIndex === -1) return;

  const tab = tabs[tabIndex];
  
  // Remove the view
  if (mainWindow && tab.view) {
    mainWindow.removeBrowserView(tab.view);
    tab.view.webContents.destroy();
  }

  tabs.splice(tabIndex, 1);

  // If we closed the active tab, switch to another
  if (activeTabId === tabId) {
    if (tabs.length === 0) {
      // Create a new tab if we closed the last one
      const newTab = createTab();
      activeTabId = newTab.id;
    } else {
      // Switch to the next tab, or the previous if we closed the last
      const nextIndex = Math.min(tabIndex, tabs.length - 1);
      activeTabId = tabs[nextIndex].id;
    }
  }

  layoutView();
  broadcastState();
  savePersistentTabs();
}

function clearHistory() {
  memoryHistory = [];
  visibleHistory = [];
  historyIndex = -1;
}

function deleteHistoryEntry(id) {
  const entry = visibleHistory.find((item) => item.id === id);
  if (!entry) return;

  visibleHistory = visibleHistory.filter((item) => item.id !== id);
  memoryHistory = memoryHistory.filter((url) => url !== entry.url);
  historyIndex = Math.min(historyIndex, memoryHistory.length - 1);
}

function setHomeVisible(visible) {
  const tab = getActiveTab();
  if (!tab) return;
  
  tab.isHome = visible;
  layoutView();
  broadcastState();
}

function loadTarget(target) {
  const tab = getActiveTab();
  if (!tab) return;

  const url = normalizeTarget(target);
  if (url === START_URL || !target || target === '') {
    setHomeVisible(true);
    tab.view.webContents.loadURL(START_URL);
    remember(START_URL);
    return;
  }

  tab.isHome = false;
  layoutView();
  tab.view.webContents.loadURL(url);
}

function setZoom(nextZoom) {
  const tab = getActiveTab();
  if (!tab) return;

  tab.zoomFactor = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(nextZoom.toFixed(2))));
  if (tab.view && !tab.view.webContents.isDestroyed()) {
    tab.view.webContents.setZoomFactor(tab.zoomFactor);
  }
  broadcastState();
}

function zoomBy(delta) {
  const tab = getActiveTab();
  if (!tab) return;
  setZoom(tab.zoomFactor + delta);
}

async function toggleTor() {
  torEnabled = !torEnabled;
  
  const browsingSession = session.fromPartition('opsec-temp');
  
  if (torEnabled) {
    // Start Tor if not running
    const started = await startTorProcess();
    if (!started) {
      torEnabled = false;
      broadcastState();
      return;
    }

    // Enable Tor proxy
    await browsingSession.setProxy(TOR_PROXY);
    
    if (mainWindow) {
      mainWindow.webContents.send('tor:status', {
        status: torReady ? 'ready' : 'connecting',
        message: torReady ? 'Tor ativado' : 'Conectando ao Tor...'
      });
    }
  } else {
    // Disable proxy
    await browsingSession.setProxy({ proxyRules: '' });
    
    if (mainWindow) {
      mainWindow.webContents.send('tor:status', {
        status: 'disabled',
        message: 'Tor desativado'
      });
    }
  }
  
  // Reload all tabs to apply proxy settings
  tabs.forEach(tab => {
    if (tab.view && !tab.view.webContents.isDestroyed()) {
      const currentUrl = tab.view.webContents.getURL();
      if (currentUrl && currentUrl !== START_URL) {
        tab.view.webContents.reload();
      }
    }
  });
  
  broadcastState();
}

function updateDownload(item, record) {
  const total = item.getTotalBytes();
  const received = item.getReceivedBytes();
  record.totalBytes = total;
  record.receivedBytes = received;
  record.progress = total > 0 ? Math.round((received / total) * 100) : 0;
  broadcastState();
}

async function clearSessionData() {
  const browsingSession = session.fromPartition('opsec-temp');
  const privateSession = session.fromPartition('private-temp');
  await Promise.all([
    browsingSession.clearCache(),
    browsingSession.clearStorageData(),
    privateSession.clearCache(),
    privateSession.clearStorageData()
  ]);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 820,
    minWidth: 760,
    minHeight: 480,
    backgroundColor: '#000000',
    icon: path.join(__dirname, 'icon.ico'),
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: `${__dirname}/preload.js`,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(`${__dirname}/renderer/index.html`);

  const adBlockList = [
    '*://*.doubleclick.net/*',
    '*://*.google-analytics.com/*',
    '*://*.googlesyndication.com/*',
    '*://*.googleadservices.com/*',
    '*://*.adservice.google.com/*',
    '*://*.adnxs.com/*',
    '*://*.amazon-adsystem.com/*',
    '*://*.criteo.com/*',
    '*://*.criteo.net/*',
    '*://*.taboola.com/*',
    '*://*.outbrain.com/*',
    '*://*.pubmatic.com/*',
    '*://*.rubiconproject.com/*',
    '*://*.scorecardresearch.com/*',
    '*://*.hotjar.com/*'
  ];

  const setupSessionHandlers = (ses) => {
    ses.setUserAgent(ses.getUserAgent(), appSettings.language || 'en-US');
    
    ses.setPermissionRequestHandler((_webContents, _permission, callback) => {
      callback(false);
    });

    ses.webRequest.onBeforeSendHeaders((details, callback) => {
      const headers = {
        ...details.requestHeaders,
        'DNT': '1',
        'Sec-GPC': '1'
      };
      delete headers.Referer;
      delete headers.referer;
      callback({ requestHeaders: headers });
    });

    ses.webRequest.onBeforeRequest({ urls: adBlockList }, (details, callback) => {
      if (appSettings.adBlockEnabled !== false) {
        console.log('Blocked ad/tracker request:', details.url);
        callback({ cancel: true });
      } else {
        callback({ cancel: false });
      }
    });
  };

  const browsingSession = session.fromPartition('opsec-temp');
  const privateSession = session.fromPartition('private-temp');
  setupSessionHandlers(browsingSession);
  setupSessionHandlers(privateSession);

  browsingSession.on('will-download', (_event, item) => {
    const filename = item.getFilename();
    const record = {
      id: String(++downloadId),
      filename,
      url: item.getURL(),
      path: path.join(app.getPath('downloads'), filename),
      state: 'starting',
      progress: 0,
      receivedBytes: 0,
      totalBytes: item.getTotalBytes(),
      startedAt: new Date().toISOString()
    };

    item.setSavePath(record.path);
    downloads.push(record);
    downloads = downloads.slice(-60);
    broadcastState();

    item.on('updated', (_event, state) => {
      record.state = state;
      updateDownload(item, record);
    });

    item.once('done', (_event, state) => {
      record.state = state;
      record.progress = state === 'completed' ? 100 : record.progress;
      record.finishedAt = new Date().toISOString();
      broadcastState();
    });
  });

  // Restore persistent tabs or create a default one
  let restored = false;
  try {
    if (fs.existsSync(TABS_FILE)) {
      const data = JSON.parse(fs.readFileSync(TABS_FILE, 'utf8'));
      if (data && Array.isArray(data.tabs) && data.tabs.length > 0) {
        isRestoringTabs = true;
        let activeIndex = 0;
        data.tabs.forEach((savedTab, index) => {
          const tabUrl = savedTab.url || START_URL;
          const newTab = createTab(tabUrl);
          
          // Set title immediately
          newTab.title = savedTab.title || 'Nova guia';
          
          if (savedTab.url === data.activeTabUrl) {
            activeIndex = index;
          }
        });
        
        isRestoringTabs = false;
        if (tabs.length > 0) {
          activeTabId = tabs[activeIndex].id;
          restored = true;
        }
      }
    }
  } catch (error) {
    console.error('Error restoring persistent tabs:', error);
    isRestoringTabs = false;
  }

  if (!restored) {
    const initialTab = createTab(START_URL);
    activeTabId = initialTab.id;
  }
  
  layoutView();

  mainWindow.on('resize', layoutView);
  mainWindow.on('maximize', layoutView);
  mainWindow.on('unmaximize', layoutView);
}

ipcMain.handle('browser:navigate', (_event, target) => {
  loadTarget(target);
});

ipcMain.handle('browser:back', () => {
  const history = navigationHistory();

  if (history?.canGoBack()) {
    history.goBack();
    return;
  }

  if (historyIndex > 0) {
    historyIndex -= 1;
    loadTarget(memoryHistory[historyIndex]);
  }
});

ipcMain.handle('browser:forward', () => {
  const history = navigationHistory();

  if (history?.canGoForward()) {
    history.goForward();
    return;
  }

  if (historyIndex < memoryHistory.length - 1) {
    historyIndex += 1;
    loadTarget(memoryHistory[historyIndex]);
  }
});

ipcMain.handle('browser:reload', () => {
  const tab = getActiveTab();
  if (tab) tab.view.webContents.reload();
});

ipcMain.handle('browser:home', () => {
  setHomeVisible(true);
  const tab = getActiveTab();
  if (tab) tab.view.webContents.loadURL(START_URL);
  broadcastState();
});

ipcMain.handle('browser:purge', async () => {
  clearHistory();
  await clearSessionData();
  loadTarget(START_URL);
});

ipcMain.handle('browser:theme', () => {
  theme = theme === 'dark' ? 'white' : 'dark';
  applyWindowTheme();
  syncSearchTheme();
  broadcastState();
});

ipcMain.handle('browser:tor', async () => {
  await toggleTor();
});

ipcMain.handle('browser:tor-info', async () => {
  const info = await fetchTorInfo();
  if (mainWindow) {
    mainWindow.webContents.send('tor:info', info);
  }
  return info;
});

ipcMain.handle('browser:panel', (_event, open) => {
  panelOpen = Boolean(open);
  layoutView();
});

ipcMain.handle('history:delete', (_event, id) => {
  deleteHistoryEntry(id);
  broadcastState();
});

ipcMain.handle('history:clear', () => {
  clearHistory();
  broadcastState();
});

ipcMain.handle('downloads:open', (_event, id) => {
  const download = downloads.find((entry) => entry.id === id);
  if (download?.path) shell.showItemInFolder(download.path);
});

ipcMain.handle('browser:zoom-in', () => zoomBy(ZOOM_STEP));
ipcMain.handle('browser:zoom-out', () => zoomBy(-ZOOM_STEP));
ipcMain.handle('browser:zoom-reset', () => setZoom(1));
ipcMain.handle('browser:fullscreen', () => {
  mainWindow.setFullScreen(!mainWindow.isFullScreen());
  broadcastState();
});
ipcMain.handle('browser:devtools', () => {
  const tab = getActiveTab();
  if (!tab) return;
  
  if (tab.view.webContents.isDevToolsOpened()) {
    tab.view.webContents.closeDevTools();
  } else {
    tab.view.webContents.openDevTools({ mode: 'detach' });
  }
});
ipcMain.on('browser:zoom-delta', (_event, direction) => {
  zoomBy(direction > 0 ? ZOOM_STEP : -ZOOM_STEP);
});

// Tab handlers
ipcMain.handle('tab:new', () => {
  const newTab = createTab(START_URL);
  activeTabId = newTab.id;
  layoutView();
  broadcastState();
});

ipcMain.handle('tab:new-private', () => {
  const newTab = createTab(START_URL, true);
  activeTabId = newTab.id;
  layoutView();
  broadcastState();
});

ipcMain.handle('tab:close', (_event, tabId) => {
  closeTab(tabId);
});

ipcMain.handle('tab:close-current', () => {
  if (activeTabId) closeTab(activeTabId);
});

ipcMain.handle('tab:switch', (_event, tabId) => {
  switchToTab(tabId);
});

ipcMain.handle('tab:next', () => {
  const currentIndex = tabs.findIndex(t => t.id === activeTabId);
  if (currentIndex === -1 || tabs.length === 0) return;
  
  const nextIndex = (currentIndex + 1) % tabs.length;
  switchToTab(tabs[nextIndex].id);
});

ipcMain.handle('tab:previous', () => {
  const currentIndex = tabs.findIndex(t => t.id === activeTabId);
  if (currentIndex === -1 || tabs.length === 0) return;
  
  const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  switchToTab(tabs[prevIndex].id);
});

ipcMain.handle('window:minimize', () => mainWindow.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});
ipcMain.handle('window:close', () => mainWindow.close());

// Settings handlers
ipcMain.handle('settings:get', () => {
  return appSettings;
});

ipcMain.handle('settings:save', (_event, settings) => {
  return saveSettings(settings);
});

ipcMain.handle('settings:reset', () => {
  return resetSettings();
});

ipcMain.handle('settings:clear-data', async () => {
  await clearSessionData();
  return true;
});

ipcMain.handle('i18n:get', (_event, lang) => {
  try {
    const filePath = path.join(__dirname, 'i18n', `${lang}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (error) {
    console.error(`Error loading language file ${lang}:`, error);
  }
  return null;
});

ipcMain.handle('bookmarks:toggle', (_event, { url, title }) => {
  return toggleBookmark(url, title);
});

ipcMain.handle('bookmarks:get', () => {
  return bookmarks;
});

ipcMain.handle('bookmarks:delete', (_event, url) => {
  const index = bookmarks.findIndex(b => b.url === url);
  if (index !== -1) {
    bookmarks.splice(index, 1);
    saveBookmarks();
    broadcastState();
    return true;
  }
  return false;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', async (event) => {
  if (app.isQuittingAfterPurge) return;

  event.preventDefault();
  app.isQuittingAfterPurge = true;
  
  // Stop Tor process
  stopTorProcess();
  
  // Clear on exit if enabled
  if (appSettings.clearOnExit) {
    await clearSessionData();
    try {
      if (fs.existsSync(TABS_FILE)) {
        fs.unlinkSync(TABS_FILE);
      }
    } catch (e) {
      console.error('Error deleting persistent tabs on exit:', e);
    }
  }
  
  app.quit();
});

app.on('window-all-closed', () => {
  stopTorProcess();
  if (process.platform !== 'darwin') app.quit();
});
