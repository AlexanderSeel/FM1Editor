import './browser-dx7-layout-smoke.mjs'
import { spawn, spawnSync } from 'node:child_process'
import process from 'node:process'

const HOST = '127.0.0.1'
const PORT = 4173
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

async function addSidebarStressContent(page) {
  await page.evaluate(() => {
    const sidebar = document.querySelector('aside.fm1-sidebar')
    const connectionPanel = sidebar?.querySelector('.fm1-connection-panel')
    if (!(sidebar instanceof HTMLElement) || !(connectionPanel instanceof HTMLElement)) {
      throw new Error('Sidebar connection panel was not found for stress content.')
    }

    const label = document.createElement('label')
    label.dataset.layoutStress = 'midi-port'
    label.className = 'mt-4 grid gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400'
    label.append('MIDI output stress fixture')

    const select = document.createElement('select')
    select.className = 'px-3 py-2.5 text-sm normal-case tracking-normal'
    const option = document.createElement('option')
    option.value = 'stress-port'
    option.textContent = 'FM-1 USB MIDI Output — Studio Interface Rack — Extremely Long Manufacturer and Endpoint Name — Channel Bridge A/B/C/D'
    select.append(option)
    label.append(select)
    connectionPanel.append(label)

    const safetyText = sidebar.querySelector('section:last-of-type p:last-child')
    if (safetyText instanceof HTMLElement) {
      safetyText.textContent = 'Safety verification text with a deliberately long endpoint identifier FM1_USB_MIDI_AUDIO_COMBINED_INTERFACE_WITHOUT_BREAKPOINTS_0123456789 and additional recovery guidance that must wrap inside the sidebar.'
    }
  })
}

async function assertSidebarContract(sidebar, viewport, channel) {
  const metrics = await sidebar.evaluate((element) => {
    const style = getComputedStyle(element)
    const html = element
    html.scrollLeft = 100
    const attemptedScrollLeft = html.scrollLeft
    html.scrollLeft = 0
    return {
      clientWidth: html.clientWidth,
      scrollWidth: html.scrollWidth,
      attemptedScrollLeft,
      overflowX: style.overflowX,
      overflowY: style.overflowY,
    }
  })

  assert(
    metrics.scrollWidth <= metrics.clientWidth + 1,
    `${channel}/${viewport.name} sidebar has internal horizontal overflow: ${metrics.scrollWidth}px > ${metrics.clientWidth}px.`,
  )
  assert(
    metrics.overflowX === 'clip' || metrics.overflowX === 'hidden',
    `${channel}/${viewport.name} sidebar overflow-x is ${metrics.overflowX}, expected clip or hidden.`,
  )
  assert(
    Math.abs(metrics.attemptedScrollLeft) <= 1,
    `${channel}/${viewport.name} sidebar accepted horizontal scrolling to ${metrics.attemptedScrollLeft}px.`,
  )

  if (viewport.width >= 1024) {
    assert(metrics.overflowY === 'auto', `${channel}/${viewport.name} sidebar overflow-y is ${metrics.overflowY}, expected auto.`)
    const box = await sidebar.boundingBox()
    assert(box !== null, `${channel}/${viewport.name} sidebar has no desktop bounding box.`)
    if (viewport.width >= 1280) {
      assert(box.width >= 409 && box.width <= 411, `${channel}/${viewport.name} sidebar width ${box.width}px is outside the 410px contract.`)
    } else {
      assert(box.width >= 339 && box.width <= 381, `${channel}/${viewport.name} sidebar width ${box.width}px is outside the 340–380px contract.`)
    }
  }
}

