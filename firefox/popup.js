// Constants for storage management
const STORAGE_LIMITS = {
  MAX_RESPONSE_SIZE: 4000,
  MAX_HISTORY_SIZE: 50,
  MAX_ITEM_SIZE: 8000,
  STORAGE_QUOTA: 100000,
  LOCAL_STORAGE_QUOTA: 5242880
};

const STORAGE_KEYS = {
  LAST_ENDPOINT: 'lastSelectedEndpoint',
  ENDPOINTS: 'endpoints',
  HISTORY: 'history',
  HISTORY_SETTINGS: 'historySettings'
};

const DEFAULT_PAYLOAD = {
  "URL": "{url}",
  "timestamp": "{timestamp}",
  "title": "{title}"
};

const DEFAULT_HISTORY_SETTINGS = {
  maxItems: 20,
  itemsPerPage: 10,
  currentPage: 1
};

// Storage management functions
async function getStorageSize(storageType = 'sync') {
  const data = await (storageType === 'sync' ?
    browser.storage.sync.get(null) :
    browser.storage.local.get(null));
  return new TextEncoder().encode(JSON.stringify(data)).length;
}

async function trimHistoryIfNeeded(currentHistory = [], storageType = 'local') {
  if (!currentHistory.length) return currentHistory;

  const trimmedHistory = currentHistory.map(item => {
    if (!item.responseData) return item;

    const itemSize = new TextEncoder().encode(JSON.stringify(item)).length;
    if (itemSize <= STORAGE_LIMITS.MAX_ITEM_SIZE) return item;

    const trimmedItem = { ...item };
    if (typeof item.responseData === 'string') {
      trimmedItem.responseData = item.responseData.slice(0, STORAGE_LIMITS.MAX_RESPONSE_SIZE) + '... (truncated)';
    } else {
      trimmedItem.responseData = {
        data: 'Response data too large - truncated',
        size: itemSize
      };
    }
    trimmedItem.truncated = true;
    return trimmedItem;
  });

  let currentSize = await getStorageSize(storageType);
  const quota = storageType === 'sync' ?
    STORAGE_LIMITS.STORAGE_QUOTA * 0.9 :
    STORAGE_LIMITS.LOCAL_STORAGE_QUOTA * 0.9;

  while (currentSize > quota && trimmedHistory.length > 5) {
    trimmedHistory.pop();
    currentSize = new TextEncoder().encode(JSON.stringify(trimmedHistory)).length;
  }

  return trimmedHistory;
}

// DOM Elements
const elements = {
  // Header
  endpointSelect: document.getElementById('endpointSelect'),
  sendButton: document.getElementById('sendButton'),
  newEndpoint: document.getElementById('newEndpoint'),
  toggleHistory: document.getElementById('toggleHistory'),
  historyBadge: document.getElementById('historyBadge'),

  // Main Content
  emptyState: document.getElementById('emptyState'),
  emptyStateNewBtn: document.getElementById('emptyStateNewBtn'),

  // Endpoint Card
  endpointCard: document.getElementById('endpointCard'),
  cardEndpointName: document.getElementById('cardEndpointName'),
  cardWebhookUrl: document.getElementById('cardWebhookUrl'),
  cardAuthStatus: document.getElementById('cardAuthStatus'),
  cardAuthText: document.getElementById('cardAuthText'),
  editEndpoint: document.getElementById('editEndpoint'),
  deleteEndpoint: document.getElementById('deleteEndpoint'),

  // Settings Panel
  settingsPanel: document.getElementById('settingsPanel'),
  settingsTitle: document.getElementById('settingsTitle'),
  closeSettings: document.getElementById('closeSettings'),
  cancelSettings: document.getElementById('cancelSettings'),
  endpointName: document.getElementById('endpointName'),
  webhookUrl: document.getElementById('webhookUrl'),
  useApiKey: document.getElementById('useApiKey'),
  apiKeyGroup: document.getElementById('apiKeyGroup'),
  apiKey: document.getElementById('apiKey'),
  payloadTemplate: document.getElementById('payloadTemplate'),
  showFullResponse: document.getElementById('showFullResponse'),
  showNotification: document.getElementById('showNotification'),
  saveButton: document.getElementById('saveButton'),

  // Status & Response
  status: document.getElementById('status'),
  responsePanel: document.getElementById('responsePanel'),
  responseContent: document.getElementById('responseContent'),
  copyResponse: document.getElementById('copyResponse'),

  // History Panel
  historyOverlay: document.getElementById('historyOverlay'),
  historyPanel: document.getElementById('historyPanel'),
  closeHistory: document.getElementById('closeHistory'),
  historySearch: document.getElementById('historySearch'),
  historyList: document.getElementById('historyList'),
  historySize: document.getElementById('historySize'),
  exportHistory: document.getElementById('exportHistory'),
  clearHistory: document.getElementById('clearHistory'),
  prevPage: document.getElementById('prevPage'),
  nextPage: document.getElementById('nextPage'),
  currentPage: document.getElementById('currentPage'),
  totalPages: document.getElementById('totalPages')
};

