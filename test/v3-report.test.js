'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')
const renderer = require('../plate21/module/utils/report-renderer')

function snapshot(id) {
  return { sessionId: id || 'old-run', records: [], run: { name: '考察者甲', completedAt: Date.UTC(2026,8,24,17),
    editionNo: 123, sites: { gate: 'done', xieqiqu: 'done', maze: 'done', fangwaiguan: 'skipped', haiyantang: 'done' } } }
}
function photo(id, siteId) { return { id: id, purpose: 'field', kind: 'photo', filePath: '/saved/' + id + '.jpg', siteId: siteId || 'maze' } }
function note(id, text) { return { id: id, purpose: 'field', kind: 'text', text: text, siteId: 'haiyantang' } }
function clone(value) { return JSON.parse(JSON.stringify(value)) }

function fakeCanvas(missing) {
  const words = [], imageSources = [], drawing = []
  const context = new Proxy({
    measureText(text) { return { width: Array.from(text).length * 22 } },
    fillText(text) { words.push(text) },
    drawImage(image) { drawing.push(image.src) }
  }, { get(object,key) { return key in object ? object[key] : function () {} } })
  return {
    words, imageSources, drawing, getContext() { return context },
    createImage() {
      const image = { width: 600, height: 400 }
      Object.defineProperty(image,'src',{ get() { return image._src }, set(src) {
        image._src = src; imageSources.push(src)
        if (missing && missing.includes(src)) image.onerror(new Error('missing'))
        else image.onload()
      } })
      return image
    }
  }
}

test('report reads only private field material and never promotes skipped or unknown stations', function () {
  const s = snapshot()
  s.records = [photo('mine'), note('text','自己的观察'), Object.assign(photo('relay'),{purpose:'relay'}),
    Object.assign(photo('reference'),{filePath:'/assets/fig/reference.jpg'}),
    Object.assign(photo('reference2'),{filePath:'/plate21/module/assets/img/IMG-RUNTIME-PLATE.jpg'})]
  const model = renderer.buildModel(s)
  assert.deepEqual(model.photos.map(x=>x.id), ['mine'])
  assert.deepEqual(model.texts.map(x=>x.id), ['text'])
  assert.equal(model.stations.length, 8)
  assert.equal(model.stations.find(x=>x.id==='fangwaiguan').stateLabel,'本次跳过')
  assert.equal(model.stations.find(x=>x.id==='hugo').stateLabel,'未记录')
  assert.equal(model.dateLabel,'2026 年 9 月 25 日')
  assert.equal('editionNo' in model,false)
  assert.equal(renderer.dateLabel(0),'尚未完成考察')
})

test('all photos and complete long/multiline notes are retained across bounded sheets', function () {
  const s = snapshot()
  s.records = Array.from({length:9},(_,i)=>photo('p'+i)).concat([
    note('n1','观察'.repeat(250)), note('n2',Array.from({length:120},(_,i)=>String(i%10)).join('\n'))
  ])
  const model = renderer.buildModel(s), sheets = renderer.buildSheets(model)
  assert.deepEqual(sheets.flatMap(x=>x.photos.map(p=>p.id)), model.photos.map(p=>p.id))
  for(const n of model.texts) assert.equal(sheets.filter(s=>s.text&&s.text.id===n.id).map(s=>s.text.text).join(''),n.text)
  for(const sheet of sheets) {
    assert.ok(sheet.photos.length <= 4)
    assert.ok(renderer.measure(fakeCanvas().getContext('2d'),sheet).height < 2200)
    assert.equal(sheet.total,sheets.length)
  }
})

