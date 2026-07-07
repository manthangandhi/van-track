import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const iconsDir = path.join(__dirname, '../public/icons')
const svgPath = path.join(iconsDir, 'icon.svg')

async function generate() {
  const { default: sharp } = await import('sharp')
  const svg = fs.readFileSync(svgPath)

  await sharp(svg).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192.png'))
  await sharp(svg).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512.png'))

  console.log('Generated icon-192.png and icon-512.png')
}

generate().catch((err) => {
  console.error(err)
  process.exit(1)
})