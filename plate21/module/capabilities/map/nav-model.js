'use strict'
// Route order and orientation only. No guessed coordinates or distance claims.
const SITES = [
  {id:'gate',name:'西洋楼入口'}, {id:'xieqiqu',name:'谐奇趣'}, {id:'maze',name:'黄花阵'},
  {id:'fangwaiguan',name:'方外观'}, {id:'haiyantang',name:'海晏堂'}, {id:'xushuilou',name:'蓄水楼'},
  {id:'dashuifa',name:'大水法'}, {id:'hugo',name:'雨果雕像'}
]
function listSites() { return SITES.map((s) => Object.assign({}, s)) }
function leg(fromId,toId) {
  const from = SITES.find((s) => s.id === fromId), to = SITES.find((s) => s.id === toId)
  return from && to ? {fromId,toId,from:from.name,to:to.name,title:'前往'+to.name,
    instruction:toId === 'xushuilou' ? '前往海晏堂北面的高台蓄水楼，对照现场标识确认。' : '对照实体地图与现场标识步行。', schematic:true} : null
}
function sideButton(id) { return { visible:SITES.some((s) => s.id===id), label:'路线' } }
module.exports={listSites,leg,sideButton}
