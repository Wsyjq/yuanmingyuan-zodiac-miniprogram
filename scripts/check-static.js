const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const miniprogramDir = path.join(rootDir, 'miniprogram');
const prototypeRootName = 'dev-zodiac-ui-prototype';
const prototypeDir = path.join(miniprogramDir, prototypeRootName);

function walk(dir, predicate, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    const stat = fs.statSync(file);
    if (stat.isDirectory()) {
      if (name === 'node_modules') continue;
      walk(file, predicate, files);
    }
    else if (!predicate || predicate(file)) files.push(file);
  }
  return files;
}

function checkJsSyntax() {
  const files = walk(miniprogramDir, (file) => file.endsWith('.js'));
  for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status || 1);
  }
  console.log(`JS syntax check passed for ${files.length} files`);
}

function checkJsonParse() {
  const files = walk(rootDir, (file) => file.endsWith('.json'));
  for (const file of files) {
    JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  console.log(`JSON parse check passed for ${files.length} files`);
}

function checkPageFiles() {
  const appJson = JSON.parse(fs.readFileSync(path.join(miniprogramDir, 'app.json'), 'utf8'));
  const requiredExts = ['.js', '.wxml', '.json', '.wxss'];
  const missing = [];
  const mainPages = (appJson.pages || []).map((page) => ({ page, root: '' }));
  const subpackagePages = (appJson.subPackages || appJson.subpackages || []).flatMap((subpackage) => (
    (subpackage.pages || []).map((page) => ({ page, root: subpackage.root || '' }))
  ));
  const pages = mainPages.concat(subpackagePages);
  for (const entry of pages) {
    for (const ext of requiredExts) {
      const file = path.join(miniprogramDir, entry.root, `${entry.page}${ext}`);
      if (!fs.existsSync(file)) missing.push(path.relative(rootDir, file));
    }
  }
  if (missing.length) {
    console.error(`Missing page files:\n${missing.join('\n')}`);
    process.exit(1);
  }
  console.log(`Page file check passed for ${pages.length} pages (${mainPages.length} main, ${subpackagePages.length} subpackage)`);
}

function checkPrototypeIsolation() {
  const appJson = JSON.parse(fs.readFileSync(path.join(miniprogramDir, 'app.json'), 'utf8'));
  const subpackages = appJson.subPackages || appJson.subpackages || [];
  const prototypePackage = subpackages.find((item) => item.root === prototypeRootName);
  const issues = [];

  if (!prototypePackage) issues.push(`Missing ${prototypeRootName} subpackage registration`);
  else {
    if (prototypePackage.independent !== true) issues.push(`${prototypeRootName} must be independent`);
    if ((prototypePackage.pages || []).join(',') !== 'pages/index/index') {
      issues.push(`${prototypeRootName} must expose only pages/index/index`);
    }
  }

  if (!fs.existsSync(prototypeDir)) issues.push(`Missing prototype root ${prototypeRootName}`);
  else {
    const sourceFiles = walk(prototypeDir, (file) => /\.(?:js|json|wxml|wxss)$/.test(file));
    const forbidden = [
      { pattern: /\bgetApp\s*\(/, label: 'getApp()' },
      { pattern: /wx\.(?:(?:batchGet|batchSet|get|set|remove|clear)Storage(?:Info)?(?:Sync)?|createCacheManager)\s*\(/, label: 'storage API' },
      { pattern: /wx\s*\[\s*['"](?:(?:batchGet|batchSet|get|set|remove|clear)Storage(?:Info)?(?:Sync)?|createCacheManager)['"]\s*\]/, label: 'bracketed storage API' },
      { pattern: /wx\.(?:request|downloadFile|uploadFile|connectSocket|sendSocketMessage|createTCPSocket|createUDPSocket|getLocation|chooseLocation|openLocation|vibrateShort|vibrateLong)\s*\(/, label: 'network/location/vibration API' },
      { pattern: /wx\s*\[\s*['"](?:request|downloadFile|uploadFile|connectSocket|sendSocketMessage|createTCPSocket|createUDPSocket|getLocation|chooseLocation|openLocation|vibrateShort|vibrateLong)['"]\s*\]/, label: 'bracketed network/location/vibration API' },
      { pattern: /tour-service|user-service|utils[\\/]storage|mock[\\/]zodiac-route/, label: 'legacy module' },
      { pattern: /zodiac\.currentSession|zodiac\.records|zodiac\.record\./, label: 'legacy storage key' },
      { pattern: /(?:^|\D)568(?:\D|$)/, label: 'prohibited legacy placeholder' }
    ];

    for (const file of sourceFiles) {
      const source = fs.readFileSync(file, 'utf8');
      const relative = path.relative(rootDir, file);
      forbidden.forEach(({ pattern, label }) => {
        if (pattern.test(source)) issues.push(`${relative} contains forbidden ${label}`);
      });
      if (!file.endsWith('.js')) continue;
      const checkImport = (request) => {
        if (!request.startsWith('.')) {
          issues.push(`${relative} imports non-local module ${request}`);
          return;
        }
        const resolved = path.resolve(path.dirname(file), request);
        if (resolved !== prototypeDir && !resolved.startsWith(`${prototypeDir}${path.sep}`)) {
          issues.push(`${relative} imports outside prototype root: ${request}`);
        }
      };
      const requirePattern = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      let match;
      while ((match = requirePattern.exec(source)) !== null) {
        checkImport(match[1]);
      }
      const esImportPattern = /(?:import|export)\s+(?:[^'"]+?\s+from\s+)?['"]([^'"]+)['"]/g;
      while ((match = esImportPattern.exec(source)) !== null) {
        checkImport(match[1]);
      }
    }

    const prototypeWxss = fs.readFileSync(path.join(prototypeDir, 'pages', 'index', 'index.wxss'), 'utf8');
    if (!prototypeWxss.includes('env(safe-area-inset-left)') || !prototypeWxss.includes('env(safe-area-inset-right)')) {
      issues.push('Prototype page must apply both landscape safe-area insets');
    }
    if (!prototypeWxss.includes('@media (orientation: landscape) and (min-width: 1024px)')) {
      issues.push('Prototype two-column layout must stay above phone landscape widths');
    }
    if (/\binfinite\b/.test(prototypeWxss)) issues.push('I1 prototype animations must settle instead of running infinitely');
    ['--motion-enter: 520ms', '--motion-settle: 760ms', '--motion-result: 1200ms', '--motion-focus-delay: 1620ms'].forEach((token) => {
      if (!prototypeWxss.includes(token)) issues.push(`Prototype is missing motion token ${token}`);
    });
    ['--space-1: 8rpx', '--space-2: 16rpx', '--space-3: 24rpx', '--space-4: 32rpx', '--space-5: 48rpx', '--type-quote: 30rpx'].forEach((token) => {
      if (!prototypeWxss.includes(token)) issues.push(`Prototype is missing I1 design token ${token}`);
    });
    ['prologue-artwork', 'title-plate', 'path-artwork', 'path-focus-seal', 'comparison-image-reconstruction', 'radial-board-artwork', 'radial-status'].forEach((className) => {
      if (!prototypeWxss.includes(`.motion-reduced .${className}`)) {
        issues.push(`Reduced-motion mode does not explicitly settle .${className}`);
      }
    });
    if (!/\.network-weak \.scene-asset\s*\{[^}]*opacity:\s*0\.46 !important;[^}]*animation:\s*none !important;[^}]*transition:\s*none !important;/s.test(prototypeWxss)) {
      issues.push('Weak-network concept assets must settle at the deterministic low-detail opacity');
    }

    const fixtures = require(path.join(prototypeDir, 'mock', 'screens.js'));
    const expectedScreenIds = ['DSF-05', 'HHZ-05', 'HUG-08', 'PRO-01'];
    const actualScreenIds = Object.keys(fixtures.SCREENS_BY_ID || {}).sort();
    if (actualScreenIds.join(',') !== expectedScreenIds.join(',')) {
      issues.push(`Prototype screens must be exactly ${expectedScreenIds.join(', ')}`);
    }
    actualScreenIds.forEach((screenId) => {
      const screen = fixtures.SCREENS_BY_ID[screenId];
      if (!screen || screen.assetLabel !== '原型素材') issues.push(`${screenId} is missing the prototype asset label`);
      if (!screen || !screen.primaryActionLabel || !screen.sourceLabel || !Number.isInteger(screen.locationIndex)) {
        issues.push(`${screenId} is missing product chrome metadata`);
      }
      if (!screen || !Array.isArray(screen.assets) || screen.assets.length === 0) {
        issues.push(`${screenId} is missing registered concept assets`);
      }
    });
    const expectedConceptAssets = {
      prologueRuin: {
        file: 'prologue-ruin-concept.svg', id: 'concept-prologue-ruin-v1',
        replacementId: 'AST-PRO-01-HERO', provenance: '内部概念绘制 · 非现场照片'
      },
      hhzPath: {
        file: 'hhz-path-concept.svg', id: 'concept-hhz-path-v1',
        replacementId: 'AST-HHZ-05-PATH', provenance: '内部概念绘制 · 非审核路线'
      },
      dsfRuin: {
        file: 'dsf-ruin-concept.svg', id: 'concept-dsf-ruin-v1',
        replacementId: 'AST-DSF-05-RUIN', provenance: '内部概念绘制 · 非现场照片'
      },
      dsfReconstruction: {
        file: 'dsf-reconstruction-concept.svg', id: 'concept-dsf-reconstruction-v1',
        replacementId: 'AST-DSF-05-RECON', provenance: '内部概念绘制 · 无复原依据'
      },
      hugoRadialBoard: {
        file: 'hugo-radial-board-concept.svg', id: 'concept-hugo-radial-board-v1',
        replacementId: 'AST-HUG-08-DIAL', provenance: '内部概念绘制 · 非文物图像'
      }
    };
    const conceptAssets = fixtures.CONCEPT_ASSETS || {};
    if (Object.keys(conceptAssets).sort().join(',') !== Object.keys(expectedConceptAssets).sort().join(',')) {
      issues.push('Prototype concept asset registry must contain exactly the five I1 concept assets');
    }
    Object.entries(expectedConceptAssets).forEach(([key, expected]) => {
      const asset = conceptAssets[key];
      if (!asset) return;
      const { file: fileName } = expected;
      if (asset.file !== fileName || asset.src !== `../../assets/${fileName}`) {
        issues.push(`${key} has an invalid local concept asset path`);
      }
      if (!asset.id || !asset.alt || !asset.role || !asset.provenance || !asset.replacementId) {
        issues.push(`${key} is missing asset identity, accessibility, provenance, or replacement metadata`);
      }
      if (asset.id !== expected.id || asset.replacementId !== expected.replacementId || asset.provenance !== expected.provenance) {
        issues.push(`${key} does not match the approved non-factual provenance and replacement contract`);
      }
      const assetPath = path.join(prototypeDir, 'assets', fileName);
      if (!fs.existsSync(assetPath)) {
        issues.push(`Missing prototype concept asset assets/${fileName}`);
        return;
      }
      const svg = fs.readFileSync(assetPath, 'utf8');
      if (!/<svg\b/.test(svg) || !/\bviewBox=/.test(svg)) issues.push(`${fileName} is not a responsive SVG asset`);
      if (/(?:href|xlink:href)=["']https?:/i.test(svg)) issues.push(`${fileName} must not load remote content`);
    });
    const assetValues = Object.values(conceptAssets);
    const assetIds = assetValues.map((asset) => asset.id);
    const replacementIds = assetValues.map((asset) => asset.replacementId);
    const registeredAssetIds = new Set(assetIds);
    if (registeredAssetIds.size !== assetIds.length) issues.push('Prototype concept asset IDs must be unique');
    if (new Set(replacementIds).size !== replacementIds.length) issues.push('Prototype replacement IDs must be unique');
    const usedAssetIds = new Set(actualScreenIds.flatMap((screenId) => (
      (fixtures.SCREENS_BY_ID[screenId].assets || []).map((asset) => asset.id)
    )));
    if (registeredAssetIds.size !== usedAssetIds.size || [...registeredAssetIds].some((id) => !usedAssetIds.has(id))) {
      issues.push('Every registered I1 concept asset must be used by one of the four keyframes');
    }
    const expectedVisualTokens = {
      paper: '#EEE5D3',
      ink: '#1E2521',
      verdigris: '#426A63',
      cinnabar: '#964536',
      brass: '#B08A4D',
      night: '#121815'
    };
    const actualVisualTokens = Object.fromEntries((fixtures.VISUAL_TOKENS || []).map((item) => [item.id, item.value]));
    if (JSON.stringify(actualVisualTokens) !== JSON.stringify(expectedVisualTokens)) {
      issues.push('Prototype visual color tokens do not match the I1 review baseline');
    }

    const pageScript = path.join(prototypeDir, 'pages', 'index', 'index.js');
    const pageTemplate = path.join(prototypeDir, 'pages', 'index', 'index.wxml');
    const previousPage = global.Page;
    const previousWx = global.wx;
    let pageConfig = null;
    try {
      global.wx = {
        getWindowInfo: () => ({
          windowWidth: 375,
          windowHeight: 667,
          pixelRatio: 2,
          safeArea: { left: 0, top: 20, right: 375, bottom: 667 }
        })
      };
      global.Page = (config) => { pageConfig = config; };
      delete require.cache[require.resolve(pageScript)];
      require(pageScript);
    } catch (error) {
      issues.push(`Prototype page config could not be loaded: ${error.message}`);
    } finally {
      delete require.cache[require.resolve(pageScript)];
      if (previousPage === undefined) delete global.Page;
      else global.Page = previousPage;
      if (previousWx === undefined) delete global.wx;
      else global.wx = previousWx;
    }
    if (pageConfig) {
      const template = fs.readFileSync(pageTemplate, 'utf8');
      if ((template.match(/data-asset-generation="\{\{assetGeneration\}\}"/g) || []).length !== 5) {
        issues.push('Every concept image must bind the current asset generation token');
      }
      const bindingPattern = /\b(?:bind|catch)[a-zA-Z]+="([^"]+)"/g;
      let binding;
      while ((binding = bindingPattern.exec(template)) !== null) {
        if (typeof pageConfig[binding[1]] !== 'function') {
          issues.push(`Prototype WXML binds missing page method ${binding[1]}`);
        }
      }
    }
  }

  if (issues.length) {
    console.error(`Prototype isolation check failed:\n${issues.join('\n')}`);
    process.exit(1);
  }
  console.log('Prototype isolation guardrail passed');
}

checkJsSyntax();
checkJsonParse();
checkPageFiles();
checkPrototypeIsolation();
