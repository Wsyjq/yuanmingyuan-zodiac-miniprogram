const assert = require('node:assert/strict')
const test = require('node:test')

const { renderPage } = require('./harness/runtime')

const HISTORY_CASES = [
  {
    name: 's2-reveal',
    route: 'plate21/module/pages/s2-reveal/s2-reveal',
    async drive(instance) {
      instance.onFlip()
    }
  },
  {
    name: 's2-blend',
    route: 'plate21/module/pages/s2-blend/s2-blend',
    async drive(instance) {
      const points = instance.data.points.map((point) => Object.assign({}, point, { photoPath: point.guide }))
      instance.setData({ points, photoCount: points.length })
      await instance.onComplete()
      instance.onAcceptRecord()
    }
  },
  {
    name: 's2-pattern',
    route: 'plate21/module/pages/s2-pattern/s2-pattern',
    drive(instance) {
      instance.setData({ picked: 'wanzi' })
      instance.onConfirm()
    }
  },
  {
    name: 's3-zodiac',
    route: 'plate21/module/pages/s3-zodiac/s3-zodiac',
    drive(instance) {
      instance.onInput({ detail: { value: '牛、虎、猴、猪、鼠、兔、马' } })
      instance.onConfirm()
    }
  }
]

for (const spec of HISTORY_CASES) {
  test(`${spec.name} renders its history card after solving`, async () => {
    const result = await renderPage({
      route: spec.route,
      settleMs: 10,
      drive: async (instance) => spec.drive(instance)
    })

    assert.deepEqual(result.errors, [])
    assert.equal(result.data.showHistory, true)
    assert.match(result.html, /history-card-mask/)
  })
}

test('s2-blend blocks card generation until all four photos exist', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/s2-blend/s2-blend',
    settleMs: 10,
    drive: async (instance) => instance.onComplete()
  })

  assert.deepEqual(result.errors, [])
  assert.equal(result.data.photoCount, 0)
  assert.equal(result.data.done, false)
  assert.equal(result.data.showRecordCard, false)
})

test('s2-blend captures four photos and renders one field record card', async () => {
  const storage = {}
  const result = await renderPage({
    route: 'plate21/module/pages/s2-blend/s2-blend',
    settleMs: 10,
    wxOverrides: {
      getStorageSync(key) {
        return storage[key] ? JSON.parse(JSON.stringify(storage[key])) : ''
      },
      setStorageSync(key, value) {
        storage[key] = JSON.parse(JSON.stringify(value))
      },
      removeStorageSync(key) {
        delete storage[key]
      }
    },
    drive: async (instance) => {
      for (const point of instance.data.points) {
        await instance.onCapture({ currentTarget: { dataset: { key: point.key } } })
      }
      await instance.onComplete()
    }
  })

  assert.deepEqual(result.errors, [])
  assert.equal(result.data.photoCount, 4)
  assert.equal(result.data.done, true)
  assert.equal(result.data.showRecordCard, true)
  assert.match(result.html, /record-mask/)
  assert.match(result.html, /西学东渐后的皇家审美转译/)
  const flags = storage.plate21_session.snapshot.flags
  assert.equal(Object.keys(flags.s2PhotoDraft.photos).length, 4)
  assert.equal(Object.keys(flags.s2PhotoDraft.capturedAt).length, 4)
  assert.equal(Object.keys(flags.s2PhotoRecord.photos).length, 4)
  assert.equal(Object.keys(flags.s2PhotoRecord.capturedAt).length, 4)
  assert.equal(typeof flags.s2PhotoRecord.completedAt, 'number')
})

test('s2-blend restores a partial photo draft from the session snapshot', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/s2-blend/s2-blend',
    settleMs: 10,
    drive: async (instance) => {
      instance.restoreFromSnapshot({
        flags: {
          s2PhotoDraft: {
            photos: { dome: '/saved/dome.jpg', beast: '/saved/beast.jpg' },
            capturedAt: { dome: 1786212000000, beast: 1786212060000 },
            dateLabel: '2026.08.09'
          }
        }
      })
    }
  })

  assert.deepEqual(result.errors, [])
  assert.equal(result.data.photoCount, 2)
  assert.equal(result.data.dateLabel, '2026.08.09')
  assert.equal(result.data.points[0].photoPath, '/saved/dome.jpg')
  assert.equal(result.data.points[0].capturedAt, 1786212000000)
  assert.equal(result.data.points[2].photoPath, '')
})