test('renderer draws supplied player photos, truthful labels, signature and original date', async function () {
  const s = snapshot(); s.records=[photo('p1'),note('n1','我看见了石构的轮廓。')]
  const sheet = renderer.buildSheets(renderer.buildModel(s))[0]
  const canvas = fakeCanvas(),ctx=canvas.getContext('2d')
  const result = await renderer.draw(ctx,canvas,sheet)
  assert.deepEqual(canvas.imageSources,['/saved/p1.jpg'])
  assert.deepEqual(canvas.drawing,['/saved/p1.jpg'])
  assert.ok(canvas.words.includes('署名：考察者甲'))
  assert.ok(canvas.words.includes('完成日期：2026 年 9 月 25 日'))
  assert.ok(canvas.words.includes('遗址线稿 · 示意底图'))
  assert.ok(canvas.words.includes('本次跳过'))
  assert.equal(/第\s*123\s*版|密码|日期卡/.test(canvas.words.join('')),false)
  assert.deepEqual(result.missingPhotos,[])
})

test('missing player image produces a named placeholder and never substitutes stock imagery', async function () {
  const s=snapshot();s.records=[photo('missing')]
  const canvas=fakeCanvas(['/saved/missing.jpg'])
  const result=await renderer.draw(canvas.getContext('2d'),canvas,renderer.buildSheets(renderer.buildModel(s))[0])
  assert.deepEqual(result.missingPhotos,['missing'])
  assert.deepEqual(canvas.drawing,[])
  assert.ok(canvas.words.includes('这张照片暂不可用'))
  assert.equal(await renderer.loadImage({createImage(){return {}}},'/never.jpg',1),null)
})

function pageHarness(options) {
  const opts=options||{}, old=clone(opts.archive||snapshot()), current=clone(opts.current||snapshot('current-run'))
  const calls=[], saved=[], canvas=fakeCanvas(opts.missing), redirects=[]
  let nextId=1, exportCount=0, failAlbumAt=opts.failAlbumAt||0
  const target=id=>id===current.sessionId?current:old
  const api={
    getSnapshot(){return clone(current)},
    getArchive(id){return id===old.sessionId?clone(old):null},
    async getLetterState(id){calls.push(['letterState',id]);return {available:true}},
    async openLetter(id){calls.push(['openLetter',id]);if(opts.lockLetter){const e=new Error('locked');e.code='LETTER_LOCKED';throw e}return clone(target(id))},
    async requestReminder(id){calls.push(['reminder',id]);return opts.reminderAck||{accepted:false,status:'failed'}},
    async saveMedia(input){calls.push(['media',input]);return opts.failMedia?{status:'failed'}:{status:'local',localPath:'/saved/new.jpg'}},
    async saveRecord(input,id){
      calls.push(['saveRecord',clone(input),id]);const item=clone(input),s=target(id)
      if(item.id){const ix=s.records.findIndex(r=>r.id===item.id);if(ix<0)throw new Error('missing');s.records[ix]=Object.assign({},s.records[ix],item)}
      else{s.records.push(Object.assign(item,{id:'new-'+nextId++}))}
      return item
    },
    async deleteRecord(id,sessionId){calls.push(['delete',id,sessionId]);const s=target(sessionId);s.records=s.records.filter(r=>r.id!==id);return {deleted:true}},
    emit(event){calls.push(['emit',event])}
  }
  const wx={
    chooseImage(input){if(opts.cancelPhoto)input.fail({errMsg:'chooseImage:fail cancel'});else input.success({tempFilePaths:['/tmp/chosen.jpg'],tempFiles:[{size:100}]})},
    showModal(input){input.success({confirm:true})},
    previewImage(input){calls.push(['preview',input.current]);input.success({})},
    redirectTo(input){redirects.push(input.url);input.success({})},
    canvasToTempFilePath(input){exportCount++;if(opts.failExport)input.fail(new Error('export_failed'));else input.success({tempFilePath:'/tmp/report-'+exportCount+'.jpg'})},
    saveImageToPhotosAlbum(input){
      const index=Number(/report-(\d+)/.exec(input.filePath)[1])
      if(failAlbumAt===index){failAlbumAt=0;input.fail({errMsg:'auth deny'})}else{saved.push(input.filePath);input.success({})}
    },
    showToast(){},openSetting(){},pageScrollTo(){},
    createSelectorQuery(){const query={in(){return query},select(){return query},fields(){return query},exec(cb){cb(opts.noCanvas?[]:[{node:canvas}])}};return query}
  }
  const filename=path.join(__dirname,'../plate21/module/pages/report/report.js'),ownRequire=createRequire(filename)
  let definition
  vm.runInNewContext(fs.readFileSync(filename,'utf8'),{
    Page(value){definition=value},wx,setTimeout,clearTimeout,encodeURIComponent,
    require(name){
      if(name.includes('store/session'))return api
      if(name.includes('game-entry'))return {async init(input){calls.push(['entry',input]);return api.getSnapshot()}}
      if(name.includes('host/bridge'))return {available(name){return name==='requestReminder'&&!!opts.reminderSupported}}
      if(name.includes('photo-pipeline'))return {async normalizePhoto(p){return {path:p,width:800,height:600,withinBudget:true}}}
      return ownRequire(name)
    }
  },{filename})
  const page={data:clone(definition.data),setData(patch){Object.assign(this.data,patch)}}
  Object.keys(definition).filter(k=>typeof definition[k]==='function').forEach(k=>{page[k]=definition[k].bind(page)})
  return {page,calls,saved,old,current,canvas,redirects}
}
const event=id=>({currentTarget:{dataset:{id}}})

