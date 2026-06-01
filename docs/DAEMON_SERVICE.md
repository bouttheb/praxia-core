# Daemon Service Install

The simplest daemon mode is foreground:

```bash
node daemon/dashboard-daemon.mjs
```

For everyday use, run it under your operating system's service manager.

## macOS LaunchAgent

Create `~/Library/LaunchAgents/com.praxia.core.daemon.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.praxia.core.daemon</string>
  <key>WorkingDirectory</key>
  <string>/absolute/path/to/praxia-core</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/env</string>
    <string>node</string>
    <string>daemon/dashboard-daemon.mjs</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/praxia-core-daemon.out.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/praxia-core-daemon.err.log</string>
</dict>
</plist>
```

Then load it:

```bash
launchctl load ~/Library/LaunchAgents/com.praxia.core.daemon.plist
launchctl start com.praxia.core.daemon
```

## Linux systemd User Service

Create `~/.config/systemd/user/praxia-core-daemon.service`:

```ini
[Unit]
Description=Praxia Core daemon

[Service]
Type=simple
WorkingDirectory=/absolute/path/to/praxia-core
ExecStart=/usr/bin/env node daemon/dashboard-daemon.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
```

Then:

```bash
systemctl --user daemon-reload
systemctl --user enable --now praxia-core-daemon
```

## Windows

Windows support is manual for v0.1:

```powershell
node daemon/dashboard-daemon.mjs
```

Use Task Scheduler or a process manager once your local foreground run works.
