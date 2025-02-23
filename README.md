# Auth Security Monitor - Telex Integration

A Telex Output Integration that monitors authentication logs from your website platform to detect and alert on suspicious login activities.

## 🔍 Overview

This integration monitors authentication system by:
- Analyzing database query logs for suspicious patterns
- Detecting unusual login behaviors and failed attempts
- Sending real-time security alerts to Telex channels
- Notifying DevOps teams about potential security incidents

## 🛠 Integration Type

**Output Integration** that routes authentication events and security alerts to Telex channels.

## ⚡ Key Features

- 🚨 Real-time security event monitoring
- 🔒 Multiple security event detection
  - SQL Injection attempts
  - Brute force attacks
  - Session hijacking
  - Privilege escalation
  - Suspicious IP access
- 📊 MongoDB event logging
- ⚡ Rate limiting protection
- 🎯 Configurable alert thresholds
- 📱 Instant Telex notifications

## 🚀 Quick Start

### Prerequisites

- Node.js >= 14
- npm
- Telex account and channel
- database access

### Installation

```bash
# Clone the repository
git clone https://github.com/telexintegrations/login-security-monitor.git
# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Configuration

1. Set up your environment variables:
```properties
TELEX_WEBHOOK_URL=your_webhook_url
MONGODB_URI=your_mongodb_uri
NODE_ENV=production
PORT=3000
```

2. Configure the integration in Telex:
- Navigate to your Telex channel
- Add new integration
- Configure the following settings:
  - Database connection string
  - Authentication key
  - Alert thresholds
  - Monitored events


## 🔍 API Usage

### Send Security Event

```bash
curl -X POST "https://login-security-monitor.onrender.com/webhook" \
-H "Content-Type: application/json" \
-d '{
  "event_type": "sql_injection_attempt",
  "payload": {
    "userId": "user123",
    "timestamp": 1708633200000,
    "ipAddress": "192.168.1.1",
    "eventType": "sql_injection_attempt"
  },
  "settings": {
    "db_connection_string": "mongodb://localhost:27017",
    "auth_key": "test-key-123",
    "alert_threshold": 5,
    "time_window": 15,
    "alert_severity": "High",
    "alert_admins": ["DevOps-Lead"],
    "monitored_events": ["failed_login", "unusual_pattern", "sql_injection_attempt"]
  }
}'
```

## 🧪 Development

```bash
# Run tests
npm test

# Start development server
npm run dev
```

## 🧪 Testing & Validation

### Verify Setup
```bash
# Check environment and connections
npm run verify
```

### Database Validation
```bash
# Check recent security events
npm run check-db
```

### Real-world Testing
```bash
# Run simulated security events
npm run test:real
```

## 📸 Integration Screenshots

![Alert Example](docs/images/alert-example.png)
![Configuration](docs/images/config-screen.png)

## 📁 Project Structure

```
/
├── src/
│   ├── config/        # Configuration
│   ├── middleware/    # Express middleware
│   ├── utils/         # Helpers
│   ├── models/        # Data models
│   └── __tests__/     # Test suite
├── .env.example
└── README.md
```

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

# Postman Testing Guide

## Environment Setup

1. Create a new environment in Postman:
   - Click "Environments" → "Create Environment"
   - Name it "Auth Monitor - Local"

2. Add these variables:
```
BASE_URL: http://localhost:3000
TELEX_WEBHOOK_URL: your_telex_webhook_url
AUTH_KEY: your_auth_key
```

## Import Collection

1. Import the `Auth_Monitor_Tests.postman_collection.json`
2. Select the "Auth Monitor - Local" environment

## Test Scenarios

### 1. Health Check
- Endpoint: GET `/health`
- Expected: 200 OK with uptime info

### 2. Failed Login Attempt
- Endpoint: POST `/webhook`
- Simulates multiple failed login attempts
- Check Telex channel for alert

### 3. SQL Injection Attempt
- Endpoint: POST `/webhook`
- Simulates SQL injection detection
- Verify alert severity is "Critical"

### 4. Successful Login
- Endpoint: POST `/webhook`
- Includes device and location info
- Confirms normal login behavior

### 5. Privilege Escalation
- Endpoint: POST `/webhook`
- Tests unauthorized admin access attempts
- Verifies security team notification

## Running Tests

1. Start your local server:
```bash
npm run dev
```

2. In Postman:
   - Select the collection
   - Click "Run Collection"
   - Choose test order
   - Click "Run Auth Monitor Tests"

## Validation

Each request should:
1. Return 200/202 status
2. Generate Telex notification
3. Log event to database
4. Follow rate limiting rules

## Common Issues

- **401 Unauthorized**: Check AUTH_KEY
- **404 Not Found**: Verify BASE_URL
- **400 Bad Request**: Validate request body

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