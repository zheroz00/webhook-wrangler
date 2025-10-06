// Constants for storage management
const STORAGE_LIMITS = {
  MAX_RESPONSE_SIZE: 4000, // 4KB per response item to be safe
  MAX_HISTORY_SIZE: 50,    // Maximum number of history items allowed
  MAX_ITEM_SIZE: 8000,     // 8KB per history item total
  STORAGE_QUOTA: 100000,   // Chrome sync storage quota ~100KB
  LOCAL_STORAGE_QUOTA: 5242880 // Chrome local storage quota ~5MB
};

// Storage management functions
async function getStorageSize(storageType = 'sync') {
  const data = await (storageType === 'sync' ? 
    chrome.storage.sync.get(null) : 
    chrome.storage.local.get(null));
  return new TextEncoder().encode(JSON.stringify(data)).length;
}

async function trimHistoryIfNeeded(currentHistory = [], storageType = 'local') {
  if (!currentHistory.length) return currentHistory;
  
  // First try to trim large responses in history items
  const trimmedHistory = currentHistory.map(item => {
    if (!item.responseData) return item;
    
    const itemSize = new TextEncoder().encode(JSON.stringify(item)).length;
    if (itemSize <= STORAGE_LIMITS.MAX_ITEM_SIZE) return item;
    
    // Trim response data if too large
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
  
  // If still too large, remove oldest items
  let currentSize = await getStorageSize(storageType);
  const quota = storageType === 'sync' ? 
    STORAGE_LIMITS.STORAGE_QUOTA * 0.9 : 
    STORAGE_LIMITS.LOCAL_STORAGE_QUOTA * 0.9;
    
  while (currentSize > quota && trimmedHistory.length > 5) {
    trimmedHistory.pop(); // Remove oldest item
    currentSize = new TextEncoder().encode(JSON.stringify(trimmedHistory)).length;
  }
  
  return trimmedHistory;
}

const DEFAULT_PAYLOAD = {
  "URL": "{url}",
  "timestamp": "{timestamp}",
  "title": "{title}"
};

// Remove the old MAX_RESPONSE_SIZE and MAX_HISTORY_ITEMS constants since they're now in STORAGE_LIMITS
const STORAGE_KEYS = {
  LAST_ENDPOINT: 'lastSelectedEndpoint',
  ENDPOINTS: 'endpoints',
  HISTORY: 'history',
  HISTORY_SETTINGS: 'historySettings'
};

// DOM Elements
const endpointSelect = document.getElementById('endpointSelect');
const endpointNameInput = document.getElementById('endpointName');
const webhookUrlInput = document.getElementById('webhookUrl');
const payloadTemplateInput = document.getElementById('payloadTemplate');
const useApiKeyToggle = document.getElementById('useApiKey');
const apiKeyInput = document.getElementById('apiKey');
const saveButton = document.getElementById('saveButton');
const deleteButton = document.getElementById('deleteButton');
const sendButton = document.getElementById('sendButton');
const newEndpointButton = document.getElementById('newEndpoint');
const statusDiv = document.getElementById('status');
const settingsPanel = document.getElementById('settingsPanel');
const toggleSettings = document.getElementById('toggleSettings');
const showFullResponse = document.getElementById('showFullResponse');
const showNotification = document.getElementById('showNotification');
const responsePanel = document.getElementById('responsePanel');

// History Elements
const historyPanel = document.getElementById('historyPanel');
const toggleHistory = document.getElementById('toggleHistory');
const historyList = document.getElementById('historyList');
const historySizeSelect = document.getElementById('historySize');
const exportHistory = document.getElementById('exportHistory');
const clearHistory = document.getElementById('clearHistory');
const historyTabs = document.querySelectorAll('.history-tab');

// Add history search element
const historySearch = document.getElementById('historySearch');

// Add pagination elements
const prevPageButton = document.getElementById('prevPage');
const nextPageButton = document.getElementById('nextPage');
const currentPageSpan = document.getElementById('currentPage');
const totalPagesSpan = document.getElementById('totalPages');

// Default history settings
const DEFAULT_HISTORY_SETTINGS = {
  maxItems: 20,
  currentTab: 'recent',
  itemsPerPage: 10,
  currentPage: 1
};

// Load saved endpoints and settings when popup opens
document.addEventListener('DOMContentLoaded', async () => {
  // Migrate history from sync to local storage if needed
  await migrateHistoryToLocalStorage();
  
  await loadEndpoints();
  
  // Load history settings
  const { historySettings = DEFAULT_HISTORY_SETTINGS } = await chrome.storage.sync.get('historySettings');
  historySizeSelect.value = historySettings.maxItems;
  await loadHistory();
});

// Add event listeners
endpointSelect.addEventListener('change', async () => {
  await loadSelectedEndpoint();
  // Save the selected endpoint
  if (endpointSelect.value) {
    await chrome.storage.sync.set({ [STORAGE_KEYS.LAST_ENDPOINT]: endpointSelect.value });
  }
});
saveButton.addEventListener('click', saveEndpoint);
deleteButton.addEventListener('click', deleteEndpoint);
sendButton.addEventListener('click', sendCurrentUrl);
newEndpointButton.addEventListener('click', createNewEndpoint);
toggleSettings.addEventListener('click', () => {
  settingsPanel.classList.toggle('visible');
});
showFullResponse.addEventListener('change', async (e) => {
  const { endpoints = {} } = await chrome.storage.sync.get('endpoints');
  const selectedEndpoint = endpointSelect.value;
  
  if (selectedEndpoint && endpoints[selectedEndpoint]) {
    endpoints[selectedEndpoint].showDetailedResponse = e.target.checked;
    await chrome.storage.sync.set({ endpoints });
  }
  
  if (!e.target.checked) {
    responsePanel.classList.remove('visible');
  }
});

// Toggle history panel
toggleHistory.addEventListener('click', () => {
  historyPanel.classList.toggle('visible');
  settingsPanel.classList.remove('visible');
});

// Handle history size change
historySizeSelect.addEventListener('change', async () => {
  const { historySettings = DEFAULT_HISTORY_SETTINGS } = await chrome.storage.sync.get('historySettings');
  const newSettings = {
    ...historySettings,
    maxItems: parseInt(historySizeSelect.value)
  };
  await chrome.storage.sync.set({ historySettings: newSettings });
  await loadHistory();
});

// Handle history tabs
historyTabs.forEach(tab => {
  tab.addEventListener('click', async () => {
    historyTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const { historySettings = DEFAULT_HISTORY_SETTINGS } = await chrome.storage.sync.get('historySettings');
    const newSettings = {
      ...historySettings,
      currentTab: tab.dataset.tab
    };
    await chrome.storage.sync.set({ historySettings: newSettings });
    await loadHistory();
  });
});

// Export history
exportHistory.addEventListener('click', async () => {
  const { history = [] } = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
  const markdown = generateHistoryMarkdown(history);
  
  // Create blob and download
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'webhook-history.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Clear history
clearHistory.addEventListener('click', async () => {
  if (confirm('Are you sure you want to clear all history?')) {
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: [] });
    await loadHistory();
  }
});

// Add search functionality
historySearch.addEventListener('input', async () => {
  const { historySettings = DEFAULT_HISTORY_SETTINGS } = await chrome.storage.sync.get(STORAGE_KEYS.HISTORY_SETTINGS);
  historySettings.currentPage = 1; // Reset to first page on search
  await chrome.storage.sync.set({ historySettings });
  await loadHistory();
});

// Add API key toggle handler
useApiKeyToggle.addEventListener('change', (e) => {
  apiKeyInput.disabled = !e.target.checked;
  if (!e.target.checked) {
    apiKeyInput.value = '';
  }
});

// Add pagination event listeners
prevPageButton.addEventListener('click', async () => {
  const { historySettings = DEFAULT_HISTORY_SETTINGS } = await chrome.storage.sync.get(STORAGE_KEYS.HISTORY_SETTINGS);
  if (historySettings.currentPage > 1) {
    historySettings.currentPage--;
    await chrome.storage.sync.set({ historySettings });
    await loadHistory();
  }
});

// Handle pagination
nextPageButton.addEventListener('click', async () => {
  const { historySettings = DEFAULT_HISTORY_SETTINGS } = await chrome.storage.sync.get(STORAGE_KEYS.HISTORY_SETTINGS);
  const { history = [] } = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
  const totalPages = Math.ceil(history.length / historySettings.itemsPerPage);
  
  if (historySettings.currentPage < totalPages) {
    historySettings.currentPage++;
    await chrome.storage.sync.set({ historySettings });
    await loadHistory();
  }
});

// Update event listeners for the new showNotification checkbox
showNotification.addEventListener('change', async (e) => {
  const { endpoints = {} } = await chrome.storage.sync.get('endpoints');
  const selectedEndpoint = endpointSelect.value;
  
  if (selectedEndpoint && endpoints[selectedEndpoint]) {
    endpoints[selectedEndpoint].showNotification = e.target.checked;
    await chrome.storage.sync.set({ endpoints });
  }
});

async function loadEndpoints() {
  try {
    const { [STORAGE_KEYS.ENDPOINTS]: endpoints = {} } = await chrome.storage.sync.get(STORAGE_KEYS.ENDPOINTS);
    const { [STORAGE_KEYS.LAST_ENDPOINT]: lastEndpoint } = await chrome.storage.sync.get(STORAGE_KEYS.LAST_ENDPOINT);
    
    endpointSelect.innerHTML = '<option value="">Select Endpoint...</option>';
    
    Object.keys(endpoints).forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      endpointSelect.appendChild(option);
    });
    
    if (Object.keys(endpoints).length > 0) {
      // Use last selected endpoint if it exists, otherwise use first endpoint
      const endpointToSelect = lastEndpoint && endpoints[lastEndpoint] ? 
        lastEndpoint : 
        Object.keys(endpoints)[0];
      
      endpointSelect.value = endpointToSelect;
      await loadSelectedEndpoint();
    } else {
      payloadTemplateInput.value = JSON.stringify(DEFAULT_PAYLOAD, null, 2);
    }
    
    deleteButton.style.display = endpointSelect.value ? 'inline-flex' : 'none';
  } catch (error) {
    showStatus('Error loading endpoints: ' + error.message, false);
  }
}

