#!/usr/bin/env node

const { version } = require("../package.json");

const HELP = `
claude-prime v${version}

Usage:
  claude-prime install [options]   Install Claude Prime into the current directory
  claude-prime init                Configure/reconfigure Claude Prime in current directory
  claude-prime --help              Show this help message
  claude-prime --version           Show CLI version

Options (install):
  --version <version>              Install a specific version (e.g., 1.0.0)

Environment variables:
  CLAUDE_PRIME_VERSION             Install a specific version (alternative to --version flag)

Examples:
  npx claude-prime install
  npx claude-prime install --version 1.0.0
  npx claude-prime init
`;

const args = process.argv.slice(2);
const command = args[0];

if (args.includes("--help") || args.includes("-h") || !command) {
  console.log(HELP.trim());
  process.exit(0);
}

if (command === "--version" || command === "-V") {
  console.log(version);
  process.exit(0);
}

const [major] = process.versions.node.split(".").map(Number);
if (major < 18) {
  console.error(
    `Error: claude-prime requires Node.js >= 18 (current: ${process.version})`
  );
  process.exit(1);
}

if (command === "install") {
  require("../src/install")(args.slice(1)).catch((err) => {
    const { log } = require("@clack/prompts");
    log.error(err.message);
    process.exit(1);
  });
} else if (command === "init") {
  require("../src/init")().catch((err) => {
    const { log } = require("@clack/prompts");
    log.error(err.message);
    process.exit(1);
  });
} else {
  console.error(`Unknown command: ${command}\n`);
  console.log(HELP.trim());
  process.exit(1);
}
