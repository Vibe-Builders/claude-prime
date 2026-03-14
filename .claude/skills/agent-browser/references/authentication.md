# Authentication Patterns

Login flows, session persistence, OAuth, 2FA, and authenticated browsing.

**Related**: [session-management.md](session-management.md) for state persistence details, [SKILL.md](../SKILL.md) for quick start.

## Contents

- [Sensitivity Detection](#sensitivity-detection)
- [Non-sensitive Auth (Local/Test)](#non-sensitive-auth-localtest)
- [Sensitive Auth (Production/Real Accounts)](#sensitive-auth-productionreal-accounts)
- [Post-Auth: Offer to Save for Reuse](#post-auth-offer-to-save-for-reuse)
- [Basic Login Flow](#basic-login-flow)
- [Saving Authentication State](#saving-authentication-state)
- [Restoring Authentication](#restoring-authentication)
- [Auth Vault](#auth-vault)
- [Session Persistence](#session-persistence)
- [OAuth / SSO Flows](#oauth--sso-flows)
- [Two-Factor Authentication](#two-factor-authentication)
- [HTTP Basic Auth](#http-basic-auth)
- [Cookie-Based Auth](#cookie-based-auth)
- [Token Refresh Handling](#token-refresh-handling)
- [Security Best Practices](#security-best-practices)

## Sensitivity Detection

Before handling auth, detect whether credentials are sensitive:

- **Non-sensitive** (agent fills credentials): `localhost`, `127.0.0.1`, URLs containing `staging.`, `test.`, `.local`, `dev.`, non-standard ports (`:3000`, `:8080`), or user explicitly provides credentials in conversation
- **Sensitive** (user authenticates): Production URLs, real service domains (google.com, github.com, aws.amazon.com, etc.), OAuth/SSO flows, real user accounts

## Non-sensitive Auth (Local/Test)

Agent asks user for test credentials, then fills form directly:

```bash
agent-browser open http://localhost:3000/login
agent-browser snapshot -i
agent-browser fill @e1 "$TEST_USERNAME"
agent-browser fill @e2 "$TEST_PASSWORD"
agent-browser click @e3
agent-browser wait --load networkidle
```

## Sensitive Auth (Production/Real Accounts)

Agent navigates to the auth step, then opens headed browser for user to complete manually:

```bash
# Agent navigates to the app and reaches the auth step
agent-browser open https://app.example.com/login
agent-browser snapshot -i
# Found: @e1 [button] "Sign in with Google"

# Open headed browser for user to complete OAuth/SSO
agent-browser --headed click @e1
# Tell user: "Please complete authentication in the browser window"
agent-browser wait --url "**/app.example.com/dashboard**" --timeout 120000
# Agent never sees the credentials
```

## Post-Auth: Offer to Save for Reuse

After **either path** succeeds, check if credentials/state are already stored (`agent-browser auth list`, `ls .claude/tmp/auth-state-*.json`). If not, ask the user if they want to save for next time:

- **Non-sensitive** → offer Auth Vault: `echo "pass" | agent-browser auth save <profile> --url <url> --username <user> --password-stdin`
- **Sensitive** → offer State Persistence: `agent-browser state save .claude/tmp/auth-state-<name>.json` (saves session only, not credentials)

Don't auto-save without asking. Don't re-ask if already stored for this site.

## Auth Vault

```bash
# Save credentials once (encrypted with AGENT_BROWSER_ENCRYPTION_KEY)
# Recommended: pipe password via stdin to avoid shell history exposure
echo "pass" | agent-browser auth save github --url https://github.com/login --username user --password-stdin

# Login using saved profile (LLM never sees password)
agent-browser auth login github

# List/show/delete profiles
agent-browser auth list
agent-browser auth show github
agent-browser auth delete github
```

## Session Persistence

```bash
# Auto-save/restore cookies and localStorage across browser restarts
agent-browser --session-name myapp open https://app.example.com/login
# ... login flow ...
agent-browser close  # State auto-saved to ~/.agent-browser/sessions/

# Next time, state is auto-loaded
agent-browser --session-name myapp open https://app.example.com/dashboard

# Encrypt state at rest
export AGENT_BROWSER_ENCRYPTION_KEY=$(openssl rand -hex 32)
agent-browser --session-name secure open https://app.example.com

# Manage saved states
agent-browser state list
agent-browser state show myapp-default.json
agent-browser state clear myapp
agent-browser state clean --older-than 7
```

**Naming convention**: `--session-name {project}-{domain}` (e.g., `claude-prime-influmation`, `my-saas-github`). Project prefix avoids collisions since sessions are stored globally.

## Basic Login Flow

```bash
# Navigate to login page
agent-browser open https://app.example.com/login
agent-browser wait --load networkidle

# Get form elements
agent-browser snapshot -i
# Output: @e1 [input type="email"], @e2 [input type="password"], @e3 [button] "Sign In"

# Fill credentials
agent-browser fill @e1 "user@example.com"
agent-browser fill @e2 "password123"

# Submit
agent-browser click @e3
agent-browser wait --load networkidle

# Verify login succeeded
agent-browser get url  # Should be dashboard, not login
```

## Saving Authentication State

After logging in, save state to `.claude/tmp/` (gitignored, project-scoped):

```bash
# Login first (see above)
agent-browser open https://app.example.com/login
agent-browser snapshot -i
agent-browser fill @e1 "user@example.com"
agent-browser fill @e2 "password123"
agent-browser click @e3
agent-browser wait --url "**/dashboard"

# Save authenticated state
agent-browser state save .claude/tmp/auth-state-myapp.json
```

**Naming convention**: `auth-state-{name}.json` where `{name}` is a short identifier (domain, app name).

## Restoring Authentication

Skip login by loading saved state:

```bash
# Discover saved states for current project
ls .claude/tmp/auth-state-*.json

# Load saved auth state
agent-browser state load .claude/tmp/auth-state-myapp.json

# Navigate directly to protected page
agent-browser open https://app.example.com/dashboard

# Verify authenticated
agent-browser snapshot -i
```

## OAuth / SSO Flows

For OAuth redirects:

```bash
# Start OAuth flow
agent-browser open https://app.example.com/auth/google

# Handle redirects automatically
agent-browser wait --url "**/accounts.google.com**"
agent-browser snapshot -i

# Fill Google credentials
agent-browser fill @e1 "user@gmail.com"
agent-browser click @e2  # Next button
agent-browser wait 2000
agent-browser snapshot -i
agent-browser fill @e3 "password"
agent-browser click @e4  # Sign in

# Wait for redirect back
agent-browser wait --url "**/app.example.com**"
agent-browser state save .claude/tmp/auth-state-google-oauth.json
```

## Two-Factor Authentication

Handle 2FA with manual intervention:

```bash
# Login with credentials
agent-browser open https://app.example.com/login --headed  # Show browser
agent-browser snapshot -i
agent-browser fill @e1 "user@example.com"
agent-browser fill @e2 "password123"
agent-browser click @e3

# Wait for user to complete 2FA manually
echo "Complete 2FA in the browser window..."
agent-browser wait --url "**/dashboard" --timeout 120000

# Save state after 2FA
agent-browser state save .claude/tmp/auth-state-2fa.json
```

## HTTP Basic Auth

For sites using HTTP Basic Authentication:

```bash
# Set credentials before navigation
agent-browser set credentials username password

# Navigate to protected resource
agent-browser open https://protected.example.com/api
```

## Cookie-Based Auth

Manually set authentication cookies:

```bash
# Set auth cookie
agent-browser cookies set session_token "abc123xyz"

# Navigate to protected page
agent-browser open https://app.example.com/dashboard
```

## Token Refresh Handling

For sessions with expiring tokens:

```bash
#!/bin/bash
# Wrapper that handles token refresh

STATE_FILE="./auth-state.json"

# Try loading existing state
if [[ -f "$STATE_FILE" ]]; then
    agent-browser state load "$STATE_FILE"
    agent-browser open https://app.example.com/dashboard

    # Check if session is still valid
    URL=$(agent-browser get url)
    if [[ "$URL" == *"/login"* ]]; then
        echo "Session expired, re-authenticating..."
        # Perform fresh login
        agent-browser snapshot -i
        agent-browser fill @e1 "$USERNAME"
        agent-browser fill @e2 "$PASSWORD"
        agent-browser click @e3
        agent-browser wait --url "**/dashboard"
        agent-browser state save "$STATE_FILE"
    fi
else
    # First-time login
    agent-browser open https://app.example.com/login
    # ... login flow ...
fi
```

## Security Best Practices

1. **Never commit state files** - They contain session tokens
   ```bash
   echo "*.auth-state.json" >> .gitignore
   ```

2. **Use environment variables for credentials**
   ```bash
   agent-browser fill @e1 "$APP_USERNAME"
   agent-browser fill @e2 "$APP_PASSWORD"
   ```

3. **Clean up after automation**
   ```bash
   agent-browser cookies clear
   rm -f ./auth-state.json
   ```

4. **Use short-lived sessions for CI/CD**
   ```bash
   # Don't persist state in CI
   agent-browser open https://app.example.com/login
   # ... login and perform actions ...
   agent-browser close  # Session ends, nothing persisted
   ```