test('s2-blend can import from the album and preview the saved photo', async () => {
  let selectedSources = []
  let preview = null
  const result = await renderPage({
    route: 'plate21/module/pages/s2-blend/s2-blend',
    settleMs: 10,
    wxOverrides: {
      chooseMedia(options) {
        selectedSources = options.sourceType
        options.success({ tempFiles: [{ tempFilePath: '/tmp/album-photo.jpg', size: 1024 }] })
      },
      previewImage(options) {
        preview = options
      }
    },
    drive: async (instance) => {
      const event = { currentTarget: { dataset: { key: 'dome' } } }
      await instance.onChooseAlbum(event)
      instance.onPreview(event)
    }
  })

  assert.deepEqual(result.errors, [])
  assert.equal(selectedSources.join(','), 'album')
  assert.equal(preview.current, '/saved/album-photo.jpg')
  assert.equal(preview.urls.length, 1)
})

test('s2-blend restores a retake made after the previous record card', async () => {
  const storage = {}
  let captureNo = 0
  const wxOverrides = {
    getStorageSync(key) {
      return storage[key] ? JSON.parse(JSON.stringify(storage[key])) : ''
    },
    setStorageSync(key, value) {
      storage[key] = JSON.parse(JSON.stringify(value))
    },
    removeStorageSync(key) {
      delete storage[key]
    },
    chooseMedia(options) {
      captureNo += 1
      options.success({ tempFiles: [{ tempFilePath: `/tmp/photo-${captureNo}.jpg`, size: 1024 }] })
    }
  }

  await renderPage({
    route: 'plate21/module/pages/s2-blend/s2-blend',
    settleMs: 10,
    wxOverrides,
    drive: async (instance) => {
      for (const point of instance.data.points) {
        await instance.onCapture({ currentTarget: { dataset: { key: point.key } } })
      }
      await instance.onComplete()
      instance.onCloseRecord()
      await instance.onCapture({ currentTarget: { dataset: { key: 'dome' } } })
    }
  })

  const result = await renderPage({
    route: 'plate21/module/pages/s2-blend/s2-blend',
    settleMs: 10,
    wxOverrides
  })

  assert.deepEqual(result.errors, [])
  assert.equal(result.data.points[0].photoPath, '/saved/photo-5.jpg')
  assert.equal(result.data.photoCount, 4)
  assert.equal(result.data.done, false)
})

test('s2-blend exposes a settings recovery path after camera permission denial', async () => {
  let attempts = 0
  let openedSettings = false
  let denialMessage = ''
  const result = await renderPage({
    route: 'plate21/module/pages/s2-blend/s2-blend',
    settleMs: 10,
    wxOverrides: {
      chooseMedia(options) {
        attempts += 1
        if (attempts === 1) {
          options.fail({ errMsg: 'chooseMedia:fail auth deny' })
          return
        }
        options.success({ tempFiles: [{ tempFilePath: '/tmp/recovered-photo.jpg', size: 1024 }] })
      },
      openSetting() {
        openedSettings = true
      }
    },
    drive: async (instance) => {
      await instance.onCapture({ currentTarget: { dataset: { key: 'dome' } } })
      denialMessage = instance.data.captureError
      instance.onOpenSettings()
      await instance.onCapture({ currentTarget: { dataset: { key: 'dome' } } })
    }
  })

  assert.deepEqual(result.errors, [])
  assert.match(denialMessage, /打开设置/)
  assert.equal(openedSettings, true)
  assert.equal(result.data.captureError, '')
  assert.equal(result.data.photoCount, 1)
})

