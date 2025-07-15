// Background Service Worker für PermanentPinnedTabs Extension

// Storage Keys
const STORAGE_KEY = 'permanentPinnedUrls';
const STATUS_KEY = 'lastStatus';

// Icon States
const ICON_GREEN = {
  "16": "icons/icon-16-green.png",
  "32": "icons/icon-32-green.png",
  "48": "icons/icon-48-green.png",
  "128": "icons/icon-128-green.png"
};

const ICON_RED = {
  "16": "icons/icon-16-red.png",
  "32": "icons/icon-32-red.png",
  "48": "icons/icon-48-red.png",
  "128": "icons/icon-128-red.png"
};

const ICON_DEFAULT = {
  "16": "icons/icon-16.png",
  "32": "icons/icon-32.png",
  "48": "icons/icon-48.png",
  "128": "icons/icon-128.png"
};

// Event Listeners
chrome.runtime.onStartup.addListener(checkAndPinTabs);
chrome.windows.onCreated.addListener(checkAndPinTabs);
chrome.tabs.onRemoved.addListener(handleTabRemoved);
chrome.tabs.onUpdated.addListener(handleTabUpdated);

// Hauptfunktion: Überprüfe und pinne Tabs
async function checkAndPinTabs() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    const urls = result[STORAGE_KEY] || [];
    
    if (urls.length === 0) {
      updateIcon('default');
      return;
    }

    const windows = await chrome.windows.getAll({ populate: true });
    let allTabsOk = true;

    for (const window of windows) {
      if (window.type !== 'normal') continue;

      const pinnedTabs = window.tabs.filter(tab => tab.pinned);
      const pinnedUrls = pinnedTabs.map(tab => normalizeUrl(tab.url));

      // Prüfe, welche URLs fehlen
      const missingUrls = urls.filter(url => !pinnedUrls.includes(normalizeUrl(url)));
      
      if (missingUrls.length > 0) {
        allTabsOk = false;
        
        // Öffne fehlende Tabs
        for (const url of missingUrls) {
          try {
            const tab = await chrome.tabs.create({
              url: url,
              windowId: window.id,
              pinned: true,
              active: false
            });
          } catch (error) {
            console.error(`Fehler beim Öffnen von ${url}:`, error);
          }
        }
      }

      // Prüfe, ob es angepinnte Tabs gibt, die nicht in der Liste stehen
      for (const tab of pinnedTabs) {
        const normalizedTabUrl = normalizeUrl(tab.url);
        if (!urls.some(url => normalizeUrl(url) === normalizedTabUrl)) {
          // Entpinne den Tab, falls er nicht in der Liste steht
          try {
            await chrome.tabs.update(tab.id, { pinned: false });
          } catch (error) {
            console.error(`Fehler beim Entpinnen von Tab ${tab.id}:`, error);
          }
        }
      }
    }

    // Aktualisiere Icon basierend auf Status
    updateIcon(allTabsOk ? 'green' : 'red');
    
  } catch (error) {
    console.error('Fehler bei checkAndPinTabs:', error);
    updateIcon('red');
  }
}

// Tab entfernt Handler
async function handleTabRemoved(tabId, removeInfo) {
  // Verzögerte Überprüfung, da andere Tabs sich noch ändern könnten
  setTimeout(checkAndPinTabs, 1000);
}

// Tab aktualisiert Handler
async function handleTabUpdated(tabId, changeInfo, tab) {
  if (changeInfo.pinned !== undefined) {
    // Verzögerte Überprüfung bei Pinning-Änderungen
    setTimeout(checkAndPinTabs, 500);
  }
}

// URL normalisieren für Vergleiche
function normalizeUrl(url) {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url);
    // Entferne Trailing Slash und Fragment
    let normalized = urlObj.origin + urlObj.pathname;
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    return normalized.toLowerCase();
  } catch (error) {
    return url.toLowerCase();
  }
}

