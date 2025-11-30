# Setup Guide

This guide covers installation and configuration of the Money Manager MCP server.

## Prerequisites

- **Node.js** >= 18.0.0
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

The simplest way to configure the server is via the `--baseUrl` argument:

```bash
npx money-manager-mcp@latest --baseUrl http://192.168.1.1:8888
```

### Environment Variables

Alternatively, you can use environment variables. Create a `.env` file or set them in your MCP client config:

```bash
# Required: Base URL of your Money Manager server
MONEY_MANAGER_BASE_URL=http://your-server-ip:port

# Optional: Request timeout in milliseconds (default: 30000)
MONEY_MANAGER_TIMEOUT=30000

# Optional: Maximum retry attempts for failed requests (default: 3)
MONEY_MANAGER_RETRY_COUNT=3

# Optional: Log level (debug|info|warn|error) (default: info)
MONEY_MANAGER_LOG_LEVEL=info

# Optional: Whether to persist session cookies across restarts (default: true)
MONEY_MANAGER_SESSION_PERSIST=true
```

### Configuration Priority

The server reads configuration in this order (highest priority first):

1. **Command line arguments** (`--baseUrl`)
2. **Environment variables** (`MONEY_MANAGER_BASE_URL`)
3. **Configuration file** (`money-manager-config.json`)

### Configuration File (Alternative)

You can also use a `money-manager-config.json` file:

```json
{
  "baseUrl": "http://your-server-ip:port",
  "timeout": 30000,
  "retryCount": 3,
  "logLevel": "info",
  "sessionPersist": true
}
```

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
npm start
```

The server should start without errors. It will wait for MCP client connections via stdio.

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

## Troubleshooting

### Common Issues

#### "Cannot connect to Money Manager server"

- Verify the server URL is correct
- Check if the Money Manager app is running
- Ensure network connectivity between your machine and the server

#### "Session expired" errors

- The server auto-manages sessions
- Try restarting the MCP server
- Check `MONEY_MANAGER_SESSION_PERSIST` is set to `true`

#### "Tool not found" in AI client

- Ensure the MCP server is properly configured
- Restart the AI client (Claude Desktop, VS Code)
- Check the configuration file path is absolute

#### Build errors

- Ensure Node.js >= 18 is installed: `node --version`
- Run `npm install` to ensure all dependencies are present
- Check for TypeScript errors: `npm run build`

### Debug Mode

For verbose logging, set the log level to debug:

```bash
MONEY_MANAGER_LOG_LEVEL=debug npm start
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
- See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup
