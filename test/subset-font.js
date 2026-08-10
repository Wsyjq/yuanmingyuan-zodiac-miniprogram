const Fontmin = require('fontmin');
const path = require('path');
const src = path.join(__dirname, '..', 'plate21', 'module', 'assets', 'fonts', 'Yozai-Regular.ttf');
const out = path.join(__dirname, '..', 'plate21', 'module', 'assets', 'fonts');
const text = '一二三上下不与中为乃之九也于五亭人仅今以件似佚侧便信俱值入全八六兽写出分则刻劫勘十午即及取可各合同名后向吻哉园图在基墙壳处多大奇如字家对将层已带年序座式归当录影待徐得想戏成我所手扫抹拓拼按摹散断方无日时是显景晷暮更月有本来柱校样格案档檐正此步残水池法洋海清渐源漫漶瀛火灯灰炬点然照状犹现璧畔留痕的皆皇相看知短石砖笔第系约纹细终缓缺者肩臆自至色花落藏行补表西见观解记证词误贝轻辰达远迷迹透逐途铅锋阵雕零页须首验黄鼓齐，。！？、：；·——（）()0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz点选模块开启趟纸上考察暮色中对柱取景留影为证';
new Fontmin().src(src).use(Fontmin.glyph({ text: text, hinting: false })).dest(out).run((err, files) => {
  if (err) { console.error('ERR:', err.message); process.exit(1); }
  const fs = require('fs');
  files.forEach(f => {
    const size = fs.statSync(f.path).size;
    console.log('OK', path.basename(f.path), (size/1024).toFixed(1)+'KB');
  });
});