// State
let isCreatingNew = false;
let currentResponseData = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await migrateHistoryToLocalStorage();
  await loadEndpoints();

  const { historySettings = DEFAULT_HISTORY_SETTINGS } = await browser.storage.sync.get('historySettings');
  elements.historySize.value = historySettings.maxItems;
  await loadHistory();

  initEventListeners();
});

function initEventListeners() {
  // Header actions
  elements.endpointSelect.addEventListener('change', handleEndpointChange);
  elements.sendButton.addEventListener('click', sendCurrentUrl);
  elements.newEndpoint.addEventListener('click', openNewEndpoint);
  elements.emptyStateNewBtn.addEventListener('click', openNewEndpoint);

  // Endpoint card actions
  elements.editEndpoint.addEventListener('click', openEditEndpoint);
  elements.deleteEndpoint.addEventListener('click', deleteEndpoint);

  // Settings panel
  elements.closeSettings.addEventListener('click', closeSettingsPanel);
  elements.cancelSettings.addEventListener('click', closeSettingsPanel);
  elements.saveButton.addEventListener('click', saveEndpoint);
  elements.useApiKey.addEventListener('change', toggleApiKeyInput);

  // History panel
  elements.toggleHistory.addEventListener('click', openHistoryPanel);
  elements.historyOverlay.addEventListener('click', closeHistoryPanel);
  elements.closeHistory.addEventListener('click', closeHistoryPanel);
  elements.historySearch.addEventListener('input', handleHistorySearch);
  elements.historySize.addEventListener('change', handleHistorySizeChange);
  elements.exportHistory.addEventListener('click', exportHistoryToMarkdown);
  elements.clearHistory.addEventListener('click', handleClearHistory);
  elements.prevPage.addEventListener('click', goToPrevPage);
  elements.nextPage.addEventListener('click', goToNextPage);

  // Response panel
  elements.copyResponse.addEventListener('click', copyCurrentResponse);
}

// Endpoint Management
async function loadEndpoints() {
  try {
    const { [STORAGE_KEYS.ENDPOINTS]: endpoints = {} } = await browser.storage.sync.get(STORAGE_KEYS.ENDPOINTS);
    const { [STORAGE_KEYS.LAST_ENDPOINT]: lastEndpoint } = await browser.storage.sync.get(STORAGE_KEYS.LAST_ENDPOINT);

    elements.endpointSelect.innerHTML = '<option value="">Select Endpoint...</option>';

    Object.keys(endpoints).forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      elements.endpointSelect.appendChild(option);
    });

    const hasEndpoints = Object.keys(endpoints).length > 0;

    if (hasEndpoints) {
      const endpointToSelect = lastEndpoint && endpoints[lastEndpoint] ?
        lastEndpoint :
        Object.keys(endpoints)[0];

      elements.endpointSelect.value = endpointToSelect;
      await loadSelectedEndpoint();
      showEndpointCard();
    } else {
      showEmptyState();
    }

    updateSendButtonState();
  } catch (error) {
    showStatus('Error loading endpoints: ' + error.message, false);
  }
}

async function handleEndpointChange() {
  if (elements.endpointSelect.value) {
    await browser.storage.sync.set({ [STORAGE_KEYS.LAST_ENDPOINT]: elements.endpointSelect.value });
    await loadSelectedEndpoint();
    showEndpointCard();
  } else {
    hideEndpointCard();
  }
  updateSendButtonState();
  closeSettingsPanel();
}

