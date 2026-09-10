# 项目关系

- 原生小程序主包与 plate21/module 分包保留。
- config：稳定的站点、任务、知识、回响与媒体配置。
- domain：无微信依赖的进度与私人记录命令，供本地命令使用；云端另行校验传入快照。
- store/session：唯一业务存档入口；services/audio：设备级全局播放；services/sync：显式冲突处理的私人云同步。
- capabilities/overlay-host：所有页面的共享导航、声音和操作入口。
- pages/journey、library、reader、journal、echo、audio-lab：独立可用功能页面。
- cloudfunctions/archive：服务端身份确认、私人快照同步及媒体归属；tools/bgm-preview.js：开发音乐试听。
