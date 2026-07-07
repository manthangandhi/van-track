// Image compression and processing utilities

/**
 * Compress image to JPEG with specified dimensions
 * @param {Blob} file - Image file
 * @param {number} maxWidth - Maximum width in pixels
 * @param {number} maxHeight - Maximum height in pixels
 * @param {number} quality - JPEG quality (0-1)
 * @returns {Promise<Blob>} Compressed image blob
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

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            resolve(blob)
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

/**
 * Convert canvas stream to blob
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {number} quality - JPEG quality (0-1)
 * @returns {Promise<Blob>} Canvas as JPEG blob
 */
export async function canvasToBlob(canvas, quality = 0.7) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Canvas conversion failed'))
        }
      },
      'image/jpeg',
      quality
    )
  })
}

/**
 * Get image dimensions
 * @param {Blob} file - Image file
 * @returns {Promise<{width: number, height: number}>}
 */
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

/**
 * Convert blob to base64 (for offline storage)
 * @param {Blob} blob - Blob to convert
 * @returns {Promise<string>} Base64 string
 */
export async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Convert base64 to blob
 * @param {string} base64 - Base64 string
 * @returns {Blob} Blob object
 */
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
