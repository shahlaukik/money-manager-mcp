# Money Manager MCP Server

[![npm version](https://img.shields.io/npm/v/money-manager-mcp.svg)](https://www.npmjs.com/package/money-manager-mcp)
[![npm downloads](https://img.shields.io/npm/dm/money-manager-mcp.svg)](https://www.npmjs.com/package/money-manager-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![MCP Protocol](https://img.shields.io/badge/MCP-Compatible-purple)](https://modelcontextprotocol.io/)
[![Open Source Love](https://badges.frapsoft.com/os/v2/open-source.svg?v=103)](https://github.com/ellerbrock/open-source-badges/)

![Money Manager MCP](./docs/assets/banner.png)

An MCP (Model Context Protocol) server that enables AI assistants to manage personal finances through the Realbyte Money Manager application.

## ✨ Features

- **18 MCP Tools** for comprehensive financial management
- **Transaction Management** - Create, read, update, delete transactions
- **Asset Tracking** - Manage bank accounts and investments
- **Credit Card Support** - Track cards and balances
- **Financial Reports** - Summaries, trends, and Excel exports
- **Dashboard Analytics** - Portfolio breakdowns and trends
- **Session Persistence** - Maintains login across restarts

## 🚀 Quick Start

### 1. Prerequisites 🛠️

Ensure you have the following before starting the installation:

- **Node.js (version 18 or higher)**: Required for running the server
- **Money Manager App Web Server Enabled**: The web server must be running on your phone ([How to enable](#3-enabling-the-money-manager-web-server-))
- **Same Network**: Your computer and your phone must be connected to the **same Wi-Fi network**.

### 2. Integration for IDEs & AI Clients 💻

#### A. VS Code / GitHub Copilot

**One Click Installer:**

Use the oneclick installer below for the fastest setup. This will create the necessary configuration file and prompt you for the base URL.

[![Install for VS Code](https://img.shields.io/badge/VS_Code-Install_Money_Manager_MCP-0098FF?logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=money-manager&config=%7B%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22money-manager-mcp%40latest%22%2C%22--baseUrl%22%2C%22%24%7Binput%3AmoneyManager.baseUrl%7D%22%5D%7D&inputs=%5B%7B%22id%22%3A%22moneyManager.baseUrl%22%2C%22type%22%3A%22promptString%22%2C%22description%22%3A%22Enter%20the%20base%20URL%20for%20the%20Money%20Manager%20API%20%28e.g.%2C%20http%3A%2F%2F192.168.1.1%3A8888%29%22%2C%22default%22%3A%22http%3A%2F%2F192.168.1.1%3A8888%22%7D%5D)
[![Install for VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install_Money_Manager_MCP-24bfa5?logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=money-manager&quality=insiders&config=%7B%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22money-manager-mcp%40latest%22%2C%22--baseUrl%22%2C%22%24%7Binput%3AmoneyManager.baseUrl%7D%22%5D%7D&inputs=%5B%7B%22id%22%3A%22moneyManager.baseUrl%22%2C%22type%22%3A%22promptString%22%2C%22description%22%3A%22Enter%20the%20base%20URL%20for%20the%20Money%20Manager%20API%20%28e.g.%2C%20http%3A%2F%2F192.168.1.1%3A8888%29%22%2C%22default%22%3A%22http%3A%2F%2F192.168.1.1%3A8888%22%7D%5D)

**Manual Configuration:**

If the buttons fail, add the following JSON block to your workspace's `.vscode/mcp.json` or root `mcp.json` file:

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

#### B. Claude Desktop

Add the server definition to your `claude_desktop_config.json`:

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

**Config file location:**

- **macOS/Linux:** `~/.config/claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

### 3. Enabling the Money Manager Web Server 📱

You **must** start the web server in the app to get the necessary IP address and port for the $\text{npx}$ command.

1. Open the **Money Manager** app on your phone.
2. Navigate to **More** (three dots icon).
3. Select **PC Manager**.
4. Tap **Start** to launch the web server.
5. **Note the displayed IP address and Port** (e.g., `192.168.1.1:8888`). Use this entire string as the `http://YOUR_PHONE_IP:PORT` value in your commands.

> 📖 For advanced setup options, see [docs/SETUP.md](docs/SETUP.md)

## 📋 Available Tools

| Category           | Tools                                                                                | Description                                  |
| ------------------ | ------------------------------------------------------------------------------------ | -------------------------------------------- |
| **Initialization** | `init_get_data`                                                                      | Get categories, payment types, configuration |
| **Transactions**   | `transaction_list`, `transaction_create`, `transaction_update`, `transaction_delete` | Full CRUD for income/expenses                |
| **Summaries**      | `summary_get_period`, `summary_export_excel`                                         | Financial reports and exports                |
| **Assets**         | `asset_list`, `asset_create`, `asset_update`, `asset_delete`                         | Bank account management                      |
| **Credit Cards**   | `card_list`, `card_create`, `card_update`                                            | Credit card tracking                         |
| **Transfers**      | `transfer_create`, `transfer_update`                                                 | Move money between accounts                  |
| **Dashboard**      | `dashboard_get_overview`, `dashboard_get_asset_chart`                                | Analytics and trends                         |

> 📖 For usage examples, see [docs/USAGE.md](docs/USAGE.md)

## 📚 Documentation

| Document                                                 | Description                    |
| -------------------------------------------------------- | ------------------------------ |
| [Setup Guide](docs/SETUP.md)                             | Installation and configuration |
| [Usage Guide](docs/USAGE.md)                             | Tool descriptions and examples |
| [API Documentation](docs/technical/API_DOCUMENTATION.md) | Technical API reference        |
| [Architecture](docs/technical/ARCHITECTURE.md)           | System design and structure    |
| [Contributing](docs/CONTRIBUTING.md)                     | How to contribute              |

## ⚠️ Legal Disclaimer

**IMPORTANT:** Please read before using this software.

- **Money Manager** is a personal finance application developed by **RealByte**
- This MCP server is an **independent community project**
- This project is **NOT affiliated with, endorsed by, or sponsored by RealByte**
- Use of this software is at your own risk
- This project is intended for **personal and educational use only**
- Users are responsible for ensuring compliance with Money Manager's terms of service
- The maintainers of this project assume no liability for any issues arising from its use

By using this software, you acknowledge that you understand and agree to these terms.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please see our [Contributing Guide](docs/CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) for the MCP specification
- The open-source community for inspiration and support

---

<p>
<div align="center">
    <p>Made with ❤️ by <a href="https://github.com/shahlaukik">Laukik Shah</a></p>
    <p>
        <a href="https://github.com/shahlaukik/money-manager-mcp/issues">Report Bug</a> •
        <a href="https://github.com/shahlaukik/money-manager-mcp/issues">Request Feature</a>
    </p>
</div>
