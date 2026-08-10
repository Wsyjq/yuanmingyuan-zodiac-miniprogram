'use strict'

const path = require('path'), http = require('http'), fs = require('fs')
const { execSync } = require('child_process')
const ROOT = path.resolve(__dirname, '..')
function loadPlaywright(){try{return require('playwright')}catch(e){}const g=execSync('npm root -g').toString().trim();return require(path.join(g,'playwright'))}
const server = http.createServer((req,res)=>{
  const file=path.normalize(path.join(ROOT,decodeURIComponent(req.url.split('?')[0])))
  fs.readFile(file,(err,buf)=>{if(err){res.writeHead(404);res.end('404');return}res.end(buf)})
})
server.listen(0,'127.0.0.1',async()=>{
  const port=server.address().port
  const pw=loadPlaywright()
  const browser=await pw.chromium.launch()
  const page=await browser.newPage()
  await page.goto(`http://127.0.0.1:${port}/test/harness/out/01-cover.html`,{waitUntil:'load'})
  await page.evaluate(async()=>{if(document.fonts&&document.fonts.ready)await document.fonts.ready})
  await page.waitForTimeout(1500)
  const result=await page.evaluate(()=>{
    const fonts=[]
    if(document.fonts)for(const f of document.fonts)fonts.push(f.family+':'+f.status)
    const el=document.querySelector('.note-hand,.hand')
    const cs=el?getComputedStyle(el).fontFamily:'无'
    return{fonts,computedFontFamily:cs,text:el?el.textContent.slice(0,20):''}
  })
  console.log('字体注册:',JSON.stringify(result.fonts))
  console.log('批注computed:',result.computedFontFamily)
  console.log('批注文字:',result.text)
  // 字体文件 HTTP 状态
  const code=await new Promise(r=>{http.get(`http://127.0.0.1:${port}/plate21/module/assets/fonts/Plate21WenKai-Subset.ttf`,res=>r(res.statusCode)).on('error',()=>r('err'))})
  console.log('字体文件HTTP:',code)
  const loaded=result.fonts.some((font)=>font.includes('Plate21WenKai:loaded'))
  await browser.close();server.close()
  if(!loaded||code!==200)process.exitCode=1
})