async function loadSelectedEndpoint() {
  try {
    if (!endpointSelect.value) return;
    
    const { endpoints = {} } = await chrome.storage.sync.get('endpoints');
    const endpoint = endpoints[endpointSelect.value];
    
    if (endpoint) {
      endpointNameInput.value = endpoint.name || '';
      webhookUrlInput.value = endpoint.webhookUrl || '';
      payloadTemplateInput.value = endpoint.payloadTemplate || JSON.stringify(DEFAULT_PAYLOAD, null, 2);
      
      // Set API Key toggle and field
      useApiKeyToggle.checked = endpoint.useApiKey || false;
      apiKeyInput.value = endpoint.apiKey || '';
      apiKeyInput.disabled = !useApiKeyToggle.checked;
      
      // Set response display toggle
      showFullResponse.checked = endpoint.showDetailedResponse || false;
      
      // Set notification toggle
      showNotification.checked = endpoint.showNotification || false;
    } else {
      endpointNameInput.value = '';
      webhookUrlInput.value = '';
      payloadTemplateInput.value = JSON.stringify(DEFAULT_PAYLOAD, null, 2);
      useApiKeyToggle.checked = false;
      apiKeyInput.value = '';
      apiKeyInput.disabled = true;
      showFullResponse.checked = false;
      showNotification.checked = false;
    }
  } catch (error) {
    console.error('Error loading endpoint:', error);
    showStatus('Error loading endpoint: ' + error.message, false);
  }
}

