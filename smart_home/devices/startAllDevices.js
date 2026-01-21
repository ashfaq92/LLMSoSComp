import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const deviceDir = path.dirname(fileURLToPath(import.meta.url));

const deviceFiles = fs.readdirSync(deviceDir)
  .filter(f =>
    f.endsWith('.js') &&
    f !== 'deviceHelper.js' &&
    f !== 'startAllDevices.js'
  )

deviceFiles.forEach(file => {
  const proc = spawn('node', [path.join(deviceDir, file)], { stdio: 'inherit' })
  console.log(`Started ${file} (pid: ${proc.pid})`)
})