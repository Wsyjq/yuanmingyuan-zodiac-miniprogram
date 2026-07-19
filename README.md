# 归途小程序版开发计划

本目录用于管理 `归途 · 十二兽首寻迹` 微信原生小程序业务分包的长期开发计划。

独立 GitHub 仓库是本小程序的唯一开发源码；父项目只在需要集成时通过 submodule 锁定版本。协作规则见 [18-GitHub 独立仓库与协作流程](docs/18-GitHub独立仓库与协作流程.md)。

## 当前状态

- 当前可运行代码是八站 `p1` 至 `p8` 的 legacy 功能 Demo，八个玩法和现有自动化可用于算法、交互与迁移回归。
- 目标产品是“五章八互动”叙事体验，基线见 [12-剧情体验与交互呈现完整计划](docs/12-剧情体验与交互呈现完整计划.md)。
- 阶段 A 工作矩阵见 [13-五章八互动阶段 A 详细矩阵](docs/13-五章八互动阶段A详细矩阵.md)；稳定 beat、归属、互动契约和处置边界已登记，但状态集、现场路线、远瀛观证据、素材与内容审核仍未关闭，不能标记阶段 A 通过。
- 页面、转场、动效和素材生产基线见 [14-五章逐屏体验分镜与页面、动效、素材矩阵](docs/14-五章逐屏体验分镜与页面动效素材矩阵.md)；其中人物与玩法为可替换槽位，五地点顺序和知识目标为稳定骨架。
- UI 原型按 [15-UI 原型逐步迭代计划](docs/15-UI原型逐步迭代计划.md) 推进；I0/G0 已通过，I1 第一版视觉被退回后已形成素材驱动、非矩形构图的第二版 G1 评审候选，人工视觉确认前不扩展其余 61 屏。
- 五章目标尚未实现；在计划的阶段 A、A2、旧记录冻结和 schema v2 迁移条件完成前，不替换默认路由。
- 当前自动化验证 legacy Demo、I0 原型隔离和 I1 概念素材加载，不代表五章版本验收通过；完整五章仍受阶段 A、A2、素材和迁移门禁约束。

## 固定前提

- 最终交付形态为微信原生小程序业务分包。
- 不走 H5 WebView。
- 不做完整独立小程序。
- 不要求对方开放完整源码。
- 我们交付独立业务目录，由对方集成到现有小程序。
- 一期核心业务是一条研学实景解谜线路：`归途 · 十二兽首寻迹`。
- 后续可能扩展多线路、景点大全、地图导览、积分、课程和 AI，因此一期数据结构需要预留扩展字段。

## 当前开发策略

接口、登录态和对方小程序结构尚未完全确定前，已先完成 legacy Demo：

1. 八个玩法组件。
2. 统一关卡容器。
3. Mock 线路数据。
4. 本地 storage 进度恢复。
5. 玩法调试页。
6. 最小线路闭环页面。

页面与玩法不得直接依赖对方接口。所有外部能力通过 `services/` 适配层访问；五章版本要求宿主接口支持幂等键、条件版本写和完成 receipt，不能假设只替换请求 URL 即可满足进度语义。

## I0 隔离 UI 原型

I0 原型位于独立分包 `miniprogram/dev-zodiac-ui-prototype/`，不继承主包 `app.wxss`，不能引用主包 JS、组件或模板。它只读取分包内 mock，不使用 `getApp()`、Service、storage、网络、定位或震动 API。

开发者工具可直接编译以下路径：

```text
/dev-zodiac-ui-prototype/pages/index/index
```

可用参数：

| 参数 | 允许值 |
|---|---|
| `screen` | `PRO-01`、`HHZ-05`、`DSF-05`、`HUG-08` |
| `motion` | `normal`、`reduced` |
| `network` | `normal`、`weak` |
| `reachability` | `reachable`、`unreachable` |

示例：

```text
/dev-zodiac-ui-prototype/pages/index/index?screen=DSF-05&motion=reduced&network=weak&reachability=unreachable
```

原型仅允许在 `develop` 环境运行，其他环境会返回 legacy 首页。这个运行时守卫不是 production 排除：源项目仍登记该分包，在 I13 生成并扫描 production artifact 前，不得直接上传当前源码目录；正式构建必须同时删除分包登记和物理目录。

## 建议技术栈

| 模块 | 技术 | 说明 |
|---|---|---|
| 小程序形态 | 微信原生小程序分包 | 最容易接入对方现有小程序 |
| 语言 | TypeScript 优先，JavaScript 兼容 | 若对方项目不支持 TS，可降级 JS |
| 页面 | WXML + WXSS | 不依赖 H5 WebView |
| 组件 | 原生 Component | 八个玩法拆成独立组件 |
| 状态 | 轻量 store + service 层 | 不先引入复杂状态库 |
| Mock | JSON + wx storage | 支持无后端独立开发 |
| 地图 | 微信原生 map 组件 | 一期用于辅助游览 |
| 到达确认 | 手动“我已到达” | 五章第一版不请求定位权限、不调用 `wx.getLocation` |
| 动画 | WXSS transition/keyframes + touch events | 避免引入大型动画库 |
| 资源 | CDN URL 优先，小程序包兜底 | 避免包体过大 |

