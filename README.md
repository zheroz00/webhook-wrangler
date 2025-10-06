# WebHook Wrangler

A powerful Chrome extension for managing and sending webpage URLs to webhooks with customizable payloads, detailed response tracking, and comprehensive history management.

## Features

### 🎯 Multiple Endpoint Management
- Create and manage multiple webhook endpoints
- Customize each endpoint with unique settings
- Easy switching between endpoints
- Quick add/remove functionality

### 📝 Customizable Payload Templates
- JSON-based payload templates
- Support for dynamic variables:
  - `{url}`: Current page URL
  - `{title}`: Page title
  - `{timestamp}`: Current timestamp
- Real-time JSON validation

### 🔒 Security Features
- API Key authentication support
- Secure storage of sensitive data
- HTTPS validation and warnings
- Content Security Policy (CSP) compliant

### 📊 Response Handling
- Detailed response viewing
- Support for both JSON and plain text responses
- Markdown rendering for formatted responses
- Copy response functionality
- Response size management with smart truncation

### 📜 History Management
- Comprehensive request history
- Search functionality
- Filtering options:
  - Recent requests
  - All history
- Configurable history size
- Export history to markdown
- Individual history item management

### 🎨 Modern UI/UX
- Dark mode interface
- Responsive design
- Loading indicators
- Clear status messages
- Intuitive controls

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Usage

### Setting Up an Endpoint

1. Click the extension icon in your Chrome toolbar
2. Click the "+" button to create a new endpoint
3. Configure the endpoint:
   - Name: Give your endpoint a descriptive name
   - Webhook URL: Enter the target webhook URL
   - API Key: (Optional) Enable and enter if required
   - Payload Template: Customize the JSON payload structure

### Sending URLs

1. Navigate to the webpage you want to send
2. Click the extension icon
3. Select your endpoint from the dropdown
4. Click "Send Current URL"
5. (Optional) Check "Show detailed response" to view the webhook response

### Managing History

- View history: Click the clock icon
- Search: Use the search bar to filter history items
- Export: Click "Export" to save history as markdown
- Clear: Use "Clear" to remove all history
- Individual items:
  - Click to expand/collapse
  - Copy response
  - Delete individual entries

### Response Viewing

- Enable "Show detailed response" to see webhook responses
- Responses are automatically formatted:
  - JSON is pretty-printed
  - Markdown is rendered
  - Large responses are smartly truncated
- Use the copy button to copy response content

## Webhook Configuration

### Basic Setup
The extension sends POST requests with a JSON payload. Configure your webhook to accept:
- Method: POST
- Content-Type: application/json

### API Key Authentication
If enabled, the extension sends the API key in the `X-API-Key` header:
```http
X-API-Key: your-api-key-here
```

### Example N8n Setup
1. Create a new Webhook node
2. Configure:
   - Method: POST
   - Authentication: Header Auth
   - Header Name: X-API-Key
   - Header Value: Your chosen API key
   - Response: Configure to return desired data

### CORS Configuration
Ensure your webhook server allows CORS from the Chrome extension by setting appropriate headers:
```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-API-Key
```

## Development

### Project Structure
```
webhook-wrangler/
├── manifest.json        # Extension configuration
├── popup.html          # Main UI
├── popup.js           # UI logic
├── popup.css          # Styles
├── background.js      # Background service worker
└── lib/              # Local dependencies
    └── marked.min.js  # Markdown parser
```

### Built With
- Chrome Extensions Manifest V3
- Vanilla JavaScript
- marked.js for Markdown rendering

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 