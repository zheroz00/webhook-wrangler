chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'sendWebhook') {
    handleWebhookSend(request.endpoint, request.data, request.auth, request.showNotification)
      .then(result => {
        // Send response back to popup
        sendResponse(result);
        
        // Show notification if requested and popup is closed
        if (request.showNotification) {
          chrome.action.getBadgeText({}, function(badgeText) {
            // If there's a badge text, the popup is closed or not focused
            if (badgeText !== undefined) {
              showWebhookNotification(request.endpoint, result);
            }
          });
        }
      })
      .catch(error => sendResponse({ 
        success: false, 
        error: error.message,
        responseData: error.responseData
      }));
    return true;
  }
});

// Function to show notification about webhook response
function showWebhookNotification(endpointName, response) {
  const title = response.success ? 
    'Webhook Response Received' : 
    'Webhook Error';
    
  const message = response.success ? 
    `Successfully received response from ${endpointName}` : 
    `Error from ${endpointName}: ${response.error}`;
    
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: title,
    message: message,
    priority: 2,
    requireInteraction: true  // Keep notification visible until user interacts with it
  });
}

async function handleWebhookSend(endpointName, data, auth, showNotification) {
  try {
    const { endpoints = {} } = await chrome.storage.sync.get('endpoints');
    const endpoint = endpoints[endpointName];
    
    if (!endpoint) {
      throw new Error('Endpoint not found');
    }
    
    if (!endpoint.webhookUrl) {
      throw new Error('Webhook URL not configured');
    }

    // Enhanced URL validation with warnings
    let isSecure = true;
    let urlWarning = null;
    
    try {
      const url = new URL(endpoint.webhookUrl);
      if (!url.protocol.startsWith('https')) {
        isSecure = false;
        urlWarning = 'Warning: Using non-HTTPS URL. This is less secure and should only be used for testing.';
      }
    } catch (urlError) {
      // Allow non-URL formats (like IP:port)
      const ipPortRegex = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/;
      const localhostRegex = /^localhost(:\d+)?$/;
      
      if (!ipPortRegex.test(endpoint.webhookUrl) && !localhostRegex.test(endpoint.webhookUrl)) {
        urlWarning = 'Warning: Using non-standard URL format. Ensure the endpoint is correct.';
      }
    }
    
    if (!endpoint.payloadTemplate) {
      throw new Error('Payload template not configured');
    }
    
    let payload = JSON.parse(endpoint.payloadTemplate);
    payload = replacePlaceholders(payload, {
      url: data.url,
      title: data.title,
      timestamp: new Date().toISOString()
    });
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json'
    };

    // Add API key if provided
    if (auth?.type === 'apiKey' && auth?.key) {
      headers['X-API-Key'] = auth.key;
    }
    
    const response = await fetch(endpoint.webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    
    // Read response text once and then try to parse if it's JSON
    let responseData;
    const contentType = response.headers.get('content-type');
    const text = await response.text(); // Read text only once
    
    try {
      if (contentType && contentType.includes('application/json')) {
        responseData = JSON.parse(text);
      } else {
        responseData = text;
      }
    } catch (parseError) {
      // If JSON parsing fails, use the text we already read
      responseData = text;
    }
    
    if (!response.ok) {
      throw Object.assign(new Error(`HTTP error! status: ${response.status}`), {
        responseData,
        urlWarning
      });
    }
    
    return { 
      success: true,
      responseData,
      urlWarning
    };
  } catch (error) {
    // If the error already has responseData, rethrow it
    if (error.responseData) {
      throw error;
    }
    // Otherwise wrap it in a new error with no response data
    throw Object.assign(new Error(error.message), {
      responseData: null
    });
  }
}

function replacePlaceholders(obj, values) {
  const result = JSON.parse(JSON.stringify(obj));
  
  function replace(item) {
    if (typeof item === 'string') {
      return Object.entries(values).reduce((str, [key, value]) => {
        return str.replace(new RegExp(`{${key}}`, 'g'), value);
      }, item);
    }
    
    if (Array.isArray(item)) {
      return item.map(replace);
    }
    
    if (typeof item === 'object' && item !== null) {
      return Object.fromEntries(
        Object.entries(item).map(([key, value]) => [key, replace(value)])
      );
    }
    
    return item;
  }
  
  return replace(result);
}