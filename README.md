# PermanentPinnedTabs - Chrome Extension

**Version:** 1.0.0  
**Manifest:** v3  
**Sprache:** Deutsch

Eine Chrome-Erweiterung, die sicherstellt, dass eine benutzerdefinierte Liste von Webseiten dauerhaft als angepinnte Tabs in Chrome geöffnet bleibt.

## 🎯 Ziel der Erweiterung

PermanentPinnedTabs automatisiert das Verwalten von angepinnten Tabs in Chrome. Die Erweiterung:

- ✅ Öffnet automatisch fehlende angepinnte Tabs beim Browser-Start
- ✅ Überwacht kontinuierlich alle geöffneten Fenster
- ✅ Entfernt Tabs automatisch, wenn sie aus der Liste gelöscht werden
- ✅ Zeigt den aktuellen Status über das Browser-Icon an
- ✅ Bietet eine benutzerfreundliche Oberfläche zur Verwaltung

## 🚀 Hauptfunktionen

### Automatische Tab-Verwaltung
- **Beim Chrome-Start**: Überprüfung und automatisches Öffnen fehlender Tabs
- **Bei neuen Fenstern**: Anpinnen der konfigurierten URLs in jedem neuen Fenster
- **Kontinuierliche Überwachung**: Reagiert auf manuelles Entpinnen oder Schließen von Tabs

### Benutzeroberfläche
- **Pop-up Interface**: Zugänglich über das Erweiterungssymbol
- **URL-Verwaltung**: Einfaches Hinzufügen und Entfernen von URLs
- **Aktueller Tab**: Ein-Klick-Option zum Hinzufügen des aktiven Tabs
- **Status-Anzeige**: Visueller Indikator für den aktuellen Status

### Sicherheit & Speicherung
- **Lokale Speicherung**: Alle Daten bleiben auf Ihrem Gerät
- **Manifest v3**: Neueste Chrome-Extension-Standards
- **Offline-Funktionalität**: Keine externe Serveranbindung erforderlich

## 📥 Installation

### Option 1: Entwicklermodus (Empfohlen)

1. **Erweiterung herunterladen**
   ```bash
   git clone https://github.com/[your-username]/PermanentPinnedTabs.git
   cd PermanentPinnedTabs
   ```

2. **Icons erstellen** (siehe `icons/README_ICONS.txt`)
   - Erstellen Sie die erforderlichen Icon-Dateien im `icons/` Verzeichnis
   - Oder verwenden Sie temporäre Platzhalter für Tests

3. **Chrome öffnen**
   - Navigieren Sie zu `chrome://extensions/`
   - Aktivieren Sie den "Entwicklermodus" (oben rechts)

4. **Erweiterung laden**
   - Klicken Sie auf "Entpackte Erweiterung laden"
   - Wählen Sie den `PermanentPinnedTabs` Ordner aus

5. **Berechtigung erteilen**
   - Chrome fragt nach Berechtigung für Tab-Zugriff
   - Klicken Sie auf "Erweiterung hinzufügen"

### Option 2: ZIP-Installation

1. Laden Sie das Repository als ZIP herunter
2. Entpacken Sie es in einen Ordner
3. Folgen Sie den Schritten 2-5 von Option 1

## 🛠️ Nutzung

### Erste Schritte

1. **Erweiterung starten**
   - Klicken Sie auf das PermanentPinnedTabs-Icon in der Toolbar
   - Das Pop-up-Fenster öffnet sich

2. **URLs hinzufügen**
   - Geben Sie eine URL in das Eingabefeld ein (z.B. `https://github.com`)
   - Klicken Sie auf "Hinzufügen"
   - **Oder:** Klicken Sie auf "Aktuellen Tab hinzufügen"

3. **Status überprüfen**
   - Das Icon zeigt den aktuellen Status:
     - 🔴 **Rot**: Tabs fehlen oder müssen korrigiert werden
     - 🟢 **Grün**: Alle Tabs sind korrekt angepinnt
     - ⚪ **Grau**: Keine URLs konfiguriert

