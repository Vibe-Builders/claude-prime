const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");
const {
  intro,
  outro,
  log,
  text,
  select,
  confirm,
  spinner,
  cancel,
  isCancel,
} = require("@clack/prompts");
const { banner } = require("./utils");

const GITIGNORE_ENTRIES = [
  "repomix-output.xml",
  "plans/**/*",
  "!plans/templates/*",
  "screenshots/*",
  "docs/screenshots/*",
  "docs/assets/*",
  "docs/research/*",
  "docs/session-reports/*",
  "claude-prime-*.zip",
  ".mcp.json",
];

const CLAUDE_GITIGNORE_ENTRIES = [
  "touch-skill",
  "optimus-prime",
  "convo-analysis",
  "prime-sync",
];

function handleCancel(value) {
  if (isCancel(value)) {
    cancel("Initialization cancelled.");
    process.exit(0);
  }
  return value;
}

function ensureGitignoreEntries(filePath, entries, label) {
  const exists = fs.existsSync(filePath);
  let content = exists ? fs.readFileSync(filePath, "utf-8") : "";
  const lines = content.split("\n").map((l) => l.trim());
  let added = 0;

  if (exists && content.length > 0 && !content.endsWith("\n")) {
    content += "\n";
  }

  for (const entry of entries) {
    if (!lines.includes(entry)) {
      content += entry + "\n";
      added++;
    }
  }

  if (added > 0) {
    fs.writeFileSync(filePath, content);
    log.success(`Updated ${label} (${added} entries added)`);
  } else {
    log.success(`${label} already configured`);
  }
}

async function stageGitignore(installDir) {
  log.step("Stage: .gitignore configuration");

  const gitignorePath = path.join(installDir, ".gitignore");
  ensureGitignoreEntries(gitignorePath, GITIGNORE_ENTRIES, ".gitignore");

  const claudeGitignorePath = path.join(installDir, ".claude", ".gitignore");
  if (fs.existsSync(path.join(installDir, ".claude"))) {
    ensureGitignoreEntries(
      claudeGitignorePath,
      CLAUDE_GITIGNORE_ENTRIES,
      ".claude/.gitignore"
    );
  }
}

async function stageSkillEnvFiles(installDir) {
  log.step("Stage: Skill environment files");

  const mediaProcessorDir = path.join(
    installDir,
    ".claude",
    "skills",
    "media-processor"
  );
  const envExample = path.join(mediaProcessorDir, ".env.example");
  const envFile = path.join(mediaProcessorDir, ".env");

  if (!fs.existsSync(envExample)) {
    log.warn("media-processor skill not found (skipping)");
    return;
  }

  if (fs.existsSync(envFile)) {
    const action = handleCancel(
      await select({
        message: "media-processor .env already exists",
        options: [
          { value: "backup", label: "Backup and reconfigure", hint: "moves to .env.bk" },
          { value: "override", label: "Override" },
          { value: "skip", label: "Skip" },
        ],
      })
    );
    if (action === "skip") {
      log.warn("Skipping media-processor configuration");
      return;
    }
    if (action === "backup") {
      fs.copyFileSync(envFile, envFile + ".bk");
      log.success("Backed up .env → .env.bk");
    }
  }

  log.info(
    "Google Gemini API Configuration\n" +
      " ◌ Used by media-processor skill for audio/video/image processing.\n" +
      " ◌ Stored at: .claude/skills/media-processor/.env\n" +
      " ◌ Get your API key: https://aistudio.google.com/apikey"
  );

  const apiKey = handleCancel(
    await text({
      message: "Enter Gemini API key (press Enter to skip)",
      placeholder: "AIza...",
      validate: () => undefined,
    })
  );

  if (apiKey && apiKey.trim()) {
    const template = fs.readFileSync(envExample, "utf-8");
    fs.writeFileSync(
      envFile,
      template.replace("your_api_key_here", apiKey.trim())
    );
    log.success(`Created .env for media-processor\n  Stored at: ${envFile}`);
  } else {
    log.warn("Skipped - Gemini API key is required for this skill");
  }
}

