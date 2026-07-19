# GitHub 独立仓库与协作流程

## 1. 唯一源码

`Wsyjq/yuanmingyuan-zodiac-miniprogram` 是本小程序的唯一开发源码仓库。

独立仓库建立后：

- 小程序功能、文档、测试和素材登记只在独立仓库修改。
- 原父仓库中的目录副本停止开发，只保留到迁移验收结束。
- 不在两个仓库分别修改同名文件，不使用手工复制维持同步。

## 2. 日常开发

在独立仓库根目录执行：

```bash
git pull --ff-only
npm ci
npm run verify:static
```

开发完成后执行对应本地验证，再提交和推送：

```bash
git status
git diff
git add <intended-files>
git commit -m "<type>: <summary>"
git push
```

模拟器和布局检查需要 Windows 微信开发者工具，并显式配置 `WECHAT_DEVTOOLS_CLI`。

## 3. 父仓库集成

父仓库工作树整理干净后，将原 `apps/zodiac-miniprogram` 目录替换为指向独立仓库的 Git submodule。该转换单独执行，不与当前未提交改动混在一起。

转换完成后，父仓库只保存小程序提交指针。更新集成版本时：

```bash
cd apps/zodiac-miniprogram
git checkout main
git pull --ff-only
cd ../..
git add apps/zodiac-miniprogram
git commit -m "chore: update zodiac miniprogram"
```

小程序日常提交仍只发生在独立仓库；父仓库只在需要锁定新的集成版本时更新指针。

## 4. 本地私有配置

以下内容不进入 Git：

- `project.private.config.json`
- 真实微信小程序 AppID
- 本机微信开发者工具路径
- 环境变量和日志

仓库中的 `project.config.json` 使用 `touristappid`。需要真实 AppID 的开发者在本地微信开发者工具中配置，不提交对应私有文件。

## 5. CI 边界

GitHub Actions 只运行跨平台静态检查：

```bash
npm ci
npm run verify:static
```

以下命令依赖本地微信开发者工具，不在普通 GitHub runner 中执行：

```bash
npm run verify:simulator
npm run inspect:layout
```
