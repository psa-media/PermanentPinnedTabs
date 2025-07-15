// PermanentPinnedTabs Popup Script

document.addEventListener('DOMContentLoaded', initializePopup);

// DOM Elements
let urlInput, addButton, addCurrentTabButton, refreshButton, forceCheckButton;
let urlsList, emptyState, statusDot, statusText;
let confirmDialog, confirmUrl, confirmCancel, confirmDelete;
let toast, toastMessage;

let currentUrls = [];
let urlToDelete = null;

// Initialize Popup
function initializePopup() {
    // Get DOM elements
    urlInput = document.getElementById('urlInput');
    addButton = document.getElementById('addButton');
    addCurrentTabButton = document.getElementById('addCurrentTabButton');
    refreshButton = document.getElementById('refreshButton');
    forceCheckButton = document.getElementById('forceCheckButton');
    
    urlsList = document.getElementById('urlsList');
    emptyState = document.getElementById('emptyState');
    statusDot = document.getElementById('statusDot');
    statusText = document.getElementById('statusText');
    
    confirmDialog = document.getElementById('confirmDialog');
    confirmUrl = document.getElementById('confirmUrl');
    confirmCancel = document.getElementById('confirmCancel');
    confirmDelete = document.getElementById('confirmDelete');
    
    toast = document.getElementById('toast');
    toastMessage = document.getElementById('toastMessage');

    // Add event listeners
    addButton.addEventListener('click', handleAddUrl);
    addCurrentTabButton.addEventListener('click', handleAddCurrentTab);
    refreshButton.addEventListener('click', handleRefresh);
    forceCheckButton.addEventListener('click', handleForceCheck);
    
    confirmCancel.addEventListener('click', hideConfirmDialog);
    confirmDelete.addEventListener('click', handleConfirmDelete);
    
    // Handle Enter key in URL input
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAddUrl();
        }
    });
    
    // Close modal when clicking outside
    confirmDialog.addEventListener('click', (e) => {
        if (e.target === confirmDialog) {
            hideConfirmDialog();
        }
    });

    // Load initial data
    loadUrls();
    updateStatus();
}

// Load URLs from storage
async function loadUrls() {
    try {
        const response = await sendMessageToBackground({ action: 'getUrls' });
        
        if (response.success) {
            currentUrls = response.urls || [];
            renderUrlsList();
        } else {
            showToast('Fehler beim Laden der URLs: ' + response.error, 'error');
        }
    } catch (error) {
        console.error('Error loading URLs:', error);
        showToast('Fehler beim Laden der URLs', 'error');
    }
}

// Render URLs list
function renderUrlsList() {
    if (currentUrls.length === 0) {
        urlsList.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    urlsList.style.display = 'block';
    emptyState.style.display = 'none';
    
    urlsList.innerHTML = '';
    
    currentUrls.forEach((url, index) => {
        const urlItem = createUrlItem(url, index);
        urlsList.appendChild(urlItem);
    });
}

// Create URL item element
function createUrlItem(url, index) {
    const item = document.createElement('div');
    item.className = 'url-item';
    
    const domain = extractDomain(url);
    
    item.innerHTML = `
        <div class="url-content">
            <div class="url-text">${escapeHtml(url)}</div>
            <div class="url-domain">${escapeHtml(domain)}</div>
        </div>
        <div class="url-actions">
            <button class="remove-btn" data-url="${escapeHtml(url)}" title="URL entfernen">✕</button>
        </div>
    `;
    
    // Add remove button event listener
    const removeBtn = item.querySelector('.remove-btn');
    removeBtn.addEventListener('click', () => showConfirmDialog(url));
    
    return item;
}

// Extract domain from URL
function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch (error) {
        return url;
    }
}

// Handle add URL
async function handleAddUrl() {
    const url = urlInput.value.trim();
    
    if (!url) {
        showToast('Bitte geben Sie eine URL ein', 'error');
        return;
    }
    
    if (!isValidUrl(url)) {
        showToast('Bitte geben Sie eine gültige URL ein', 'error');
        return;
    }
    
    setLoading(true);
    
    try {
        const response = await sendMessageToBackground({ 
            action: 'addUrl', 
            url: url 
        });
        
        if (response.success) {
            urlInput.value = '';
            await loadUrls();
            showToast('URL erfolgreich hinzugefügt', 'success');
            updateStatus();
        } else {
            showToast('Fehler: ' + response.error, 'error');
        }
    } catch (error) {
        console.error('Error adding URL:', error);
        showToast('Fehler beim Hinzufügen der URL', 'error');
    } finally {
        setLoading(false);
    }
}

