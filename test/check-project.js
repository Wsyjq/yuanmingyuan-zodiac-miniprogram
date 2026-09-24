'use strict'
const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process')
const root=path.resolve(__dirname,'..'), app=require('../app.json'), config=require('../project.config.json')
let failures=[]
function scan(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const p=path.join(dir,e.name);return e.name==='node_modules'||e.name==='.git'||e.name==='artifacts'?[]:e.isDirectory()?scan(p):[p]})}
const files=scan(root), rel=p=>path.relative(root,p)
for(const p of files.filter(p=>p.endsWith('.js'))){const r=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});if(r.status)failures.push(rel(p)+': '+r.stderr)}
for(const p of files.filter(p=>p.endsWith('.json'))){try{JSON.parse(fs.readFileSync(p))}catch(e){failures.push(rel(p)+': '+e.message)}}
const routes=app.pages.concat(app.subpackages.flatMap(s=>s.pages.map(p=>s.root+'/'+p)))
for(const route of routes)for(const ext of ['.js','.json','.wxml','.wxss'])if(!fs.existsSync(path.join(root,route+ext)))failures.push('Missing route '+route+ext)
const modulePackage=app.subpackages.find(s=>s.root==='plate21/module')
if(!modulePackage||modulePackage.pages.join(',')!=='pages/walk/walk,pages/report/report')failures.push('Only walk/report should be registered in the game module')
const runtime=files.filter(p=>/\.(js|wxml|json|wxss)$/.test(p)&&/^(?:pages\/|plate21\/module\/|app\.)/.test(rel(p))&&!p.endsWith('third-party-lock.json'))
for(const p of runtime){const source=fs.readFileSync(p,'utf8')
 for(const match of source.matchAll(/require\(['"](\.[^'"]+)['"]\)/g)){const target=path.resolve(path.dirname(p),match[1]);if(!fs.existsSync(target)&&!fs.existsSync(target+'.js'))failures.push(rel(p)+': missing import '+match[1])}
 for(const ref of source.match(/\/(?:plate21\/module\/)?assets\/[\w./-]+/g)||[])if(!fs.existsSync(path.join(root,ref.slice(1))))failures.push(rel(p)+': missing resource '+ref)
 if(p.endsWith('.wxml'))for(const m of source.matchAll(/wx:(?:if|elif|for)="([^"]+)"/g))if(!m[1].startsWith('{{'))failures.push(rel(p)+': unbound '+m[0])
 if(/pages\/(ticket|gate|s4-password|s3-zodiac|ending)\//.test(source))failures.push(rel(p)+': retired route')
 if(p.endsWith('.json'))for(const component of Object.values(JSON.parse(source).usingComponents||{})){const base=component.startsWith('/')?path.join(root,component):path.resolve(path.dirname(p),component);for(const ext of ['.js','.json','.wxml','.wxss'])if(!fs.existsSync(base+ext))failures.push(rel(p)+': missing component '+component+ext)}
}
const ignore=config.packOptions.ignore
if(!ignore.some(r=>r.type==='folder'&&r.value==='reference'))failures.push('reference prototype must be excluded')
if(failures.length){console.error(failures.join('\n'));process.exitCode=1}else console.log('OK: syntax, JSON, imports, assets, components, WXML bindings, '+routes.length+' routes')
