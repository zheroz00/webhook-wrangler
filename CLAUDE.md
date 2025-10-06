# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WebHook Wrangler is a Chrome extension (Manifest V3) that enables users to send webpage URLs to configurable webhook endpoints with customizable JSON payloads. It features multiple endpoint management, detailed response tracking, and comprehensive history management with local storage optimization.

## Architecture

### Core Components

**Extension Structure:**
- **popup.html/popup.js/popup.css**: Main UI for endpoint configuration, sending webhooks, viewing history
- **background.js**: Service worker handling webhook HTTP requests, message passing, and notifications
- **manifest.json**: Manifest V3 configuration with permissions for activeTab, storage, and notifications

**Storage Architecture:**
- Chrome sync storage: Endpoint configurations, settings, last selected endpoint (limited to ~100KB)
- Chrome local storage: Complete history data (~5MB quota) to avoid sync storage limitations
- Storage migration logic in [popup.js:863-886](popup.js#L863-L886) handles automatic migration from sync to local storage

**Data Flow:**
1. User configures endpoint in popup → saved to chrome.storage.sync
2. User clicks "Send Current URL" → popup.js sends message to background.js
3. background.js fetches endpoint config, replaces payload placeholders, sends HTTP POST
4. Response returns via callback → popup.js displays response and saves to chrome.storage.local

### Key Technical Details

**Storage Limits & Management:**
- Responses truncated to 4KB per item ([popup.js:3](popup.js#L3))
- Max 50 history items with automatic trimming ([popup.js:4](popup.js#L4))
- Smart truncation preserves markdown structure for YouTube-style responses ([popup.js:664-704](popup.js#L664-L704))
- Storage size monitoring in [popup.js:11-54](popup.js#L11-L54)

**Payload Template System:**
- JSON templates with placeholder replacement: `{url}`, `{title}`, `{timestamp}`
- Recursive placeholder replacement in [background.js:147-171](background.js#L147-L171)
- Supports nested objects and arrays

**Response Handling:**
- Content-type detection (JSON vs plain text) in [background.js:108-121](background.js#L108-L121)
- Markdown rendering via marked.js library ([popup.js:608-642](popup.js#L608-L642))
- Special handling for array responses (YouTube summaries) in [popup.js:584-590](popup.js#L584-L590)

**Security Features:**
- API Key authentication via X-API-Key header ([background.js:97-99](background.js#L97-L99))
- HTTPS validation with warnings for non-secure endpoints ([background.js:61-78](background.js#L61-L78))
- CSP compliant - no inline scripts ([manifest.json:11-13](manifest.json#L11-L13))

## Development Workflow

### Testing the Extension

1. Load unpacked extension:
   ```bash
   # Navigate to chrome://extensions/
   # Enable "Developer mode"
   # Click "Load unpacked" and select this directory
   ```

2. Test changes:
   - Edit files → Click reload icon on extension card in chrome://extensions/
   - For background.js changes, click "Service Worker" link to view console logs
   - For popup changes, right-click extension icon → "Inspect popup"

### Common Development Tasks

**Testing webhook endpoints:**
- Use local development servers with CORS enabled
- Example n8n setup documented in [README.md:111-119](README.md#L111-L119)
- API key sent as header, not in payload

**Debugging storage issues:**
- Check chrome.storage.sync quota: Open DevTools → Application → Storage → Extension Storage
- History stored in chrome.storage.local (separate 5MB quota)
- See storage management functions in [popup.js:11-54](popup.js#L11-L54)

**Working with response formatting:**
- Markdown rendering via marked.js (included locally in lib/)
- Response formatting logic handles JSON, markdown, and plain text ([popup.js:580-642](popup.js#L580-L642))
- Truncation warnings displayed when responses exceed size limits

### Important Constraints

**Chrome Extension Limitations:**
- No external script loading (use lib/ for dependencies)
- Service workers timeout after 30 seconds of inactivity
- Sync storage limited to ~100KB total, 8KB per item
- Local storage limited to ~5MB

**Storage Strategy:**
- Store configuration (endpoints, settings) in sync storage for cross-device sync
- Store large/frequently changing data (history) in local storage
- Always handle QUOTA_BYTES_PER_ITEM errors ([popup.js:772-776](popup.js#L772-L776))

## Code Organization

**popup.js structure (886 lines):**
- Lines 1-113: Constants, DOM elements, settings, event listeners
- Lines 263-421: Endpoint management (load, save, delete)
- Lines 436-532: History display with pagination and search
- Lines 580-704: Response formatting (markdown, JSON, truncation)
- Lines 707-838: Main webhook sending logic
- Lines 840-886: History persistence and migration

**background.js structure (171 lines):**
- Lines 1-25: Message listener and notification handling
- Lines 47-145: Webhook HTTP request handling with validation
- Lines 147-171: Recursive payload placeholder replacement

## UI/UX Notes

- Dark mode interface with custom scrollbars
- Collapsible panels: settings, history, response
- Loading spinner during webhook sends
- Pagination for history (10 items per page default)
- Copy buttons for responses using Clipboard API
- History search filters by endpoint name, URL, or title