test('s2-blend keeps a usable temporary photo when local persistence fails', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/s2-blend/s2-blend',
    settleMs: 10,
    wxOverrides: {
      saveFile(options) {
        options.fail({ errMsg: 'saveFile:fail quota exceeded' })
      }
    },
    drive: async (instance) => {
      await instance.onCapture({ currentTarget: { dataset: { key: 'dome' } } })
    }
  })

  assert.deepEqual(result.errors, [])
  assert.equal(result.data.photoCount, 1)
  assert.equal(result.data.points[0].photoPath, '/tmp/plate21-photo.jpg')
  assert.match(result.data.persistenceWarning, /本地持久化失败/)
})

test('password uses the locked archive date and explains its provenance', async () => {
  const answer = '20260808'
  const cardIds = [
    's2-purpose',
    's2-name',
    's2-blend',
    's2-pattern',
    's3-hour',
    's3-zodiac',
    's3-water',
    's4-timeline'
  ]
  const cards = {}
  cardIds.forEach((cardId, position) => {
    cards[cardId] = { cardId, position, digit: answer.charAt(position), collectedAt: 1 }
  })
  const storage = {
    plate21_session: {
      snapshot: {
        schemaVersion: 2,
        sessionId: 'locked-date-session',
        revision: 8,
        sessionDate: answer,
        checkpoint: 's4-password',
        stations: { s1: true, s2: true, s3: true, s4: false },
        puzzles: {},
        cards,
        records: [],
        flags: {},
        finale: false,
        createdAt: 1,
        updatedAt: 1
      },
      ops: {}
    }
  }

  const result = await renderPage({
    route: 'plate21/module/pages/s4-password/s4-password',
    settleMs: 10,
    wxOverrides: storageOverrides(storage),
    drive: async (instance, sleep) => {
      instance.onShowHint()
      instance.setData({ pwd: answer })
      instance.onSubmit()
      await sleep(10)
    }
  })

  assert.deepEqual(result.errors, [])
  assert.equal(result.data.correct, true)
  assert.equal(result.data.archiveDate, '2026 年 8 月 8 日')
  assert.deepEqual(Array.from(result.data.collectedNums), answer.split(''))
  assert.match(result.data.hint, /考察凭证/)
  assert.match(result.data.hint, /建档日/)
  assert.match(result.html, /档案锁打开/)
})

test('host page describes the V2.1 five-stop mainline', async () => {
  const result = await renderPage({ route: 'pages/index/index', settleMs: 10 })
  assert.match(result.html, /从西往东五处/)
  assert.doesNotMatch(result.html, /四站考察|五站考察|等待完成的铜版画|主线|支线/)
})

test('hugo page reads the letter plot and advances to the finale (rev5614)', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/s4-timeline/s4-timeline',
    settleMs: 10,
    drive: async (instance) => instance.onNext()
  })
  // rev5614：雨果页为纯叙事，继续即往结局
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.advancing, true)
})

test('finale uses the v3 ending narrative from the plot', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/finale/finale',
    settleMs: 10
  })
  const text = result.data.novel.map((item) => item.text).join('')
  // 飞书 v3 rev5614 §结局原文
  assert.match(text, /第二十一幅画到底在哪呢/)
  assert.match(text, /等待被后来者完成的“新画”/)
  assert.match(text, /第21幅的第N个版本/)
  assert.doesNotMatch(text, /此处待绘/)
  assert.doesNotMatch(text, /养雀笼/)
})

test('finale skip completes the CSS reveal without a per-frame veil object', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/finale/finale',
    settleMs: 10,
    drive(instance) {
      instance.setData({ act: 3, layerCount: 0, caption: '' })
      instance.onTapScreen()
      assert.equal(instance.data.layerCount, 5)
      instance.onTapScreen()
    }
  })

  assert.deepEqual(result.errors, [])
  assert.equal(result.data.act, 4)
  assert.equal(Object.prototype.hasOwnProperty.call(result.data, 'veils'), false)
})

test('prologue hands over the archive bag from the v3 plot', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/prologue/prologue',
    settleMs: 10,
    drive: async (instance) => instance.onNovelFinish()
  })
  // 飞书 v3：序章收尾为档案袋交接清点（旧日记「寻廿一图」已入叙事）
  assert.equal(result.data.showHandover, true)
  assert.match(result.html, /档案袋/)
  assert.match(result.html, /里面有一封信、一张手绘路线图、几张空白记录页，以及几件用于现场记录的工具/)
  assert.doesNotMatch(result.html, /IMG-ENVELOPE|envelope-img/)
})

