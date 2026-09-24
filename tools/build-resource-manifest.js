'use strict'
// Rebuild checksums only after reviewing the accompanying provenance and migration notes.
const fs=require('fs'),path=require('path'),crypto=require('crypto')
const root=path.resolve(__dirname,'..'),config=require('../project.config.json')
function scan(dir){if(!fs.existsSync(dir))return [];return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?scan(path.join(dir,e.name)):[path.join(dir,e.name)])}
const ignored=rel=>config.packOptions.ignore.some(r=>r.type==='folder'?(rel===r.value||rel.startsWith(r.value+'/')):rel===r.value)
const files=[...scan(path.join(root,'assets')),...scan(path.join(root,'plate21/module/assets/img')),...scan(path.join(root,'plate21/module/components/water-clock/assets')),
 ...fs.readdirSync(root).filter(n=>/^voice-[a-z]+$/.test(n)).flatMap(n=>scan(path.join(root,n)))].filter(p=>/\.(jpg|jpeg|png|webp|mp3|wav|ttf|woff2)$/i.test(p))
const rows=files.map(p=>{const rel=path.relative(root,p).replace(/\\/g,'/');let source='main/16af879；历史来源见 plate21/module/assets/NOTICE.md 与 third-party-lock.json'
 if(rel.includes('water-clock/assets/'))source='用户提供的海晏堂HTML原型；图像提取压缩，水声由代码合成，见 reference/海晏堂水力钟-谜题互动版.html'
 else if(rel.startsWith('voice-'))source=rel.includes('dj06-')?'main 原版 DJ-06 声景':'feat/ui-fixes-and-ticket/2880cc2；对应文案及冻结原因见 docs/v3-audio-migration.md'
 else if(rel==='assets/cover.jpg')source='main 的 IMG-RUNTIME-COVER.jpg 原样移至演示主包；原授权证据保留'
 return {path:rel,bytes:fs.statSync(p).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),published:!ignored(rel),source}
}).sort((a,b)=>a.path.localeCompare(b.path))
const output={schemaVersion:1,description:'当前真实资源及工程发布排除状态；校验哈希不等同重新认定素材版权。原许可证、授权证据和来源说明保留。',resources:rows}
fs.writeFileSync(path.join(root,'docs/v3-resource-manifest.json'),JSON.stringify(output,null,2)+'\n')
console.log('Wrote '+rows.length+' resources ('+rows.filter(r=>r.published).length+' in release)')
