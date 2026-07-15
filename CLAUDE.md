# CLAUDE.md

## Auto-learned Rules

<!-- claude-evolve:managed-start -->

<!-- claude-evolve:rule id=r_mrlu6dce_aqgn score=5.9 created=2026-07-15 source=observation complexity=simple -->
- After scaffolding a multi-package monorepo frontend, immediately run the build command and pipe output to a log file before attempting browser verification — catch compile errors before spinning up Chrome.
<!-- /claude-evolve:rule -->

<!-- claude-evolve:rule id=r_mrlu6dcy_6bxp score=5.3 created=2026-07-15 source=observation complexity=simple -->
- When verifying role-based access flows in the browser, test each role (student, teacher, admin) sequentially in the same tab using javascript_tool fetch calls to set auth state, then navigate to the role-specific route and screenshot — avoids opening multiple tabs.
<!-- /claude-evolve:rule -->

<!-- claude-evolve:rule id=r_mrlu6dd9_vasl score=5.9 created=2026-07-15 source=observation complexity=simple -->
- When starting a browser automation session, always call tabs_context_mcp first to get available tab IDs before any navigate or computer action.
<!-- /claude-evolve:rule -->

<!-- claude-evolve:rule id=r_mrlu6ddl_buox score=5.9 created=2026-07-15 source=observation complexity=simple -->
- When writing many files for a new frontend scaffold, batch all Write calls back-to-back before running any build or verification step — do not interleave writes with shell commands.
<!-- /claude-evolve:rule -->

<!-- claude-evolve:rule id=r_mrlu6ddx_t4ne score=5.3 created=2026-07-15 source=observation complexity=simple -->
- After completing a major feature milestone (scaffold commit, frontend commit), immediately commit with a descriptive conventional-commit message before starting the next phase of work.
<!-- /claude-evolve:rule -->

<!-- claude-evolve:rule id=r_mrlu6de8_x29v score=5.3 created=2026-07-15 source=anti_pattern complexity=simple -->
- Do not run `npm run build` piping stderr with `2>&1 | tail -40` and then immediately start the API and re-run the build in a single compound command — split into separate steps so a build failure doesn't silently swallow the API startup error.
<!-- /claude-evolve:rule -->

<!-- claude-evolve:rule id=r_mrlu6dei_blom score=5.3 created=2026-07-15 source=anti_pattern complexity=simple -->
- When a Next.js build fails, read the full build log before editing config — do not patch next.config.mjs based on truncated `tail -40` output alone.
<!-- /claude-evolve:rule -->

<!-- claude-evolve:managed-end -->