### Interface-Funktionen

#### URL hinzufügen
```
┌─ Neue URL hinzufügen ───────────────┐
│ https://example.com    [Hinzufügen] │
│ [Aktuellen Tab hinzufügen]          │
└─────────────────────────────────────┘
```

#### URL-Liste verwalten
```
┌─ Permanente URLs ──────── [↻ Aktualisieren] ─┐
│ ┌─────────────────────────────────────────┐ │
│ │ https://github.com           [✕]        │ │
│ │ github.com                              │ │
│ ├─────────────────────────────────────────┤ │
│ │ https://stackoverflow.com    [✕]        │ │
│ │ stackoverflow.com                       │ │
│ └─────────────────────────────────────────┘ │
└───────────────────────────────────────────────┘
```

#### Aktionen
- **[↻ Aktualisieren]**: Liste und Status neu laden
- **[Alle Tabs prüfen]**: Manuelle Überprüfung aller Tabs
- **[✕]**: URL aus Liste entfernen (mit Bestätigung)

### Automatische Funktionen

Die Erweiterung arbeitet automatisch im Hintergrund:

1. **Beim Chrome-Start**: Öffnet fehlende angepinnte Tabs
2. **Bei neuen Fenstern**: Pinnt konfigurierte URLs an
3. **Bei Tab-Änderungen**: Reagiert auf manuelles Entpinnen
4. **Kontinuierlich**: Überwacht und korrigiert den Status

## ⚙️ Konfiguration

### URL-Verwaltung

**URLs hinzufügen:**
- Vollständige URLs: `https://example.com`
- Automatische Normalisierung (entfernt trailing slash)
- Duplikat-Prüfung

**URLs entfernen:**
- Sicherheitsabfrage vor dem Löschen
- Automatisches Entpinnen entsprechender Tabs
- Sofortige Aktualisierung des Status

### Status-Überwachung

Das Erweiterungsicon zeigt kontinuierlich den aktuellen Status:

| Icon-Farbe | Bedeutung | Aktion |
|------------|-----------|---------|
| 🔴 Rot | Tabs fehlen | Fehlende Tabs werden automatisch geöffnet |
| 🟢 Grün | Alles OK | Alle konfigurierten Tabs sind angepinnt |
| ⚪ Grau | Keine Konfiguration | Fügen Sie URLs hinzu |

## 🔧 Technische Details

### Architektur

```
┌─ Frontend (Popup) ─────────────────┐
│ popup.html + popup.css + popup.js  │
│ ↕ chrome.runtime.sendMessage()     │
└─────────────────────────────────────┘
              │
┌─ Background (Service Worker) ──────┐
│ background.js                      │
│ ↕ chrome.storage.local             │
│ ↕ chrome.tabs / chrome.windows     │
└─────────────────────────────────────┘
```

### APIs verwendet

- **chrome.tabs**: Tab-Management und -Überwachung
- **chrome.windows**: Fenster-Events und -Information
- **chrome.storage.local**: Persistente Datenspeicherung
- **chrome.runtime**: Kommunikation zwischen Komponenten
- **chrome.action**: Icon- und Popup-Management

### Datenspeicherung

```javascript
// Gespeicherte Daten Struktur
{
  "permanentPinnedUrls": [
    "https://github.com",
    "https://stackoverflow.com"
  ],
  "lastStatus": "green"
}
```

### Events

| Event | Trigger | Aktion |
|-------|---------|---------|
| `chrome.runtime.onStartup` | Chrome-Start | Tab-Überprüfung |
| `chrome.windows.onCreated` | Neues Fenster | Tab-Anpinnen |
| `chrome.tabs.onRemoved` | Tab geschlossen | Status-Update |
| `chrome.tabs.onUpdated` | Tab-Änderung | Pin-Status-Prüfung |

## 🐛 Fehlerbehebung

