#!/usr/bin/env python3
"""
Advanced HTTP Server for Log Monitor
- Scans multiple directories for log files
- Serves a REST API endpoint with discovered logs
- Configurable via config.json
"""

import http.server
import socketserver
import os
import json
import re
from pathlib import Path
from urllib.parse import urlparse, parse_qs
import mimetypes

# Default port (can be overridden by config.json)
PORT = 8080

class LogMonitorHandler(http.server.SimpleHTTPRequestHandler):
    
    config = None
    discovered_logs = []
    
    @classmethod
    def load_config(cls):
        """Load configuration from config.json"""
        config_path = Path(__file__).parent / 'config.json'
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                cls.config = json.load(f)
            print(f"✓ Configuration loaded from {config_path}")
        except Exception as e:
            print(f"⚠ Could not load config.json: {e}")
            # Default configuration
            cls.config = {
                "logPatterns": [
                    {
                        "pattern": "*.*.*.log",
                        "regex": "^(.+?)\\.(\\d+)\\.(.+?)\\.log$",
                        "tagGroup": 3,
                        "nameGroup": 1
                    }
                ],
                "scanPaths": ["."],
                "updateInterval": 2000,
                "maxEntriesPerTag": 1000
            }
    
    @classmethod
    def discover_logs(cls):
        """Scan configured paths for log files"""
        if not cls.config:
            cls.load_config()
        
        base_path = Path(__file__).parent
        discovered = []
        seen_files = set()  # Track absolute paths to avoid duplicates
        
        print("\n" + "="*60)
        print("🔍 Scanning for log files...")
        print("="*60)
        
        for scan_path in cls.config.get('scanPaths', ['.']):
            full_path = (base_path / scan_path).resolve()
            
            if not full_path.exists():
                print(f"⚠ Path does not exist: {full_path}")
                continue
            
            print(f"\n📂 Scanning: {full_path}")
            
            # Find all .log files
            log_files = list(full_path.glob('**/*.log'))
            
            for log_file in log_files:
                # Skip if we've already seen this file
                abs_path_str = str(log_file.resolve())
                if abs_path_str in seen_files:
                    continue
                
                # Try to match against configured patterns
                for pattern_config in cls.config.get('logPatterns', []):
                    regex = pattern_config.get('regex')
                    tag_group = pattern_config.get('tagGroup', 1)
                    name_group = pattern_config.get('nameGroup', 1)
                    
                    match = re.match(regex, log_file.name)
                    if match:
                        tag = match.group(tag_group) if tag_group <= len(match.groups()) else log_file.stem
                        name = match.group(name_group) if name_group <= len(match.groups()) else log_file.stem
                        
                        # Calculate relative path from base
                        try:
                            rel_path = log_file.relative_to(base_path)
                            # Use forward slashes for web compatibility
                            web_path = str(rel_path).replace('\\', '/')
                        except ValueError:
                            # If file is outside base_path, copy it or use filename only
                            web_path = log_file.name
                        
                        log_info = {
                            'filename': log_file.name,
                            'path': web_path,
                            'absolutePath': abs_path_str,
                            'tag': tag,
                            'name': name,
                            'size': log_file.stat().st_size,
                            'modified': log_file.stat().st_mtime,
                            'pattern': pattern_config.get('description', 'Unknown pattern')
                        }
                        
                        discovered.append(log_info)
                        seen_files.add(abs_path_str)
                        print(f"  ✓ Found: {log_file.name} → Tag: '{tag}' → Path: '{web_path}'")
                        break
        
        cls.discovered_logs = discovered
        
        print("\n" + "="*60)
        print(f"📊 Total log files discovered: {len(discovered)}")
        print("="*60 + "\n")
        
        return discovered

    
    def end_headers(self):
        """Add CORS and cache control headers"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()
    
    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS"""
        self.send_response(200)
        self.end_headers()
    
    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # API endpoints
        if path == '/api/logs':
            self.serve_logs_api()
        elif path == '/api/config':
            self.serve_config_api()
        elif path == '/api/refresh':
            self.serve_refresh_api()
        else:
            # Serve static files or log files
            self.serve_file(path)
    
    def serve_logs_api(self):
        """Serve discovered logs as JSON"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response = {
            'logs': self.discovered_logs,
            'count': len(self.discovered_logs),
            'timestamp': os.path.getmtime(__file__)
        }
        
        self.wfile.write(json.dumps(response, indent=2).encode())
    
    def serve_config_api(self):
        """Serve configuration as JSON"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        self.wfile.write(json.dumps(self.config, indent=2).encode())
    
    def serve_refresh_api(self):
        """Refresh log discovery and return updated list"""
        self.discover_logs()
        self.serve_logs_api()
    
    def serve_file(self, path):
        """Serve static files or log files from configured paths"""
        # Remove leading slash
        if path.startswith('/'):
            path = path[1:]
        
        base_path = Path(__file__).parent
        
        # Try to find the file
        file_path = base_path / path
        
        if not file_path.exists():
            # Try to find in discovered logs
            for log in self.discovered_logs:
                if log['path'] == path or log['filename'] == path:
                    file_path = Path(log['absolutePath'])
                    break
        
        if file_path.exists() and file_path.is_file():
            try:
                # Determine content type
                content_type, _ = mimetypes.guess_type(str(file_path))
                if content_type is None:
                    content_type = 'application/octet-stream'
                
                # For log files, read only the tail to improve performance
                if file_path.suffix == '.log':
                    max_read_size = self.config.get('maxFileReadSize', 524288)  # 512KB default
                    file_size = file_path.stat().st_size
                    
                    with open(file_path, 'rb') as f:
                        if file_size > max_read_size:
                            # Seek to the last N bytes
                            f.seek(file_size - max_read_size)
                            # Skip partial line
                            f.readline()
                        
                        content = f.read()
                    
                    self.send_response(200)
                    self.send_header('Content-type', content_type)
                    self.send_header('Content-Length', len(content))
                    self.send_header('X-Partial-Content', 'true' if file_size > max_read_size else 'false')
                    self.end_headers()
                    self.wfile.write(content)
                else:
                    # For non-log files, serve normally
                    self.send_response(200)
                    self.send_header('Content-type', content_type)
                    self.send_header('Content-Length', file_path.stat().st_size)
                    self.end_headers()
                    
                    with open(file_path, 'rb') as f:
                        self.wfile.write(f.read())
                        
            except Exception as e:
                self.send_error(500, f"Error reading file: {e}")
        else:
            self.send_error(404, f"File not found: {path}")

    
    def log_message(self, format, *args):
        """Custom log format"""
        # Only log non-polling requests to reduce noise
        if '/api/logs' not in self.path:
            print(f"[{self.log_date_time_string()}] {format % args}")

def main():
    # Change to the script's directory
    os.chdir(Path(__file__).parent)
    
    # Load configuration and discover logs
    LogMonitorHandler.load_config()
    LogMonitorHandler.discover_logs()
    
    # Get port from config or use default
    port = LogMonitorHandler.config.get('port', PORT)
    
    # Start server
    with socketserver.TCPServer(("", port), LogMonitorHandler) as httpd:
        print("=" * 60)
        print(f"🚀 Log Monitor Server")
        print("=" * 60)
        print(f"📂 Serving directory: {os.getcwd()}")
        print(f"🌐 Server running at: http://localhost:{port}")
        print(f"📊 Web Interface: http://localhost:{port}/index.html")
        print(f"🔌 API Endpoints:")
        print(f"   - GET /api/logs    - List discovered log files")
        print(f"   - GET /api/config  - Get configuration")
        print(f"   - GET /api/refresh - Refresh log discovery")
        print("=" * 60)
        print("Press Ctrl+C to stop the server")
        print("=" * 60 + "\n")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n🛑 Server stopped")

if __name__ == "__main__":
    main()