test('first station reads the map and picks the right quarter of Changchunyuan', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/s1-decode/s1-decode',
    settleMs: 10,
    drive: async (instance, sleep) => {
      instance.onSelect({ currentTarget: { dataset: { key: 'A' } } })
      instance.onConfirm()
      instance.onSelect({ currentTarget: { dataset: { key: 'D' } } })
      instance.onConfirm()
      await sleep(10)
    }
  })
  // 飞书 v3 §西洋楼入口：西洋楼在长春园东北部（答案 d）
  assert.equal(result.data.solved, true)
  assert.match(result.html, /东北/)
  assert.match(result.html, /前往谐奇趣/)
})

test('zodiac page guides the physical wheel instead of rendering a virtual selector', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/s3-zodiac/s3-zodiac',
    settleMs: 10
  })
  assert.match(result.html, /实体转盘/)
  assert.doesNotMatch(result.html, /zodiac-grid|zcell/)
})

test('water page confirms the physical reveal paper without a canvas simulation', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/s3-water/s3-water',
    settleMs: 10,
    drive: async (instance, sleep) => {
      instance.onInput({ detail: { value: '马首' } })
      instance.onSubmit()
      await sleep(10)
    }
  })
  assert.equal(result.data.showHistory, true)
  assert.match(result.html, /实体水显纸/)
  assert.doesNotMatch(result.html, /<canvas|paper-wrap|progress-bar/)
})

function fieldPhotoStorage() {
  const timestamp = new Date(2026, 7, 8, 12, 0, 0).getTime()
  return {
    plate21_session: {
      snapshot: {
        schemaVersion: 2,
        sessionId: 'field-photo-session',
        revision: 10,
        sessionDate: '20260808',
        checkpoint: 'report',
        stations: { s1: true, s2: true, s3: true, s4: true },
        puzzles: {},
        cards: {},
        records: [],
        flags: {
          s2PhotoRecord: {
            photos: {
              dome: '/saved/player-dome.jpg',
              beast: '/saved/player-beast.jpg',
              lotus: '/saved/player-lotus.jpg',
              swan: '/saved/player-swan.jpg'
            },
            completedAt: timestamp
          }
        },
        finale: true,
        name: '考察者甲',
        editionNo: 21,
        createdAt: timestamp,
        updatedAt: timestamp
      },
      ops: {}
    }
  }
}

function storageOverrides(storage, extra) {
  return Object.assign({
    getStorageSync(key) {
      return storage[key] ? JSON.parse(JSON.stringify(storage[key])) : ''
    },
    setStorageSync(key, value) {
      storage[key] = JSON.parse(JSON.stringify(value))
    },
    removeStorageSync(key) {
      delete storage[key]
    }
  }, extra || {})
}

test('report renders and previews the four player photos without reference-image substitution', async () => {
  const storage = fieldPhotoStorage()
  let preview = null
  const result = await renderPage({
    route: 'plate21/module/pages/report/report',
    settleMs: 20,
    wxOverrides: storageOverrides(storage, {
      previewImage(options) { preview = options }
    }),
    drive(instance) {
      instance.onPreviewPhoto({ currentTarget: { dataset: { key: 'lotus' } } })
    }
  })

  assert.deepEqual(result.errors, [])
  assert.equal(result.data.photoCount, 4)
  assert.match(result.html, /player-dome\.jpg/)
  assert.match(result.html, /player-swan\.jpg/)
  assert.doesNotMatch(result.html, /IMG-S2C[1-4]|IMG-R02/)
  assert.equal(preview.current, '/saved/player-lotus.jpg')
  assert.equal(preview.urls.length, 4)
})