function createNewEndpoint() {
  endpointSelect.value = '';
  endpointNameInput.value = '';
  webhookUrlInput.value = '';
  payloadTemplateInput.value = JSON.stringify(DEFAULT_PAYLOAD, null, 2);
  showFullResponse.checked = true;
  useApiKeyToggle.checked = false;
  apiKeyInput.value = '';
  apiKeyInput.disabled = true;
  deleteButton.style.display = 'none';
  settingsPanel.classList.add('visible');
}

async function saveEndpoint() {
  try {
    const endpointName = endpointNameInput.value.trim();
    
    if (!endpointName) {
      throw new Error('Endpoint name is required');
    }
    
    if (!webhookUrlInput.value.trim()) {
      throw new Error('Webhook URL is required');
    }
    
    let payloadJSON;
    try {
      payloadJSON = JSON.parse(payloadTemplateInput.value);
      if (typeof payloadJSON !== 'object' || payloadJSON === null) {
        throw new Error('Payload must be a JSON object');
      }
    } catch (jsonError) {
      throw new Error('Invalid JSON payload: ' + jsonError.message);
    }
    
    const { endpoints = {} } = await chrome.storage.sync.get('endpoints');
    endpoints[endpointName] = {
      name: endpointName,
      webhookUrl: webhookUrlInput.value.trim(),
      payloadTemplate: payloadTemplateInput.value,
      useApiKey: useApiKeyToggle.checked,
      apiKey: apiKeyInput.value,
      showDetailedResponse: showFullResponse.checked,
      showNotification: showNotification.checked
    };
    
    await chrome.storage.sync.set({ endpoints });
    await chrome.storage.sync.set({ [STORAGE_KEYS.LAST_ENDPOINT]: endpointName });
    
    // Update dropdown
    await loadEndpoints();
    endpointSelect.value = endpointName;
    
    showStatus('Endpoint saved successfully!', true);
  } catch (error) {
    console.error('Error saving endpoint:', error);
    showStatus('Error saving endpoint: ' + error.message, false);
  }
}

