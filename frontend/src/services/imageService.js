// Image compression and processing utilities
import { buildStampMetadata } from '../utils/imageStampFormat'

const BRAND = {
  accent: '#34856a',
  accentDark: '#1f5645',
  panel: 'rgba(11, 33, 27, 0.88)',
  panelEdge: 'rgba(52, 133, 106, 0.45)',
  label: 'rgba(184, 221, 208, 0.95)',
  value: '#ffffff',
  muted: 'rgba(220, 238, 230, 0.88)',
  divider: 'rgba(52, 133, 106, 0.22)',
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function measureStampLayout(ctx, metadata, width) {
  const scale = Math.max(0.75, Math.min(1.2, width / 480))
  const padding = Math.round(16 * scale)
  const labelSize = Math.round(11 * scale)
  const valueSize = Math.round(14 * scale)
  const titleSize = Math.round(18 * scale)
  const subtitleSize = Math.round(11 * scale)
  const footerSize = Math.round(11 * scale)
  const rowGap = Math.round(10 * scale)

  ctx.font = `700 ${titleSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`
  const titleHeight = titleSize

  ctx.font = `500 ${subtitleSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`
  const subtitleHeight = subtitleSize + 4

  let rowsHeight = 0
  for (const row of metadata.rows) {
    ctx.font = `600 ${labelSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`
    const labelHeight = labelSize + 2
    ctx.font = `600 ${valueSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`
    const valueLines = wrapText(ctx, row.value, width - padding * 2, valueSize)
    rowsHeight += labelHeight + valueLines.length * (valueSize + 4) + rowGap
  }

  const footerHeight = metadata.footer
    ? (() => {
        ctx.font = `500 ${footerSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`
        return wrapText(ctx, metadata.footer, width - padding * 2, footerSize).length * (footerSize + 3) + 12
      })()
    : 0

  const panelHeight =
    padding +
    titleHeight +
    8 +
    subtitleHeight +
    14 +
    rowsHeight +
    footerHeight +
    padding

  return {
    scale,
    padding,
    labelSize,
    valueSize,
    titleSize,
    subtitleSize,
    footerSize,
    rowGap,
    panelHeight,
  }
}

function wrapText(ctx, text, maxWidth, fontSize) {
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`
  const words = String(text).split(/\s+/)
  const lines = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }

  if (current) lines.push(current)
  return lines.length > 0 ? lines : ['']
}

function drawPremiumStamp(ctx, canvas, metadata, bandTop = 0) {
  const { width } = canvas
  const layout = measureStampLayout(ctx, metadata, width)
  const bandPadding = Math.round(8 * layout.scale)
  const panelTop = bandTop + bandPadding
  const panelLeft = Math.round(10 * layout.scale)
  const panelWidth = width - panelLeft * 2

  roundRect(ctx, panelLeft, panelTop, panelWidth, layout.panelHeight, Math.round(14 * layout.scale))
  ctx.fillStyle = BRAND.panel
  ctx.fill()
  ctx.strokeStyle = BRAND.panelEdge
  ctx.lineWidth = Math.max(1, Math.round(1.5 * layout.scale))
  ctx.stroke()

  ctx.fillStyle = BRAND.accent
  roundRect(
    ctx,
    panelLeft,
    panelTop,
    Math.round(5 * layout.scale),
    layout.panelHeight,
    Math.round(3 * layout.scale)
  )
  ctx.fill()

  let cursorY = panelTop + layout.padding

  ctx.fillStyle = BRAND.value
  ctx.font = `700 ${layout.titleSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`
  ctx.fillText(metadata.appName, panelLeft + layout.padding + 6, cursorY + layout.titleSize)
  const titleWidth = ctx.measureText(metadata.title).width
  ctx.fillText(metadata.title, panelLeft + panelWidth - layout.padding - titleWidth, cursorY + layout.titleSize)
  cursorY += layout.titleSize + 8

  ctx.fillStyle = BRAND.muted
  ctx.font = `500 ${layout.subtitleSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`
  ctx.fillText(metadata.subtitle, panelLeft + layout.padding + 6, cursorY + layout.subtitleSize)
  cursorY += layout.subtitleSize + 12

  ctx.strokeStyle = BRAND.divider
  ctx.beginPath()
  ctx.moveTo(panelLeft + layout.padding, cursorY)
  ctx.lineTo(panelLeft + panelWidth - layout.padding, cursorY)
  ctx.stroke()
  cursorY += 12

  for (const row of metadata.rows) {
    ctx.fillStyle = BRAND.label
    ctx.font = `600 ${layout.labelSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`
    ctx.fillText(row.label.toUpperCase(), panelLeft + layout.padding + 6, cursorY + layout.labelSize)
    cursorY += layout.labelSize + 4

    ctx.fillStyle = BRAND.value
    const valueLines = wrapText(
      ctx,
      row.value,
      panelWidth - layout.padding * 2 - 6,
      layout.valueSize
    )
    for (const line of valueLines) {
      ctx.font = `600 ${layout.valueSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`
      ctx.fillText(line, panelLeft + layout.padding + 6, cursorY + layout.valueSize)
      cursorY += layout.valueSize + 4
    }
    cursorY += layout.rowGap - 4
  }

  if (metadata.footer) {
    cursorY += 2
    ctx.strokeStyle = BRAND.divider
    ctx.beginPath()
    ctx.moveTo(panelLeft + layout.padding, cursorY)
    ctx.lineTo(panelLeft + panelWidth - layout.padding, cursorY)
    ctx.stroke()
    cursorY += 10

    ctx.fillStyle = BRAND.muted
    const footerLines = wrapText(
      ctx,
      metadata.footer,
      panelWidth - layout.padding * 2 - 6,
      layout.footerSize
    )
    for (const line of footerLines) {
      ctx.font = `500 ${layout.footerSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`
      ctx.fillText(line, panelLeft + layout.padding + 6, cursorY + layout.footerSize)
      cursorY += layout.footerSize + 3
    }
  }
}

/**
 * Burn premium GPS + timestamp metadata onto a selfie image
 */
export async function stampImageWithMetadata(
  blob,
  {
    latitude,
    longitude,
    accuracy,
    timestamp = new Date(),
    label = null,
    employeeName = null,
    siteName = null,
    appName = 'VanTrack',
  }
) {
  const metadata = buildStampMetadata({
    label,
    timestamp,
    latitude,
    longitude,
    accuracy,
    employeeName,
    siteName,
    appName,
  })

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const layout = measureStampLayout(ctx, metadata, img.width)
        const bandGap = Math.round(6 * layout.scale)
        const bandPadding = Math.round(8 * layout.scale)
        const bandHeight = layout.panelHeight + bandPadding * 2 + bandGap

        canvas.width = img.width
        canvas.height = img.height + bandHeight

        ctx.drawImage(img, 0, 0)

        const bandTop = img.height + bandGap
        ctx.fillStyle = '#0b1412'
        ctx.fillRect(0, bandTop, canvas.width, bandHeight - bandGap)

        drawPremiumStamp(ctx, canvas, metadata, bandTop)

        canvas.toBlob(
          (stampedBlob) => {
            if (stampedBlob) resolve(stampedBlob)
            else reject(new Error('Failed to stamp image'))
          },
          'image/jpeg',
          0.92
        )
      }

      img.onerror = () => reject(new Error('Image load failed'))
      img.src = event.target.result
    }

    reader.onerror = () => reject(new Error('File read failed'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Compress image to JPEG with specified dimensions
 */
export async function compressImage(file, maxWidth = 480, maxHeight = 480, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height)
          height = maxHeight
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (compressedBlob) => {
            if (compressedBlob) resolve(compressedBlob)
            else reject(new Error('Image compression failed'))
          },
          'image/jpeg',
          quality
        )
      }

      img.onerror = () => reject(new Error('Image load failed'))
      img.src = event.target.result
    }

    reader.onerror = () => reject(new Error('File read failed'))
    reader.readAsDataURL(file)
  })
}

export async function canvasToBlob(canvas, quality = 0.7) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas conversion failed'))
      },
      'image/jpeg',
      quality
    )
  })
}

export async function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.width, height: img.height })
      img.onerror = () => reject(new Error('Image load failed'))
      img.src = event.target.result
    }

    reader.onerror = () => reject(new Error('File read failed'))
    reader.readAsDataURL(file)
  })
}

export async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function base64ToBlob(base64) {
  const parts = base64.split(',')
  const mimeMatch = parts[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
  const bstr = atob(parts[1])
  const n = bstr.length
  const u8arr = new Uint8Array(n)

  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i)
  }

  return new Blob([u8arr], { type: mime })
}