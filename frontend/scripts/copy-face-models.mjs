import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sourceDir = path.join(__dirname, '../node_modules/@vladmandic/face-api/model')
const targetDir = path.join(__dirname, '../public/models')

if (!fs.existsSync(sourceDir)) {
  console.warn('face-api models not found — run npm install @vladmandic/face-api first')
  process.exit(0)
}

fs.mkdirSync(targetDir, { recursive: true })

for (const file of fs.readdirSync(sourceDir)) {
  fs.copyFileSync(path.join(sourceDir, file), path.join(targetDir, file))
}

console.log(`Copied face-api models to ${targetDir}`)