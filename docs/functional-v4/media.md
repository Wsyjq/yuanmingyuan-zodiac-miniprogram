# BGM 登记、试听与上传

14 段合计 **23.55 MiB**，原始文件不变，未加入安装包、未上传公开站点。机器清单记录精确字节数、时长和 SHA-256。

| 文件 | 登记标题 | 秒 | MiB |
|---|---|---:|---:|
| bgm-01-xiyanglou.mp3 | 序章 · 西洋楼 | 81.072 | 1.86 |
| bgm-02-huanghuazhen.mp3 | 黄花阵 | 45.192 | 1.04 |
| bgm-03-fangwaiguan.mp3 | 方外观 | 71.280 | 1.63 |
| bgm-04-haiyantang.mp3 | 海晏堂 | 75.072 | 1.72 |
| bgm-05-dashuifa.mp3 | 大水法（非静默段） | 103.968 | 2.38 |
| bgm-06-zhongzhang.mp3 | 终章 | 70.344 | 1.61 |
| bgm-07-xieqiqu-zhongyue.mp3 | 谐奇趣 · 中乐 | 66.144 | 1.52 |
| bgm-07x-xieqiqu-dual.mp3 | 谐奇趣 · 双声道 | 82.152 | 1.88 |
| bgm-08-xieqiqu-xiyue.mp3 | 谐奇趣 · 西乐 | 69.024 | 1.58 |
| bgm-09-yangquelong.mp3 | 养雀笼 | 66.024 | 1.51 |
| bgm-10-xushuilou.mp3 | 蓄水楼 | 97.032 | 2.22 |
| bgm-11-xianfahua.mp3 | 线法画 | 62.040 | 1.42 |
| bgm-12-yugao.mp3 | 雨果 | 70.032 | 1.61 |
| bgm-13-huixiang.mp3 | 线上回响 | 68.040 | 1.56 |

## 当前搭配

入口/序章 → 01；黄花阵 → 02；海晏堂 → 04；雨果 → 12；终章/报告 → 06。其余曲目在开发试听库可听，未自动挂接新剧情。05 不用于静默段。07x 明确作为当代双声道音乐创作，不宣称重现真实历史演奏。

曲目基准音量默认 0.24；设备滑块以此为基准调节整体音量，单曲 volume 可相对增减。旁白播放时配乐降至当前设定的四分之一。站点切换淡出后再淡入，同站题目切换不重启。用户主动暂停、静音与后台生命周期分开处理。

## 本机试听

```sh
node tools/bgm-preview.js /absolute/path/to/bgm 8878
```

浏览器打开 `http://127.0.0.1:8878`。页面提供 14 段逐曲试听、总音量、暂停，开启一曲会暂停其他曲。服务仅绑定本机、只读取清单内文件，支持媒体 Range 请求，不复制文件。

微信开发版本：封面 → 路线目录 → 开发配乐试听，填写媒体目录地址。此入口在非 develop 版本不列出曲目，也不接受试听操作；开发设备地址只保存在本机。真机无法使用电脑的 127.0.0.1，需正式 HTTPS 测试资源或开发环境可访问的独立服务。

## 正式托管（本轮未执行）

1. 核对提供方生成服务与商用条件。源 README 标注 AI 生成，本登记不替代许可证明。
2. 将清单文件原名上传自有媒体托管，保留 SHA-256 核对；无需把 MP3 放进小程序目录。
3. 服务提供 HTTPS、Content-Type `audio/mpeg`、可用的 Content-Length 与 Range；在微信后台配置相应合法域名。
4. 在 runtime.mediaBaseUrl 填目录地址。没有地址时界面说明配乐暂未上架，可继续文字体验。
5. 检查 14 个地址、时长与首尾；再在 iOS/Android 真机测试后台、静音开关、来电与耳机。

音频实现参考：[微信官方背景音频示例](https://github.com/wechat-miniprogram/miniprogram-demo/blob/master/miniprogram/packageAPI/pages/media/background-audio/background-audio.js)、[腾讯音频接口说明](https://intl.cloud.tencent.com/ind/document/product/1219/57746)。
