# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WebHook Wrangler is a Chrome extension (Manifest V3) that enables users to send webpage URLs to configurable webhook endpoints with customizable JSON payloads. It features multiple endpoint management, detailed response tracking, and comprehensive history management with local storage optimization.

## Architecture

### Core Components

**Extension Structure:**
- **popup.html**: Main UI structure with header, endpoint card, settings panel, and history overlay
- **popup.css**: Consolidated styles with CSS variables for theming
- **popup.js**: UI logic, endpoint management, history handling
- **background.js**: Service worker handling webhook HTTP requests, message passing, and notifications
- **manifest.json**: Manifest V3 configuration with permissions for activeTab, storage, and notifications
- **lib/marked.min.js**: Local copy of marked.js for markdown rendering (CSP compliance)

**Storage Architecture:**
- Chrome sync storage: Endpoint configurations, settings, last selected endpoint (limited to ~100KB)
- Chrome local storage: Complete history data (~5MB quota) to avoid sync storage limitations
- Storage migration logic in popup.js:845-861 handles automatic migration from sync to local storage

**Data Flow:**
1. User configures endpoint in popup → saved to chrome.storage.sync
2. User clicks "Send" → popup.js sends message to background.js
3. background.js fetches endpoint config, replaces payload placeholders, sends HTTP POST
4. Response returns via callback → popup.js displays response and saves to chrome.storage.local

### UI Components

**Header:** Endpoint selector dropdown, Send button, New endpoint (+) button, History toggle
**Endpoint Card:** Displays selected endpoint details (URL, auth status) with Edit/Delete actions
**Settings Panel:** Form for creating/editing endpoints with sections for Basic Info, Authentication, Payload Template, and Options
**History Panel:** Slide-in overlay with search, pagination, export/clear functionality
**Response Panel:** Displays webhook response with markdown rendering and copy functionality

### Key Technical Details

**Storage Limits & Management:**
- Constants defined in `STORAGE_LIMITS` object (popup.js:2-8)
- Responses truncated to 4KB per item, max 50 history items
- Smart truncation preserves markdown structure (popup.js:698-735)
- Storage size monitoring via `getStorageSize()` and `trimHistoryIfNeeded()` (popup.js:30-70)

**Payload Template System:**
- JSON templates with placeholder replacement: `{url}`, `{title}`, `{timestamp}`
- Recursive `replacePlaceholders()` function (background.js:147-171)
- Supports nested objects and arrays

**Response Handling:**
- Content-type detection (JSON vs plain text) in background.js:107-121
- Markdown rendering via marked.js library (popup.js:622-665)
- Special handling for array responses (YouTube summaries) in popup.js:626-632

**Security Features:**
- API Key authentication via X-API-Key header (background.js:97-99)
- HTTPS validation with warnings for non-secure endpoints (background.js:60-78)
- CSP compliant - no inline scripts, all dependencies in lib/

## Development Workflow

### Testing the Extension

1. Load unpacked extension:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select this directory

2. Test changes:
   - Edit files → Click reload icon on extension card in chrome://extensions/
   - For background.js changes, click "Service Worker" link to view console logs
   - For popup changes, right-click extension icon → "Inspect popup"

### Debugging

**Storage issues:**
- Check chrome.storage.sync quota: DevTools → Application → Storage → Extension Storage
- History stored in chrome.storage.local (separate 5MB quota)
- Storage quota errors handled in popup.js:787-798

**Webhook testing:**
- Use local development servers with CORS enabled
- CORS headers needed: `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Headers: Content-Type, X-API-Key`
- API key sent as X-API-Key header, not in payload

### Important Constraints

**Chrome Extension Limitations:**
- No external script loading (use lib/ for dependencies)
- Service workers timeout after 30 seconds of inactivity
- Sync storage limited to ~100KB total, 8KB per item
- Local storage limited to ~5MB

**Storage Strategy:**
- Store configuration (endpoints, settings) in sync storage for cross-device sync
- Store large/frequently changing data (history) in local storage
- Always handle QUOTA_BYTES_PER_ITEM errors

## Code Organization

**popup.css (~1000 lines):**
- CSS variables and theming (lines 6-32)
- Header styles (lines 54-202)
- Main content and empty state (lines 204-246)
- Endpoint card (lines 248-354)
- Settings panel and forms (lines 356-554)
- History panel overlay (lines 556-784)
- Response panel and markdown styles (lines 786-922)
- Status messages and utilities (lines 924-1001)

**popup.js (~869 lines):**
- Constants and storage management (lines 1-70)
- DOM elements object (lines 72-128)
- Initialization and event listeners (lines 130-176)
- Endpoint management functions (lines 178-378)
- UI state management (lines 380-413)
- History panel functions (lines 415-620)
- Response formatting (lines 622-735)
- Webhook sending logic (lines 737-861)
- Utility functions (lines 863-869)

**background.js (171 lines):**
- Message listener and response handling (lines 1-25)
- `showWebhookNotification()` - Chrome notification creation (lines 27-45)
- `handleWebhookSend()` - main HTTP request handling with URL validation (lines 47-145)
- `replacePlaceholders()` - recursive template variable substitution (lines 147-171)

## UI/UX Design

- Dark mode interface with CSS variables for easy theming
- Responsive width (420px) that adapts to content
- Header with primary action (Send) prominently placed
- Endpoint info card shows key details at a glance
- Settings panel with organized sections (Basic Info, Auth, Payload, Options)
- History slides in as full-screen overlay
- Response panel with copy functionality and markdown support
- Empty state guides new users to create first endpoint
