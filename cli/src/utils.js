const { spinner } = require("@clack/prompts");

const YELLOW = "\x1b[1;33m";
const NC = "\x1b[0m";

function banner() {
  const claude = [
    " ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗",
    "██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝",
    "██║     ██║     ███████║██║   ██║██║  ██║█████╗  ",
    "██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝  ",
    "╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗",
    " ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝",
  ];
  const prime = [
    "██████╗ ██████╗ ██╗███╗   ███╗███████╗",
    "██╔══██╗██╔══██╗██║████╗ ████║██╔════╝",
    "██████╔╝██████╔╝██║██╔████╔██║█████╗  ",
    "██╔═══╝ ██╔══██╗██║██║╚██╔╝██║██╔══╝  ",
    "██║     ██║  ██║██║██║ ╚═╝ ██║███████╗",
    "╚═╝     ╚═╝  ╚═╝╚═╝╚═╝     ╚═╝╚══════╝",
  ];

  console.log("");
  for (let i = 0; i < claude.length; i++) {
    console.log(`${claude[i]}  ${YELLOW}${prime[i]}${NC}`);
  }
  console.log("");
}

async function resolveVersion(explicitVersion) {
  let version = explicitVersion || process.env.CLAUDE_PRIME_VERSION;

  if (version) {
    return version.replace(/^v/, "");
  }

  const s = spinner();
  s.start("Fetching latest version from GitHub");

  let response;
  try {
    response = await fetch(
      "https://api.github.com/repos/avibebuilder/claude-prime/releases/latest",
      { headers: { Accept: "application/vnd.github.v3+json" } }
    );
  } catch {
    s.stop("Failed to fetch version");
    process.exit(1);
  }

  if (!response.ok) {
    s.stop("Failed to fetch version");
    process.exit(1);
  }

  const data = await response.json();
  version = data.tag_name;

  if (!version) {
    s.stop("Could not determine latest version");
    process.exit(1);
  }

  version = version.replace(/^v/, "");
  s.stop(`Resolved version: ${version}`);
  return version;
}

module.exports = { banner, resolveVersion };