async function checkLayout(page, viewport, channel) {
  const pageErrors = []
  const consoleErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await page.addInitScript(() => {
    window.localStorage.setItem('fm1-editor.device-target', 'fm1')
    window.localStorage.removeItem('fm1-editor:section:voice-bank-audition')
  })
  await page.setViewportSize({ width: viewport.width, height: viewport.height })
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })

  assert(pageErrors.length === 0, `${channel}/${viewport.name} page errors: ${pageErrors.join(' | ')}`)
  assert(consoleErrors.length === 0, `${channel}/${viewport.name} console errors: ${consoleErrors.join(' | ')}`)

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  assert(
    dimensions.scrollWidth <= dimensions.clientWidth + 1,
    `${channel}/${viewport.name} has horizontal page overflow: ${dimensions.scrollWidth}px > ${dimensions.clientWidth}px.`,
  )

  const sidebar = page.locator('aside.fm1-sidebar')
  await sidebar.waitFor({ state: 'visible' })
  await assertInsideViewport(sidebar, viewport, `${channel}/${viewport.name} sidebar`)
  await addSidebarStressContent(page)
  await assertSidebarContract(sidebar, viewport, channel)

  if (viewport.width >= 1024) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(100)
    const stickyBox = await sidebar.boundingBox()
    assert(stickyBox !== null, `${channel}/${viewport.name} sticky sidebar is not visible after scrolling.`)
    assert(stickyBox.y >= -1, `${channel}/${viewport.name} sticky sidebar moved above the viewport.`)
    assert(
      stickyBox.y + stickyBox.height <= viewport.height + 1,
      `${channel}/${viewport.name} sticky sidebar exceeds the viewport height.`,
    )
    await page.evaluate(() => window.scrollTo(0, 0))
  }

  const auditionToggle = page.getByRole('button', { name: /FM-1 bank audition/i })
  await auditionToggle.waitFor({ state: 'visible' })
  if ((await auditionToggle.getAttribute('aria-expanded')) !== 'true') await auditionToggle.click()

  const bankControls = [
    page.locator('#audition-midi-channel'),
    page.locator('#audition-velocity'),
    page.locator('#audition-base-octave'),
    page.locator('#audition-target-bank'),
    page.getByRole('button', { name: 'Export base backup' }),
    page.getByRole('button', { name: 'Export merged bank' }),
    page.getByRole('button', { name: 'Send merged 32-voice bank' }),
    page.getByRole('button', { name: 'Recall target preset' }),
    page.getByRole('button', { name: 'Test C4' }),
  ]

  for (const [index, control] of bankControls.entries()) {
    await control.waitFor({ state: 'visible' })
    await assertInsideViewport(control, viewport, `${channel}/${viewport.name} bank control ${index + 1}`)
  }

  const pianoLabel = page.locator('p:visible').filter({ hasText: /^Virtual piano$/ }).first()
  await pianoLabel.waitFor({ state: 'visible' })
  await assertInsideViewport(pianoLabel, viewport, `${channel}/${viewport.name} virtual piano heading`)
  const pianoPanel = pianoLabel.locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]')

  const pianoKeys = pianoPanel.getByRole('button', { name: /^Play / })
  assert(await pianoKeys.count() === 25, `${channel}/${viewport.name} expected 25 virtual piano keys in the visible piano panel.`)
  const pianoFrame = pianoKeys.first().locator('xpath=ancestor::div[contains(@class,"relative")][1]')
  const frameBox = await pianoFrame.boundingBox()
  assert(frameBox !== null, `${channel}/${viewport.name} piano frame is not visible.`)

  for (let index = 0; index < await pianoKeys.count(); index += 1) {
    const key = pianoKeys.nth(index)
    const keyBox = await key.boundingBox()
    assert(keyBox !== null, `${channel}/${viewport.name} piano key ${index + 1} is not visible.`)
    assert(keyBox.x >= frameBox.x - 1, `${channel}/${viewport.name} piano key ${index + 1} starts outside its frame.`)
    assert(
      keyBox.x + keyBox.width <= frameBox.x + frameBox.width + 1,
      `${channel}/${viewport.name} piano key ${index + 1} extends outside its frame.`,
    )
  }

  console.log(`PASS ${channel} ${viewport.name} ${viewport.width}x${viewport.height}`)
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
            await checkLayout(page, viewport, channel)
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