## 建议项目结构

```text
  yuanmingyuan-zodiac-miniprogram/
  README.md
  docs/
  miniprogram/
    app.json
    app.ts
    app.wxss
    pages/zodiac/
      index/
      stage/
      map/
      finale/
      records/
      record-detail/
      dev-playground/
    components/zodiac/
      stage-shell/
      progress-header/
      mark-strip/
      dashuifa-puzzle/
      rain-catch-game/
      envelope-word-game/
      clock-match-game/
      password-clue-game/
      sandtable-order-game/
      maze-path-game/
      final-zodiac-board/
    services/
      tour-service.ts
      user-service.ts
      request.ts
    mock/
      zodiac-route.ts
      mock-session.ts
      mock-records.ts
    store/
      tour-store.ts
    types/
      tour.ts
    utils/
      storage.ts
      time.ts
      geo.ts
    assets/
      images/
      icons/
      fallback/
```

当前已创建基础小程序壳、mock 数据、service 层、核心页面、通用展示组件和八个 legacy 玩法组件。下一阶段先完成内容与迁移契约，不直接在旧八站配置上替换剧情文字。

## 文档索引

- [01-技术栈与架构方案](docs/01-技术栈与架构方案.md)
- [02-页面与路由开发计划](docs/02-页面与路由开发计划.md)
- [03-玩法组件开发计划](docs/03-玩法组件开发计划.md)
- [04-进度状态与游玩记录计划](docs/04-进度状态与游玩记录计划.md)
- [05-Mock数据与接口适配层计划](docs/05-Mock数据与接口适配层计划.md)
- [06-地图辅助与定位计划](docs/06-地图辅助与定位计划.md)
- [07-资源素材与内容配置计划](docs/07-资源素材与内容配置计划.md)
- [08-接入对方小程序计划](docs/08-接入对方小程序计划.md)
- [09-测试验收计划](docs/09-测试验收计划.md)
- [10-长期小程序迭代路线](docs/10-长期小程序迭代路线.md)
- [11-模拟器验证](docs/11-模拟器验证.md)
- [12-剧情体验与交互呈现完整计划](docs/12-剧情体验与交互呈现完整计划.md)
- [13-五章八互动阶段 A 详细矩阵](docs/13-五章八互动阶段A详细矩阵.md)
- [14-五章逐屏体验分镜与页面、动效、素材矩阵](docs/14-五章逐屏体验分镜与页面动效素材矩阵.md)
- [15-UI 原型逐步迭代计划](docs/15-UI原型逐步迭代计划.md)
- [16-I1 视觉 Token 与四张关键帧评审](docs/16-I1视觉Token与四张关键帧评审.md)
- [17-I1 概念素材清单与正式替换提交规范](docs/17-I1概念素材清单与正式替换提交规范.md)
- [18-GitHub 独立仓库与协作流程](docs/18-GitHub独立仓库与协作流程.md)

## 验证命令

首次运行前在本目录执行：

```bash
npm install
```

常用验证：

```bash
npm run verify:static
npm run verify:simulator
npm run inspect:layout
```

`verify:static` 同时检查原型独立分包、禁止能力、四个固定 screen ID、五个概念素材及其来源元数据、响应式安全区规则和 WXML 事件绑定。`verify:simulator` 会验证四个原型深链、本地 SVG 加载、关键构图不溢出、参数回退、异常状态 DOM、44px 触控下限、全部 storage 前后不变，再完整走通 legacy 八站和终局记录；五章流程启用前仍须重写。详见 [11-模拟器验证](docs/11-模拟器验证.md)。

## 近期开发顺序

1. 审核 [阶段 A 详细矩阵](docs/13-五章八互动阶段A详细矩阵.md)，关闭获批状态集、远瀛观证据、五段实走路线、素材授权和内容审核。
2. 按 [UI 原型逐步迭代计划](docs/15-UI原型逐步迭代计划.md) 完成 I1 第二版 G1 人工视觉评审；通过后再制作首段纵向切片。
3. 冻结 legacy 记录渲染，建立旧数据 fixtures 和幂等迁移 journal。
4. 从 stage 页面与 playground 提取可保留玩法的 reducer、result 和 snapshot codec。
5. 实现 schema v2 beat、journey、grant ledger 和显式终章收口。
6. 重写五章流程、迁移、内容门禁和真实 WXML 交互自动化。
7. 试做并验收“黄花阵 → 海晏堂”纵向切片，并用替代人物和玩法验证槽位可替换。
8. 宿主接口语义确认后再接入登录、进度、记录和 CDN。
