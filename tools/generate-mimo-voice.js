'use strict'

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const ROOT = path.resolve(__dirname, '..')
const CONFIG_PATH = path.join(__dirname, 'voice-prompts', 'v3-mimo-voices.json')
const STORY_PATH = path.join(ROOT, 'plate21', 'module', 'content', 'story.js')
const LETTER_PATH = path.join(ROOT, 'plate21', 'module', 'flow', 'letter-paragraphs.js')

function parseArgs(argv) {
  const args = { batch: '', node: [], voice: 'A', out: '', force: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--batch') args.batch = String(argv[++i] || '')
    else if (arg === '--node') args.node.push(String(argv[++i] || ''))
    else if (arg === '--voice') args.voice = String(argv[++i] || 'A')
    else if (arg === '--out') args.out = String(argv[++i] || '')
    else if (arg === '--force') args.force = true
    else throw new Error(`未知参数：${arg}`)
  }
  return args
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function ensureApiKey() {
  const apiKey = process.env.MIMO_API_KEY
  if (!apiKey) throw new Error('缺少 MIMO_API_KEY 环境变量')
  return apiKey
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function loadConfig() {
  return loadJson(CONFIG_PATH)
}

function storyNode(nodeId) {
  const story = require(STORY_PATH)
  const node = story.nodes.find(item => item.id === nodeId)
  if (!node) throw new Error(`未找到剧情节点：${nodeId}`)
  return node
}

function extractText(nodeId) {
  const node = storyNode(nodeId)
  const lines = node.lines || []
  if (!lines.length) throw new Error(`节点 ${nodeId} 没有可朗读正文`)
  if (node.dialogueGroups) {
    const letterParagraphs = require(LETTER_PATH)
    return letterParagraphs.build(node, lines).join('\n')
  }
  return lines.join('\n')
}

function extractSampleText(config) {
  const node = storyNode(config.voiceSample.nodeId)
  const line = node.lines[config.voiceSample.lineIndex]
  if (!line) throw new Error('声音样音指定行不存在')
  return line
}

function voiceScheme(config, id) {
  const scheme = config.voiceSchemes[id]
  if (!scheme) throw new Error(`未定义音色方案：${id}`)
  return scheme
}

function performanceFor(config, nodeId) {
  const performance = config.performance[nodeId]
  if (!performance) throw new Error(`未定义逐页演出提示词：${nodeId}`)
  return performance
}

function outputFile(outDir, stem, ext) {
  return path.join(outDir, `${stem}.${ext}`)
}

function splitText(text, maxChars) {
  const units = []
  let current = ''
  Array.from(text).forEach(char => {
    current += char
    if (char === '\n' || '。！？；'.includes(char)) {
      units.push(current)
      current = ''
    }
  })
  if (current) units.push(current)

  const chunks = []
  let chunk = ''
  units.forEach(unit => {
    const combined = chunk + unit
    if (chunk && Array.from(combined).length > maxChars) {
      chunks.push(chunk)
      chunk = unit
    } else {
      chunk = combined
    }
  })
  if (chunk) chunks.push(chunk)
  return chunks
}

function writeAudioFromBase64(base64, wavPath) {
  const buffer = Buffer.from(base64, 'base64')
  if (!buffer.length) throw new Error('模型返回的音频为空')
  fs.writeFileSync(wavPath, buffer)
  return buffer
}

function convertToMp3(wavPath, mp3Path, config) {
  execFileSync('ffmpeg', [
    '-y',
    '-i', wavPath,
    '-codec:a', 'libmp3lame',
    '-b:a', config.audio.mp3Bitrate,
    '-ar', String(config.audio.sampleRate),
    '-ac', String(config.audio.channels),
    mp3Path,
  ], { stdio: 'pipe' })
}

async function requestAudio({ apiKey, config, voicePrompt, text }) {
  const body = {
    model: config.model,
    messages: [
      { role: 'user', content: voicePrompt },
      { role: 'assistant', content: text },
    ],
    audio: {
      format: config.audio.requestFormat,
      optimize_text_preview: config.textPolicy.optimizeTextPreview,
    },
    stream: false,
  }

  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(`MiMo API ${response.status}: ${JSON.stringify(payload)}`)
      }
      const audio = payload.choices?.[0]?.message?.audio
      if (!audio?.data) throw new Error('模型响应中没有音频数据')
      return { payload, audio }
    } catch (error) {
      lastError = error
      if (attempt === 3) break
      await new Promise(resolve => setTimeout(resolve, 500 * attempt))
    }
  }
  throw lastError
}

async function generateClip({ config, apiKey, outDir, stem, text, voicePrompt }) {
  const wavPath = outputFile(outDir, stem, 'wav')
  const mp3Path = outputFile(outDir, stem, 'mp3')

  const { payload, audio } = await requestAudio({ apiKey, config, voicePrompt, text })
  const wavBuffer = writeAudioFromBase64(audio.data, wavPath)
  convertToMp3(wavPath, mp3Path, config)
  const mp3Buffer = fs.readFileSync(mp3Path)

  return {
    text,
    textSha256: sha256(text),
    requestId: payload.id,
    audioId: audio.id,
    usage: payload.usage,
    wav: {
      path: path.relative(ROOT, wavPath).replaceAll('\\', '/'),
      bytes: wavBuffer.length,
      sha256: sha256(wavBuffer),
    },
    mp3: {
      path: path.relative(ROOT, mp3Path).replaceAll('\\', '/'),
      bytes: mp3Buffer.length,
      sha256: sha256(mp3Buffer),
      bitrate: config.audio.mp3Bitrate,
      sampleRate: config.audio.sampleRate,
      channels: config.audio.channels,
    },
  }
}

