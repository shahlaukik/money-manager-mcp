# Contributing to Money Manager MCP

Thank you for your interest in contributing to the Money Manager MCP server! This document provides guidelines and instructions for contributing.

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

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git
- A running Money Manager server (for integration testing)

### Getting Started

```bash
# Clone your fork
git clone https://github.com/shahlaukik/money-manager-mcp.git
cd money-manager-mcp

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your configuration

# Build the project
npm run build

# Run in development mode
npm run dev
```

### Project Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run dev` | Run with ts-node for development |
| `npm start` | Run the compiled server |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

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

| Element | Convention | Example |
|---------|------------|---------|
| Files | kebab-case | `http-client.ts` |
| Variables | camelCase | `transactionList` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_TIMEOUT` |
| Types/Interfaces | PascalCase | `TransactionInput` |
| Tool names | snake_case | `transaction_create` |

### Error Handling

- Use custom error classes from `src/errors`
- Always include error context
- Log errors appropriately

```typescript
import { ApiError } from '../errors';

try {
  await apiClient.post('/endpoint', data);
} catch (error) {
  throw new ApiError('Failed to create transaction', {
    cause: error,
    endpoint: '/endpoint',
    data
  });
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
 * @throws {ValidationError} If input is invalid
 * @throws {ApiError} If API call fails
 */
export async function createTransaction(input: TransactionInput): Promise<string> {
  // ...
}
```

## Project Structure

```
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

1. **Define the schema** in `src/schemas/index.ts`:
   ```typescript
   export const NewToolInputSchema = z.object({
     param1: z.string(),
     param2: z.number().optional(),
   });
   ```

2. **Add the handler** in `src/tools/handlers.ts`:
   ```typescript
   export async function handleNewTool(
     args: z.infer<typeof NewToolInputSchema>,
     client: MoneyManagerClient
   ): Promise<ToolResponse> {
     // Implementation
   }
   ```

3. **Register the tool** in `src/index.ts`:
   ```typescript
   {
     name: 'new_tool',
     description: 'Description of what the tool does',
     inputSchema: zodToJsonSchema(NewToolInputSchema),
   }
   ```

4. **Add documentation** in `docs/USAGE.md`

## Pull Request Process

### Before Submitting

1. **Build passes**: `npm run build` succeeds
2. **Code is formatted**: `npm run format`
3. **Linting passes**: `npm run lint`
4. **Changes are tested**: Manual testing with MCP client

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