async function loadSelectedEndpoint() {
  try {
    if (!elements.endpointSelect.value) return;

    const { endpoints = {} } = await browser.storage.sync.get('endpoints');
    const endpoint = endpoints[elements.endpointSelect.value];

    if (endpoint) {
      // Update card display
      elements.cardEndpointName.textContent = endpoint.name || elements.endpointSelect.value;
      elements.cardWebhookUrl.textContent = endpoint.webhookUrl || 'Not configured';

      if (endpoint.useApiKey) {
        elements.cardAuthStatus.className = 'badge-indicator success';
        elements.cardAuthText.textContent = 'API Key Enabled';
      } else {
        elements.cardAuthStatus.className = 'badge-indicator warning';
        elements.cardAuthText.textContent = 'No API Key';
      }

      // Update form fields for editing
      elements.endpointName.value = endpoint.name || '';
      elements.webhookUrl.value = endpoint.webhookUrl || '';
      elements.payloadTemplate.value = endpoint.payloadTemplate || JSON.stringify(DEFAULT_PAYLOAD, null, 2);
      elements.useApiKey.checked = endpoint.useApiKey || false;
      elements.apiKey.value = endpoint.apiKey || '';
      elements.apiKeyGroup.style.display = endpoint.useApiKey ? 'block' : 'none';
      elements.showFullResponse.checked = endpoint.showDetailedResponse || false;
      elements.showNotification.checked = endpoint.showNotification || false;
    }
  } catch (error) {
    console.error('Error loading endpoint:', error);
    showStatus('Error loading endpoint: ' + error.message, false);
  }
}

function openNewEndpoint() {
  isCreatingNew = true;
  elements.settingsTitle.textContent = 'New Endpoint';

  // Clear form
  elements.endpointName.value = '';
  elements.webhookUrl.value = '';
  elements.payloadTemplate.value = JSON.stringify(DEFAULT_PAYLOAD, null, 2);
  elements.useApiKey.checked = false;
  elements.apiKey.value = '';
  elements.apiKeyGroup.style.display = 'none';
  elements.showFullResponse.checked = true;
  elements.showNotification.checked = false;

  hideEndpointCard();
  hideEmptyState();
  elements.settingsPanel.classList.add('visible');
}

function openEditEndpoint() {
  isCreatingNew = false;
  elements.settingsTitle.textContent = 'Edit Endpoint';
  elements.settingsPanel.classList.add('visible');
  elements.endpointCard.style.display = 'none';
}

function closeSettingsPanel() {
  elements.settingsPanel.classList.remove('visible');

  const hasEndpoints = elements.endpointSelect.options.length > 1;
  if (hasEndpoints && elements.endpointSelect.value) {
    showEndpointCard();
  } else if (!hasEndpoints) {
    showEmptyState();
  }
}

async function saveEndpoint() {
  try {
    const endpointName = elements.endpointName.value.trim();

    if (!endpointName) {
      throw new Error('Endpoint name is required');
    }

    if (!elements.webhookUrl.value.trim()) {
      throw new Error('Webhook URL is required');
    }

    let payloadJSON;
    try {
      payloadJSON = JSON.parse(elements.payloadTemplate.value);
      if (typeof payloadJSON !== 'object' || payloadJSON === null) {
        throw new Error('Payload must be a JSON object');
      }
    } catch (jsonError) {
      throw new Error('Invalid JSON payload: ' + jsonError.message);
    }

    const { endpoints = {} } = await browser.storage.sync.get('endpoints');
    endpoints[endpointName] = {
      name: endpointName,
      webhookUrl: elements.webhookUrl.value.trim(),
      payloadTemplate: elements.payloadTemplate.value,
      useApiKey: elements.useApiKey.checked,
      apiKey: elements.apiKey.value,
      showDetailedResponse: elements.showFullResponse.checked,
      showNotification: elements.showNotification.checked
    };

    await browser.storage.sync.set({ endpoints });
    await browser.storage.sync.set({ [STORAGE_KEYS.LAST_ENDPOINT]: endpointName });

    await loadEndpoints();
    elements.endpointSelect.value = endpointName;

    closeSettingsPanel();
    showStatus('Endpoint saved successfully!', true);
  } catch (error) {
    console.error('Error saving endpoint:', error);
    showStatus('Error saving endpoint: ' + error.message, false);
  }
}