async function generateCase({ config, apiKey, outDir, stem, nodeId, text, voicePrompt, voiceId, performanceId }) {
  const metadataPath = outputFile(outDir, stem, 'json')
  const chunks = splitText(text, config.audio.maxChunkChars)
  const clips = []
  for (let index = 0; index < chunks.length; index += 1) {
    const clipStem = chunks.length > 1
      ? `${stem}-${String(index + 1).padStart(2, '0')}`
      : stem
    clips.push(await generateClip({
      config,
      apiKey,
      outDir,
      stem: clipStem,
      text: chunks[index],
      voicePrompt,
    }))
  }

  const metadata = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    provider: 'xiaomi-token-plan-cn',
    model: config.model,
    endpoint: config.endpoint,
    nodeId,
    voiceId,
    performanceId: performanceId || null,
    voicePrompt,
    text,
    textSha256: sha256(text),
    textPolicy: config.textPolicy,
    maxChunkChars: config.audio.maxChunkChars,
    chunkCount: chunks.length,
    clips,
  }
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8')
  return metadata
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const config = loadConfig()
  const apiKey = ensureApiKey()
  const outDir = path.resolve(ROOT, args.out || path.join('docs', 'compliance', 'sources-audio', 'mimo-v3'))
  const casesDir = path.join(outDir, 'cases')
  fs.mkdirSync(casesDir, { recursive: true })

  const jobs = []
  if (args.batch === 'voices') {
    const text = extractSampleText(config)
    for (const voiceId of Object.keys(config.voiceSchemes)) {
      jobs.push({
        stem: `voice-scheme-${voiceId}`,
        nodeId: config.voiceSample.nodeId,
        text,
        voicePrompt: voiceScheme(config, voiceId).voicePrompt,
        voiceId,
        performanceId: null,
        outDir: casesDir,
      })
    }
  } else if (args.batch === 'performance') {
    const scheme = voiceScheme(config, args.voice)
    for (const nodeId of config.sampleBatch) {
      const performance = performanceFor(config, nodeId)
      jobs.push({
        stem: `perf-${args.voice}-${nodeId}`,
        nodeId,
        text: extractText(nodeId),
        voicePrompt: `${scheme.voicePrompt}\n逐页演出提示：${performance.prompt}`,
        voiceId: args.voice,
        performanceId: nodeId,
        outDir: casesDir,
      })
    }
  } else if (args.batch === 'all') {
    const scheme = voiceScheme(config, args.voice)
    for (const nodeId of Object.keys(config.performance)) {
      const performance = performanceFor(config, nodeId)
      jobs.push({
        stem: `narr-${nodeId.toLowerCase()}`,
        nodeId,
        text: extractText(nodeId),
        voicePrompt: `${scheme.voicePrompt}\n逐页演出提示：${performance.prompt}`,
        voiceId: args.voice,
        performanceId: nodeId,
        outDir,
      })
    }
  } else if (args.node.length) {
    const scheme = voiceScheme(config, args.voice)
    for (const nodeId of args.node) {
      const performance = performanceFor(config, nodeId)
      jobs.push({
        stem: `narr-${nodeId.toLowerCase()}`,
        nodeId,
        text: extractText(nodeId),
        voicePrompt: `${scheme.voicePrompt}\n逐页演出提示：${performance.prompt}`,
        voiceId: args.voice,
        performanceId: nodeId,
        outDir,
      })
    }
  } else {
    throw new Error('请指定 --batch voices、--batch performance、--batch all 或 --node <节点ID>')
  }

  const results = []
  for (const job of jobs) {
    const metadataPath = outputFile(job.outDir, job.stem, 'json')
    if (!args.force && fs.existsSync(metadataPath)) {
      results.push(loadJson(metadataPath))
      continue
    }
    process.stderr.write(`生成 ${job.nodeId} → ${path.relative(ROOT, metadataPath)}\n`)
    results.push(await generateCase({ config, apiKey, ...job }))
  }

  const manifestName = args.batch === 'voices'
    ? 'manifest-voices.json'
    : args.batch === 'performance'
      ? 'manifest-performance.json'
      : 'manifest.json'
  const manifestPath = path.join(args.batch === 'all' || args.node.length ? outDir : casesDir, manifestName)
  fs.writeFileSync(manifestPath, `${JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    model: config.model,
    voiceId: args.voice,
    batch: args.batch || 'node',
    count: results.length,
    items: results.map(item => ({
      nodeId: item.nodeId,
      voiceId: item.voiceId,
      performanceId: item.performanceId,
      textSha256: item.textSha256,
      chunkCount: item.chunkCount,
      clips: item.clips.map(clip => clip.mp3),
    })),
  }, null, 2)}\n`, 'utf8')

  process.stdout.write(`${JSON.stringify({ manifestPath, count: results.length }, null, 2)}\n`)
}

main().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`)
  process.exitCode = 1
})
