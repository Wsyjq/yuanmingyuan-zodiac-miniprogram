module.exports = {
  name: 'web',
  sourceType: 'wechat',
  target: 'web',
  compileType: 'miniprogram',
  compileMode: 'bundle',
  srcPath: '.',
  outputPath: 'C:/Users/ASUS/AppData/Local/Temp/opencode/ymy-mor-web',
  autoClean: true,
  ignore: [
    '**/docs/**',
    '**/h5/**',
    '**/showcase/**',
    '**/showcase-demos/**',
    '**/test/**',
    '**/tools/**'
  ],
  web: {
    showHeader: false,
    showBack: false,
    responsiveRootFontSize: 16
  }
}