async function deleteEndpoint() {
  try {
    if (!elements.endpointSelect.value) {
      throw new Error('Please select an endpoint to delete');
    }

    if (!confirm(`Are you sure you want to delete "${elements.endpointSelect.value}"?`)) {
      return;
    }

    const { [STORAGE_KEYS.ENDPOINTS]: endpoints = {} } = await browser.storage.sync.get(STORAGE_KEYS.ENDPOINTS);
    const deletedEndpoint = elements.endpointSelect.value;
    delete endpoints[deletedEndpoint];

    const { [STORAGE_KEYS.LAST_ENDPOINT]: lastEndpoint } = await browser.storage.sync.get(STORAGE_KEYS.LAST_ENDPOINT);
    if (lastEndpoint === deletedEndpoint) {
      await browser.storage.sync.remove(STORAGE_KEYS.LAST_ENDPOINT);
    }

    await browser.storage.sync.set({ [STORAGE_KEYS.ENDPOINTS]: endpoints });
    await loadEndpoints();

    showStatus('Endpoint deleted successfully!', true);
  } catch (error) {
    showStatus('Error deleting endpoint: ' + error.message, false);
  }
}

function toggleApiKeyInput() {
  elements.apiKeyGroup.style.display = elements.useApiKey.checked ? 'block' : 'none';
  if (!elements.useApiKey.checked) {
    elements.apiKey.value = '';
  }
}

// UI State Management
function showEmptyState() {
  elements.emptyState.style.display = 'flex';
  elements.endpointCard.style.display = 'none';
  elements.settingsPanel.classList.remove('visible');
}

function hideEmptyState() {
  elements.emptyState.style.display = 'none';
}

function showEndpointCard() {
  elements.endpointCard.style.display = 'block';
  elements.emptyState.style.display = 'none';
  elements.settingsPanel.classList.remove('visible');
}

function hideEndpointCard() {
  elements.endpointCard.style.display = 'none';
}

function updateSendButtonState() {
  const hasEndpoint = elements.endpointSelect.value !== '';
  elements.sendButton.disabled = !hasEndpoint;
}

function showStatus(message, success) {
  elements.status.textContent = message;
  elements.status.className = 'status visible ' + (success ? 'success' : 'error');

  setTimeout(() => {
    elements.status.classList.remove('visible');
  }, 3000);
}

// History Panel
function openHistoryPanel() {
  elements.historyOverlay.classList.add('visible');
  elements.historyPanel.classList.add('visible');
  loadHistory();
}

function closeHistoryPanel() {
  elements.historyOverlay.classList.remove('visible');
  elements.historyPanel.classList.remove('visible');
}

async function handleHistorySearch() {
  const { historySettings = DEFAULT_HISTORY_SETTINGS } = await browser.storage.sync.get(STORAGE_KEYS.HISTORY_SETTINGS);
  historySettings.currentPage = 1;
  await browser.storage.sync.set({ historySettings });
  await loadHistory();
}

async function handleHistorySizeChange() {
  const { historySettings = DEFAULT_HISTORY_SETTINGS } = await browser.storage.sync.get('historySettings');
  const newSettings = {
    ...historySettings,
    maxItems: parseInt(elements.historySize.value)
  };
  await browser.storage.sync.set({ historySettings: newSettings });
  await loadHistory();
}

async function handleClearHistory() {
  if (confirm('Are you sure you want to clear all history?')) {
    await browser.storage.local.set({ [STORAGE_KEYS.HISTORY]: [] });
    await loadHistory();
  }
}

async function goToPrevPage() {
  const { historySettings = DEFAULT_HISTORY_SETTINGS } = await browser.storage.sync.get(STORAGE_KEYS.HISTORY_SETTINGS);
  if (historySettings.currentPage > 1) {
    historySettings.currentPage--;
    await browser.storage.sync.set({ historySettings });
    await loadHistory();
  }
}

