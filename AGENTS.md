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

## WorkBuddy 接入位置（2026-09-11 实测校正）

WorkBuddy 的 MCP 加载路径与 ZCode / Grok / Claude Code **不同**，曾经踩过的坑：

- **唯一生效位置：用户级 `~/.workbuddy/mcp.json`**（即 `C:\Users\ASUS\.workbuddy\mcp.json`）。
  客户端代码中该路径写作 `customMcpConfigPath = path.join(configDir, "mcp.json")`。
- **项目级 `D:\kc\ymy\.workbuddy\mcp.json` 不会被读取**（已改名为 `mcp.json.disabled` 留档）。
  WorkBuddy 的 `projectMcpCount` 指的是云侧项目连接器（`projectResourceManager`，
  走 `gatewayUrl` 的 HTTP MCP）+ 内置 `wb-issues`，**不是**项目目录里的 mcp.json 文件。
- 桌面端会话恒带 `--strict-mcp-config`，因此项目根 `.mcp.json`（Claude Code 约定）
  与 CLI 的 project/local scope 同样被屏蔽。
- **配置中不要写 `--root`**：pollux 的 `_resolve_mem_dir()` 在无 `--root`、无
  `PROJECTMEM_ROOT` 时回落到 `discover_mem_dir()`，从进程**当前工作目录向上查找**
  `.projectmem`。这样用户级配置对每个工作区自适应，不会让其它项目误连本项目记忆
  （实测：cwd 为无记忆工作区时返回 "No .projectmem directory found"）。
- 新增或改动用户级 mcp.json 后，需在**连接器管理页对该 server 点「信任」**，
  且 **MCP 列表在会话启动时注入**——必须新开会话，当前会话拿不到工具。
- 审批记录在 `~/.workbuddy/mcp-approvals.json`（当前为 `{}` 时会话启动日志打印
  `[MCP Security] Loaded 0 approvals`）。

在工具注入生效前，一律走上文 CLI 通道完成记忆读写（同一引擎、同一 `.projectmem`）。

