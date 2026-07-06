const controls = {
  back: document.querySelector('#back'),
  forward: document.querySelector('#forward'),
  reload: document.querySelector('#reload'),
  home: document.querySelector('#home'),
  purge: document.querySelector('#purge'),
  torButton: document.querySelector('#torButton'),
  torStatus: document.querySelector('#torStatus'),
  torIP: document.querySelector('#torIP'),
  torLocation: document.querySelector('#torLocation'),
  torCircuit: document.querySelector('#torCircuit'),
  menuButton: document.querySelector('#menuButton'),
  themeButton: document.querySelector('#themeButton'),
  historyButton: document.querySelector('#historyButton'),
  downloadsButton: document.querySelector('#downloadsButton'),
  clearHistory: document.querySelector('#clearHistory'),
  minimize: document.querySelector('#minimize'),
  maximize: document.querySelector('#maximize'),
  close: document.querySelector('#close'),
  panel: document.querySelector('#panel'),
  historyPanel: document.querySelector('#historyPanel'),
  downloadsPanel: document.querySelector('#downloadsPanel'),
  bookmarksPanel: document.querySelector('#bookmarksPanel'),
  menuPanel: document.querySelector('#menuPanel'),
  settingsPanel: document.querySelector('#settingsPanel'),
  torPanel: document.querySelector('#torPanel'),
  closePanelHistory: document.querySelector('#closePanelHistory'),
  closePanelDownloads: document.querySelector('#closePanelDownloads'),
  closePanelBookmarks: document.querySelector('#closePanelBookmarks'),
  closePanelSettings: document.querySelector('#closePanelSettings'),
  closePanelTor: document.querySelector('#closePanelTor'),
  torToggleSwitch: document.querySelector('#torToggleSwitch'),
  torBridgeType: document.querySelector('#torBridgeType'),
  torCustomBridges: document.querySelector('#torCustomBridges'),
  torCustomBridgesContainer: document.querySelector('#torCustomBridgesContainer'),
  historyList: document.querySelector('#historyList'),
  downloadsList: document.querySelector('#downloadsList'),
  form: document.querySelector('#bar'),
  url: document.querySelector('#url'),
  homepage: document.querySelector('#homepage'),
  homeSearch: document.querySelector('#homeSearch'),
  homeUrl: document.querySelector('#homeUrl'),
  menuNewTab: document.querySelector('#menuNewTab'),
  menuNewPrivateTab: document.querySelector('#menuNewPrivateTab'),
  menuCloseTab: document.querySelector('#menuCloseTab'),
  menuTorToggle: document.querySelector('#menuTorToggle'),
  menuSettings: document.querySelector('#menuSettings'),
  menuZoomIn: document.querySelector('#menuZoomIn'),
  menuZoomOut: document.querySelector('#menuZoomOut'),
  menuZoomReset: document.querySelector('#menuZoomReset'),
  menuFullscreen: document.querySelector('#menuFullscreen'),
  menuDevTools: document.querySelector('#menuDevTools'),
  menuLanguage: document.querySelector('#menuLanguage'),
  menuHistory: document.querySelector('#menuHistory'),
  menuDownloads: document.querySelector('#menuDownloads'),
  tabsList: document.querySelector('#tabsList'),
  newTab: document.querySelector('#newTab'),
  settingsButton: document.querySelector('#settingsButton'),
  // Settings
  settingLanguage: document.querySelector('#settingLanguage'),
  settingTheme: document.querySelector('#settingTheme'),
  settingClearOnExit: document.querySelector('#settingClearOnExit'),
  settingDNT: document.querySelector('#settingDNT'),
  settingAdBlock: document.querySelector('#settingAdBlock'),
  settingSearchEngine: document.querySelector('#settingSearchEngine'),
  settingTorPort: document.querySelector('#settingTorPort'),
  settingHardwareAccel: document.querySelector('#settingHardwareAccel'),
  settingJavaScript: document.querySelector('#settingJavaScript'),
  settingsClearStorage: document.querySelector('#settingsClearStorage'),
  settingsSave: document.querySelector('#settingsSave'),
  settingsReset: document.querySelector('#settingsReset'),
  bookmarkToggle: document.querySelector('#bookmarkToggle'),
  bookmarksButton: document.querySelector('#bookmarksButton'),
  bookmarksList: document.querySelector('#bookmarksList')
};