async function goToNextPage() {
  const { historySettings = DEFAULT_HISTORY_SETTINGS } = await browser.storage.sync.get(STORAGE_KEYS.HISTORY_SETTINGS);
  const { history = [] } = await browser.storage.local.get(STORAGE_KEYS.HISTORY);
  const totalPages = Math.ceil(history.length / historySettings.itemsPerPage);

  if (historySettings.currentPage < totalPages) {
    historySettings.currentPage++;
    await browser.storage.sync.set({ historySettings });
    await loadHistory();
  }
}

function updateHistoryBadge(count) {
  if (count > 0) {
    elements.historyBadge.textContent = count > 99 ? '99+' : count;
    elements.historyBadge.style.display = 'flex';
  } else {
    elements.historyBadge.style.display = 'none';
  }
}

async function loadHistory() {
  const { history = [] } = await browser.storage.local.get(STORAGE_KEYS.HISTORY);
  const { historySettings = DEFAULT_HISTORY_SETTINGS } = await browser.storage.sync.get(STORAGE_KEYS.HISTORY_SETTINGS);
  const searchTerm = elements.historySearch.value.toLowerCase();

  updateHistoryBadge(history.length);

  let filteredHistory = history;
  if (searchTerm) {
    filteredHistory = history.filter(item =>
      item.endpointName.toLowerCase().includes(searchTerm) ||
      item.url.toLowerCase().includes(searchTerm) ||
      (item.title && item.title.toLowerCase().includes(searchTerm))
    );
  }

  const totalItems = filteredHistory.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / historySettings.itemsPerPage));
  const currentPage = Math.min(historySettings.currentPage, totalPages);

  elements.currentPage.textContent = currentPage;
  elements.totalPages.textContent = totalPages;
  elements.prevPage.disabled = currentPage === 1;
  elements.nextPage.disabled = currentPage === totalPages;

  const startIndex = (currentPage - 1) * historySettings.itemsPerPage;
  const endIndex = Math.min(startIndex + historySettings.itemsPerPage, totalItems);
  const pageItems = filteredHistory.slice(startIndex, endIndex);

  if (pageItems.length === 0) {
    elements.historyList.innerHTML = `
      <div class="history-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="9"/>
          <path d="M12 7v5l3 3"/>
        </svg>
        <p>${searchTerm ? 'No matching history found' : 'No history yet'}</p>
      </div>
    `;
    return;
  }

  elements.historyList.innerHTML = pageItems.map((item, index) => createHistoryItemHTML(item, index)).join('');

  // Add event listeners to history items
  document.querySelectorAll('.history-item').forEach((itemEl, index) => {
    const copyBtn = itemEl.querySelector('.history-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          const formattedText = getFormattedTextContent(pageItems[index].response);
          await navigator.clipboard.writeText(formattedText);
          showStatus('Response copied to clipboard!', true);
        } catch (error) {
          showStatus('Failed to copy response: ' + error.message, false);
        }
      });
    }

    const deleteBtn = itemEl.querySelector('.history-delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Delete this history item?')) {
          const { history = [] } = await browser.storage.local.get(STORAGE_KEYS.HISTORY);
          const actualIndex = history.findIndex(h =>
            h.endpointName === pageItems[index].endpointName &&
            h.timestamp === pageItems[index].timestamp
          );
          if (actualIndex !== -1) {
            history.splice(actualIndex, 1);
            await browser.storage.local.set({ [STORAGE_KEYS.HISTORY]: history });
            await loadHistory();
          }
        }
      });
    }

    const content = itemEl.querySelector('.history-item-content');
    if (content) {
      content.addEventListener('click', () => {
        const response = itemEl.querySelector('.history-item-response');
        if (response) {
          response.classList.toggle('visible');
        }
      });
    }
  });
}

function createHistoryItemHTML(item, index) {
  return `
    <div class="history-item">
      <div class="history-item-content">
        <div class="history-item-header">
          <span class="history-item-title">${escapeHtml(item.endpointName)}</span>
          <span class="history-item-time">${new Date(item.timestamp).toLocaleString()}</span>
        </div>
        <div class="history-item-url">${escapeHtml(item.url)}</div>
        <div class="history-item-response">${formatResponse(item.response, item.isResponseTruncated)}</div>
      </div>
      <div class="history-item-actions">
        <button class="btn btn-secondary history-copy-btn">Copy</button>
        <button class="btn btn-danger history-delete-btn">Delete</button>
      </div>
    </div>
  `;
}

