# Money Manager MCP Server

[![npm version](https://img.shields.io/npm/v/money-manager-mcp.svg)](https://www.npmjs.com/package/money-manager-mcp)
[![npm downloads](https://img.shields.io/npm/dm/money-manager-mcp.svg)](https://www.npmjs.com/package/money-manager-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![MCP Protocol](https://img.shields.io/badge/MCP-Compatible-purple)](https://modelcontextprotocol.io/)
[![Open Source Love](https://badges.frapsoft.com/os/v2/open-source.svg?v=103)](https://github.com/ellerbrock/open-source-badges/)

![Money Manager MCP](./docs/assets/banner.png)

An [MCP](https://modelcontextprotocol.io/) server that lets AI assistants manage personal finances through the **Realbyte Money Manager** app's PC Manager web server.

Each of the **18 tools** is defined once (a Zod schema + handler); the [FastMCP](https://github.com/punkpeye/fastmcp) framework derives validation, schema advertising, and dispatch from that single definition.

## ✨ Features

- **Full transaction CRUD** — create, read, update, delete income & expenses
- **Assets & credit cards** — manage accounts, balances, and cards
- **Transfers** — move money between accounts
- **Reports & export** — period summaries and Excel export
- **Dashboard** — net-worth trends and portfolio breakdown
- **Session persistence** — stays logged in across restarts

## 🚀 Quick Start

You need the Money Manager app's web server running on your phone, on the **same Wi-Fi network** as your computer. To start it: open the app → **More (⋮) → PC Manager → Start**, and note the displayed address (e.g. `192.168.1.1:8888`).

Then add the server to your AI client.

### VS Code / GitHub Copilot

**One-click install** (prompts for the base URL):

[![Install for VS Code](https://img.shields.io/badge/VS_Code-Install_Money_Manager_MCP-0098FF?logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=money-manager&config=%7B%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22money-manager-mcp%40latest%22%2C%22--baseUrl%22%2C%22%24%7Binput%3AmoneyManager.baseUrl%7D%22%5D%7D&inputs=%5B%7B%22id%22%3A%22moneyManager.baseUrl%22%2C%22type%22%3A%22promptString%22%2C%22description%22%3A%22Enter%20the%20base%20URL%20for%20the%20Money%20Manager%20API%20%28e.g.%2C%20http%3A%2F%2F192.168.1.1%3A8888%29%22%2C%22default%22%3A%22http%3A%2F%2F192.168.1.1%3A8888%22%7D%5D)
[![Install for VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install_Money_Manager_MCP-24bfa5?logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=money-manager&quality=insiders&config=%7B%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22money-manager-mcp%40latest%22%2C%22--baseUrl%22%2C%22%24%7Binput%3AmoneyManager.baseUrl%7D%22%5D%7D&inputs=%5B%7B%22id%22%3A%22moneyManager.baseUrl%22%2C%22type%22%3A%22promptString%22%2C%22description%22%3A%22Enter%20the%20base%20URL%20for%20the%20Money%20Manager%20API%20%28e.g.%2C%20http%3A%2F%2F192.168.1.1%3A8888%29%22%2C%22default%22%3A%22http%3A%2F%2F192.168.1.1%3A8888%22%7D%5D)

**Or manually** — add to `.vscode/mcp.json`:

```json
{
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
```

### Claude Desktop / Cursor / Others

Add the server to your client's MCP config (e.g. `claude_desktop_config.json`):

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

> 📖 For full client setup, environment variables, and config files, see the [Setup Guide](docs/SETUP.md).

## 📋 Tools

| Category     | Tools                                                                                |
| ------------ | ------------------------------------------------------------------------------------ |
| Init         | `init_get_data`                                                                      |
| Transactions | `transaction_list`, `transaction_create`, `transaction_update`, `transaction_delete` |
| Summaries    | `summary_get_period`, `summary_export_excel`                                         |
| Assets       | `asset_list`, `asset_create`, `asset_update`, `asset_delete`                         |
| Cards        | `card_list`, `card_create`, `card_update`                                            |
| Transfers    | `transfer_create`, `transfer_update`                                                 |
| Dashboard    | `dashboard_get_overview`, `dashboard_get_asset_chart`                                |

> 📖 Parameters and example prompts: [Usage Guide](docs/USAGE.md)

## 📚 Documentation

| Document                                             | Description                      |
| ---------------------------------------------------- | -------------------------------- |
| [Setup Guide](docs/SETUP.md)                         | Installation & configuration     |
| [Usage Guide](docs/USAGE.md)                         | Tool reference & example prompts |
| [API Reference](docs/technical/API_DOCUMENTATION.md) | Upstream Money Manager HTTP API  |
| [Architecture](docs/technical/ARCHITECTURE.md)       | System design                    |
| [Contributing](docs/CONTRIBUTING.md)                 | Development setup & guidelines   |
| [AGENTS.md](AGENTS.md)                               | Guidance for AI coding agents    |

## ⚠️ Legal Disclaimer

**Money Manager** is developed by **RealByte**. This MCP server is an independent community project — **not affiliated with, endorsed by, or sponsored by RealByte**. Use is at your own risk and intended for personal/educational use. Users are responsible for compliance with Money Manager's terms of service.

## 📄 License

MIT — see [LICENSE](LICENSE).

## 🤝 Contributing

Contributions are welcome! See the [Contributing Guide](docs/CONTRIBUTING.md).

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) for the MCP specification
- [FastMCP](https://github.com/punkpeye/fastmcp) — the TypeScript MCP framework this server is built on

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/shahlaukik">Laukik Shah</a></p>
  <p>
    <a href="https://github.com/shahlaukik/money-manager-mcp/issues">Report Bug</a> •
    <a href="https://github.com/shahlaukik/money-manager-mcp/issues">Request Feature</a>
  </p>
</div>
