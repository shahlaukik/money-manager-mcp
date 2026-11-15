# Setup Guide

This guide covers installation and configuration of the Money Manager MCP server.

## Prerequisites

- **Node.js** >= 22.13.0
- **npm** >= 9.0.0
- **Realbyte Money Manager** app with web server enabled
- Your phone and computer on the **same Wi-Fi network**
- An MCP-compatible client:
  - Claude Desktop
  - VS Code with GitHub Copilot
  - Cursor
  - Other MCP-compatible AI tools

## Installation

### From Source

1. **Clone the repository:**

   ```bash
   git clone https://github.com/shahlaukik/money-manager-mcp.git
   cd money-manager-mcp
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Build the project:**

   ```bash
   npm run build
   ```

4. **Run the server:**

   ```bash
   npm start -- --baseUrl http://YOUR_PHONE_IP:PORT
   ```

## Configuration

### Command Line Arguments (Recommended)

The `--baseUrl` argument is optional: without any configured address the server still starts, and the AI establishes the connection on first use (via `connection_set` — the verified address is then remembered across sessions, so this is a one-time step). Providing it up front simply skips that step:

```bash
npx money-manager-mcp@latest --baseUrl http://192.168.1.1:8888
```

### Environment Variables

Alternatively, you can use environment variables. Create a `.env` file or set them in your MCP client config:

```bash
# Optional: Base URL of your Money Manager server (omit for a zero-config
# start — the AI connects on first use and the address is remembered)
MONEY_MANAGER_BASE_URL=http://your-server-ip:port

# Optional: Request timeout in milliseconds (default: 30000)
MONEY_MANAGER_TIMEOUT=30000

# Optional: Maximum retry attempts for failed read requests (default: 3).
# Writes are never retried, so a timed-out write cannot be applied twice.
MONEY_MANAGER_RETRY_COUNT=3

# Optional: Log level (debug|info|warn|error) (default: info)
MONEY_MANAGER_LOG_LEVEL=info

# Optional: Ports scanned by connection_discover, comma-separated
# (default: 8888,6200,7200,8200,9200 — the ports the PC Manager app uses)
MONEY_MANAGER_DISCOVERY_PORTS=8888,6200,7200,8200,9200

# Optional: Directory for persisted state (the last verified PC Manager
# address). Defaults to your per-user config directory; override to isolate
# test runs.
MONEY_MANAGER_STATE_DIR=
```

### Configuration Priority

The server reads configuration in this order (highest priority first):

1. **Command line arguments** (`--baseUrl`)
2. **Environment variables** (`MONEY_MANAGER_BASE_URL`)
3. **Configuration file** (`.money-manager-mcp.json`)
4. **Persisted address** (the last one verified by `connection_set`, stored in your per-user config directory)
5. **Schema defaults**

Without a configured address the server starts unconfigured; the first tool call then fails with a clear message telling the AI to ask you for the address shown in PC Manager (or discover it on the network) and pass it to `connection_set`.

### Configuration File (Alternative)

You can also use a `.money-manager-mcp.json` file in your working directory. Any subset of keys can be provided — unspecified keys fall back to the defaults shown below:

```json
{
  "server": {
    "baseUrl": "http://your-server-ip:port",
    "timeout": 30000,
    "retryCount": 3,
    "retryDelay": 1000
  },
  "logging": {
    "level": "info",
    "format": "json"
  },
  "discovery": {
    "ports": [8888, 6200, 7200, 8200, 9200]
  }
}
```

| Key                 | Default                          | Description                                                              |
| ------------------- | -------------------------------- | ------------------------------------------------------------------------ |
| `server.baseUrl`    | — (optional)                     | Money Manager server address (`http://` or `https://`)                   |
| `server.timeout`    | `30000`                          | Request timeout in milliseconds (1000–120000)                            |
| `server.retryCount` | `3`                              | Retry attempts for failed read requests (0–10); writes are never retried |
| `server.retryDelay` | `1000`                           | Base delay in milliseconds for the exponential-backoff retry             |
| `logging.level`     | `info`                           | `debug` \| `info` \| `warn` \| `error`                                   |
| `logging.format`    | `json`                           | Log line format written to stderr: `json` or `text`                      |
| `discovery.ports`   | `[8888, 6200, 7200, 8200, 9200]` | Ports scanned by `connection_discover`                                   |

> `retryDelay` and `logging.format` can only be set through the config file (there are no environment variables for them).

## MCP Client Setup

### VS Code with GitHub Copilot (Recommended)

VS Code supports MCP servers with interactive prompts for configuration. This is the most user-friendly setup.

#### Option 1: Workspace Configuration with Prompt (Recommended)

Create `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "money-manager": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "money-manager-mcp@latest",
        "--baseUrl",
        "${input:moneyManager.baseUrl}"
      ]
    }
  },
  "inputs": [
    {
      "id": "moneyManager.baseUrl",
      "description": "Enter the base URL for the Money Manager API",
      "type": "promptString",
      "default": "http://192.168.1.1:8888"
    }
  ]
}
```

This configuration will prompt you for the base URL when the server starts.

#### Option 2: Fixed Configuration

If you prefer not to be prompted each time:

```json
{
  "servers": {
    "money-manager": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "money-manager-mcp@latest",
        "--baseUrl",
        "http://192.168.1.1:8888"
      ]
    }
  }
}
```

#### Option 3: User Settings (Global)

Add to your VS Code `settings.json` (File > Preferences > Settings > Open Settings JSON):

```json
{
  "mcp": {
    "servers": {
      "money-manager": {
        "type": "stdio",
        "command": "npx",
        "args": [
          "money-manager-mcp@latest",
          "--baseUrl",
          "http://YOUR_PHONE_IP:PORT"
        ]
      }
    }
  }
}
```

