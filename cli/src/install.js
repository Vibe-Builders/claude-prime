const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execSync } = require("node:child_process");
const {
  intro,
  outro,
  spinner,
  select,
  log,
  cancel,
  isCancel,
} = require("@clack/prompts");
const { banner, resolveVersion } = require("./utils");

async function checkExistingInstallation(installDir) {
  const hasClaudeDir = fs.existsSync(path.join(installDir, ".claude"));
  const hasClaudeMd = fs.existsSync(path.join(installDir, "CLAUDE.md"));

  if (!hasClaudeDir && !hasClaudeMd) return;

  const existing = [];
  if (hasClaudeDir) existing.push(".claude/");
  if (hasClaudeMd) existing.push("CLAUDE.md");
  log.warn(`Existing configuration detected: ${existing.join(", ")}`);

  if (!process.stdin.isTTY) {
    log.error(
      "Existing files found. Run interactively to choose backup/override, or remove them manually."
    );
    process.exit(1);
  }

  const action = await select({
    message: "What would you like to do?",
    options: [
      {
        value: "backup",
        label: "Backup existing files and continue",
        hint: "moves to .claude.bk / CLAUDE.md.bk",
      },
      {
        value: "override",
        label: "Override",
        hint: "removes existing files",
      },
      { value: "cancel", label: "Cancel" },
    ],
  });

  if (isCancel(action) || action === "cancel") {
    cancel("Installation cancelled.");
    process.exit(0);
  }

  if (action === "backup") {
    if (hasClaudeDir) {
      fs.rmSync(path.join(installDir, ".claude.bk"), {
        recursive: true,
        force: true,
      });
      fs.renameSync(
        path.join(installDir, ".claude"),
        path.join(installDir, ".claude.bk")
      );
      log.success("Backed up .claude/ → .claude.bk/");
    }
    if (hasClaudeMd) {
      fs.rmSync(path.join(installDir, "CLAUDE.md.bk"), { force: true });
      fs.renameSync(
        path.join(installDir, "CLAUDE.md"),
        path.join(installDir, "CLAUDE.md.bk")
      );
      log.success("Backed up CLAUDE.md → CLAUDE.md.bk");
    }
  }

  if (action === "override") {
    if (hasClaudeDir) {
      fs.rmSync(path.join(installDir, ".claude"), {
        recursive: true,
        force: true,
      });
      log.success("Removed existing .claude/");
    }
    if (hasClaudeMd) {
      fs.rmSync(path.join(installDir, "CLAUDE.md"), { force: true });
      log.success("Removed existing CLAUDE.md");
    }
  }
}

async function downloadAndInstall(version, installDir) {
  const tag = `v${version}`;
  const assetUrl = `https://github.com/avibebuilder/claude-prime/releases/download/${tag}/claude-prime.zip`;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-prime-"));
  const zipPath = path.join(tmpDir, "claude-prime.zip");

  const s = spinner();
  s.start(`Downloading claude-prime ${tag}`);

  try {
    let response;
    try {
      response = await fetch(assetUrl, { redirect: "follow" });
    } catch {
      s.stop("Download failed");
      log.error(
        `Failed to download release asset for ${tag}.\nURL: ${assetUrl}\nMake sure this version has a release with the claude-prime.zip asset.`
      );
      process.exit(1);
    }

    if (!response.ok) {
      s.stop("Download failed");
      log.error(
        `Failed to download release asset for ${tag}.\nURL: ${assetUrl}\nMake sure this version has a release with the claude-prime.zip asset.`
      );
      process.exit(1);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(zipPath, buffer);

    s.stop(`Downloaded ${tag}`);

    execSync(`unzip -qo "${zipPath}" -d "${installDir}"`, {
      stdio: "pipe",
    });
    log.success(`Installed .claude/ into ${installDir}`);

    fs.writeFileSync(
      path.join(installDir, ".claude", ".prime-version"),
      version
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function runInit(installDir) {
  const initModule = require("./init");
  await initModule(installDir, { standalone: false });
}

async function init(args) {
  const installDir = process.cwd();
  const versionIdx = args.indexOf("--version");
  const explicitVersion =
    versionIdx !== -1 ? args[versionIdx + 1] : undefined;

  if (versionIdx !== -1 && !explicitVersion) {
    log.error("--version requires a version argument (e.g., --version 1.0.0)");
    process.exit(1);
  }

  banner();
  intro("Claude Prime Installer");

  await checkExistingInstallation(installDir);

  const version = await resolveVersion(explicitVersion);
  await downloadAndInstall(version, installDir);

  await runInit(installDir);

  const BLUE = "\x1b[0;34m";
  const BOLD = "\x1b[1m";
  const NC = "\x1b[0m";

  outro("Done!");

  console.log(`  ${BOLD}Next steps:${NC}`);
  console.log(`    1. Start Claude Code:  ${BLUE}claude${NC}`);
  console.log(`    2. Prime your project: ${BLUE}/optimus-prime${NC}`);
  console.log(`    3. Start building:     ${BLUE}/cook Add user authentication${NC}`);
  console.log("");
}

module.exports = init;
