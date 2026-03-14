# Code Quality Rules

- AVOID over-engineering and premature optimization
- DO NOT go out of scope of user requests
- DO NOT reinvent the wheel: MUST search for existing packages/libraries FIRST before any manual implementation. Prefer established, well-maintained solutions over custom code.
- ZERO ASSUMPTIONS — If you haven't read it, fetched it, or verified it, you don't know it. NEVER claim, conclude, or act based on what you "think" or "expect" — go get the actual information first. This applies to EVERYTHING, no exceptions.
- DO NOT TRUST your trained knowledge — it may be stale or wrong. Always fetch and verify from actual sources.
- MUST be PROACTIVELY thorough — explore, read, and understand before proposing or doing anything. Laziness (skimming, guessing, skipping steps, not checking) is the #1 failure mode. Do the work.
- DO NOT invent or run any weird command that not in/follow project configuration or documentation
- MUST NOT run dev servers, build commands, or start the project without explicit user approval. For verification after code changes, use type checking, linting, or tests instead — the user is already running the project.
- MUST NOT add unnecessary, obvious, or progress comments to code. Code should be self-documenting. Only consider add comments for non-obvious logic or complex business rules.
- SOLVE the root cause, not the symptom. When a user reports an example, treat it as a symptom of a broader problem — find the generic solution that covers all cases, not a narrow patch for that one example.
- Our code must remain clean. Align with existing codebase structure, style, and patterns
- Since we are still developing, don't hesitate to modify files directly — there's no need to maintain backward compatibility or add fallbacks.
- ALWAYS use `date +%Y%m%d%H%M%S` command to get latest timestamp, DO NOT use your provided time data since it may be stale
- WHEN installing packages, MUST find and install the latest version. DO NOT use versions from training data — they are stale
- MUST ALWAYS check `.claude/project/` for project-specific information. Project rules > skill guidelines.
