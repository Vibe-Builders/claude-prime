# claude-prime

**One command to supercharge Claude Code.** Skills, agents, hooks, memory systems — configured and ready to use. No setup headache.

Claude Code is powerful, but getting the most out of it requires configuring skills, agents, hooks, rules, and memory systems. Claude Prime does all of that for you in one command — so you can skip the setup and start building.

## Install

```bash
npx claude-prime install
```

Install a specific version:

```bash
npx claude-prime install --version 1.1.0
```

## Commands

| Command | Description |
|---------|-------------|
| `claude-prime install` | Install Claude Prime into the current directory |
| `claude-prime init` | Configure/reconfigure an existing installation |

## How it works

1. Downloads the latest Claude Prime release
2. Extracts the `.claude/` directory into your project
3. Runs interactive setup (API keys, MCP servers, gitignore)
4. Start Claude Code and run `/optimus-prime` to prime your project for your specific stack

## Example workflows

```bash
# Jump straight to building
/cook Add user authentication with Google OAuth

# Debug and fix issues
/fix The checkout flow returns 500 when cart is empty

# Research before deciding
/research How does our app handle file uploads?

# Plan before implementing
/give-plan Migrate from REST to GraphQL

# Review your changes
/review-code
```

## Requirements

- Node.js >= 18

## Alternative install

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/avibebuilder/claude-prime/main/install.sh)
```

## Links

- [GitHub](https://github.com/avibebuilder/claude-prime)
- [Full documentation](https://github.com/avibebuilder/claude-prime#readme)

## License

[MIT](https://github.com/avibebuilder/claude-prime/blob/main/LICENSE)