test('handbook contains the four-photo field card and previews player photos', async () => {
  const storage = fieldPhotoStorage()
  let preview = null
  const result = await renderPage({
    route: 'plate21/module/pages/handbook/handbook',
    settleMs: 20,
    wxOverrides: storageOverrides(storage, {
      previewImage(options) { preview = options }
    }),
    drive(instance) {
      instance.onPreviewPhoto({ currentTarget: { dataset: { key: 'beast' } } })
    }
  })

  assert.deepEqual(result.errors, [])
  assert.equal(result.data.photoCount, 4)
  assert.match(result.html, /第贰折 · 亭下考察卡/)
  assert.match(result.html, /player-beast\.jpg/)
  assert.equal(preview.current, '/saved/player-beast.jpg')
  assert.equal(preview.urls.length, 4)
})

test('cover resumes the exact saved puzzle checkpoint', async () => {
  const storage = fieldPhotoStorage()
  const snap = storage.plate21_session.snapshot
  snap.checkpoint = 's3-zodiac'
  snap.finale = false
  snap.stations.s3 = false
  snap.stations.s4 = false
  snap.puzzles = { 's3-hour': { completedAt: snap.updatedAt, payload: {} } }
  let target = ''
  const result = await renderPage({
    route: 'plate21/module/pages/cover/cover',
    settleMs: 20,
    wxOverrides: storageOverrides(storage, {
      navigateTo(options) { target = options.url }
    }),
    drive(instance) { instance.onContinue() }
  })

  assert.deepEqual(result.errors, [])
  assert.equal(result.data.hasRecord, true)
  assert.equal(target, '/plate21/module/pages/s3-zodiac/s3-zodiac')
})

test('cover restart confirmation clears field photos and starts a fresh prologue', async () => {
  const storage = fieldPhotoStorage()
  const oldSessionId = storage.plate21_session.snapshot.sessionId
  const removed = []
  let target = ''
  const result = await renderPage({
    route: 'plate21/module/pages/cover/cover',
    settleMs: 20,
    wxOverrides: storageOverrides(storage, {
      removeSavedFile(options) {
        removed.push(options.filePath)
        options.success()
      },
      navigateTo(options) { target = options.url }
    }),
    async drive(instance) {
      instance.onRestart()
      assert.equal(instance.data.showRestartConfirm, true)
      await instance.onConfirmRestart()
    }
  })

  assert.deepEqual(result.errors, [])
  assert.equal(target, '/plate21/module/pages/prologue/prologue')
  assert.equal(removed.length, 4)
  assert.notEqual(storage.plate21_session.snapshot.sessionId, oldSessionId)
  assert.equal(storage.plate21_session.snapshot.checkpoint, 'prologue')
})

test('pattern conclusion follows the v3 reveal text, with no invented water meaning', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/s2-pattern/s2-pattern',
    settleMs: 10,
    drive(instance) {
      instance.setData({ picked: 'wanzi' })
      instance.onConfirm()
      instance.onCloseHistory()
    }
  })

  // 飞书 v3 rev4379 §黄花阵：万字纹寓意＋今墙重建（SL-08）＋前往方外观
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.showFinale, true)
  assert.match(result.html, /卐字不到头/)
  assert.match(result.html, /万寿无疆/)
  assert.match(result.html, /原墙/)
  assert.match(result.html, /我按照地图继续走，下一站是方外观/)
  assert.doesNotMatch(result.html, /砌墙师傅|照原图，复位|照片背面/)
  assert.doesNotMatch(result.html, /万字纹[^<]{0,30}(寓意|暗示).{0,10}水/)
  // V2.2 红线：不触摸文物（页内不得再出现贴墙/摸墙类指引）
  assert.doesNotMatch(result.html, /贴墙|贴到墙上|摸一摸|摸完墙/)
})

test('zodiac conclusion hands off toward 蓄水楼 (v3 rev5614)', async () => {
  const zodiac = await renderPage({
    route: 'plate21/module/pages/s3-zodiac/s3-zodiac',
    settleMs: 10,
    drive(instance) {
      instance.setData({ solved: true })
      instance.onHistoryNext()
    }
  })

  assert.deepEqual(zodiac.errors, [])
  assert.match(zodiac.html, /收好转盘/)
  assert.match(zodiac.html, /前往蓄水楼/)
  // rev5614：水显纸页已出主线，转盘页不再交接水显纸
  assert.doesNotMatch(zodiac.html, /取出水显纸/)
})