const icons = {
  reload: controls.reload.querySelector('.material-symbols-outlined'),
  theme: controls.themeButton.querySelector('.material-symbols-outlined'),
  tor: controls.torButton.querySelector('.material-symbols-outlined')
};

let activePanel = null;
// Keep Tor info updated when the panel is open
let torInfoInterval = null;
let currentUrl = '';
let currentTitle = '';

function renderTabs(tabs, activeTabId) {
  controls.tabsList.replaceChildren();

  tabs.forEach((tab) => {
    const tabElement = document.createElement('button');
    const title = document.createElement('span');
    const closeBtn = document.createElement('button');

    tabElement.className = tab.id === activeTabId ? 'tab active' : 'tab';
    tabElement.type = 'button';
    if (tab.isPrivate) {
      tabElement.classList.add('private');
    }

    title.className = 'tab-title';
    title.textContent = tab.title || 'Nova guia';

    closeBtn.className = 'tab-close';
    closeBtn.type = 'button';
    closeBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.sparta.closeTab(tab.id);
    });

    tabElement.addEventListener('click', () => {
      window.sparta.switchTab(tab.id);
    });

    if (tab.isPrivate) {
      const privateIcon = document.createElement('span');
      privateIcon.className = 'material-symbols-outlined private-icon';
      privateIcon.textContent = 'visibility_off';
      tabElement.append(privateIcon);
    }

    tabElement.append(title, closeBtn);
    controls.tabsList.append(tabElement);
  });
}

function setPanel(name) {
  activePanel = activePanel === name ? null : name;

  // Clear any existing Tor info polling interval
  clearInterval(torInfoInterval);
  torInfoInterval = null;

  if (activePanel) {
    controls.panel.classList.add('open');
    controls.historyPanel.classList.toggle('open', activePanel === 'history');
    controls.downloadsPanel.classList.toggle('open', activePanel === 'downloads');
    controls.bookmarksPanel.classList.toggle('open', activePanel === 'bookmarks');
    controls.menuPanel.classList.toggle('open', activePanel === 'menu');
    controls.settingsPanel.classList.toggle('open', activePanel === 'settings');
    controls.torPanel.classList.toggle('open', activePanel === 'tor');

    // Start polling Tor info if opening Tor panel
    if (activePanel === 'tor') {
      window.sparta.getTorInfo();
      torInfoInterval = setInterval(() => {
        window.sparta.getTorInfo();
      }, 1500);
    }
  } else {
    controls.panel.classList.remove('open');
    controls.historyPanel.classList.remove('open');
    controls.downloadsPanel.classList.remove('open');
    controls.bookmarksPanel.classList.remove('open');
    controls.menuPanel.classList.remove('open');
    controls.settingsPanel.classList.remove('open');
    controls.torPanel.classList.remove('open');
  }

  window.sparta.setPanel(Boolean(activePanel));

  // Load settings when opening settings panel or Tor panel
  if (activePanel === 'settings' || activePanel === 'tor') {
    loadSettings();
  }
}

function closePanel() {
  activePanel = null;
  clearInterval(torInfoInterval);
  torInfoInterval = null;
  controls.panel.classList.remove('open');
  controls.historyPanel.classList.remove('open');
  controls.downloadsPanel.classList.remove('open');
  controls.bookmarksPanel.classList.remove('open');
  controls.menuPanel.classList.remove('open');
  controls.settingsPanel.classList.remove('open');
  controls.torPanel.classList.remove('open');
  window.sparta.setPanel(false);
}

