# Mock 数据与接口适配层计划

> 状态：本文的 `saveStageProgress(sessionId, stageId, ...)` 是 legacy 八站接口。五章版本要求异步、带 revision/idempotency 的 beat、journey、grant 和 completion receipt 契约，以 [12-剧情体验与交互呈现完整计划](12-剧情体验与交互呈现完整计划.md) 为准。

## 目标

在对方接口文档未确定前，前端可以独立开发和调试；对方接口确定后，只替换 service 层，不重写页面和玩法组件。

## 接口不是固定路径

本文里的接口路径只是能力示例，不要求对方接口必须长这样。

如果对方已有接口：按对方接口适配。

如果对方没有接口：我们可以提供字段设计和 mock 数据。

## Service 能力清单

```ts
tourService.getBootstrap(routeId)
tourService.startSession(routeId, options)
tourService.getCurrentSession(routeId)
tourService.saveStageProgress(sessionId, stageId, payload)
tourService.endSession(sessionId, payload)
tourService.getRecords(routeId)
tourService.getRecordDetail(recordId)

userService.getProfile()
```

## 开发阶段实现

```text
getBootstrap -> mock/zodiac-route.ts
startSession -> wx storage
getCurrentSession -> wx storage
saveStageProgress -> wx storage
endSession -> wx storage records
getRecords -> wx storage records
getRecordDetail -> wx storage records
getProfile -> mock user
```

## 正式阶段实现

```text
service -> request.ts -> 对方 request 封装或 wx.request -> 对方接口
```

## 建议接口能力

| 能力 | 示例路径 | 必要性 |
|---|---|---|
| 获取用户信息 | `GET /user/profile` | 若对方已有用户接口可复用 |
| 获取线路配置 | `GET /tour/bootstrap` | 建议需要 |
| 开始游玩 | `POST /tour/sessions/start` | 需要 |
| 获取当前进度 | `GET /tour/sessions/current` | 需要 |
| 保存站点进度 | `POST /tour/stages/progress` | 需要 |
| 结束游玩 | `POST /tour/sessions/end` | 需要 |
| 历史记录列表 | `GET /tour/records` | 需要 |
| 单次记录详情 | `GET /tour/records/{recordId}` | 需要 |

## Bootstrap 数据建议

```ts
type BootstrapResponse = {
  route: TourRoute;
  assetsBaseUrl?: string;
  skipRule: {
    givesMark: boolean;
    countsAsProgress: boolean;
  };
  map?: {
    center: { latitude: number; longitude: number };
    markers: Array<{
      stageId: string;
      title: string;
      latitude: number;
      longitude: number;
    }>;
    polyline?: Array<{ latitude: number; longitude: number }>;
  };
};
```

## 保存站点进度字段

完成：

```json
{
  "sessionId": "xxx",
  "routeId": "zodiac-return",
  "stageId": "p3",
  "status": "completed",
  "action": "complete",
  "mark": "虎",
  "completedAt": "2026-07-14T10:30:00+08:00"
}
```

跳过：

```json
{
  "sessionId": "xxx",
  "routeId": "zodiac-return",
  "stageId": "p3",
  "status": "skipped",
  "action": "skip",
  "mark": null,
  "completedAt": "2026-07-14T10:30:00+08:00"
}
```

## Mock 文件建议

```text
mock/zodiac-route.ts
mock/mock-session.ts
mock/mock-records.ts
mock/mock-user.ts
```

## request 适配

`request.ts` 不直接写死鉴权方式，先预留：

```ts
type RequestOptions = {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: unknown;
  auth?: boolean;
};
```

待确认项：

- token 从哪里取。
- 是否使用 `Authorization: Bearer <token>`。
- 是否复用对方统一 request。
- 错误码格式。
- 是否签名、加密、时间戳。

## 后续替换策略

1. 页面和组件保持不变。
2. 替换 `tour-service.ts` 内部实现。
3. 替换 `user-service.ts` 内部实现。
4. 将 mock 数据作为接口失败兜底或测试数据。
5. 不在玩法组件里改接口逻辑。