test('report with missing player photos offers repair and never inserts guide images', async () => {
  const storage = fieldPhotoStorage()
  delete storage.plate21_session.snapshot.flags.s2PhotoRecord.photos.lotus
  delete storage.plate21_session.snapshot.flags.s2PhotoRecord.photos.swan
  const result = await renderPage({
    route: 'plate21/module/pages/report/report',
    settleMs: 20,
    wxOverrides: storageOverrides(storage)
  })

  assert.deepEqual(result.errors, [])
  assert.equal(result.data.photoCount, 2)
  assert.match(result.html, /返回现场照片页补录/)
  assert.doesNotMatch(result.html, /IMG-S2C[1-4]/)
})

test('repairing an old photo record without a draft preserves its existing photos', async () => {
  const storage = fieldPhotoStorage()
  const photos = storage.plate21_session.snapshot.flags.s2PhotoRecord.photos
  delete photos.lotus
  delete photos.swan
  const wxOverrides = storageOverrides(storage)

  await renderPage({
    route: 'plate21/module/pages/s2-blend/s2-blend',
    settleMs: 20,
    wxOverrides,
    drive(instance) {
      return instance.onCapture({ currentTarget: { dataset: { key: 'lotus' } } })
    }
  })
  const restored = await renderPage({
    route: 'plate21/module/pages/s2-blend/s2-blend',
    settleMs: 20,
    wxOverrides
  })

  assert.deepEqual(restored.errors, [])
  assert.equal(restored.data.photoCount, 3)
  assert.equal(restored.data.points[0].photoPath, '/saved/player-dome.jpg')
  assert.equal(restored.data.points[1].photoPath, '/saved/player-beast.jpg')
  assert.equal(restored.data.points[2].photoPath, '/saved/plate21-photo.jpg')
})

// rev5614：时间线拖拽谜题已从正文删除（雨果雕像改为纯叙事页），原两个 timeline 交互测试随之移除

test('report distinguishes album permission denial and exposes settings recovery', async () => {
  let opened = false
  const result = await renderPage({
    route: 'plate21/module/pages/report/report',
    settleMs: 10,
    wxOverrides: {
      openSetting() { opened = true }
    },
    drive(instance) {
      instance.setSaveFailure('album', { errMsg: 'saveImageToPhotosAlbum:fail auth deny' })
      instance.onOpenAlbumSettings()
    }
  })

  assert.deepEqual(result.errors, [])
  assert.equal(result.data.canOpenAlbumSettings, true)
  assert.match(result.html, /打开权限设置/)
  assert.equal(opened, true)
})

// ===== V2.2 讲述版：人物对话层（旁白＋人声＋屏＋纸） =====

test('waypoint xieqiqu presents the v3 soundscape quiz from the plot', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/waypoint/waypoint',
    query: { site: 'xieqiqu' },
    settleMs: 10
  })
  assert.deepEqual(result.errors, [])
  assert.match(result.html, /皇家园林史上首座西洋建筑/)
  assert.match(result.html, /喷泉声、少数民族音乐和西洋音乐/)
  assert.match(result.html, /喷泉声/)
  assert.match(result.html, /少数民族音乐/)
  assert.doesNotMatch(result.html, /小拉琴/)
  assert.doesNotMatch(result.html, /东厅乐师/)
})

test('waypoint xushuilou presents the v3 height question from the plot', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/waypoint/waypoint',
    query: { site: 'xushuilou' },
    settleMs: 10
  })
  assert.deepEqual(result.errors, [])
  assert.match(result.html, /原来喷泉的水，靠的就是这座[\s\S]*?蓄水楼/)
  assert.match(result.html, /通常会建得比较/)
  assert.doesNotMatch(result.html, /亲历当差/)
})