// Settings management
async function loadSettings() {
  const settings = await window.sparta.getSettings();
  controls.settingLanguage.value = settings.language || 'pt-BR';
  controls.settingTheme.value = settings.theme || 'dark';
  controls.settingClearOnExit.checked = settings.clearOnExit !== false;
  controls.settingSearchEngine.value = settings.searchEngine || 'duckduckgo';
  controls.settingTorPort.value = settings.torPort || 9150;
  controls.settingHardwareAccel.checked = settings.hardwareAccel !== false;
  controls.settingSecureDns.value = settings.secureDns || 'off';
  
  if (controls.settingJavaScript) {
    controls.settingJavaScript.checked = settings.javascriptEnabled !== false;
  }

  if (controls.settingAdBlock) {
    controls.settingAdBlock.checked = settings.adBlockEnabled !== false;
  }

  // Load Tor bridge settings
  const bridgeType = settings.torBridgeType || 'none';
  if (controls.torBridgeType) {
    controls.torBridgeType.value = bridgeType;
  }
  if (controls.torCustomBridges) {
    controls.torCustomBridges.value = settings.torCustomBridges || '';
  }
  if (controls.torCustomBridgesContainer) {
    controls.torCustomBridgesContainer.hidden = bridgeType !== 'custom';
  }

  // Load language
  if (window.i18n) {
    await window.i18n.load(settings.language || 'pt-BR');
  }

  if (controls.menuLanguage) {
    controls.menuLanguage.value = settings.language || 'pt-BR';
  }
}

async function saveSettings() {
  const settings = {
    language: controls.settingLanguage.value,
    theme: controls.settingTheme.value,
    clearOnExit: controls.settingClearOnExit.checked,
    searchEngine: controls.settingSearchEngine.value,
    torPort: parseInt(controls.settingTorPort.value),
    hardwareAccel: controls.settingHardwareAccel.checked,
    secureDns: controls.settingSecureDns.value,
    torBridgeType: controls.torBridgeType ? controls.torBridgeType.value : 'none',
    torCustomBridges: controls.torCustomBridges ? controls.torCustomBridges.value : '',
    javascriptEnabled: controls.settingJavaScript ? controls.settingJavaScript.checked : true,
    adBlockEnabled: controls.settingAdBlock ? controls.settingAdBlock.checked : true
  };

  await window.sparta.saveSettings(settings);

  // Apply language immediately
  if (window.i18n && settings.language !== window.i18n.getCurrentLanguage()) {
    await window.i18n.load(settings.language);
  }

  if (controls.menuLanguage) {
    controls.menuLanguage.value = settings.language;
  }

  // Apply theme immediately
  if (settings.theme !== document.body.dataset.theme) {
    window.sparta.toggleTheme();
  }

  closePanel();
}

async function resetSettings() {
  const message = window.i18n ? window.i18n.t('settings.resetConfirm') : 'Restaurar todas as configurações para os valores padrão?';
  if (confirm(message)) {
    await window.sparta.resetSettings();
    await loadSettings();
  }
}

// Initialize language on load
window.addEventListener('DOMContentLoaded', async () => {
  const settings = await window.sparta.getSettings();
  if (window.i18n) {
    await window.i18n.load(settings.language || 'pt-BR');
  }
  if (controls.menuLanguage) {
    controls.menuLanguage.value = settings.language || 'pt-BR';
  }
});

function displayDate(value) {
  return new Date(value).toLocaleString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit'
  });
}

function renderHistory(entries) {
  controls.historyList.replaceChildren();

  if (!entries.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Nenhum histórico nesta sessão';
    controls.historyList.append(empty);
    return;
  }

  entries.forEach((entry) => {
    const item = document.createElement('li');
    const container = document.createElement('div');
    const button = document.createElement('button');
    const content = document.createElement('div');
    const title = document.createElement('strong');
    const meta = document.createElement('span');
    const deleteBtn = document.createElement('button');

    container.className = 'history-item';
    button.className = 'history-link';
    button.type = 'button';
    content.className = 'history-content';

    title.textContent = entry.title || entry.url;
    meta.textContent = `${displayDate(entry.visitedAt)} • ${entry.url}`;

    content.append(title, meta);
    button.append(content);
    button.addEventListener('click', () => {
      window.sparta.navigate(entry.url);
      closePanel();
    });

    deleteBtn.className = 'delete-btn';
    deleteBtn.type = 'button';
    deleteBtn.title = 'Remover do histórico';
    deleteBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.sparta.deleteHistory(entry.id);
    });

    container.append(button, deleteBtn);
    item.append(container);
    controls.historyList.append(item);
  });
}