// Handle add current tab
async function handleAddCurrentTab() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab || !tab.url) {
            showToast('Kein aktiver Tab gefunden', 'error');
            return;
        }
        
        if (!isValidUrl(tab.url)) {
            showToast('Der aktuelle Tab hat keine gültige URL', 'error');
            return;
        }
        
        urlInput.value = tab.url;
        await handleAddUrl();
        
    } catch (error) {
        console.error('Error getting current tab:', error);
        showToast('Fehler beim Abrufen des aktuellen Tabs', 'error');
    }
}

// Show confirm dialog
function showConfirmDialog(url) {
    urlToDelete = url;
    confirmUrl.textContent = url;
    confirmDialog.style.display = 'flex';
}

// Hide confirm dialog
function hideConfirmDialog() {
    urlToDelete = null;
    confirmDialog.style.display = 'none';
}

// Handle confirm delete
async function handleConfirmDelete() {
    if (!urlToDelete) return;
    
    setLoading(true);
    
    try {
        const response = await sendMessageToBackground({ 
            action: 'removeUrl', 
            url: urlToDelete 
        });
        
        if (response.success) {
            await loadUrls();
            showToast('URL erfolgreich entfernt', 'success');
            updateStatus();
        } else {
            showToast('Fehler: ' + response.error, 'error');
        }
    } catch (error) {
        console.error('Error removing URL:', error);
        showToast('Fehler beim Entfernen der URL', 'error');
    } finally {
        setLoading(false);
        hideConfirmDialog();
    }
}

// Handle refresh
async function handleRefresh() {
    setLoading(true);
    
    try {
        await loadUrls();
        await updateStatus();
        showToast('Liste aktualisiert', 'success');
    } catch (error) {
        console.error('Error refreshing:', error);
        showToast('Fehler beim Aktualisieren', 'error');
    } finally {
        setLoading(false);
    }
}

// Handle force check
async function handleForceCheck() {
    setLoading(true);
    
    try {
        const response = await sendMessageToBackground({ action: 'forceCheck' });
        
        if (response.success) {
            showToast('Tabs wurden überprüft und aktualisiert', 'success');
            await updateStatus();
        } else {
            showToast('Fehler beim Überprüfen der Tabs', 'error');
        }
    } catch (error) {
        console.error('Error forcing check:', error);
        showToast('Fehler beim Überprüfen der Tabs', 'error');
    } finally {
        setLoading(false);
    }
}

// Update status indicator
async function updateStatus() {
    try {
        // Check if all pinned tabs are present
        const windows = await chrome.windows.getAll({ populate: true });
        const result = await chrome.storage.local.get(['permanentPinnedUrls']);
        const urls = result.permanentPinnedUrls || [];
        
        if (urls.length === 0) {
            updateStatusDisplay('default', 'Keine URLs konfiguriert');
            return;
        }
        
        let allTabsPresent = true;
        let totalMissing = 0;
        
        for (const window of windows) {
            if (window.type !== 'normal') continue;
            
            const pinnedTabs = window.tabs.filter(tab => tab.pinned);
            const pinnedUrls = pinnedTabs.map(tab => normalizeUrl(tab.url));
            
            const missingUrls = urls.filter(url => !pinnedUrls.includes(normalizeUrl(url)));
            totalMissing += missingUrls.length;
            
            if (missingUrls.length > 0) {
                allTabsPresent = false;
            }
        }
        
        if (allTabsPresent) {
            updateStatusDisplay('green', 'Alle Tabs sind angepinnt');
        } else {
            updateStatusDisplay('red', `${totalMissing} Tab(s) fehlen`);
        }
        
    } catch (error) {
        console.error('Error updating status:', error);
        updateStatusDisplay('red', 'Fehler beim Statusabruf');
    }
}

// Update status display
function updateStatusDisplay(status, message) {
    statusDot.className = 'status-dot';
    if (status === 'green' || status === 'red') {
        statusDot.classList.add(status);
    }
    statusText.textContent = message;
}

// Send message to background script
async function sendMessageToBackground(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(response);
            }
        });
    });
}

// Utility functions
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
        return false;
    }
}

function normalizeUrl(url) {
    if (!url) return '';
    
    try {
        const urlObj = new URL(url);
        let normalized = urlObj.origin + urlObj.pathname;
        if (normalized.endsWith('/')) {
            normalized = normalized.slice(0, -1);
        }
        return normalized.toLowerCase();
    } catch (error) {
        return url.toLowerCase();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setLoading(isLoading) {
    const container = document.querySelector('.container');
    if (isLoading) {
        container.classList.add('loading');
    } else {
        container.classList.remove('loading');
    }
}

function showToast(message, type = 'info') {
    toastMessage.textContent = message;
    toast.className = 'toast';
    if (type === 'success' || type === 'error') {
        toast.classList.add(type);
    }
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Update status periodically
setInterval(updateStatus, 5000); 