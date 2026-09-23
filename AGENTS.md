# 项目智能体规则

- 禁止启用、调用或委派任何子智能体，包括 `Task`、`general`、`explore` 等子智能体能力；所有工作必须由当前主智能体直接完成。

<!-- >>> pollux >>> -->
## Pollux Project Memory (MANDATORY)

This project uses pollux as its persistent engineering memory (own engine,
on-disk format compatible with the historical projectmem layout).

At session start, call these MCP tools in order:
1. `get_instructions()`
2. `get_summary()`
3. `get_project_map()` when structure matters
4. `get_plan()` for current intent and parallel work

Before modifying a file, call `precheck_file(path)`.

During work:
- Log a bug with `log_issue` before attempting a fix.
- Record every distinct attempt with `record_attempt` and its real outcome.
- Call `record_fix` only after verification.
- Record durable choices with `add_decision` and gotchas with `add_note`.
- Include why the choice was made, rejected alternatives, and evidence.

### Fallback when the MCP tools are not registered

If this client has not registered the pollux MCP tools (e.g. WorkBuddy before the
server is trusted in the connector UI), use the CLI channel — same engine, same
`.projectmem`, full read/write. Do NOT skip the memory work just because MCP is
missing; the rules above still apply.

```bash
POLLUX=/d/python/Scripts/pollux          # Windows path: D:\python\Scripts\pollux
$POLLUX context --tokens 2000            # ≈ get_instructions + get_summary + get_plan
$POLLUX show                             # ≈ get_summary
$POLLUX precheck <path>                  # BEFORE editing a file ≈ precheck_file
$POLLUX search "<text>"                  # ≈ search_events
$POLLUX log "<text>" --at "<file:line>"  # ≈ log_issue
$POLLUX attempt "<text>" --failed        # also --partial / --worked
$POLLUX fix "<text>"                     # only after verification
$POLLUX decision "<text>"                # + note "" for gotchas
```

Source-of-truth boundary:
- Never hand-edit `events.jsonl`, `summary.md`, or generated `issues/*.md`.
- Maintain `PROJECT_MAP.md` directly when structure or relationships change.
- Maintain `plan.md` directly for ideas, active plans, and shipped work.
- Before finishing, call `get_summary()` and confirm the session is recorded.

Git hooks (if installed) are advisory automation; commits with recognizable
subjects are auto-captured. Verify a capture with `search_events("<hash>")`
— search matches the `git_commit` field. When in doubt, record explicitly.
<!-- <<< pollux <<< -->

## 当前工作区

只在本仓库 `D:\kc\ymy2` 开发。最新代码就是 `main`。不要打开、对照，也不要把改动写进这些旧目录：`D:\kc\ymy`、`D:\kc\ymy-cdce962`、`D:\kc\ymy2-wt-nfc`、`D:\kc\ymy2-wt-word`。

`docs/` 里的飞书稿、Word 摘录和送审稿是档案。用户没有点名要按某一份改时，不要用它们改已经落地的页面。

## 主线设计稿

下面两份只在用户点名要按设计稿改时才用，不自动覆盖当前页面：

- `docs/飞书分页接入方案.md` 记每一页的字、图和玩法。
- `docs/主线模块技术设计.md` 记支付、流程、地图、音频、玩法、进程怎么接。

## 客户端接入

当前主通道：Grok / ZCode / Claude Code / kimi-code CLI，一律走 pollux。项目已于 2026-09-19 脱离 WorkBuddy。

- ZCode → `.zcode/config.json`；Grok → `.grok/config.toml`（需 folder-trust）；Claude Code → `CLAUDE.md` bridge。
- kimi-code → 项目级 `.kimi-code/mcp.json`（gitignore，路径本机专用；可写 `--root D:\kc\ymy`）。
- WorkBuddy 若再开：只认用户级 `~/.workbuddy/mcp.json`，项目级文件不会被读；用户级配置**不要写 `--root`**，让 pollux 从 cwd 向上发现 `.projectmem`。详见 issue #0007。
- MCP 工具未注入时，走上文 CLI 通道，不要跳过记忆读写。