async function exportHistoryToMarkdown() {
  const { history = [] } = await browser.storage.local.get(STORAGE_KEYS.HISTORY);
  const markdown = generateHistoryMarkdown(history);

  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'webhook-history.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateHistoryMarkdown(history) {
  return `# WebHook Wrangler History
Generated on ${new Date().toLocaleString()}

${history.map(item => `
## ${item.endpointName}
- **URL:** ${item.url}
- **Time:** ${new Date(item.timestamp).toLocaleString()}

### Response
\`\`\`json
${JSON.stringify(item.response, null, 2)}
\`\`\`
`).join('\n')}`;
}

// Response Handling
function formatResponse(response, isResponseTruncated) {
  if (!response) return '<p class="response-content">No response data</p>';

  if (Array.isArray(response)) {
    if (response[0]?.summary) {
      response = response[0].summary;
    } else {
      response = response[0]?.text || response[0] || response;
    }
  }

  const responseText = typeof response === 'object' ?
    JSON.stringify(response, null, 2) :
    String(response);

  marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false
  });

  let formattedContent;
  try {
    if (responseText.includes('#') || responseText.includes('*') || responseText.includes('```')) {
      formattedContent = marked.parse(responseText);
    } else if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
      formattedContent = `<pre>${escapeHtml(responseText)}</pre>`;
    } else {
      formattedContent = `<p>${escapeHtml(responseText)}</p>`;
    }
  } catch (error) {
    console.error('Error parsing response:', error);
    formattedContent = `<p>${escapeHtml(responseText)}</p>`;
  }

  let result = `<div class="response-content">${formattedContent}</div>`;

  if (isResponseTruncated) {
    result += '<div class="truncation-warning">Response was truncated due to size limits</div>';
  }

  return result;
}

function getFormattedTextContent(response) {
  if (!response) return '';

  if (Array.isArray(response)) {
    if (response[0]?.summary) {
      response = response[0].summary;
    } else {
      response = response[0]?.text || response[0] || response;
    }
  }

  return typeof response === 'object' ?
    JSON.stringify(response, null, 2) :
    String(response);
}

async function copyCurrentResponse() {
  if (!currentResponseData) {
    showStatus('No response to copy', false);
    return;
  }

  try {
    const formattedText = getFormattedTextContent(currentResponseData);
    await navigator.clipboard.writeText(formattedText);
    showStatus('Response copied to clipboard!', true);
  } catch (error) {
    showStatus('Failed to copy response: ' + error.message, false);
  }
}

function truncateResponse(responseData) {
  if (!responseData) return { data: null, truncated: false };

  if (Array.isArray(responseData) && responseData[0]?.summary) {
    const summaryStr = responseData[0].summary;
    if (summaryStr.length > STORAGE_LIMITS.MAX_RESPONSE_SIZE) {
      const truncateIndex = summaryStr.lastIndexOf('\n## ', STORAGE_LIMITS.MAX_RESPONSE_SIZE - 100);
      return {
        data: [{
          ...responseData[0],
          summary: truncateIndex > 0 ?
            summaryStr.slice(0, truncateIndex) + '\n\n... (truncated)' :
            summaryStr.slice(0, STORAGE_LIMITS.MAX_RESPONSE_SIZE - 100) + '... (truncated)'
        }],
        truncated: true
      };
    }
    return { data: responseData, truncated: false };
  }

  const responseStr = typeof responseData === 'object' ?
    JSON.stringify(responseData) : String(responseData);

  if (responseStr.length > STORAGE_LIMITS.MAX_RESPONSE_SIZE) {
    if (typeof responseData === 'object') {
      return {
        data: JSON.parse(responseStr.slice(0, STORAGE_LIMITS.MAX_RESPONSE_SIZE - 100) + '..."} (truncated)'),
        truncated: true
      };
    }
    return {
      data: responseStr.slice(0, STORAGE_LIMITS.MAX_RESPONSE_SIZE - 50) + '... (truncated)',
      truncated: true
    };
  }

  return { data: responseData, truncated: false };
}

