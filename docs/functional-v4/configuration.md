# 配置与扩展

## 稳定编号

`config/experience.js` 的 NODES 和 ROUTES 关联原页面；`config/tasks.js` 管理原题两级提示、完成反馈、部分答案与选项。`domain/experience.js` 只更新游览、偏好、阅读、记录和附页，不制造原题结果。原题页面内保留原交互与长剧情；变更原有特殊解题机制仍应修改对应控制器并补测试。

```js
// 在已有节点上添加可选差异内容；未设置的模式回退共同版本。
node.variants.family = {
  action: '一起查看道具的图示，再轮流操作',
  prop: '对应的实体道具',
  hints: ['第一层提示', '第二层提示']
}
```

`EXTRA_NODES` / `EXTRA_ROUTES` 另外登记顺路点位，保存实际支线位置并按原路线衔接；不把这些可选观察计为主线答题完成。

节点编号不可因为标题修改而更换。新增节点须同时登记路线和可恢复位置；同站多道题共享 `station`，因此不会重启配乐。切换参与偏好不会重置进度。

## 音频

`config/narration.js` 从原 scripts 原样移动，兼容导出保留。目前旁白 `audio:null`，界面显示文字，不把音乐冒充讲解。提供正式 HTTPS 音频后设置该字段即可播放。最新 main 的 `deepScript` 与 `deepAudio` 继续保留，基础讲解和深讲共用全局播放器，不建立第二套播放上下文。

`config/runtime.js`：

```js
module.exports = {
  cloudEnv: '',             // 空值：保存在本机
  cloudFunction: 'archive',
  mediaBaseUrl: '',         // 发布时填写 HTTPS 媒体目录
  echoUnlockHour: 9         // 北京时间；有效范围 0—23
}
```

`config/media.js` 保存曲目 loop、volume、fadeMs 和 stationTracks。设备音量/静音/连续播放偏好和各音轨进度只放本地，不随私人云档案覆盖。首次播放需要点击。后台仅保留主讲解；来电等中断后主动恢复。静默/视频使用 `audio.get().suspend('reason')` 和 `release('reason')`；多个占用必须全部释放才恢复。后续录音功能同样用 `suspend('recording')`，结束/失败/离页均 release，切勿重新创建独立 BGM 上下文。

已有讲解队列通过播放器的 `setQueue` 设置；“连续播放”只连续播放有可用旁白的条目，不自动导航到下一题。

## 知识卡与次日章节

知识卡结构：

```js
{
  id: 'sample-card', station: 's3', title: '标题',
  nature: '史料原文 / 研究解释 / 当代照片 / 艺术演绎（按实际选择）',
  review: '核验状态与日期', dispute: '争议或空字符串',
  sources: [{ title: '来源名称', file: '资料包文件名', url: 'https://...' }],
  blocks: [
    { type: 'text', text: '正文' },
    { type: 'image', src: 'https://...', caption: '年代、出处与性质', text: '文字替代说明' },
    { type: 'audio', src: 'https://...', text: '完整文字稿' },
    { type: 'video', src: 'https://...', text: '字幕或完整文字替代' }
  ]
}
```

`config/echo.js` 初始 `chapters:[]`、`letter:null`。章节沿用知识卡结构，另加 `published:true`、summary。**只有审定并正式提供素材后才 published。** 每页即一个 block，保存页码；视频保存播放秒数；音频使用全局断点。读完可标为已读，重新进入可继续或逐页回看。

来信示例为 `{published:true,text:'已审定的来信正文'}`。本轮不生成玩家未写下的内容，也不注入不存在的游客留言。

未完成当日体验时不计算解锁时间；私人记录页和原报告页均可结束今日体验。无需照片、无需全题答对。首次完成时间固定，跨月/年按北京时间日历计算，不用“完成后 24 小时”替代次日 09:00。此处是私人内容开放时间，不是防篡改付费权益系统。

## 会话 v3 / 宿主接口

保留 `puzzles/cards/stations/flags/records/name/sessionDate`，新增 `preferences/visits/visitCheckpoint/reading/journal/echo`。旧结构迁移前保存 `plate21_backup_<sessionId>` 原始备份；新“跳过”状态不转成旧答案。旧本地 editionNo 保留为 legacyEditionNo，不对游客展示为全局序号。

接口契约位于 `contracts/adapter-api.js`；私人云同步是显式快照同步，不替换本地串行操作入口。永久校验错误不入重试队列。私人记录以 updatedAt 检查陈旧编辑；云端另用 version，禁止无条件最后写入覆盖。
