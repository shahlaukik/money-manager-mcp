# Setup Guide

This guide covers installation and configuration of the Money Manager MCP server.

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Realbyte Money Manager** server running and accessible
- An MCP-compatible client:
    - Claude Desktop
    - VS Code with GitHub Copilot
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

4. **Configure environment** (see [Configuration](#configuration) below)

### Global Installation (Optional)

After building, you can make the server globally available:

```bash
npm link
```

This makes the `money-manager-mcp` command available system-wide.

## Configuration

### Environment Variables

Create a `.env` file in the project root:

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

**Note:** Environment variables take precedence over the config file.

## MCP Client Setup

### Claude Desktop

Add to your Claude Desktop configuration file:

**Location:**

- **macOS/Linux:** `~/.config/claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**Configuration:**

```json
{
    "mcpServers": {
        "money-manager": {
            "command": "node",
            "args": ["/absolute/path/to/money-manager-mcp/dist/index.js"],
            "env": {
                "MONEY_MANAGER_BASE_URL": "http://your-server-ip:port"
            }
        }
    }
}
```

### VS Code with GitHub Copilot

VS Code uses the standard MCP configuration format. Create a `mcp.json` file in your workspace root or add to your VS Code settings:

#### Option 1: Workspace Configuration (Recommended)

Create a `mcp.json` file in your workspace root:

```json
{
    "servers": {
        "money-manager": {
            "type": "stdio",
            "command": "node",
            "args": ["/absolute/path/to/money-manager-mcp/dist/index.js"],
            "env": {
                "MONEY_MANAGER_BASE_URL": "http://your-server-ip:port"
            }
        }
    }
}
```

#### Option 2: User Settings

Add to your VS Code `settings.json` (File > Preferences > Settings > Open Settings JSON):

```json
{
    "mcp": {
        "servers": {
            "money-manager": {
                "type": "stdio",
                "command": "node",
                "args": ["/absolute/path/to/money-manager-mcp/dist/index.js"],
                "env": {
                    "MONEY_MANAGER_BASE_URL": "http://your-server-ip:port"
                }
            }
        }
    }
}
```

#### Option 3: Workspace Folder Configuration

Create `.vscode/mcp.json` in your workspace:

```json
{
    "servers": {
        "money-manager": {
            "type": "stdio",
            "command": "node",
            "args": ["${workspaceFolder}/dist/index.js"],
            "env": {
                "MONEY_MANAGER_BASE_URL": "http://your-server-ip:port"
            }
        }
    }
}
```

#### Managing MCP Servers in VS Code

1. **View MCP Servers**: Use the Command Palette (`Ctrl+Shift+P`) and run "MCP: List Servers"
2. **Server Status**: Check server status and outputs via the MCP Servers view
3. **Configuration**: Use "MCP: Add Configuration" to set up servers through the UI
4. **Variables**: Use `${workspaceFolder}` for relative paths in workspace configurations

**Important Notes:**

- VS Code supports both `mcp.json` files and `settings.json` configuration
- The `type: "stdio"` field is required for command-based servers
- Environment variables in `env` are passed to the MCP server process
- Restart VS Code after adding or modifying MCP server configurations
- Use absolute paths unless using workspace variables like `${workspaceFolder}`

<!--
### Using npx

Note: This section is commented out as the package is not yet published to npm.
Once published, users will be able to use npx instead of absolute paths.

You can use npx instead of absolute paths:

```bash
npx money-manager-mcp
```

**Claude Desktop:**

```json
{
  "mcpServers": {
    "money-manager": {
      "command": "npx",
      "args": ["money-manager-mcp"],
      "env": {
        "MONEY_MANAGER_BASE_URL": "http://your-server-ip:port"
      }
    }
  }
}
```

**VS Code:**

```json
{
  "servers": {
    "money-manager": {
      "type": "stdio",
      "command": "npx",
      "args": ["money-manager-mcp"],
      "env": {
        "MONEY_MANAGER_BASE_URL": "http://your-server-ip:port"
      }
    }
  }
}
```
-->

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
4. Note the IP address and port displayed (e.g., `192.168.1.100:7200`).

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
