'use strict'
const fs=require('fs'),path=require('path'),crypto=require('crypto')
const root=path.resolve(__dirname,'..'),config=require('../project.config.json'),manifest=require('../docs/v3-resource-manifest.json'),audio=require('../plate21/module/audio/v3-manifest')
const errors=[]
const ignored=rel=>config.packOptions.ignore.some(r=>r.type==='folder'?(rel===r.value||rel.startsWith(r.value+'/')):rel===r.value)
for(const row of manifest.resources){const p=path.join(root,row.path);if(!fs.existsSync(p)){errors.push('Missing '+row.path);continue}const bytes=fs.readFileSync(p);if(bytes.length!==row.bytes||crypto.createHash('sha256').update(bytes).digest('hex')!==row.sha256)errors.push('Changed resource '+row.path);if(row.published===ignored(row.path))errors.push('Packaging state changed '+row.path);if(!row.source)errors.push('Missing source '+row.path)}
for(const item of Object.values(audio.entries).filter(e=>e.enabled))for(const src of item.files){const rel=src.slice(1);if(ignored(rel))errors.push('Enabled narration excluded: '+rel);if(!fs.existsSync(path.join(root,rel)))errors.push('Missing active audio: '+rel)}
const historical=require('../plate21/module/assets/third-party-lock.json')
for(const item of historical.resources)if(item.licenseFile&&!fs.existsSync(path.join(root,item.licenseFile)))errors.push('Original license missing '+item.licenseFile)
for(const rel of ['plate21/module/assets/NOTICE.md','docs/compliance/IMG-AI-PROJECT-evidence.md','reference/海晏堂水力钟-谜题互动版.html'])if(!fs.existsSync(path.join(root,rel)))errors.push('Provenance missing '+rel)
if(errors.length){console.error(errors.join('\n'));process.exitCode=1}else console.log('OK: '+manifest.resources.length+' resource hashes; enabled audio is packaged; original licenses/provenance retained (not a new rights certification)')
