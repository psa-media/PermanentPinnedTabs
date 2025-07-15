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

// State tracking
let isInitializing = false;
let lastCheckTime = 0;

// Event Listeners
chrome.runtime.onStartup.addListener(handleStartup);
chrome.windows.onCreated.addListener(handleWindowCreated);
chrome.tabs.onRemoved.addListener(handleTabRemoved);
chrome.tabs.onUpdated.addListener(handleTabUpdated);

// Handler für Chrome-Start
async function handleStartup() {
  console.log('Chrome startup detected');
  isInitializing = true;
  
  // Warte kurz, damit alle Fenster geladen werden
  setTimeout(async () => {
    await checkAndPinTabs('startup');
    isInitializing = false;
  }, 2000);
}

// Handler für neues Fenster
async function handleWindowCreated(window) {
  console.log('New window created:', window.id);
  
  // Ignoriere während der Initialisierung oder wenn es kein normales Fenster ist
  if (isInitializing || window.type !== 'normal') {
    return;
  }
  
  // Warte kurz, damit das Fenster vollständig geladen wird
  setTimeout(() => {
    checkAndPinTabs('window-created', window.id);
  }, 1000);
}

// Hauptfunktion: Überprüfe und pinne Tabs
async function checkAndPinTabs(source = 'manual', targetWindowId = null) {
  const now = Date.now();
  
  // Verhindere zu häufige Aufrufe (mindestens 1 Sekunde Abstand)
  if (now - lastCheckTime < 1000) {
    console.log('Überspringe checkAndPinTabs - zu früh nach letztem Aufruf');
    return;
  }
  
  lastCheckTime = now;
  console.log('checkAndPinTabs aufgerufen von:', source);
  
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
      
      // Wenn targetWindowId angegeben ist, nur dieses Fenster bearbeiten
      if (targetWindowId && window.id !== targetWindowId) continue;

      const pinnedTabs = window.tabs.filter(tab => tab.pinned);
      const pinnedUrls = pinnedTabs.map(tab => normalizeUrl(tab.url));

      console.log(`Fenster ${window.id}: ${pinnedTabs.length} angepinnte Tabs gefunden`);
      console.log('Angepinnte URLs:', pinnedUrls);
      console.log('Gesuchte URLs:', urls.map(url => normalizeUrl(url)));

      // Prüfe, welche URLs fehlen
      const missingUrls = urls.filter(url => !pinnedUrls.includes(normalizeUrl(url)));
      
      if (missingUrls.length > 0) {
        console.log(`Fehlende URLs in Fenster ${window.id}:`, missingUrls);
        allTabsOk = false;
        
        // Öffne fehlende Tabs nur einmal pro Fenster
        for (const url of missingUrls) {
          try {
            console.log(`Erstelle angepinnten Tab für: ${url}`);
            const tab = await chrome.tabs.create({
              url: url,
              windowId: window.id,
              pinned: true,
              active: false
            });
            console.log(`Tab erstellt: ${tab.id} für ${url}`);
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
          console.log(`Entpinne Tab: ${tab.url} (nicht in Liste)`);
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
    console.log('checkAndPinTabs abgeschlossen, Status:', allTabsOk ? 'green' : 'red');
    
    // Initialisiere URL-Tracking für alle angepinnten Tabs
    await initializeUrlTracking();
    
  } catch (error) {
    console.error('Fehler bei checkAndPinTabs:', error);
    updateIcon('red');
  }
}

// Tab entfernt Handler
async function handleTabRemoved(tabId, removeInfo) {
  // Ignoriere während der Initialisierung
  if (isInitializing) return;
  
  console.log('Tab entfernt:', tabId);
  
  // Bereinige gespeicherte URL für diesen Tab
  try {
    const key = `prevUrl_${tabId}`;
    await chrome.storage.local.remove([key]);
  } catch (error) {
    console.error('Fehler beim Bereinigen der gespeicherten URL:', error);
  }
  
  // Verzögerte Überprüfung, da andere Tabs sich noch ändern könnten
  setTimeout(() => checkAndPinTabs('tab-removed'), 1000);
}

// Tab aktualisiert Handler
async function handleTabUpdated(tabId, changeInfo, tab) {
  // Ignoriere während der Initialisierung
  if (isInitializing) return;
  
  // Domain-Schutz: Prüfe URL-Änderungen in angepinnten Tabs
  if (changeInfo.url && tab.pinned) {
    await handlePinnedTabNavigation(tabId, changeInfo, tab);
  }
  
  if (changeInfo.pinned !== undefined) {
    console.log('Tab pinning geändert:', tabId, 'pinned:', changeInfo.pinned);
    // Verzögerte Überprüfung bei Pinning-Änderungen
    setTimeout(() => checkAndPinTabs('tab-updated'), 500);
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
    checkAndPinTabs('force-check').then(() => sendResponse({ success: true }));
    return true; // Async response
  } else if (request.action === 'checkTabProtection') {
    checkTabProtection(request.url, sender.tab).then(sendResponse);
    return true; // Async response
  } else if (request.action === 'openInNewTab') {
    openInNewTab(request.url, sender.tab, request.fromPinnedTab).then(sendResponse);
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
    setTimeout(() => checkAndPinTabs('url-added'), 100);
    
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
    setTimeout(() => checkAndPinTabs('url-removed'), 100);
    
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

// Domain-Schutz: Prüfe ob Tab geschützt werden soll
async function checkTabProtection(url, tab) {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    const urls = result[STORAGE_KEY] || [];
    
    if (!tab || !tab.pinned) {
      return { 
        isProtected: false, 
        isPinned: false, 
        originalDomain: null 
      };
    }
    
    const normalizedCurrentUrl = normalizeUrl(url);
    
    // Prüfe ob die aktuelle URL in der Liste der geschützten URLs ist
    const protectedUrl = urls.find(storedUrl => 
      normalizeUrl(storedUrl) === normalizedCurrentUrl
    );
    
    if (protectedUrl) {
      const originalDomain = extractDomain(protectedUrl);
      console.log(`Tab ${tab.id} ist geschützt für Domain: ${originalDomain}`);
      
      return {
        isProtected: true,
        isPinned: tab.pinned,
        originalDomain: originalDomain,
        originalUrl: protectedUrl
      };
    }
    
    return { 
      isProtected: false, 
      isPinned: tab.pinned, 
      originalDomain: null 
    };
    
  } catch (error) {
    console.error('Fehler bei checkTabProtection:', error);
    return { 
      isProtected: false, 
      isPinned: false, 
      originalDomain: null 
    };
  }
}

// Domain-Schutz: Öffne URL in neuem Tab
async function openInNewTab(url, sourceTab, fromPinnedTab = false) {
  try {
    console.log(`Öffne externe URL in neuem Tab: ${url} (von Tab ${sourceTab?.id})`);
    
    // Erstelle neuen Tab in demselben Fenster
    const newTab = await chrome.tabs.create({
      url: url,
      windowId: sourceTab?.windowId,
      active: true,
      pinned: false
    });
    
    console.log(`Neuer Tab erstellt: ${newTab.id} für ${url}`);
    
    return { success: true, tabId: newTab.id };
  } catch (error) {
    console.error('Fehler beim Öffnen in neuem Tab:', error);
    return { success: false, error: error.message };
  }
}

// Domain-Schutz: Navigation in angepinnten Tabs überwachen
async function handlePinnedTabNavigation(tabId, changeInfo, tab) {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    const urls = result[STORAGE_KEY] || [];
    
    const currentDomain = extractDomain(changeInfo.url);
    
    // Prüfe ob dieser Tab eine geschützte Domain verlässt
    for (const storedUrl of urls) {
      const storedDomain = extractDomain(storedUrl);
      const normalizedStored = normalizeUrl(storedUrl);
      
      // Prüfe ob der Tab ursprünglich zu dieser geschützten URL gehörte
      // Verwende tab.url (vorherige URL) für den Vergleich
      const previousUrl = await getPreviousTabUrl(tabId) || tab.url;
      if (previousUrl && normalizeUrl(previousUrl) === normalizedStored) {
        // Prüfe ob zu einer anderen Domain navigiert wird
        if (currentDomain !== storedDomain) {
          console.log(`Domain-Wechsel erkannt in angepinntem Tab ${tabId}: ${storedDomain} -> ${currentDomain}`);
          console.log(`Öffne ${changeInfo.url} in neuem Tab und stelle ursprüngliche URL wieder her`);
          
          // Öffne die neue URL in einem neuen Tab
          await chrome.tabs.create({
            url: changeInfo.url,
            windowId: tab.windowId,
            active: true,
            pinned: false
          });
          
          // Stelle die ursprüngliche URL im angepinnten Tab wieder her
          await chrome.tabs.update(tabId, { url: storedUrl });
          
          return;
        }
      }
    }
    
    // Speichere die aktuelle URL für zukünftige Vergleiche
    await savePreviousTabUrl(tabId, changeInfo.url);
    
  } catch (error) {
    console.error('Fehler bei Tab-Navigation-Überwachung:', error);
  }
}

// Hilfsfunktion: Extrahiere Domain aus URL (erweiterte Version)
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    return '';
  }
}

