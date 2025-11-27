# 🚀 Release v1.0.0 - DMVCFramework Log Viewer

## Overview

First stable release of **DMVCFramework Log Viewer**, a modern, high-performance web-based log monitoring system designed for real-time log file monitoring with automatic tag detection and optimizations for large data volumes.

## ✨ Key Features

### 🎯 Core Functionality
- **Real-time Log Monitoring**: Automatic updates every 2 seconds (configurable)
- **Auto-discovery**: Detects new log files and creates tabs dynamically without restart
- **Multiple Log File Support**: Monitor logs from multiple folders simultaneously
- **Pattern-based File Detection**: Flexible regex patterns for log file naming conventions

### 🏷️ Smart Organization
- **Dynamic Tabs**: Automatic tab creation based on detected tags
- **Multi-level Filtering**: Filter by log level (INFO, WARNING, ERROR, DEBUG, FATAL)
- **Real-time Search**: Instant text search with 100ms debounce
- **Date/Time Range Filtering**: Filter logs by specific date and time ranges

### ⚡ Performance Optimizations
- **Virtual Scrolling**: Smooth rendering of thousands of log entries
- **Partial File Reading**: Reads only the tail of large files (configurable, default 512KB)
- **Memory Management**: Limits entries per tag to prevent browser memory issues
- **Smart Auto-scroll**: Automatically scrolls to new entries when near the bottom

### 🎨 Modern Interface
- **Premium Dark Theme**: Sleek, professional design with glassmorphism effects
- **Responsive Layout**: Works on desktop and tablet devices
- **Color-coded Log Levels**: Easy visual identification of log severity
- **Smooth Animations**: Polished transitions and micro-interactions

### 🌐 Flexible Deployment
- **Decoupled Architecture**: Frontend and backend can be hosted separately
- **Configurable Server URL**: Point frontend to any backend server
- **Configurable Port**: Run multiple instances or avoid port conflicts
- **CORS Support**: Built-in CORS headers for cross-origin requests

### 🔧 Configuration Options
- **Scan Multiple Paths**: Monitor logs from different folders (relative or absolute)
- **Custom Log Patterns**: Define regex patterns for file name parsing
- **Adjustable Update Interval**: Control refresh frequency
- **Performance Tuning**: Configure max entries, file read size, and virtual scroll

### 📊 REST API
- `GET /api/logs` - List discovered log files
- `GET /api/config` - Get current configuration
- `GET /api/refresh` - Force log file re-scan

## 📦 What's Included

- Web interface (HTML/CSS/JavaScript)
- Python backend server
- Configuration system (JSON)
- Comprehensive documentation (English & Spanish)
- Example configuration files
- MIT License

## 🛠️ Technical Stack

- **Frontend**: Vanilla JavaScript, modern CSS3
- **Backend**: Python 3 with built-in HTTP server
- **No Dependencies**: Works out of the box with Python 3

## 📖 Documentation

- [English README](README.md)
- [Spanish README](README_ES.md)

## 🚦 Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/PuroDelphi/dmvcframework-log-viewer.git

# 2. Navigate to the directory
cd dmvcframework-log-viewer

# 3. Edit config.json to configure your log paths
# (Optional) Edit port, patterns, etc.

# 4. Start the server
python server.py

# 5. Open in browser
http://localhost:8080/index.html
```

## 🎯 Use Cases

- **Development**: Monitor application logs during development
- **Debugging**: Track down issues in real-time
- **Production Monitoring**: Keep an eye on production logs (with proper security)
- **Multi-application Monitoring**: Monitor logs from multiple applications simultaneously
- **Team Collaboration**: Share the same log view with your team

## 🙏 Credits

Developed for the **DMVCFramework** community.

## 📝 License

MIT License - See [LICENSE](LICENSE) file for details

---

**Full Changelog**: https://github.com/PuroDelphi/dmvcframework-log-viewer/commits/v1.0.0