test('waypoint guanshuifa marks the Qianlong dialogue as artistic interpretation', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/waypoint/waypoint',
    query: { site: 'guanshuifa' },
    settleMs: 10
  })
  assert.deepEqual(result.errors, [])
  assert.match(result.html, /乾隆/)
  assert.match(result.html, /台词为艺术演绎/)
  assert.match(result.html, /中国之大，何奇不有/)
})

test('s2-quiz followup uses the v3 lantern plot, not palace-maid dialogue', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/s2-quiz/s2-quiz',
    settleMs: 10,
    drive(instance) {
      instance.onSelect({ currentTarget: { dataset: { key: 'C' } } })
      instance.onConfirm()
      instance.onCloseHistory()
    }
  })
  assert.deepEqual(result.errors, [])
  assert.match(result.html, /游乐场/)
  assert.match(result.html, /黄花/)
  assert.doesNotMatch(result.html, /跑起来跑起来/)
})

test('s3-comic asks the 14h and noon zodiac questions from the plot (rev5614)', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/s3-comic/s3-comic',
    settleMs: 10,
    drive(instance) {
      instance.setData({ q1: '羊', q2: '马' })
      instance.onConfirm()
      instance.onCloseHistory()
    }
  })
  assert.deepEqual(result.errors, [])
  assert.match(result.html, /14时对应由哪个兽首喷水/)
  assert.match(result.html, /正午时候由哪个兽首喷水/)
  assert.match(result.html, /十二道水流同时喷出/)
  assert.match(result.html, /有七尊归来了，但还有五尊不知所踪/)
})

test('s4-timeline is the narrative-only Hugo page (v3 rev5614)', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/s4-timeline/s4-timeline',
    settleMs: 10
  })
  assert.deepEqual(result.errors, [])
  assert.match(result.html, /致巴特勒上尉的信/)
  assert.match(result.html, /断壁残垣/)
  // 首句经 gloss-text 渲染（「雨果」挂 SL-17 史料卡），按数据断言
  assert.match(result.data.hugoParts.map(p => p.t).join(''), /同样愤怒的还有面前的这位法国作家——雨果。/)
  // rev5614：守档人对话层与时间线谜题已删
  assert.doesNotMatch(result.html, /守档人/)
  assert.doesNotMatch(result.html, /时间轴排序/)
  // V2.2 红线：不再替游客编感受（旧稿「愣了一下」句已删）
  assert.doesNotMatch(result.html, /愣了/)
})

// V2.2 支线可跳过（用户口径）：散页随时进出、无判定门；大水法静默可提前结束、三选一可跳
test('v3 mainline scored sites keep a back button and original plot copy', async () => {
  const wp = await renderPage({
    route: 'plate21/module/pages/waypoint/waypoint',
    query: { site: 'xieqiqu' },
    settleMs: 10
  })
  assert.deepEqual(wp.errors, [])
  assert.match(wp.html, /nav-back/)
  assert.match(wp.html, /喷泉声、少数民族音乐和西洋音乐/)
  assert.doesNotMatch(wp.html, /谜题/)

  const xs = await renderPage({
    route: 'plate21/module/pages/waypoint/waypoint',
    query: { site: 'xushuilou' },
    settleMs: 10
  })
  assert.deepEqual(xs.errors, [])
  assert.match(xs.html, /原来喷泉的水，靠的就是这座[\s\S]*?蓄水楼/)

  const tr = await renderPage({
    route: 'plate21/module/pages/transit/transit',
    query: { leg: 's1-xq' },
    settleMs: 10
  })
  assert.deepEqual(tr.errors, [])
  assert.match(tr.html, /继 续 前 往/)
  assert.match(tr.html, /谐奇趣/)
  assert.doesNotMatch(tr.html, /不翻也行/)

  const dsf = await renderPage({
    route: 'plate21/module/pages/dashuifa/dashuifa',
    settleMs: 10,
    drive(instance) {
      instance.setData({ placed: { deer: 'pool', dogs: 'ring', beasts: 'ends' } })
      instance.onHuntConfirm()
    }
  })
  assert.deepEqual(dsf.errors, [])
  assert.equal(dsf.data.stage, 'after')
  assert.match(dsf.html, /猎狗逐鹿/)
})
