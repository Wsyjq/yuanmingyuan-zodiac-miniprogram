// GPUNexus 文生图脚本：node test/gen-image.js "<prompt>" <out.png> [size]
// 默认模型 doubao-seedream-5-0-260128（即梦 Seedream 5.0）
const fs = require('fs')
const path = require('path')

const KEY = process.env.GPN_KEY
if (!KEY) { console.error('set GPN_KEY first'); process.exit(1) }

const prompt = process.argv[2]
const out = process.argv[3] || 'gen-out.png'
const size = process.argv[4] || '1536x2048'
const model = process.env.GPN_IMG_MODEL || 'doubao-seedream-5-0-260128'

async function main() {
  const resp = await fetch('https://api.gpunexus.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model, prompt, size, response_format: 'b64_json' })
  })
  const text = await resp.text()
  let data
  try { data = JSON.parse(text) } catch (e) {
    console.error('HTTP', resp.status, text.slice(0, 500)); process.exit(1)
  }
  if (!resp.ok) { console.error('HTTP', resp.status, JSON.stringify(data).slice(0, 500)); process.exit(1) }
  const item = data.data && data.data[0]
  if (!item) { console.error('no data:', JSON.stringify(data).slice(0, 500)); process.exit(1) }
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true })
  if (item.b64_json) {
    fs.writeFileSync(out, Buffer.from(item.b64_json, 'base64'))
  } else if (item.url) {
    const img = await fetch(item.url)
    fs.writeFileSync(out, Buffer.from(await img.arrayBuffer()))
  } else {
    console.error('unknown item:', JSON.stringify(item).slice(0, 300)); process.exit(1)
  }
  console.log('SAVED', out, fs.statSync(out).size, 'bytes')
}
main().catch((e) => { console.error('ERR', e.message); process.exit(1) })
