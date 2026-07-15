# ReconBrowser

ReconBrowser is a custom Electron-based browser designed for cybersecurity learning, web application testing, and security research in authorized environments.

It combines a Chromium browser with built-in interception and network analysis capabilities, inspired by tools like Burp Suite while remaining completely customizable.

> ⚠️ This project is intended only for security testing on systems you own or are explicitly authorized to assess.

---

# Current Features

- Chromium Browser (Electron)
- Request Interceptor
- Forward / Drop Requests
- Current Host Mode
- All Hosts Mode
- Network Logger
- Request Headers Viewer
- Request Body Capture
- Response Headers Viewer
- Raw HTTP Request Viewer
- Slide Up / Slide Down Panels
- Request Queue
- Live Request Counter
- HTTPS Detection
- Modern Hacker UI

---

# Upcoming Features

- Repeater
- Intruder
- Decoder
- Comparer
- HTTP History
- Cookie Manager
- Header Editor
- Automatic Parameter Detection
- Request Editor
- Response Viewer
- WebSocket Support
- Scope Manager
- Proxy Support
- Extension Support
- Port Scanner
- IP Scanner
- Host Discovery
- Gobuster Style Directory Scanner
- Subdomain Scanner
- DNS Lookup
- WHOIS Lookup
- SSL Certificate Viewer
- Technology Detection
- JavaScript Analyzer
- Robots.txt Finder
- Sitemap Finder
- Hidden File Scanner
- API Discovery
- Vulnerability Scanner
- JWT Decoder
- Base64 Tools
- Hash Generator
- Hash Cracker (Dictionary)
- Encoding Utilities
- Cookie Inspector
- Session Manager

---

# Tech Stack

- Electron
- Node.js
- Chromium
- HTML
- CSS
- JavaScript

---

# Project Structure

```
ReconBrowser/
│
├── core/
│   └── networkCapture.js
│
├── interceptor/
│   ├── interceptorStore.js
│   └── interceptorServer.js
│
├── store/
│   └── requestStore.js
│
├── main.js
├── preload.js
├── renderer.js
├── index.html
├── style.css
├── package.json
└── README.md
```

---

# Install Requirements

## Update Kali Linux

```bash
sudo apt update
sudo apt upgrade -y
```

---

## Install Git

```bash
sudo apt install git -y
```

---

## Install Curl

```bash
sudo apt install curl -y
```

---

## Install Build Tools

```bash
sudo apt install build-essential -y
```

---

## Install NodeJS

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

sudo apt install nodejs -y
```

---

## Verify Installation

```bash
node -v
npm -v
```

---

## Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/ReconBrowser.git
```

---

## Open Project

```bash
cd ReconBrowser
```

---

## Install Dependencies

```bash
npm install
```

---

## Start Browser

```bash
npm start
```

---

# Useful Development Commands

### Check Node Version

```bash
node -v
```

---

### Check NPM Version

```bash
npm -v
```

---

### Install Electron

```bash
npm install electron --save-dev
```

---

### Reinstall Packages

```bash
rm -rf node_modules

rm package-lock.json

npm install
```

---

### Check JavaScript Syntax

```bash
node --check main.js

node --check renderer.js

node --check preload.js

node --check core/networkCapture.js

node --check interceptor/interceptorStore.js

node --check interceptor/interceptorServer.js
```

---

### Kill Running Electron

```bash
pkill -f electron
```

---

### Restart Browser

```bash
npm start
```

---

# Current Workflow

```
User

↓

Browser

↓

Request Generated

↓

Network Capture

↓

Interceptor

↓

Hold Request

↓

Forward / Drop

↓

Browser
```

---

# Current Status

| Module | Status |
|---------|--------|
| Browser | ✅ |
| Network Logger | ✅ |
| Interceptor | ✅ |
| Hold Requests | ✅ |
| Forward | ✅ |
| Drop | ✅ |
| Current Host Scope | ✅ |
| All Hosts Scope | ✅ |
| Header Viewer | ✅ |
| Request Body Capture | ✅ |
| Response Headers | ✅ |
| UI Panels | ✅ |
| Request Queue | ✅ |
| Repeater | 🚧 |
| Scanner | 🚧 |
| Proxy | 🚧 |

---

# Development Roadmap

### Phase 1

- Browser
- Navigation
- Network Logger

✅ Completed

---

### Phase 2

- Interceptor
- Hold Requests
- Forward
- Drop

✅ Completed

---

### Phase 3

- Repeater
- Raw Request Editing
- Response Viewer

🚧 In Progress

---

### Phase 4

- Port Scanner
- IP Scanner
- Directory Scanner
- Host Discovery

🚧 Planned

---

### Phase 5

- Vulnerability Scanner
- Cookie Manager
- Header Editor
- API Discovery

🚧 Planned

---

### Phase 6

- Proxy
- Extensions
- Session Manager
- Full Burp-style Workflow

🚧 Planned

---

# Disclaimer

This project is intended solely for educational purposes and authorized security testing. Do not use it against systems or networks without explicit permission. The author is not responsible for any misuse.

---

# Author

**Sumit Kumar**

Cyber Security Enthusiast

ReconBrowser Project