### Häufige Probleme

**Problem**: Tabs werden nicht automatisch geöffnet
- **Lösung**: Überprüfen Sie die Browser-Berechtigungen
- **Prüfung**: Chrome DevTools → Console für Fehlermeldungen

**Problem**: Icon zeigt falschen Status
- **Lösung**: Klicken Sie auf "Alle Tabs prüfen" im Popup
- **Alternative**: Erweiterung deaktivieren und wieder aktivieren

**Problem**: URLs werden nicht gespeichert
- **Lösung**: Überprüfen Sie die Chrome-Storage-Berechtigungen
- **Prüfung**: `chrome://extensions/` → Details → Berechtigungen

### Debug-Informationen

Öffnen Sie die Chrome DevTools für die Erweiterung:

1. `chrome://extensions/`
2. Klicken Sie auf "Details" bei PermanentPinnedTabs
3. Klicken Sie auf "Hintergrundseite untersuchen"
4. Überprüfen Sie die Console auf Fehlermeldungen

### Log-Ausgaben

Die Erweiterung protokolliert wichtige Events:

```javascript
// Background Script Logs
console.log('Tab erstellt:', tab.url);
console.error('Fehler beim Öffnen:', error);

// Popup Script Logs  
console.log('URLs geladen:', urls);
console.error('Kommunikationsfehler:', error);
```

## 🔒 Sicherheit & Datenschutz

### Datenverarbeitung
- **Lokal**: Alle Daten bleiben auf Ihrem Gerät
- **Keine Übertragung**: Keine Daten werden an externe Server gesendet
- **Minimal**: Nur notwendige Berechtigungen werden angefordert

### Berechtigungen
- **tabs**: Für Tab-Management und -Überwachung
- **storage**: Für lokale Datenspeicherung
- **activeTab**: Für "Aktuellen Tab hinzufügen"-Funktion

### Best Practices
- Regelmäßige Updates der Erweiterung
- Überprüfung der URLs auf Gültigkeit
- Backup der Konfiguration über Export-Funktion (zukünftige Version)

## 🚀 Zukünftige Erweiterungen

### Geplante Features

- **Import/Export**: Cloud-Synchronisation der URL-Liste
- **Gruppen**: Organisierung von URLs in Kategorien
- **Zeitplanung**: Automatisches Anpinnen zu bestimmten Zeiten
- **Hotkeys**: Tastaturkürzel für häufige Aktionen
- **Whitelist**: Ausnahmen für bestimmte Fenster

### Roadmap

| Version | Features | Status |
|---------|----------|--------|
| 1.0.0 | Grundfunktionalität | ✅ Aktuell |
| 1.1.0 | Import/Export | 📋 Geplant |
| 1.2.0 | URL-Gruppen | 📋 Geplant |
| 1.3.0 | Zeitplanung | 📋 Geplant |

## 🤝 Beitragen

### Entwicklung

1. **Repository forken**
2. **Branch erstellen**: `git checkout -b feature/new-feature`
3. **Änderungen committen**: `git commit -am 'Add new feature'`
4. **Push**: `git push origin feature/new-feature`
5. **Pull Request erstellen**

### Code-Standards

- **JavaScript**: ES6+ mit async/await
- **CSS**: BEM-Namenskonvention
- **HTML**: Semantisches HTML5
- **Kommentare**: Deutsche Sprache für Benutzer-Interface

## 📝 Lizenz

MIT License - Siehe [LICENSE](LICENSE) Datei für Details.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/[your-username]/PermanentPinnedTabs/issues)
- **Diskussionen**: [GitHub Discussions](https://github.com/[your-username]/PermanentPinnedTabs/discussions)

## 🙏 Danksagungen

- Chrome Extension API Dokumentation
- Icons erstellt mit [Canva](https://canva.com)
- Inspiriert von "Session Buddy" und ähnlichen Erweiterungen

---

**Entwickelt mit ❤️ für produktive Browser-Nutzung** 