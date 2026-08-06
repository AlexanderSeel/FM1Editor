import { spawn, spawnSync } from 'node:child_process'
import process from 'node:process'

const HOST = '127.0.0.1'
const PORT = 4174
const BASE_URL = `http://${HOST}:${PORT}`
const CHANNELS = (process.env.BROWSER_CHANNELS ?? 'chrome,msedge')
  .split(',')
  .map((channel) => channel.trim())
  .filter(Boolean)

const VIEWPORTS = [
  { name: 'desktop-wide', width: 1440, height: 900 },
  { name: 'desktop-compact', width: 1100, height: 900 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'mobile', width: 390, height: 844 },
]

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function startPreviewServer() {
  if (process.platform === 'win32') {
    const command = process.env.ComSpec ?? 'C:\\Windows\\System32\\cmd.exe'
    return spawn(command, ['/d', '/s', '/c', `npm run preview -- --host ${HOST} --port ${PORT}`], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
  }

  return spawn('npm', ['run', 'preview', '--', '--host', HOST, '--port', String(PORT)], {
    detached: true,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

async function waitForServer(server, timeoutMs = 30_000) {
  const startedAt = Date.now()
  let output = ''
  server.stdout?.on('data', (chunk) => { output += String(chunk) })
  server.stderr?.on('data', (chunk) => { output += String(chunk) })

  while (Date.now() - startedAt < timeoutMs) {
    if (server.exitCode !== null) {
      throw new Error(`Vite preview exited before becoming ready.\n${output}`)
    }
    try {
      const response = await fetch(BASE_URL)
      if (response.ok) return
    } catch {
      // The preview server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Timed out waiting for Vite preview.\n${output}`)
}

function stopPreviewServer(server) {
  if (server.exitCode !== null || !server.pid) return
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
    return
  }
  try {
    process.kill(-server.pid, 'SIGTERM')
  } catch {
    server.kill('SIGTERM')
  }
}

async function assertInsideViewport(locator, viewport, label) {
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  assert(box !== null, `${label} has no visible bounding box.`)
  assert(box.x >= -1, `${label} starts outside the viewport at x=${box.x}.`)
  assert(box.x + box.width <= viewport.width + 1, `${label} extends beyond ${viewport.width}px at x=${box.x + box.width}.`)
}

async function assertNoHorizontalOverflow(page, viewport, channel, phase) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  assert(
    dimensions.scrollWidth <= dimensions.clientWidth + 1,
    `${channel}/${viewport.name} ${phase} has horizontal page overflow: ${dimensions.scrollWidth}px > ${dimensions.clientWidth}px.`,
  )
}

async function checkDx7Layout(page, viewport, channel) {
  const pageErrors = []
  const consoleErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await page.addInitScript(() => {
    window.localStorage.setItem('fm1-editor.device-target', 'dx7')
  })
  await page.setViewportSize({ width: viewport.width, height: viewport.height })
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })

  await assertNoHorizontalOverflow(page, viewport, channel, 'initial layout')

  const sidebar = page.locator('aside.fm1-sidebar')
  await sidebar.waitFor({ state: 'visible' })
  await assertInsideViewport(sidebar, viewport, `${channel}/${viewport.name} sidebar`)
  const sidebarMetrics = await sidebar.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))
  assert(
    sidebarMetrics.scrollWidth <= sidebarMetrics.clientWidth + 1,
    `${channel}/${viewport.name} DX7 sidebar has horizontal overflow: ${sidebarMetrics.scrollWidth}px > ${sidebarMetrics.clientWidth}px.`,
  )

  const auditionHeading = page.getByText('Yamaha DX7 audition and transfer', { exact: true })
  await auditionHeading.waitFor({ state: 'visible' })
  await assertInsideViewport(auditionHeading, viewport, `${channel}/${viewport.name} DX7 audition heading`)

  const systemInfo = page.getByText('DX7 System Info is available', { exact: true })
  const memoryProtect = page.getByText('Memory Protect is off', { exact: true })
  await systemInfo.waitFor({ state: 'visible' })
  await memoryProtect.waitFor({ state: 'visible' })
  await assertInsideViewport(systemInfo, viewport, `${channel}/${viewport.name} System Info confirmation`)
  await assertInsideViewport(memoryProtect, viewport, `${channel}/${viewport.name} Memory Protect confirmation`)

  const voiceHeading = page.getByText('DX7 voice parameters · 0–155', { exact: true })
  const functionHeading = page.getByText('DX7 function parameters · 64–77', { exact: true })
  assert(await voiceHeading.count() === 1, `${channel}/${viewport.name} expected exactly one DX7 voice-parameter panel.`)
  assert(await functionHeading.count() === 1, `${channel}/${viewport.name} expected exactly one DX7 function-parameter panel.`)
  await assertInsideViewport(voiceHeading, viewport, `${channel}/${viewport.name} voice-parameter summary`)
  await assertInsideViewport(functionHeading, viewport, `${channel}/${viewport.name} function-parameter summary`)

  await voiceHeading.locator('xpath=ancestor::summary[1]').click()
  const enableVoiceWrites = page.getByRole('button', { name: 'Enable voice writes' })
  await enableVoiceWrites.waitFor({ state: 'visible' })
  assert(await enableVoiceWrites.isDisabled(), `${channel}/${viewport.name} voice writes must remain locked without output, SysEx and hardware confirmations.`)
  await assertInsideViewport(enableVoiceWrites, viewport, `${channel}/${viewport.name} enable voice writes`)

  const operatorButtons = page.getByRole('button', { name: /^OP[1-6] (ON|OFF)$/ })
  assert(await operatorButtons.count() === 6, `${channel}/${viewport.name} expected six operator-mask buttons.`)
  for (let index = 0; index < await operatorButtons.count(); index += 1) {
    await assertInsideViewport(operatorButtons.nth(index), viewport, `${channel}/${viewport.name} operator mask ${index + 1}`)
  }

  await functionHeading.locator('xpath=ancestor::summary[1]').click()
  const enableFunctionWrites = page.getByRole('button', { name: 'Enable function writes' })
  await enableFunctionWrites.waitFor({ state: 'visible' })
  assert(await enableFunctionWrites.isDisabled(), `${channel}/${viewport.name} function writes must remain locked without output, SysEx and hardware confirmations.`)
  await assertInsideViewport(enableFunctionWrites, viewport, `${channel}/${viewport.name} enable function writes`)

  const pianoHeading = page.getByText('Virtual piano', { exact: true })
  await pianoHeading.waitFor({ state: 'visible' })
  await assertInsideViewport(pianoHeading, viewport, `${channel}/${viewport.name} virtual piano heading`)

  const pianoKeys = page.getByRole('button', { name: /^Play / })
  assert(await pianoKeys.count() === 25, `${channel}/${viewport.name} expected 25 virtual piano keys.`)
  const pianoFrame = pianoKeys.first().locator('xpath=ancestor::div[contains(@class,"relative")][1]')
  const frameBox = await pianoFrame.boundingBox()
  assert(frameBox !== null, `${channel}/${viewport.name} piano frame is not visible.`)
  for (let index = 0; index < await pianoKeys.count(); index += 1) {
    const keyBox = await pianoKeys.nth(index).boundingBox()
    assert(keyBox !== null, `${channel}/${viewport.name} piano key ${index + 1} is not visible.`)
    assert(keyBox.x >= frameBox.x - 1, `${channel}/${viewport.name} piano key ${index + 1} starts outside its frame.`)
    assert(
      keyBox.x + keyBox.width <= frameBox.x + frameBox.width + 1,
      `${channel}/${viewport.name} piano key ${index + 1} extends outside its frame.`,
    )
  }

  await assertNoHorizontalOverflow(page, viewport, channel, 'expanded DX7 controls')
  assert(pageErrors.length === 0, `${channel}/${viewport.name} page errors: ${pageErrors.join(' | ')}`)
  assert(consoleErrors.length === 0, `${channel}/${viewport.name} console errors: ${consoleErrors.join(' | ')}`)

  console.log(`PASS DX7 ${channel} ${viewport.name} ${viewport.width}x${viewport.height}`)
}

async function main() {
  const { chromium } = await import('playwright')
  const server = startPreviewServer()

  try {
    await waitForServer(server)
    for (const channel of CHANNELS) {
      const browser = await chromium.launch({ channel, headless: true })
      try {
        for (const viewport of VIEWPORTS) {
          const context = await browser.newContext()
          try {
            const page = await context.newPage()
            await checkDx7Layout(page, viewport, channel)
          } finally {
            await context.close()
          }
        }
      } finally {
        await browser.close()
      }
    }
  } finally {
    stopPreviewServer(server)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
