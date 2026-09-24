# 大水法鹿犬归位

2026-09-25：DS1 使用独立 fountain-puzzle 原生组件。首次进入空景，鹿和十只猎犬分成两个可拖拽构件。命中场景中的归位区才保存；错放回待放区。支持点选构件再点位置。两者完成后出现十道动态水流，可暂停/重播，点击原有确认按钮进入 DS2。保留 DS2 旧画渐隐玩法与全部史料。

归位坐标采用场景比例，拖动按 client 坐标与实时 boundingClientRect 判定。离开、切后台或打开覆盖层取消拖动/暂停水流。草稿沿用 session.saveDraft；回看禁止改写。两端铜兽已在底图，不再作为第三个操作构件，但兼容旧判题字段 beasts: ends。旧存档中的正确鹿犬位置可恢复。

素材来源：用户提供 `/Users/pomelo/Downloads/Codex 图像 2026年9月25日 02_50_34.png`。通过 imagegen 制作无鹿犬且无喷流底图，以及透明鹿、十犬组合；仅做游戏场景，不作为经过考据的建筑复原证据。压缩发布资源位于 plate21/module/assets/img/dashuifa-*，实际哈希登记在 v3-resource-manifest.json。未改动原始文件。

生成原稿保留于 `/Users/pomelo/.codex/generated_images/01a0d38e-56ee-79d1-bf34-c16dbf9ae552/`：
- 空景 exec-97e43aed-36ca-4bf1-bf7b-3058a0a68a38.png
- 鹿 exec-c7d6456d-ba90-4a46-a9c0-22dbea4a5cdb.png
- 十犬 exec-307dc6b4-f0ad-4420-b816-77de479b624c.png

纯几何、组件生命周期、错误位置、部分恢复、只读回看和真实页面主线由自动测试覆盖。图片失败可重试，并保留点选位置继续能力。水流为 WXSS 演出，不增加 Canvas 层和音源。iOS/Android 真机触摸、帧率及完整原生页面视觉仍需验收。
