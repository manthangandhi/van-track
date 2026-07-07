import * as faceapi from '@vladmandic/face-api'
import { compareFaceDescriptors, MATCH_THRESHOLD } from '../utils/faceMath'

const MODEL_URL = `${import.meta.env.BASE_URL}models`

let modelsLoaded = false
let modelsLoading = null

function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image for face detection'))
    }
    img.src = url
  })
}

export async function loadFaceModels() {
  if (modelsLoaded) return
  if (modelsLoading) return modelsLoading

  modelsLoading = Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ])
    .then(() => {
      modelsLoaded = true
    })
    .catch((err) => {
      modelsLoading = null
      throw err
    })

  return modelsLoading
}

export async function extractFaceDescriptor(imageBlob) {
  await loadFaceModels()
  const image = await blobToImage(imageBlob)
  const detection = await faceapi
    .detectSingleFace(image, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor()

  if (!detection) {
    throw new Error('NO_FACE_DETECTED')
  }

  return Array.from(detection.descriptor)
}

export async function verifyFaceMatch(referenceDescriptor, punchImageBlob) {
  const punchDescriptor = await extractFaceDescriptor(punchImageBlob)
  const result = compareFaceDescriptors(referenceDescriptor, punchDescriptor)
  return {
    ...result,
    punchDescriptor,
  }
}

export { compareFaceDescriptors, MATCH_THRESHOLD } from '../utils/faceMath'