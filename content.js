// Content Script für PermanentPinnedTabs - Domain Protection

(function() {
    'use strict';
    
    let isTabPinned = false;
    let originalDomain = '';
    let isProtectedTab = false;
    
    // Initialisierung
    async function initializeDomainProtection() {
        try {
            // Prüfe ob dieser Tab angepinnt und geschützt ist
            const response = await chrome.runtime.sendMessage({
                action: 'checkTabProtection',
                url: window.location.href
            });
            
            if (response && response.isProtected) {
                isTabPinned = response.isPinned;
                originalDomain = response.originalDomain;
                isProtectedTab = response.isProtected;
                
                console.log('Domain-Schutz aktiviert für:', originalDomain);
                setupDomainProtection();
            }
        } catch (error) {
            console.error('Fehler bei Domain-Schutz Initialisierung:', error);
        }
    }
    
    // Domain-Schutz einrichten
    function setupDomainProtection() {
        if (!isProtectedTab) return;
        
        // Link-Click Handler
        document.addEventListener('click', handleLinkClick, true);
        
        // Form-Submit Handler (für Suchfelder etc.)
        document.addEventListener('submit', handleFormSubmit, true);
        
        // URL-Änderungen über History API abfangen
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function(...args) {
            const url = args[2];
            if (url && !isSameDomain(url, originalDomain)) {
                console.log('History.pushState zu externer Domain verhindert:', url);
                openInNewTab(url);
                return;
            }
            return originalPushState.apply(this, args);
        };
        
        history.replaceState = function(...args) {
            const url = args[2];
            if (url && !isSameDomain(url, originalDomain)) {
                console.log('History.replaceState zu externer Domain verhindert:', url);
                openInNewTab(url);
                return;
            }
            return originalReplaceState.apply(this, args);
        };
        
        console.log('Domain-Schutz-Event-Handler eingerichtet');
    }
    
    // Link-Click Handler
    function handleLinkClick(event) {
        if (!isProtectedTab) return;
        
        const link = event.target.closest('a');
        if (!link || !link.href) return;
        
        // Ignore anchor links (#)
        if (link.href.startsWith('#') || link.href.includes('#') && new URL(link.href).pathname === window.location.pathname) {
            return;
        }
        
        // Prüfe ob Link zu externer Domain führt
        if (!isSameDomain(link.href, originalDomain)) {
            console.log('Externer Link abgefangen:', link.href);
            event.preventDefault();
            event.stopPropagation();
            
            // Öffne in neuem Tab
            openInNewTab(link.href);
        }
    }
    
    // Form-Submit Handler
    function handleFormSubmit(event) {
        if (!isProtectedTab) return;
        
        const form = event.target;
        if (!form.action) return;
        
        // Prüfe ob Form zu externer Domain sendet
        if (!isSameDomain(form.action, originalDomain)) {
            console.log('Form-Submit zu externer Domain abgefangen:', form.action);
            event.preventDefault();
            event.stopPropagation();
            
            // Sammle Form-Daten
            const formData = new FormData(form);
            const params = new URLSearchParams(formData);
            const submitUrl = form.method.toLowerCase() === 'get' 
                ? `${form.action}?${params}` 
                : form.action;
            
            openInNewTab(submitUrl);
        }
    }
    
    // Prüfe ob zwei URLs dieselbe Domain haben
    function isSameDomain(url1, url2) {
        try {
            const domain1 = extractDomain(url1);
            const domain2 = extractDomain(url2);
            
            return domain1 === domain2;
        } catch (error) {
            console.error('Fehler beim Domain-Vergleich:', error);
            return false;
        }
    }
    
    // Extrahiere Domain aus URL
    function extractDomain(url) {
        try {
            // Handle relative URLs
            if (url.startsWith('/') || url.startsWith('?') || url.startsWith('#')) {
                return window.location.hostname;
            }
            
            const urlObj = new URL(url, window.location.origin);
            return urlObj.hostname;
        } catch (error) {
            return window.location.hostname;
        }
    }
    
    // Öffne URL in neuem Tab
    async function openInNewTab(url) {
        try {
            await chrome.runtime.sendMessage({
                action: 'openInNewTab',
                url: url,
                fromPinnedTab: true
            });
            console.log('URL in neuem Tab geöffnet:', url);
        } catch (error) {
            console.error('Fehler beim Öffnen in neuem Tab:', error);
            // Fallback: normaler Link-Klick
            window.open(url, '_blank');
        }
    }
    
    // URL-Änderung überwachen (für direkte Adressleisten-Eingaben)
    let lastUrl = window.location.href;
    
    function checkUrlChange() {
        if (!isProtectedTab) return;
        
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            console.log('URL-Änderung erkannt:', lastUrl, '->', currentUrl);
            
            // Prüfe ob zu externer Domain navigiert wird
            if (!isSameDomain(currentUrl, originalDomain)) {
                console.log('Navigation zu externer Domain erkannt, öffne in neuem Tab');
                
                // Verhindere die Navigation und öffne in neuem Tab
                openInNewTab(currentUrl);
                
                // Navigiere zurück zur ursprünglichen URL
                window.history.replaceState(null, '', lastUrl);
                return;
            }
            
            lastUrl = currentUrl;
        }
    }
    
    // Überwache URL-Änderungen
    setInterval(checkUrlChange, 500);
    
    // Event Listener für popstate (Browser-Navigation)
    window.addEventListener('popstate', checkUrlChange);
    
    // Initialisierung bei verschiedenen Load-States
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeDomainProtection);
    } else {
        initializeDomainProtection();
    }
    
    // Auch bei späteren Änderungen reagieren
    window.addEventListener('load', initializeDomainProtection);
    
    console.log('PermanentPinnedTabs Content Script geladen');
})(); 