function renderBookmarks(entries) {
  controls.bookmarksList.replaceChildren();

  if (!entries || !entries.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Nenhum favorito adicionado';
    controls.bookmarksList.append(empty);
    return;
  }

  entries.forEach((entry) => {
    const item = document.createElement('li');
    const container = document.createElement('div');
    const button = document.createElement('button');
    const content = document.createElement('div');
    const title = document.createElement('strong');
    const meta = document.createElement('span');
    const deleteBtn = document.createElement('button');

    container.className = 'history-item';
    button.className = 'history-link';
    button.type = 'button';
    content.className = 'history-content';

    title.textContent = entry.title || entry.url;
    meta.textContent = entry.url;

    content.append(title, meta);
    button.append(content);
    button.addEventListener('click', () => {
      window.sparta.navigate(entry.url);
      closePanel();
    });

    deleteBtn.className = 'delete-btn';
    deleteBtn.type = 'button';
    deleteBtn.title = 'Remover dos favoritos';
    deleteBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.sparta.deleteBookmark(entry.url);
    });

    container.append(button, deleteBtn);
    item.append(container);
    controls.bookmarksList.append(item);
  });
}

function renderDownloads(entries) {
  controls.downloadsList.replaceChildren();

  if (!entries.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Nenhum download nesta sessão';
    controls.downloadsList.append(empty);
    return;
  }

  entries.forEach((entry) => {
    const item = document.createElement('li');
    const container = document.createElement('div');
    const button = document.createElement('button');
    const content = document.createElement('div');
    const title = document.createElement('strong');
    const meta = document.createElement('span');

    container.className = 'history-item';
    button.className = 'history-link';
    button.type = 'button';
    content.className = 'history-content';

    title.textContent = entry.filename;

    const stateText = entry.state === 'completed' ? 'Concluído' :
      entry.state === 'progressing' ? 'Baixando' :
        entry.state === 'cancelled' ? 'Cancelado' :
          'Aguardando';
    meta.textContent = `${stateText} • ${entry.progress || 0}%`;

    content.append(title, meta);
    button.append(content);
    button.addEventListener('click', () => window.sparta.openDownload(entry.id));

    container.append(button);
    item.append(container);
    controls.downloadsList.append(item);
  });
}

controls.form.addEventListener('submit', (event) => {
  event.preventDefault();
  window.sparta.navigate(controls.url.value);
  controls.url.blur();
});

controls.homeSearch.addEventListener('submit', (event) => {
  event.preventDefault();
  window.sparta.navigate(controls.homeUrl.value);
  controls.homeUrl.value = '';
});

controls.back.addEventListener('click', () => window.sparta.back());
controls.forward.addEventListener('click', () => window.sparta.forward());
controls.reload.addEventListener('click', () => window.sparta.reload());
controls.home.addEventListener('click', () => window.sparta.home());
controls.torButton.addEventListener('click', () => setPanel('tor'));
controls.menuButton.addEventListener('click', () => setPanel('menu'));
controls.themeButton.addEventListener('click', () => window.sparta.toggleTheme());
controls.purge.addEventListener('click', () => {
  window.sparta.purge();
  closePanel();
});
controls.bookmarksButton.addEventListener('click', () => setPanel('bookmarks'));
controls.historyButton.addEventListener('click', () => setPanel('history'));
controls.downloadsButton.addEventListener('click', () => setPanel('downloads'));
controls.settingsButton.addEventListener('click', () => setPanel('settings'));
controls.closePanelBookmarks.addEventListener('click', closePanel);

