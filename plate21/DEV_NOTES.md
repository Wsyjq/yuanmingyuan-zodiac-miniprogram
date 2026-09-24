# 游戏开发指引

页面仅调用 `store/session` 操作持久数据，或调用 `host/resources` 解析资源。不新增独立进度 storage key，不从页面直接调用云数据库、上传/投稿后端或支付接口。

- 剧情/标题/流程/词条/道具关联：`content/story.js`；`flow/pages.js` 只做编译适配。
- 实体道具操作指令：`content/props.js`；史料：`content/history.js`；任务提示：`content/tasks.js`；既有题库：`content/puzzles.js`。
- 显示层（标题、条件正文、史料与选项）：`flow/screen.js`。
- 判定：`play/index.js`；水钟纯状态：`play/water-clock.js`。
- 当前显示页与权威断点：`run.pageId` / `run.resumePageId`。回看不推进断点。
- 草稿：`session.saveDraft(pageId,patch,sessionId?)`；记录：`saveRecord`；完成：`sign`。不得直接修改完成时间/结果。
- 高频草稿先落本地，再合并到单路宿主同步队列。同步冲突保留本地待处理，不能提示云端已成功。
- 照片先压缩、持久保存成功，再写引用；临时路径不能当作永久记录。
- 隐藏、卸载或进入演出时暂停音频；所有讲述手动启动。揭晓内容必须经过对应操作状态门控。
- 题目选项使用稳定 ID，不用字符串包含关系判题。
- 历史年份在史料里；作品日期只读首次完成时间。不要恢复日期卡、日期密码、水显纸和七生肖判题。
- 媒体、公开投稿、撤回、提醒以真实回执为准。私人稿和公开副本不可合并。

修改后运行仓库根目录 `npm test`。新增宿主调用需同步更新 `contracts/adapter-api.js`、接入文档与失败/缺失能力测试。组件 WXSS 使用 class，不使用标签、ID 或属性选择器。

改变录音需同时核对正文、播放状态、文件及 `v3-manifest`。冻结音频放行前必须听审，并从发布忽略清单中去除对应文件。只引用资源必须进入注册包；勿从主包依赖未加载的分包图片。

编辑流程与存档兼容规则见 `docs/v3-content-authoring.md`。先运行 `npm run check:story` 再运行 `npm test`。不要恢复分散的标题/正文副本。
