browser.runtime.onMessage.addListener((request, sender) => {
  if (request.action === 'sendWebhook') {
    // Return a Promise for async response (Firefox pattern)
    return handleWebhookSend(request.endpoint, request.data, request.auth, request.showNotification)
      .then(async result => {
        // Show notification if requested and popup is closed
        if (request.showNotification) {
          try {
            const badgeText = await browser.action.getBadgeText({});
            if (badgeText !== undefined) {
              showWebhookNotification(request.endpoint, result);
            }
          } catch (e) {
            showWebhookNotification(request.endpoint, result);
          }
        }
        return result;
      })
      .catch(error => {
        return {
          success: false,
          error: error.message,
          responseData: error.responseData
        };
      });
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

  browser.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: title,
    message: message,
    priority: 2
  });
}

async function handleWebhookSend(endpointName, data, auth, showNotification) {
  try {
    const { endpoints = {} } = await browser.storage.sync.get('endpoints');
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
    const text = await response.text();

    try {
      if (contentType && contentType.includes('application/json')) {
        responseData = JSON.parse(text);
      } else {
        responseData = text;
      }
    } catch (parseError) {
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
    if (error.responseData) {
      throw error;
    }
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