// Icon aktualisieren
function updateIcon(status) {
  let iconPath;
  
  switch (status) {
    case 'green':
      iconPath = ICON_GREEN;
      break;
    case 'red':
      iconPath = ICON_RED;
      break;
    default:
      iconPath = ICON_DEFAULT;
  }
  
  chrome.action.setIcon({ path: iconPath }).catch(error => {
    console.error('Fehler beim Setzen des Icons:', error);
  });
  
  // Speichere Status
  chrome.storage.local.set({ [STATUS_KEY]: status });
}

// Öffentliche Funktionen für Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'addUrl') {
    addPermanentUrl(request.url).then(sendResponse);
    return true; // Async response
  } else if (request.action === 'removeUrl') {
    removePermanentUrl(request.url).then(sendResponse);
    return true; // Async response
  } else if (request.action === 'getUrls') {
    getPermanentUrls().then(sendResponse);
    return true; // Async response
  } else if (request.action === 'forceCheck') {
    checkAndPinTabs().then(() => sendResponse({ success: true }));
    return true; // Async response
  }
});

// URL zur permanenten Liste hinzufügen
async function addPermanentUrl(url) {
  try {
    if (!isValidUrl(url)) {
      return { success: false, error: 'Ungültige URL' };
    }
    
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    const urls = result[STORAGE_KEY] || [];
    
    const normalizedUrl = normalizeUrl(url);
    const exists = urls.some(existingUrl => normalizeUrl(existingUrl) === normalizedUrl);
    
    if (exists) {
      return { success: false, error: 'URL bereits in der Liste' };
    }
    
    urls.push(url);
    await chrome.storage.local.set({ [STORAGE_KEY]: urls });
    
    // Sofortige Überprüfung nach Hinzufügung
    setTimeout(checkAndPinTabs, 100);
    
    return { success: true };
  } catch (error) {
    console.error('Fehler beim Hinzufügen der URL:', error);
    return { success: false, error: error.message };
  }
}

// URL aus permanenter Liste entfernen
async function removePermanentUrl(url) {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    const urls = result[STORAGE_KEY] || [];
    
    const normalizedUrl = normalizeUrl(url);
    const filteredUrls = urls.filter(existingUrl => normalizeUrl(existingUrl) !== normalizedUrl);
    
    if (filteredUrls.length === urls.length) {
      return { success: false, error: 'URL nicht in der Liste gefunden' };
    }
    
    await chrome.storage.local.set({ [STORAGE_KEY]: filteredUrls });
    
    // Entpinne entsprechende Tabs
    const windows = await chrome.windows.getAll({ populate: true });
    for (const window of windows) {
      const tabsToUnpin = window.tabs.filter(tab => 
        tab.pinned && normalizeUrl(tab.url) === normalizedUrl
      );
      
      for (const tab of tabsToUnpin) {
        try {
          await chrome.tabs.update(tab.id, { pinned: false });
        } catch (error) {
          console.error(`Fehler beim Entpinnen von Tab ${tab.id}:`, error);
        }
      }
    }
    
    // Überprüfung nach Entfernung
    setTimeout(checkAndPinTabs, 100);
    
    return { success: true };
  } catch (error) {
    console.error('Fehler beim Entfernen der URL:', error);
    return { success: false, error: error.message };
  }
}

// Alle permanenten URLs abrufen
async function getPermanentUrls() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    return { success: true, urls: result[STORAGE_KEY] || [] };
  } catch (error) {
    console.error('Fehler beim Abrufen der URLs:', error);
    return { success: false, error: error.message, urls: [] };
  }
}

// URL-Validierung
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

// Initialisierung beim Start der Extension
chrome.runtime.onInstalled.addListener(() => {
  // Setze Standard-Icon
  updateIcon('default');
  
  // Erste Überprüfung nach Installation
  setTimeout(checkAndPinTabs, 2000);
});

// Verzögerte Überprüfung beim Start
setTimeout(checkAndPinTabs, 3000); 