async function deleteEndpoint() {
  try {
    if (!endpointSelect.value) {
      throw new Error('Please select an endpoint to delete');
    }
    
    // Add confirmation dialog
    if (!confirm(`Are you sure you want to delete the endpoint "${endpointSelect.value}"?`)) {
      return; // Exit if user cancels
    }
    
    const { [STORAGE_KEYS.ENDPOINTS]: endpoints = {} } = await chrome.storage.sync.get(STORAGE_KEYS.ENDPOINTS);
    const deletedEndpoint = endpointSelect.value;
    delete endpoints[deletedEndpoint];
    
    // Remove last selected endpoint if it was deleted
    const { [STORAGE_KEYS.LAST_ENDPOINT]: lastEndpoint } = await chrome.storage.sync.get(STORAGE_KEYS.LAST_ENDPOINT);
    if (lastEndpoint === deletedEndpoint) {
      await chrome.storage.sync.remove(STORAGE_KEYS.LAST_ENDPOINT);
    }
    
    await chrome.storage.sync.set({ [STORAGE_KEYS.ENDPOINTS]: endpoints });
    await loadEndpoints();
    
    showStatus('Endpoint deleted successfully!', true);
  } catch (error) {
    showStatus('Error deleting endpoint: ' + error.message, false);
  }
}

function showStatus(message, success) {
  statusDiv.textContent = message;
  statusDiv.className = 'status ' + (success ? 'success' : 'error');
  statusDiv.style.display = 'block';
  
  if (!showFullResponse.checked) {
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }
}