#### Managing MCP Servers in VS Code

1. **View MCP Servers**: Use the Command Palette (`Ctrl+Shift+P`) and run "MCP: List Servers"
2. **Server Status**: Check server status and outputs via the MCP Servers view
3. **Restart Server**: Use "MCP: Restart Server" if you need to reconnect

### Claude Desktop

Add to your Claude Desktop configuration file:

**Location:**

- **macOS/Linux:** `~/.config/claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**Configuration (using npx - Recommended):**

```json
{
  "mcpServers": {
    "money-manager": {
      "command": "npx",
      "args": [
        "money-manager-mcp@latest",
        "--baseUrl",
        "http://YOUR_PHONE_IP:PORT"
      ]
    }
  }
}
```

**Configuration (using environment variables):**

```json
{
  "mcpServers": {
    "money-manager": {
      "command": "npx",
      "args": ["money-manager-mcp@latest"],
      "env": {
        "MONEY_MANAGER_BASE_URL": "http://YOUR_PHONE_IP:PORT"
      }
    }
  }
}
```

**Configuration (from source):**

```json
{
  "mcpServers": {
    "money-manager": {
      "command": "node",
      "args": [
        "/absolute/path/to/money-manager-mcp/dist/index.js",
        "--baseUrl",
        "http://YOUR_PHONE_IP:PORT"
      ]
    }
  }
}
```

### Cursor

Add to your Cursor MCP configuration:

```json
{
  "mcpServers": {
    "money-manager": {
      "command": "npx",
      "args": [
        "money-manager-mcp@latest",
        "--baseUrl",
        "http://YOUR_PHONE_IP:PORT"
      ]
    }
  }
}
```

### Other MCP Clients

For any MCP-compatible client, use:

- **Command:** `npx`
- **Arguments:** `["money-manager-mcp@latest", "--baseUrl", "http://YOUR_PHONE_IP:PORT"]`

Or with environment variables:

- **Command:** `npx`
- **Arguments:** `["money-manager-mcp@latest"]`
- **Environment:** `{ "MONEY_MANAGER_BASE_URL": "http://YOUR_PHONE_IP:PORT" }`

## Verifying Installation

### 1. Test the Build

```bash
npm run build
```

Should complete without errors.

### 2. Test the Server Starts

```bash
npm start -- --baseUrl http://YOUR_PHONE_IP:PORT
```

The server should start and log its base URL to stderr. It then waits for an MCP client connection via stdio (there is no HTTP port). The `--baseUrl` value must point at your running Money Manager web server.

### 3. Test MCP Connection

In Claude Desktop or VS Code with Copilot:

1. Ensure the MCP server is configured
2. Restart the application
3. Ask the AI to use a Money Manager tool:

   ```text
   Get my Money Manager initialization data
   ```

The AI should invoke the `init_get_data` tool.

## Network Configuration

### Finding Your Money Manager Server

The Money Manager app runs on your local network. Common ways to find it:

1. Open Money Manager on your mobile device.
2. Navigate to **More > PC Manager**.
3. Click on **Start** to start the server.
4. Note the IP address and port displayed (e.g., `192.168.1.1:8888`).

The port (and sometimes the IP) can change each time you start PC Manager. You don't need to edit your config and restart when it does: tell the AI the new address (for example "PC Manager is on port 4123 now") and it will call `connection_set`. You can also just ask it to "find my Money Manager on the network" — `connection_discover` scans the local subnet on the ports the app uses and verifies each hit, so only real Money Manager servers are reported. The address is verified before switching and remembered for future sessions (in your per-user config directory; override with `MONEY_MANAGER_STATE_DIR`). The address in your config is only where the server starts.

## Troubleshooting

### Common Issues

#### "Cannot connect to Money Manager server"

- Verify the server URL is correct
- Check if the Money Manager app is running (PC Manager started on the phone)
- Ensure both devices are on the same Wi-Fi network
- Ask the AI to "find my Money Manager on the network" — `connection_discover` re-locates it after the phone's IP or port changed

#### "Session expired" errors

- The server auto-manages sessions; sessions are re-established automatically on the next call
- Try restarting the MCP server

#### "outputPath must end in .xls or .xlsx (other extensions are not allowed)"

- Excel exports must use a `.xls` or `.xlsx` extension, so the export cannot overwrite unrelated files inside the working directory
- `.xlsx` paths are auto-corrected to `.xls` (the server returns an HTML-based Excel format)

#### "outputPath must be a relative path inside the working directory"

- Excel exports can only be written inside the server's working directory
- Use a relative `.xls`/`.xlsx` path (e.g. `exports/november.xls`) — absolute paths, `..` traversal, and symlinks pointing outside are rejected

#### "Tool not found" in AI client

- Ensure the MCP server is properly configured
- Restart the AI client (Claude Desktop, VS Code)
- Check the configuration file path is absolute

#### Build errors

- Ensure Node.js >= 22.13 is installed: `node --version`
- Run `npm install` to ensure all dependencies are present
- Check for TypeScript errors: `npm run build`

### Debug Mode

For verbose logging, set the log level to debug:

```bash
MONEY_MANAGER_LOG_LEVEL=debug npm start -- --baseUrl http://YOUR_PHONE_IP:PORT
```

Or in your environment configuration:

```json
{
  "env": {
    "MONEY_MANAGER_BASE_URL": "http://your-server-ip:port",
    "MONEY_MANAGER_LOG_LEVEL": "debug"
  }
}
```

## Next Steps

- See [USAGE.md](./USAGE.md) for tool descriptions and examples
- See [CONTRIBUTING.md](../CONTRIBUTING.md) for development setup