controls.bookmarkToggle.addEventListener('click', async () => {
  if (currentUrl) {
    await window.sparta.toggleBookmark(currentUrl, currentTitle);
  }
});
controls.clearHistory.addEventListener('click', () => {
  window.sparta.clearHistory();
  closePanel();
});
controls.closePanelHistory.addEventListener('click', closePanel);
controls.closePanelDownloads.addEventListener('click', closePanel);
controls.closePanelTor.addEventListener('click', closePanel);
controls.torToggleSwitch.addEventListener('change', () => window.sparta.toggleTor());
controls.minimize.addEventListener('click', () => window.sparta.minimize());
controls.maximize.addEventListener('click', () => window.sparta.maximize());
controls.close.addEventListener('click', () => window.sparta.close());

// Tor Bridge actions
if (controls.torBridgeType) {
  controls.torBridgeType.addEventListener('change', async () => {
    const bridgeType = controls.torBridgeType.value;
    if (controls.torCustomBridgesContainer) {
      controls.torCustomBridgesContainer.hidden = bridgeType !== 'custom';
    }
    
    const settings = await window.sparta.getSettings();
    settings.torBridgeType = bridgeType;
    await window.sparta.saveSettings(settings);
  });
}

if (controls.torCustomBridges) {
  controls.torCustomBridges.addEventListener('blur', async () => {
    const customBridges = controls.torCustomBridges.value;
    const settings = await window.sparta.getSettings();
    settings.torBridgeType = controls.torBridgeType ? controls.torBridgeType.value : 'none';
    settings.torCustomBridges = customBridges;
    await window.sparta.saveSettings(settings);
  });
}

// Tab actions
controls.newTab.addEventListener('click', () => window.sparta.newTab());

// Menu actions
controls.menuNewTab.addEventListener('click', () => {
  window.sparta.newTab();
  closePanel();
});
controls.menuNewPrivateTab.addEventListener('click', () => {
  window.sparta.newPrivateTab();
  closePanel();
});
controls.menuCloseTab.addEventListener('click', () => {
  window.sparta.closeCurrentTab();
  closePanel();
});
controls.menuTorToggle.addEventListener('click', () => {
  window.sparta.toggleTor();
  closePanel();
});
controls.menuZoomIn.addEventListener('click', () => {
  window.sparta.zoomIn();
  closePanel();
});
controls.menuZoomOut.addEventListener('click', () => {
  window.sparta.zoomOut();
  closePanel();
});
controls.menuZoomReset.addEventListener('click', () => {
  window.sparta.zoomReset();
  closePanel();
});
controls.menuFullscreen.addEventListener('click', () => {
  window.sparta.fullscreen();
  closePanel();
});
controls.menuDevTools.addEventListener('click', () => {
  window.sparta.devTools();
  closePanel();
});
controls.menuSettings.addEventListener('click', () => {
  setPanel('settings');
});
controls.menuHistory.addEventListener('click', () => {
  setPanel('history');
});
controls.menuDownloads.addEventListener('click', () => {
  setPanel('downloads');
});

controls.menuLanguage.addEventListener('change', async () => {
  const lang = controls.menuLanguage.value;
  const settings = await window.sparta.getSettings();
  settings.language = lang;
  await window.sparta.saveSettings(settings);
  if (window.i18n) {
    await window.i18n.load(lang);
  }
  if (controls.settingLanguage) {
    controls.settingLanguage.value = lang;
  }
});