async function stageMcpServers(installDir) {
  log.step("Stage: MCP servers");

  const mcpExample = path.join(installDir, ".claude", ".mcp.json.example");
  const mcpFile = path.join(installDir, ".mcp.json");

  if (!fs.existsSync(mcpExample)) {
    log.warn(".mcp.json.example not found (skipping)");
    return;
  }

  if (fs.existsSync(mcpFile)) {
    const action = handleCancel(
      await select({
        message: ".mcp.json already exists",
        options: [
          { value: "backup", label: "Backup and reconfigure", hint: "moves to .mcp.json.bk" },
          { value: "override", label: "Override" },
          { value: "skip", label: "Skip" },
        ],
      })
    );
    if (action === "skip") {
      log.warn("Skipping .mcp.json configuration");
      return;
    }
    if (action === "backup") {
      fs.copyFileSync(mcpFile, mcpFile + ".bk");
      log.success("Backed up .mcp.json → .mcp.json.bk");
    }
  }

  log.info(
    "Figma MCP Server Configuration (optional)\n" +
      " ◌ Only needed if you use Figma for design-to-code workflows.\n" +
      " ◌ Stored at: .mcp.json\n" +
      " ◌ Get your API key: https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens"
  );

  const figmaKey = handleCancel(
    await text({
      message: "Enter Figma API key (press Enter to skip)",
      placeholder: "figd_...",
      validate: () => undefined,
    })
  );

  const template = fs.readFileSync(mcpExample, "utf-8");

  if (figmaKey && figmaKey.trim()) {
    fs.writeFileSync(mcpFile, template.replace("YOUR-KEY", figmaKey.trim()));
    log.success(`Created .mcp.json with Figma API key\n  Stored at: ${mcpFile}`);
  } else {
    fs.writeFileSync(mcpFile, template);
    log.warn("Created .mcp.json with placeholder (configure later)");
  }
}

async function stageBrowserAutomation() {
  log.step("Stage: Browser automation");

  let installed = false;
  try {
    execSync("command -v agent-browser", { stdio: "pipe" });
    installed = true;
  } catch {}

  if (installed) {
    log.success("agent-browser is already installed globally");
    return;
  }

  const shouldInstall = handleCancel(
    await confirm({
      message: "Install agent-browser globally?",
      initialValue: false,
    })
  );

  if (!shouldInstall) {
    log.warn("Skipped (use npx agent-browser instead)");
    return;
  }

  const s = spinner();
  s.start("Installing agent-browser...");
  try {
    execSync("npm install -g agent-browser", { stdio: "pipe" });
    s.stop("agent-browser installed");

    s.start("Downloading Chromium...");
    execSync("agent-browser install", { stdio: "pipe" });
    s.stop("Chromium downloaded");

    log.success("agent-browser installed globally");
  } catch (err) {
    s.stop("Installation failed");
    log.error(`Failed to install agent-browser: ${err.message}`);
  }
}

async function init(installDir, opts = {}) {
  const dir = installDir || process.cwd();
  const standalone = opts.standalone !== false;

  if (standalone) {
    banner();
    intro("Claude Prime - Project Initialization");
  }

  await stageGitignore(dir);
  await stageSkillEnvFiles(dir);
  await stageMcpServers(dir);
  await stageBrowserAutomation();

  if (standalone) {
    const BLUE = "\x1b[0;34m";
    const BOLD = "\x1b[1m";
    const NC = "\x1b[0m";

    outro("Initialization complete!");

    console.log(`  ${BOLD}Next steps:${NC}`);
    console.log(`    1. Review generated configuration files`);
    console.log(`    2. Start using Claude Code with: ${BLUE}claude${NC}`);
    console.log("");
  }
}

module.exports = init;