// Initialisiere URL-Tracking für alle angepinnten Tabs
async function initializeUrlTracking() {
  try {
    const windows = await chrome.windows.getAll({ populate: true });
    
    for (const window of windows) {
      if (window.type !== 'normal') continue;
      
      const pinnedTabs = window.tabs.filter(tab => tab.pinned);
      
      for (const tab of pinnedTabs) {
        await savePreviousTabUrl(tab.id, tab.url);
      }
    }
    
    console.log('URL-Tracking für angepinnte Tabs initialisiert');
  } catch (error) {
    console.error('Fehler bei URL-Tracking Initialisierung:', error);
  }
}

// Hilfsfunktion: Speichere vorherige Tab-URL
async function savePreviousTabUrl(tabId, url) {
  try {
    const key = `prevUrl_${tabId}`;
    await chrome.storage.local.set({ [key]: url });
  } catch (error) {
    console.error('Fehler beim Speichern der vorherigen URL:', error);
  }
}

// Hilfsfunktion: Lade vorherige Tab-URL
async function getPreviousTabUrl(tabId) {
  try {
    const key = `prevUrl_${tabId}`;
    const result = await chrome.storage.local.get([key]);
    return result[key];
  } catch (error) {
    console.error('Fehler beim Laden der vorherigen URL:', error);
    return null;
  }
}



// Initialisierung beim Start der Extension
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed/updated:', details.reason);
  // Setze Standard-Icon
  updateIcon('default');
  
  // Nur bei Installation oder Update eine Überprüfung durchführen
  if (details.reason === 'install' || details.reason === 'update') {
    isInitializing = true;
    setTimeout(async () => {
      await checkAndPinTabs('extension-installed');
      isInitializing = false;
    }, 2000);
  }
}); 