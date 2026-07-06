// Simple i18n system
let currentLanguage = 'pt-BR';
let translations = {};

async function loadLanguage(lang) {
  try {
    const data = await window.sparta.getLanguage(lang);
    if (data) {
      translations = data;
      currentLanguage = lang;
      applyTranslations();
      return true;
    }
  } catch (error) {
    console.error('Error loading language:', error);
  }
  return false;
}

function t(key) {
  const keys = key.split('.');
  let value = translations;
  
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      return key;
    }
  }
  
  return value || key;
}

function applyTranslations() {
  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const text = t(key);
    
    if (element.tagName === 'INPUT' && element.placeholder !== undefined) {
      element.placeholder = text;
    } else {
      element.textContent = text;
    }
  });
  
  // Update all elements with data-i18n-title attribute
  document.querySelectorAll('[data-i18n-title]').forEach(element => {
    const key = element.getAttribute('data-i18n-title');
    element.title = t(key);
  });
}

// Export functions
window.i18n = {
  load: loadLanguage,
  t: t,
  getCurrentLanguage: () => currentLanguage
};
