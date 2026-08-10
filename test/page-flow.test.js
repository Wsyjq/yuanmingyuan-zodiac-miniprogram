const assert = require('node:assert/strict')
const test = require('node:test')

const { renderPage } = require('./harness/runtime')

const HISTORY_CASES = [
  {
    name: 's2-reveal',
    route: 'plate21/module/pages/s2-reveal/s2-reveal',
    drive(instance) {
      instance.onInput({ detail: { value: '莲花灯' } })
      instance.onSubmit()
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

test('password accepts the eight-digit session date', async () => {
  const now = new Date()
  const answer = String(now.getFullYear()) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0')

  const result = await renderPage({
    route: 'plate21/module/pages/s4-password/s4-password',
    settleMs: 10,
    drive: async (instance, sleep) => {
      instance.setData({ pwd: answer })
      instance.onSubmit()
      await sleep(10)
    }
  })

  assert.deepEqual(result.errors, [])
  assert.equal(result.data.correct, true)
})

test('host page describes the current four-station story', async () => {
  const result = await renderPage({ route: 'pages/index/index', settleMs: 10 })
  assert.match(result.html, /四站考察/)
  assert.doesNotMatch(result.html, /五站考察/)
})

test('timeline puzzle does not reveal the ordered answer card before solving', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/s4-timeline/s4-timeline',
    settleMs: 10,
    drive: async (instance) => instance.onNovelFinish()
  })
  assert.equal(result.data.phase, 'puzzle')
  assert.equal(result.data.showHistory, false)
  assert.doesNotMatch(result.html, /history-card-mask/)
})

test('finale uses the latest Feishu narrative', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/finale/finale',
    settleMs: 10
  })
  const text = result.data.novel.map((item) => item.text).join('')
  assert.match(text, /等待被后来者完成/)
  assert.match(text, /记录毁灭，也记录重生/)
  assert.doesNotMatch(text, /百分之二/)
})

test('prologue guides the physical envelope without rendering a virtual one', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/prologue/prologue',
    settleMs: 10,
    drive: async (instance) => instance.onNovelFinish()
  })
  assert.equal(result.data.showEnvelope, true)
  assert.match(result.html, /实体信封/)
  assert.doesNotMatch(result.html, /IMG-ENVELOPE|envelope-img/)
})

test('first station validates the answer found on the physical envelope', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/s1-decode/s1-decode',
    settleMs: 10,
    drive: async (instance, sleep) => {
      instance.onInput({ detail: { value: '黄花阵' } })
      instance.onSubmit()
      await sleep(10)
    }
  })
  assert.equal(result.data.solved, true)
  assert.match(result.html, /第一站的去处很明确了：黄花阵/)
  assert.doesNotMatch(result.html, /env-art|envelope-wrap/)
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
  assert.match(result.html, /第贰折 · 四图考察卡/)
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

test('pattern conclusion uses the hand-drawn route instead of inventing a water meaning', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/s2-pattern/s2-pattern',
    settleMs: 10,
    drive(instance) {
      instance.setData({ picked: 'wanzi' })
      instance.onConfirm()
      instance.onNext()
    }
  })

  assert.deepEqual(result.errors, [])
  assert.equal(result.data.showRoute, true)
  assert.match(result.html, /福寿绵长/)
  assert.match(result.html, /手绘路线图/)
  assert.doesNotMatch(result.html, /万字纹[^<]{0,30}(寓意|暗示).{0,10}水/)
})

test('zodiac and water conclusions render explicit physical-prop handoffs', async () => {
  const zodiac = await renderPage({
    route: 'plate21/module/pages/s3-zodiac/s3-zodiac',
    settleMs: 10,
    drive(instance) {
      instance.setData({ solved: true })
      instance.onHistoryNext()
    }
  })
  const water = await renderPage({
    route: 'plate21/module/pages/s3-water/s3-water',
    settleMs: 10,
    drive(instance) {
      instance.setData({ solved: true })
      instance.onHistoryNext()
    }
  })

  assert.deepEqual(zodiac.errors, [])
  assert.match(zodiac.html, /收好转盘，取出水显纸/)
  assert.match(water.html, /晾干水显纸，再收回资料袋/)
  assert.match(water.html, /雨果/)
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

test('timeline supports selecting a card and then tapping its year', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/s4-timeline/s4-timeline',
    settleMs: 10,
    drive(instance) {
      instance.onNovelFinish()
      instance.onCardSelect({ currentTarget: { dataset: { idx: 0 } } })
      instance.onSlotTap({ currentTarget: { dataset: { index: 4 } } })
    }
  })

  assert.deepEqual(result.errors, [])
  assert.equal(result.data.cards[0].placed, true)
  assert.equal(result.data.slots[4].filled, '雨果雕像落成')
  assert.match(result.data.pointTip, /归位正确/)
})

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
