'use strict'
// Visitor-facing task summaries; original script and historical cards remain intact.
const tasks = {
  'quiz-direction': ['对照地图，辨认西洋楼的方位', '先选一个方位，再确认答案。', '再找找长春园的范围和地图方向标记，对照西洋楼的位置。'],
  'listen-nfc': ['听一听谐奇趣的声音', '留意声景中的水声与音乐；已听过可手动确认。', '可以直接播放声景；已听过请确认，无法收听也可以跳过。'],
  'quiz-envelope': ['拼出信封中的下一站', '对齐两处半字，再填入拼出的三个字。', '试着对齐信封封口与信背面的半字，从左到右读；不用填写标点。'],
  'quiz-lantern': ['推想这座迷宫曾怎样使用', '观察迷宫与中心亭，再选择一种用途。', '从宫苑游乐的角度想一想：人们怎样在迷宫与中心亭之间互动？'],
  'prop-flip': ['翻看实体黄花阵图', '翻到背面后点确认，再读名字背后的故事。', '请先翻到实体图背面，再确认。'],
  'photo-pavilion': ['留下一处自己的观察', '到达中心亭后，照片或文字任选一种即可完成。', '拍摄一张照片，或写下一个现场细节，再保存观察记录。'],
  'quiz-pattern': ['认出沿途见到的纹样', '比较线条的转折和连接方式，再选一张图。', '留意墙面纹样连续转折的形状，再与四张图比较。'],
  'quiz-hour': ['观察水钟，再作出预测', '跟随水钟完成观察、14 时题与正午预测。', '请在水钟中完成当前步骤；演出不流畅时可切换静态演示。'],
  'prop-dial': ['完成实体转盘操作', '按实物说明对照花纹，完成后勾选确认；没有道具可跳过。', '操作实体转盘后，请勾选完成确认；暂时没有道具可跳过。'],
  'quiz-height': ['找出喷水与蓄水位置的关系', '结合眼前高台与特刊，比较蓄水位置的高低。', '再看看蓄水处与喷嘴之间的高度差，想想水会怎样流动。'],
  'place-animals': ['让喷水构件回到画中位置', '先选构件，再选位置；三个构件都放好后确认。', '对照铜版图，分别找中央、环绕中央和池两端的构件；可选中后重新放置。']
}
function get(id) { const item = tasks[id]; return item ? { title: item[0], instruction: item[1] } : null }
function feedback(id, ui) {
  if (['quiz-direction', 'quiz-lantern', 'quiz-pattern', 'quiz-height'].includes(id) && !(ui.optionId || ui.choice)) return '请先选择一个选项，再确认答案。'
  if (id === 'quiz-envelope' && !String(ui.text || '').trim()) return '请先填写拼出的站名，再确认答案。'
  return tasks[id] ? tasks[id][2] : '请查看操作提示，完成后再继续。'
}
module.exports = { get, feedback }