test('explicit historical session selects its own records instead of the new run', async function () {
  const old=snapshot();old.records=[photo('old-photo')]
  const h=pageHarness({archive:old})
  await h.page.onLoad({sessionId:'old-run'})
  assert.equal(h.page.data.model.sessionId,'old-run')
  assert.equal(h.page.data.model.photos[0].id,'old-photo')
  assert.equal(h.calls[0][0],'entry','host-aware entry initializes direct report visits')
  await h.page.onShow()
  assert.equal(h.calls.filter(c=>c[0]==='entry').length,2,'show revalidates host identity')
})

test('unknown archive shows an error without displaying the current run as a substitute', async function () {
  const h=pageHarness();await h.page.onLoad({sessionId:'missing'})
  assert.ok(h.page.data.loadError)
  assert.equal(h.page.data.model,null)
})

test('late photo is persisted before its record; replacement/deletion preserve completion and other runs', async function () {
  const old=snapshot();old.records=[photo('old-photo')]
  const h=pageHarness({archive:old});await h.page.onLoad({sessionId:'old-run'})
  const completed=h.old.run.completedAt
  await h.page.onReplacePhoto(event('old-photo'))
  assert.equal(h.calls.find(c=>c[0]==='media')[1].upload,false)
  const write=h.calls.find(c=>c[0]==='saveRecord')
  assert.equal(write[2],'old-run');assert.equal(write[1].filePath,'/saved/new.jpg')
  assert.equal(h.old.records.length,1)
  assert.equal(h.old.run.completedAt,completed)
  assert.equal(h.current.records.length,0)
  await h.page.onDeleteRecord(event('old-photo'))
  assert.equal(h.old.records.length,0)
  assert.equal(h.old.run.completedAt,completed)
  assert.equal(h.old.run.sites.fangwaiguan,'skipped')
})

test('failed durable save or cancelled picker keeps the original photo intact', async function () {
  for(const options of [{failMedia:true},{cancelPhoto:true}]){
    const old=snapshot();old.records=[photo('old-photo')]
    const h=pageHarness(Object.assign({archive:old},options));await h.page.onLoad({sessionId:'old-run'})
    await h.page.onReplacePhoto(event('old-photo'))
    assert.equal(h.old.records[0].filePath,'/saved/old-photo.jpg')
    assert.equal(h.calls.filter(c=>c[0]==='saveRecord').length,0)
    assert.equal(h.page.data.busy,false)
    assert.equal(!!h.page.data.recordError,!!options.failMedia)
  }
})