// Load and display history
async function loadHistory() {
  // Get history from local storage and settings from sync storage
  const { history = [] } = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
  const { historySettings = DEFAULT_HISTORY_SETTINGS } = await chrome.storage.sync.get(STORAGE_KEYS.HISTORY_SETTINGS);
  const searchTerm = historySearch.value.toLowerCase();
  
  // Filter history based on search term
  let filteredHistory = history;
  if (searchTerm) {
    filteredHistory = history.filter(item => 
      item.endpointName.toLowerCase().includes(searchTerm) ||
      item.url.toLowerCase().includes(searchTerm) ||
      (item.title && item.title.toLowerCase().includes(searchTerm))
    );
  }
  
  // Calculate pagination
  const totalItems = filteredHistory.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / historySettings.itemsPerPage));
  const currentPage = Math.min(historySettings.currentPage, totalPages);
  
  // Update pagination UI
  currentPageSpan.textContent = currentPage;
  totalPagesSpan.textContent = totalPages;
  prevPageButton.disabled = currentPage === 1;
  nextPageButton.disabled = currentPage === totalPages;
  
  // Get items for current page
  const startIndex = (currentPage - 1) * historySettings.itemsPerPage;
  const endIndex = Math.min(startIndex + historySettings.itemsPerPage, totalItems);
  const pageItems = filteredHistory.slice(startIndex, endIndex);
  
  // Display items
  historyList.innerHTML = pageItems.length === 0 
    ? `<div class="history-item">No ${searchTerm ? 'matching ' : ''}history items${searchTerm ? ' found' : ' yet'}</div>`
    : pageItems.map(item => createHistoryItemHTML(item)).join('');
    
  // Add click listeners to history items
  document.querySelectorAll('.history-item').forEach((item, index) => {
    // Copy button click
    const copyBtn = item.querySelector('.history-item-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent item expansion
        const response = pageItems[index].response;
        try {
          const formattedText = getFormattedTextContent(response);
          await navigator.clipboard.writeText(formattedText);
          showStatus('Response copied to clipboard!', true);
        } catch (error) {
          showStatus('Failed to copy response: ' + error.message, false);
        }
      });
    }

    // Delete button click
    const deleteBtn = item.querySelector('.history-item-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent item expansion
        if (confirm('Delete this history item?')) {
          const { history = [] } = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
          // Find the actual index in the original history array
          const actualIndex = history.findIndex(h => 
            h.endpointName === pageItems[index].endpointName &&
            h.timestamp === pageItems[index].timestamp
          );
          if (actualIndex !== -1) {
            history.splice(actualIndex, 1);
            await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: history });
            
            // Update current page if we're on the last page and it's now empty
            const { historySettings = DEFAULT_HISTORY_SETTINGS } = await chrome.storage.sync.get(STORAGE_KEYS.HISTORY_SETTINGS);
            const newTotalPages = Math.max(1, Math.ceil((history.length - 1) / historySettings.itemsPerPage));
            if (historySettings.currentPage > newTotalPages) {
              historySettings.currentPage = newTotalPages;
              await chrome.storage.sync.set({ historySettings });
            }
            
            await loadHistory();
          }
        }
      });
    }

    // Content click for expansion
    const content = item.querySelector('.history-item-content');
    if (content) {
      content.addEventListener('click', () => {
        const response = item.querySelector('.history-item-response');
        if (response) {
          response.classList.toggle('visible');
        }
      });
    }
  });
}

// Create HTML for history item
function createHistoryItemHTML(item) {
  return `
    <div class="history-item">
      <div class="history-item-actions">
        <button class="history-item-copy" title="Copy response">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M13.3 4.3h-1.7V2.6c0-.7-.6-1.3-1.3-1.3H2.6c-.7 0-1.3.6-1.3 1.3v7.7c0 .7.6 1.3 1.3 1.3h1.7v1.7c0 .7.6 1.3 1.3 1.3h7.7c.7 0 1.3-.6 1.3-1.3V5.6c0-.7-.6-1.3-1.3-1.3zm-9 6h-1.7V2.6h7.7v1.7H5.6c-.7 0-1.3.6-1.3 1.3v4.7zm9 1.7H5.6V5.6h7.7v6.4z" fill="currentColor"/>
          </svg>
        </button>
        <button class="history-item-delete" title="Delete this item">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3L13 13M13 3L3 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="history-item-content">
        <div class="history-item-header">
          <span class="history-item-title">${item.endpointName}</span>
          <span class="history-item-time">${new Date(item.timestamp).toLocaleString()}</span>
        </div>
        <div class="history-item-url">${item.url}</div>
        <div class="history-item-response">${formatResponse(item.response, item.isResponseTruncated)}</div>
      </div>
    </div>
  `;
}

// Generate markdown for export
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

