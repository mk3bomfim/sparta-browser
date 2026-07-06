document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');
  const heroBtn = document.getElementById('downloadHeroBtn');
  const heroLabel = document.getElementById('heroDownloadLabel');
  
  // Theme Switching Logic
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.body.setAttribute('data-theme', savedTheme);
  updateThemeButton(savedTheme);

  themeToggle.addEventListener('click', () => {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeButton(newTheme);
  });

  function updateThemeButton(theme) {
    const modeText = themeToggle.querySelector('.mode-text');
    if (modeText) {
      modeText.textContent = theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE';
    }
  }

  // --- OS Detection ---
  function detectOS() {
    const ua = navigator.userAgent || navigator.platform || '';
    if (/Mac/i.test(ua)) return 'mac';
    if (/Linux/i.test(ua) && !/Android/i.test(ua)) return 'linux';
    return 'windows'; // default
  }

  const detectedOS = detectOS();

  // Highlight detected OS card
  const cardMap = { windows: 'cardWindows', mac: 'cardMac', linux: 'cardLinux' };
  const detectedCard = document.getElementById(cardMap[detectedOS]);
  if (detectedCard) {
    detectedCard.classList.add('detected');
  }

  // Update hero button label based on OS
  const labelMap = {
    windows: 'DOWNLOAD FOR WINDOWS',
    mac: 'DOWNLOAD FOR MACOS',
    linux: 'DOWNLOAD FOR LINUX'
  };
  if (heroLabel) {
    heroLabel.textContent = labelMap[detectedOS] || 'DOWNLOAD';
  }

  // Hero button scrolls to downloads section
  if (heroBtn) {
    heroBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById('downloads');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // --- Platform Download Buttons ---
  const platformBtns = document.querySelectorAll('.btn-dl-platform');
  platformBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const platform = btn.getAttribute('data-platform');
      showDownloadToast(platform);
    });
  });

  function showDownloadToast(platform) {
    const instructions = {
      windows: {
        file: 'sparta-browser-v0.1.0-win64.zip',
        steps: `
          <strong>Installation:</strong><br>
          1. Extract the ZIP package.<br>
          2. Run <code>npm run download-tor</code> to fetch the Tor bundle (or manually place it in <code>resources/tor/</code>).<br>
          3. Launch <code>sparta-browser.exe</code> to begin browsing securely.
        `
      },
      mac: {
        file: 'sparta-browser-v0.1.0-mac-universal.dmg',
        steps: `
          <strong>Installation:</strong><br>
          1. Open the DMG and drag SpartaBrowser to Applications.<br>
          2. Right-click → Open to bypass Gatekeeper on first launch.<br>
          3. Tor Expert Bundle is included — anonymous browsing works immediately.
        `
      },
      linux: {
        file: 'sparta-browser-v0.1.0-linux-x64.AppImage',
        steps: `
          <strong>Installation:</strong><br>
          1. Download the AppImage file.<br>
          2. Run <code>chmod +x sparta-browser*.AppImage</code> in your terminal.<br>
          3. Execute the AppImage. Tor bundle is included.
        `
      }
    };

    const info = instructions[platform] || instructions.windows;

    // Remove existing toast
    let toast = document.getElementById('downloadToast');
    if (toast) toast.remove();

    toast = document.createElement('div');
    toast.id = 'downloadToast';
    toast.className = 'toast';
    toast.innerHTML = `
      <div class="toast-title">❖ SPARTABROWSER — ${platform.toUpperCase()}</div>
      <div class="toast-desc">
        Your download (<code>${info.file}</code>) has been initiated.<br><br>
        ${info.steps}
      </div>
      <button class="toast-close" type="button">CLOSE</button>
    `;
    document.body.appendChild(toast);
    
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.remove('active');
    });

    // Trigger animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.classList.add('active');
      });
    });
  }
});
