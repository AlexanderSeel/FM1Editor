import { spawn } from 'node:child_process'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/').filter(Boolean).at(-1) || 'FM1Editor'
const requestedBase = process.env.FM1_PAGES_BASE?.trim() || `/${repositoryName}/`
const base = requestedBase === '/'
  ? '/'
  : `/${requestedBase.replace(/^\/+|\/+$/g, '')}/`
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

console.log(`Building FM1 Editor for deployment base ${base}`)

const child = spawn(npmCommand, ['run', 'build'], {
  env: { ...process.env, FM1_BASE_PATH: base },
  stdio: 'inherit',
})

child.once('error', (error) => {
  console.error(error)
  process.exitCode = 1
})

child.once('exit', (code, signal) => {
  if (signal) {
    console.error(`Pages build terminated by ${signal}`)
    process.exitCode = 1
    return
  }
  process.exitCode = code ?? 1
})