// Send Webhook
async function sendCurrentUrl() {
  try {
    if (!elements.endpointSelect.value) {
      throw new Error('Please select an endpoint');
    }

    // Show loading state
    elements.sendButton.classList.add('loading');
    elements.sendButton.disabled = true;

    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    const { endpoints = {} } = await browser.storage.sync.get('endpoints');
    const selectedEndpoint = endpoints[elements.endpointSelect.value];

    const response = await browser.runtime.sendMessage({
      action: 'sendWebhook',
      endpoint: elements.endpointSelect.value,
      data: {
        url: tab.url,
        title: tab.title
      },
      auth: selectedEndpoint.useApiKey ? {
        type: 'apiKey',
        key: selectedEndpoint.apiKey
      } : null,
      showNotification: selectedEndpoint.showNotification || false
    });

    // Reset button state
    elements.sendButton.classList.remove('loading');
    elements.sendButton.disabled = false;

    if (response.success) {
      showStatus('URL sent successfully!', true);
      currentResponseData = response.responseData;

      try {
        const { history = [] } = await browser.storage.local.get(STORAGE_KEYS.HISTORY);
        const { data: truncatedResponse, truncated } = truncateResponse(response.responseData);

        const historyItem = {
          endpointName: elements.endpointSelect.value,
          url: tab.url,
          timestamp: new Date().toISOString(),
          response: truncatedResponse,
          isResponseTruncated: truncated
        };

        const newHistory = [historyItem, ...history].slice(0, STORAGE_LIMITS.MAX_HISTORY_SIZE);

        while (newHistory.length > 0) {
          try {
            await saveHistory(historyItem);
            break;
          } catch (storageError) {
            if (storageError.message.includes('QUOTA_BYTES_PER_ITEM')) {
              newHistory.pop();
              continue;
            }
            throw storageError;
          }
        }
      } catch (storageError) {
        console.warn('Failed to save to history:', storageError);
      }

      // Show response in panel
      if (response.responseData && selectedEndpoint.showDetailedResponse) {
        elements.responseContent.innerHTML = formatResponse(response.responseData);
        elements.responsePanel.classList.add('visible');
      } else {
        elements.responsePanel.classList.remove('visible');
      }

      // Update history badge
      const { history = [] } = await browser.storage.local.get(STORAGE_KEYS.HISTORY);
      updateHistoryBadge(history.length);
    } else {
      showStatus('Error: ' + response.error, false);
      if (response.responseData && selectedEndpoint.showDetailedResponse) {
        elements.responseContent.innerHTML = formatResponse(response.responseData);
        elements.responsePanel.classList.add('visible');
      }
    }
  } catch (error) {
    console.error('Error in sendCurrentUrl:', error);
    elements.sendButton.classList.remove('loading');
    elements.sendButton.disabled = false;
    showStatus('Error: ' + error.message, false);
  }
}

async function saveHistory(historyItem) {
  try {
    const { history = [] } = await browser.storage.local.get(STORAGE_KEYS.HISTORY);
    const { historySettings = DEFAULT_HISTORY_SETTINGS } = await browser.storage.sync.get(STORAGE_KEYS.HISTORY_SETTINGS);

    let newHistory = [historyItem, ...history].slice(0, historySettings.maxItems);
    newHistory = await trimHistoryIfNeeded(newHistory, 'local');

    await browser.storage.local.set({ [STORAGE_KEYS.HISTORY]: newHistory });
  } catch (error) {
    console.error('Error saving history:', error);
    showStatus('Warning: Could not save to history due to storage limits', false);
  }
}

async function migrateHistoryToLocalStorage() {
  try {
    const { history: syncHistory = [] } = await browser.storage.sync.get('history');

    if (syncHistory.length > 0) {
      const { history: localHistory = [] } = await browser.storage.local.get(STORAGE_KEYS.HISTORY);

      if (localHistory.length === 0) {
        await browser.storage.local.set({ [STORAGE_KEYS.HISTORY]: syncHistory });
        await browser.storage.sync.remove('history');
        showStatus('History migrated to local storage for better performance', true);
      }
    }
  } catch (error) {
    console.error('Error migrating history:', error);
  }
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