// Update formatResponse to better handle all response types
function formatResponse(response, isResponseTruncated) {
  if (!response) return '';
  
  // Handle array responses and extract summary for YouTube responses
  if (Array.isArray(response)) {
    if (response[0]?.summary) {
      response = response[0].summary;
    } else {
      response = response[0]?.text || response[0] || response;
    }
  }

  // Convert response to string if it's an object
  const responseText = typeof response === 'object' ? 
    JSON.stringify(response, null, 2) : 
    String(response);

  // Create the copy button
  const copyButton = `
    <div class="response-header">
      <button class="copy-button" title="Copy response">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M13.3 4.3h-1.7V2.6c0-.7-.6-1.3-1.3-1.3H2.6c-.7 0-1.3.6-1.3 1.3v7.7c0 .7.6 1.3 1.3 1.3h1.7v1.7c0 .7.6 1.3 1.3 1.3h7.7c.7 0 1.3-.6 1.3-1.3V5.6c0-.7-.6-1.3-1.3-1.3zm-9 6h-1.7V2.6h7.7v1.7H5.6c-.7 0-1.3.6-1.3 1.3v4.7zm9 1.7H5.6V5.6h7.7v6.4z" fill="currentColor"/>
        </svg>
      </button>
    </div>`;

  // Initialize marked with options
  marked.setOptions({
    breaks: true,  // Enable line breaks
    gfm: true,     // Enable GitHub Flavored Markdown
    headerIds: false // Disable header IDs to prevent conflicts
  });

  // Format the content based on whether it looks like markdown, JSON, or plain text
  let formattedContent;
  try {
    // Check if it's markdown
    if (responseText.includes('#') || responseText.includes('*') || responseText.includes('```')) {
      formattedContent = marked.parse(responseText);
    } 
    // Check if it's JSON
    else if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
      formattedContent = `<pre>${responseText}</pre>`;
    } 
    // Plain text (like a single sentence)
    else {
      formattedContent = `<p>${responseText}</p>`;
    }
  } catch (error) {
    console.error('Error parsing response:', error);
    formattedContent = `<p>${responseText}</p>`;
  }

  let formattedResponse = `${copyButton}<div class="content">${formattedContent}</div>`;

  // Add truncation warning if needed
  if (isResponseTruncated) {
    formattedResponse += '<div class="truncation-warning">⚠️ Response was truncated due to size limits</div>';
  }

  return formattedResponse;
}

// Simplified to just return the raw text
function getFormattedTextContent(response) {
  if (!response) return '';
  
  // Handle array responses
  if (Array.isArray(response)) {
    if (response[0]?.summary) {
      response = response[0].summary;
    } else {
      response = response[0]?.text || response[0] || response;
    }
  }

  // Return raw text, preserving markdown
  return typeof response === 'object' ? 
    JSON.stringify(response, null, 2) : 
    String(response);
}