test('text can be added, edited and deleted in its archive without changing its completion date', async function () {
  const h=pageHarness();await h.page.onLoad({sessionId:'old-run'})
  const date=h.old.run.completedAt
  h.page.onTextInput({detail:{value:'第一次观察'}});await h.page.onSaveText()
  const id=h.old.records[0].id
  h.page.onEditText(event(id));h.page.onTextInput({detail:{value:'补充后的观察'}});await h.page.onSaveText()
  assert.equal(h.old.records.length,1);assert.equal(h.old.records[0].text,'补充后的观察')
  await h.page.onDeleteRecord(event(id))
  assert.equal(h.old.records.length,0);assert.equal(h.old.run.completedAt,date)
  assert.equal(h.page.data.editingTextId,'')
})

test('album permission failure unlocks retry, preserving successful earlier sheets', async function () {
  const old=snapshot();old.records=Array.from({length:5},(_,i)=>photo('p'+i))
  const h=pageHarness({archive:old,failAlbumAt:2});await h.page.onLoad({sessionId:'old-run'})
  await h.page.onSave()
  assert.equal(h.page.data.savedCount,1);assert.equal(h.page.data.canOpenAlbumSettings,true)
  assert.equal(h.page.data.saving,false);assert.equal(h.page.data.generating,false)
  await h.page.onSave()
  assert.equal(h.page.data.savedCount,2)
  assert.deepEqual(h.saved,['/tmp/report-1.jpg','/tmp/report-2.jpg'])
  assert.equal(h.old.run.completedAt,old.run.completedAt)
})

test('canvas/export failures leave records intact and always release generation/save locks', async function () {
  for(const options of [{noCanvas:true},{failExport:true}]){
    const old=snapshot();old.records=[note('n','珍贵的观察')]
    const h=pageHarness(Object.assign({archive:old},options));await h.page.onLoad({sessionId:'old-run'})
    await h.page.onSave()
    assert.equal(h.page.data.saving,false);assert.equal(h.page.data.generating,false)
    assert.ok(h.page.data.saveError);assert.equal(h.old.records[0].text,'珍贵的观察')
    assert.equal(h.old.run.completedAt,old.run.completedAt)
  }
})

test('letter opens through the session gate before navigation, including late archived returns', async function () {
  const h=pageHarness();await h.page.onLoad({sessionId:'old-run'});await h.page.onOpenLetter()
  assert.equal(h.calls.find(c=>c[0]==='openLetter')[1],'old-run')
  assert.equal(h.redirects[0],'/plate21/module/pages/walk/walk?sessionId=old-run&entry=letter')
  assert.equal(h.page.data.letterOpening,false)
  assert.equal(h.page.data.letterMessage.includes('昨天'),false)
  const locked=pageHarness({lockLetter:true});await locked.page.onLoad({sessionId:'old-run'});await locked.page.onOpenLetter()
  assert.equal(locked.redirects.length,0);assert.ok(locked.page.data.letterMessage.includes('尚未开放'))
  assert.equal(locked.page.data.letterOpening,false)
})

test('reminder needs host capability and an explicit accepted acknowledgement', async function () {
  const absent=pageHarness();await absent.page.onLoad({sessionId:'old-run'});await absent.page.onRequestReminder()
  assert.equal(absent.page.data.reminderSupported,false)
  assert.equal(absent.calls.filter(c=>c[0]==='reminder').length,0)
  for(const ack of [{accepted:true,status:'accepted'},{accepted:false,status:'declined'},{status:'accepted'}]){
    const h=pageHarness({reminderSupported:true,reminderAck:ack});await h.page.onLoad({sessionId:'old-run'})
    await h.page.onRequestReminder()
    assert.equal(h.page.data.reminderSupported,true)
    assert.equal(h.page.data.reminderAccepted,ack.accepted===true)
    assert.equal(h.page.data.reminderRequesting,false)
    assert.equal(h.calls.find(c=>c[0]==='reminder')[1],'old-run')
    assert.equal(h.page.data.reminderMessage.includes('已受理'),ack.accepted===true)
  }
})
