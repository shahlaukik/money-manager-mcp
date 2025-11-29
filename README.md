# Money Manager MCP Server

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

1. **Install dependencies:**

    ```bash
    npm install
    ```

2. **Build the project:**

    ```bash
    npm run build
    ```

3. **Configure your MCP client** (e.g., Claude Desktop):

    ```json
    {
        "mcpServers": {
            "money-manager": {
                "command": "node",
                "args": ["/path/to/money-manager-mcp/dist/index.js"],
                "env": {
                    "MONEY_MANAGER_BASE_URL": "http://your-server:port"
                }
            }
        }
    }
    ```

4. **Start using with your AI assistant!**

> 📖 For detailed setup instructions, see [docs/SETUP.md](docs/SETUP.md)

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