// Add this helper function
function truncateResponse(responseData) {
  if (!responseData) return { data: null, truncated: false };
  
  // For YouTube responses
  if (Array.isArray(responseData) && responseData[0]?.summary) {
    const summaryStr = responseData[0].summary;
    if (summaryStr.length > STORAGE_LIMITS.MAX_RESPONSE_SIZE) {
      // Try to truncate at a markdown section
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
  
  // For other responses
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

// Update the sendCurrentUrl function's history handling
async function sendCurrentUrl() {
  try {
    if (!endpointSelect.value) {
      throw new Error('Please select an endpoint');
    }
    
    // Show loading state
    const spinner = sendButton.querySelector('.spinner');
    const buttonText = sendButton.querySelector('span');
    spinner.style.display = 'block';
    sendButton.disabled = true;
    buttonText.textContent = 'Sending...';
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const { endpoints = {} } = await chrome.storage.sync.get('endpoints');
    const selectedEndpoint = endpoints[endpointSelect.value];
    
    console.log('Sending request with endpoint:', endpointSelect.value); // Debug log
    
    chrome.runtime.sendMessage({
      action: 'sendWebhook',
      endpoint: endpointSelect.value,
      data: {
        url: tab.url,
        title: tab.title
      },
      auth: selectedEndpoint.useApiKey ? {
        type: 'apiKey',
        key: selectedEndpoint.apiKey
      } : null,
      showNotification: selectedEndpoint.showNotification || false
    }, async response => {
      console.log('Received response:', response); // Debug full response
      
      // Reset button state
      spinner.style.display = 'none';
      sendButton.disabled = false;
      buttonText.textContent = 'Send Current URL';
      
      if (response.success) {
        showStatus('URL sent successfully!', true);
        
        // Debug response data
        console.log('Response data type:', typeof response.responseData);
        console.log('Response data value:', response.responseData);
        console.log('Show full response checked:', showFullResponse.checked);
        
        try {
          // Get current history from local storage
          const { history = [] } = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
          
          // Truncate response data
          const { data: truncatedResponse, truncated } = truncateResponse(response.responseData);
          console.log('Truncated response:', truncatedResponse); // Debug truncated data
          
          // Create new history item
          const historyItem = {
            endpointName: endpointSelect.value,
            url: tab.url,
            timestamp: new Date().toISOString(),
            response: truncatedResponse,
            isResponseTruncated: truncated
          };
          
          // Keep only recent items
          const newHistory = [historyItem, ...history].slice(0, STORAGE_LIMITS.MAX_HISTORY_SIZE);
          
          // Try to save, if it fails, remove oldest items until it succeeds
          while (newHistory.length > 0) {
            try {
              await saveHistory(historyItem);
              break;
            } catch (storageError) {
              console.warn('Storage error:', storageError); // Debug storage errors
              if (storageError.message.includes('QUOTA_BYTES_PER_ITEM')) {
                newHistory.pop(); // Remove oldest item
                continue;
              }
              throw storageError; // Re-throw if it's a different error
            }
          }
        } catch (storageError) {
          console.warn('Failed to save to history:', storageError);
          // Continue execution even if history save fails
        }
        
        // Show response in panel
        if (response.responseData && showFullResponse.checked) {
          console.log('Attempting to show response in panel'); // Debug panel display
          console.log('Response data before formatting:', response.responseData);
          const formattedResponse = formatResponse(response.responseData);
          console.log('Formatted response:', formattedResponse);
          
          // Check if responsePanel exists
          console.log('Response panel element:', responsePanel);
          
          if (responsePanel) {
            responsePanel.innerHTML = formattedResponse;
            responsePanel.classList.add('visible');
            console.log('Response panel should now be visible');
            
            // Add click handler for copy button
            const copyButton = responsePanel.querySelector('.copy-button');
            if (copyButton) {
              copyButton.addEventListener('click', async () => {
                try {
                  const formattedText = getFormattedTextContent(response.responseData);
                  await navigator.clipboard.writeText(formattedText);
                  showStatus('Response copied to clipboard!', true);
                } catch (error) {
                  showStatus('Failed to copy response: ' + error.message, false);
                }
              });
            }
          } else {
            console.error('Response panel element not found!');
          }
        } else {
          console.log('Not showing response panel because:', {
            hasResponseData: !!response.responseData,
            showFullResponse: showFullResponse.checked
          });
          responsePanel.classList.remove('visible');
        }
        
        // Refresh history display if panel is visible
        if (historyPanel.classList.contains('visible')) {
          await loadHistory();
        }
      } else {
        showStatus('Error: ' + response.error, false);
        if (response.responseData && showFullResponse.checked) {
          responsePanel.innerHTML = formatResponse(response.responseData);
          responsePanel.classList.add('visible');
        }
      }
    });
  } catch (error) {
    console.error('Error in sendCurrentUrl:', error); // Debug any errors
    
    // Reset button state on error
    const spinner = sendButton.querySelector('.spinner');
    const buttonText = sendButton.querySelector('span');
    spinner.style.display = 'none';
    sendButton.disabled = false;
    buttonText.textContent = 'Send Current URL';
    
    showStatus('Error: ' + error.message, false);
  }
}

async function saveHistory(historyItem) {
  try {
    // Get history from local storage instead of sync
    const { history = [] } = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
    // Still get settings from sync storage
    const { historySettings = DEFAULT_HISTORY_SETTINGS } = await chrome.storage.sync.get(STORAGE_KEYS.HISTORY_SETTINGS);
    
    // Add new item and limit to user's selected size
    let newHistory = [historyItem, ...history].slice(0, historySettings.maxItems);
    
    // Ensure we don't exceed storage limits
    newHistory = await trimHistoryIfNeeded(newHistory, 'local');
    
    // Save to local storage instead of sync
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: newHistory });
    await loadHistory(); // Refresh the display
  } catch (error) {
    console.error('Error saving history:', error);
    showStatus('Warning: Could not save to history due to storage limits', false);
  }
}

// Function to migrate history from sync to local storage
async function migrateHistoryToLocalStorage() {
  try {
    // Check if we have history in sync storage
    const { history: syncHistory = [] } = await chrome.storage.sync.get('history');
    
    if (syncHistory.length > 0) {
      console.log('Migrating history from sync to local storage...');
      
      // Check if we already have history in local storage
      const { history: localHistory = [] } = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
      
      if (localHistory.length === 0) {
        // Only migrate if local storage is empty to avoid duplicates
        await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: syncHistory });
        
        // Clear history from sync storage to free up space
        await chrome.storage.sync.remove('history');
        
        console.log('History migration complete');
        showStatus('History migrated to local storage for better performance', true);
      }
    }
  } catch (error) {
    console.error('Error migrating history:', error);
  }
}