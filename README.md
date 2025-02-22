# Auth Security Monitor - Telex Integration

A Telex Output Integration that monitors authentication logs from your website platform to detect and alert on suspicious login activities.

![Security Monitor](docs/images/banner.png)

## 🔍 Overview

This integration monitors authentication system by:
- Analyzing database query logs for suspicious patterns
- Detecting unusual login behaviors and failed attempts
- Sending real-time security alerts to Telex channels
- Notifying DevOps teams about potential security incidents

## 🛠 Integration Type

**Output Integration** that routes authentication events and security alerts to Telex channels.

## ⚡ Key Features

- 🔐 Real-time authentication log monitoring
- 🚨 Failed login attempt detection
- 📊 SQL injection attempt detection
- 🕒 Rate limiting and brute force protection
- 📝 Comprehensive event logging
- 🎯 Configurable alert thresholds

## 🚀 Quick Start

### Prerequisites

- Node.js >= 14
- npm
- Telex account and channel
- database access

### Installation

```bash
# Clone the repository
git clone https://github.com/telex_integrations/jobjott-auth-monitor.git

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Configuration

1. Set up your environment variables:
```properties
TELEX_WEBHOOK_URL=your_telex_webhook_url
PORT=3000
NODE_ENV=development
```

2. Configure the integration in Telex:
- Navigate to your Telex channel
- Add new integration
- Configure the following settings:
  - Database connection string
  - Authentication key
  - Alert thresholds
  - Monitored events

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Test specific scenarios
npm run test:scenarios
```

### Test Security Events

```bash
# Test failed login detection
curl -X POST "http://localhost:3000/webhook" \
-H "Content-Type: application/json" \
-d '{
  "event_type": "failed_login",
  "payload": {
    "userId": "test123",
    "timestamp": 1708633200000,
    "ipAddress": "192.168.1.1",
    "eventType": "failed_login",
    "success": false,
    "attempts": 6
  }
}'
```

## 📸 Integration Screenshots

![Alert Example](docs/images/alert-example.png)
![Configuration](docs/images/config-screen.png)

## 📁 Project Structure

```
/
├── src/
│   ├── config/        # Configuration files
│   ├── middleware/    # Express middleware
│   ├── utils/         # Helper functions
│   ├── __tests__/     # Test files
│   └── scripts/       # Test scripts
├── docs/             # Documentation and images
└── README.md
```

## 🔒 Security Features

- Rate limiting to prevent brute force attacks
- SQL injection detection
- Unusual login pattern detection
- IP-based suspicious activity monitoring
- Configurable alert thresholds

## 📚 API Documentation

### Webhook Endpoint

```typescript
POST /webhook
Content-Type: application/json

{
  "event_type": "failed_login",
  "payload": {
    "userId": string,
    "timestamp": number,
    "ipAddress": string,
    "eventType": string,
    "success": boolean,
    "attempts": number
  },
  "settings": {
    "alert_severity": "High" | "Medium" | "Low"
    // ... other settings
  }
}
```

## 🚀 Deployment

1. Host your integration.json file publicly
2. Create a repository under telex_integrations organization
3. Deploy to your preferred hosting platform
4. Configure the integration in your Telex organization
5. Monitor the logs for any issues

## 👥 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 👤 Author

Created by Daggahhh (@Daggahhh)