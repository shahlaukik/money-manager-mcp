# Contributing to Money Manager MCP

Thank you for your interest in contributing to the Money Manager MCP server! This document provides guidelines and instructions for contributing.

## Project Philosophy

This project aims to be small, readable, and correct:

- **One definition per tool.** Each tool is defined exactly once (Zod schema + handler) in `src/tools/handlers.ts`. FastMCP derives validation, schema advertising, and dispatch from that single definition — there is no hand-maintained JSON Schema and no duplicate registration.
- **The Zod schema is the source of truth.** Input types are inferred from it; advertised tool schemas flow from it.
- **Handlers stay pure and transport-agnostic.** A handler is a `(client, args) → domain object` function. It never imports FastMCP or formats MCP content — that wrapping happens once in `src/index.ts`.
- **Absorb upstream quirks once.** The HTTP client handles the Money Manager API's unusual formats (JS literals, XML, HTML-based Excel) so handlers read like straightforward code.
- **No speculative features.** Document and build only what exists.

## Code of Conduct

Please be respectful and constructive in all interactions. We're building this project for the community.

## How to Contribute

### Reporting Issues

1. **Search existing issues** to avoid duplicates
2. **Use issue templates** if available
3. **Provide detailed information:**
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (Node.js version, OS, etc.)
   - Error messages and logs

### Suggesting Features

1. Open an issue with the "Feature Request" label
2. Describe the use case and problem it solves
3. Provide examples of how it would work

### Submitting Code

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Development Setup

### Prerequisites

- Node.js >= 22.13.0
- Git
- A running Money Manager web server on your phone (for integration testing) — see [SETUP.md](docs/SETUP.md)

### Getting Started

```bash
# Clone your fork
git clone https://github.com/shahlaukik/money-manager-mcp.git
cd money-manager-mcp

# Install dependencies
npm install

# (Optional) Create an environment file
cp .env.example .env
# Edit .env with your configuration

# Build the project
npm run build

# Run in development mode (pass your Money Manager base URL)
npm run dev -- --baseUrl http://YOUR_PHONE_IP:PORT
```

### Project Scripts

| Command          | Description                      |
| ---------------- | -------------------------------- |
| `npm run build`  | Compile TypeScript to JavaScript |
| `npm run dev`    | Run with tsx for development     |
| `npm start`      | Run the compiled server          |
| `npm run lint`   | Run ESLint                       |
| `npm run format` | Format code with Prettier        |

## Code Style Guidelines

### TypeScript

- Use TypeScript strict mode
- Define explicit types (avoid `any`)
- Use interfaces for object shapes
- Prefer `const` over `let`

```typescript
// Good
interface TransactionInput {
  mbDate: string;
  mbCash: number;
  assetId: string;
}

const createTransaction = async (input: TransactionInput): Promise<void> => {
  // ...
};

// Avoid
const createTransaction = async (input: any) => {
  // ...
};
```

### Naming Conventions

| Element          | Convention       | Example              |
| ---------------- | ---------------- | -------------------- |
| Files            | kebab-case       | `http-client.ts`     |
| Variables        | camelCase        | `transactionList`    |
| Constants        | UPPER_SNAKE_CASE | `DEFAULT_TIMEOUT`    |
| Types/Interfaces | PascalCase       | `TransactionInput`   |
| Tool names       | snake_case       | `transaction_create` |

### Error Handling

- Use custom error classes from `src/errors` (`NetworkError`, `APIError`, `SessionError`, `FileError`)
- Throw them from handlers — FastMCP catches them and surfaces them to the client as `isError` results
- Always include error context

```typescript
import { APIError } from "../errors";

try {
  await client.post("/endpoint", data);
} catch (error) {
  throw new APIError("Failed to create transaction");
}
```

### Comments and Documentation

- Document public APIs with JSDoc
- Explain "why" not "what" in comments
- Keep comments up to date

```typescript
/**
 * Creates a new transaction in Money Manager.
 *
 * @param input - Transaction details
 * @returns The created transaction ID
 * @throws {APIError} If the API call fails
 */
export async function createTransaction(
  input: TransactionInput,
): Promise<string> {
  // ...
}
```

## Project Structure

```text
src/
├── index.ts          # Entry point
├── client/           # HTTP client
├── config/           # Configuration
├── errors/           # Error classes
├── schemas/          # Zod schemas
├── tools/            # MCP tool handlers
└── types/            # TypeScript types
```

### Adding a New Tool

Each tool is defined **once** — there is no separate JSON Schema list and no manual registration in `index.ts`. FastMCP derives the advertised JSON Schema from the Zod schema and validates inputs automatically.

1. **Define the Zod schema + inferred type** in `src/schemas/index.ts`:

   ```typescript
   export const NewToolInputSchema = z.object({
     param1: z.string(),
     param2: z.number().optional(),
   });
   export type NewToolInput = z.infer<typeof NewToolInputSchema>;
   ```

2. **Write the handler and add it to the `TOOLS` array** in `src/tools/handlers.ts`:

   ```typescript
   export async function handleNewTool(
     client: HttpClient,
     args: NewToolInput,
   ): Promise<unknown> {
     // Implementation — return a plain object; index.ts wraps it as JSON text.
   }
   ```

   Then add an entry to the `TOOLS` array:

   ```typescript
   {
     name: "new_tool",
     description: "Description of what the tool does",
     schema: NewToolInputSchema,
     handler: handleNewTool,
   },
   ```

3. **Add documentation** in `docs/USAGE.md` and update the tool table in `README.md` if names/counts change.

## Commit Message Conventions

This project follows [Conventional Commits](https://www.conventionalcommits.org/). Keep the subject line concise and imperative:

```text
<type>: <short description>

feat: add budget overview tool
fix: handle empty date range in transaction_list
docs: clarify session persistence in SETUP
refactor: simplify JS-literal response parsing
chore: bump dependencies
```

Common types: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`.

## Testing

There is no automated test suite today. Until one exists, changes are verified by:

1. **`npm run build`** — TypeScript strict compilation must pass (the primary gate).
2. **`npm run lint`** — ESLint must pass.
3. **Manual testing** against a live Money Manager server through an MCP client
   (Claude Desktop, VS Code with Copilot, etc.).

Handlers are pure `(client, args) → object` functions, so they are straightforward to unit-test against a mocked `HttpClient` if you choose to add tests for your change.

## Pull Request Process

### Before Submitting

1. **Build passes**: `npm run build` succeeds
2. **Linting passes**: `npm run lint`
3. **Code is formatted**: `npm run format`
4. **Docs updated** if behavior, tools, or config changed
5. **Manually verified** against a live Money Manager server (see [Testing](#testing))

### PR Guidelines

1. **Use descriptive titles**: "Add support for bulk transaction creation"
2. **Reference issues**: "Fixes #123" or "Relates to #456"
3. **Describe changes**: What, why, and how
4. **Include examples**: Show usage if adding features

### PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

How was this tested?

## Checklist

- [ ] Code builds without errors
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No sensitive data in commits
```

## Security

### Do Not Commit

- `.env` files with real credentials
- Session cookies or tokens
- Financial data exports
- Database backups

### Reporting Security Issues

Do NOT open public issues for security vulnerabilities. Instead:

1. Email the maintainers directly
2. Provide detailed description
3. Allow time for a fix before disclosure

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

- Open a GitHub issue for questions
- Tag issues appropriately for faster response

---

Thank you for contributing!