// Settings actions
controls.closePanelSettings.addEventListener('click', closePanel);
controls.settingsSave.addEventListener('click', saveSettings);
controls.settingsReset.addEventListener('click', resetSettings);
controls.settingsClearStorage.addEventListener('click', async () => {
  const confirm = window.confirm("Deseja deletar todos os cookies, cache e armazenamento local imediatamente?");
  if (confirm) {
    await window.sparta.clearStorage();
    window.alert("Dados locais deletados com sucesso!");
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (event) => {
  // Ctrl+T - New tab
  if (event.ctrlKey && !event.shiftKey && event.key === 't') {
    event.preventDefault();
    window.sparta.newTab();
    return;
  }

  // Ctrl+Shift+P - New private tab
  if (event.ctrlKey && event.shiftKey && (event.key === 'p' || event.key === 'P')) {
    event.preventDefault();
    window.sparta.newPrivateTab();
    return;
  }

  // Ctrl+W - Close tab
  if (event.ctrlKey && event.key === 'w') {
    event.preventDefault();
    window.sparta.closeCurrentTab();
    return;
  }

  // Ctrl+Tab - Next tab
  if (event.ctrlKey && event.key === 'Tab' && !event.shiftKey) {
    event.preventDefault();
    window.sparta.nextTab();
    return;
  }

  // Ctrl+Shift+Tab - Previous tab
  if (event.ctrlKey && event.key === 'Tab' && event.shiftKey) {
    event.preventDefault();
    window.sparta.previousTab();
    return;
  }

  // Alt+F - Menu
  if (event.altKey && event.key === 'f') {
    event.preventDefault();
    setPanel('menu');
    return;
  }

  // Ctrl+Plus/Minus - Zoom
  if (event.ctrlKey && (event.key === '+' || event.key === '=')) {
    event.preventDefault();
    window.sparta.zoomIn();
    return;
  }
  if (event.ctrlKey && (event.key === '-' || event.key === '_')) {
    event.preventDefault();
    window.sparta.zoomOut();
    return;
  }
  if (event.ctrlKey && event.key === '0') {
    event.preventDefault();
    window.sparta.zoomReset();
    return;
  }

  // F11 - Fullscreen
  if (event.key === 'F11') {
    event.preventDefault();
    window.sparta.fullscreen();
    return;
  }

  // F12 - DevTools
  if (event.key === 'F12') {
    event.preventDefault();
    window.sparta.devTools();
    return;
  }

  // Escape - Close panel
  if (event.key === 'Escape' && activePanel) {
    event.preventDefault();
    closePanel();
    return;
  }
});

window.sparta.onState((state) => {
  currentUrl = state.url || '';
  currentTitle = state.title || '';

  controls.url.value = currentUrl;
  controls.back.disabled = !state.canGoBack;
  controls.forward.disabled = !state.canGoForward;
  icons.reload.textContent = state.loading ? 'close' : 'refresh';

  // Update bookmarked icon status
  const isBookmarked = state.bookmarks && state.bookmarks.some(b => b.url === currentUrl);
  if (controls.bookmarkToggle) {
    const starIcon = controls.bookmarkToggle.querySelector('.material-symbols-outlined');
    if (isBookmarked) {
      controls.bookmarkToggle.classList.add('active');
      if (starIcon) starIcon.textContent = 'star';
    } else {
      controls.bookmarkToggle.classList.remove('active');
      if (starIcon) starIcon.textContent = 'star_border';
    }
  }

  // Render bookmarks panel
  renderBookmarks(state.bookmarks || []);
  document.body.dataset.theme = state.theme || 'dark';
  icons.theme.textContent = state.theme === 'white' ? 'light_mode' : 'dark_mode';
  controls.themeButton.title = state.theme === 'white' ? 'Tema branco' : 'Tema preto';
  document.body.dataset.loading = state.loading ? 'true' : 'false';

  // Tor mode
  document.body.dataset.tor = state.torEnabled ? 'true' : 'false';
  icons.tor.textContent = state.torEnabled ? 'verified_user' : 'shield';
  controls.torButton.title = state.torEnabled ? 'Modo Tor (Ativado)' : 'Modo Tor (Desativado)';
  controls.torButton.classList.toggle('tor-active', state.torEnabled);
  if (controls.torToggleSwitch) {
    controls.torToggleSwitch.checked = state.torEnabled;
  }
  const menuTorShortcut = controls.menuTorToggle.querySelector('.shortcut');
  if (menuTorShortcut) {
    menuTorShortcut.textContent = state.torEnabled ? 'Ativado' : 'Desativado';
  }

  // Show/hide homepage
  controls.homepage.classList.toggle('visible', state.isHome);

  // Render tabs
  renderTabs(state.tabs || [], state.activeTabId);

  renderHistory(state.history || []);
  renderDownloads(state.downloads || []);
});

window.sparta.onTorInfo((info) => {
  controls.torStatus.textContent = info.status;
  controls.torIP.textContent = info.ip;
  controls.torLocation.textContent = info.location;
  controls.torCircuit.textContent = info.circuit;
});
