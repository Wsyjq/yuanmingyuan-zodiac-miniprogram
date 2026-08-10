'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const Fontmin = require('fontmin')

const root = path.join(__dirname, '..')
const source = path.join(__dirname, 'vendor-src', 'fonts', 'LXGWWenKai-Regular.ttf')
const outDir = path.join(root, 'plate21', 'module', 'assets', 'fonts')
const output = path.join(outDir, 'Plate21WenKai-Subset.ttf')
const base64Module = path.join(root, 'fonts', 'Plate21WenKai-Subset.b64.js')
const characterFile = path.join(root, 'plate21', 'module', 'assets', 'licenses', 'OFL-LXGW-WenKai-v1.522-characters.txt')
const sourceSha256 = '39ad71264b588165b469e35e6afb162a378dacd1f95348160240ba9038ac3009'

// Only copy used for handwritten annotations and captions is embedded. Other
// text keeps the system Song/Kai fallbacks, so the main package stays small.
const handwrittenText = `
点选模块，开启一趟纸上考察。
此图与皇家档案所藏第二十一图同源
散落的五层，今日终于在我手中拼齐。
墙上的花纹，回转连绵，像是走不到头。
考察记录 · 第二站
参考图：手持莲花灯的宫女
砖墙仅及肩，入阵便迷向，奇哉。
须想透「戏」字，方得正解。
你从各处卡片角落记下的数字
把它们连起来看看……
缓步徐行，约八分可达
此信写于劫火之后一年，字字带火。
一八六零年十月，一炬成灰。
归途记：图成，人散，园犹在。
已观察 / 0123456789
日晷影短，午正将至——记于池畔。
兽首各按时辰当值，如更鼓然。
大水法现状 · 2026
刻痕已校，与阵中亭基座相合，可归档。
已录 0123456789 则，共四则。
先对照信封封口和信纸背面的半字，不要只看单个字形。
把对应位置的两半字在脑中合拢，完整地点由三个字组成。
应当得到七个生肖。按实体转盘上的图示逐一核对，不必考虑仍下落不明的五尊。
纸面显出的应是一尊生肖兽首。等待轮廓和文字稳定后再作答。
民国著录卡片特写
ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz
，。！？、：；·——（）「」〔〕…/+-
`

const characters = Array.from(new Set(Array.from(handwrittenText).filter((char) => !/\s/.test(char)))).join('')

if (!fs.existsSync(source)) {
  console.error('ERR: missing source font', source)
  process.exit(1)
}

const actualSourceSha256 = crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex')
if (actualSourceSha256 !== sourceSha256) {
  console.error('ERR: source font SHA-256 mismatch', actualSourceSha256)
  process.exit(1)
}

new Fontmin()
  .src(source)
  .use(Fontmin.glyph({ text: characters, hinting: false }))
  .dest(outDir)
  .run((error, files) => {
    if (error) {
      console.error('ERR:', error.message)
      process.exit(1)
    }

    const generated = files[0] && files[0].path
    if (!generated) {
      console.error('ERR: fontmin produced no file')
      process.exit(1)
    }
    if (path.resolve(generated) !== path.resolve(output)) {
      if (fs.existsSync(output)) fs.unlinkSync(output)
      fs.renameSync(generated, output)
    }

    const font = fs.readFileSync(output)
    fs.writeFileSync(base64Module, `'use strict'\n\nmodule.exports = '${font.toString('base64')}'\n`)
    fs.writeFileSync(characterFile, `LXGW WenKai v1.522 project subset\nGlyph characters (${characters.length}):\n${characters}\n`)

    console.log('OK', path.relative(root, output), `${(font.length / 1024).toFixed(1)} KiB`, `glyphs=${characters.length}`)
    console.log('OK', path.relative(root, base64Module), `${(fs.statSync(base64Module).size / 1024).toFixed(1)} KiB`)
  })
