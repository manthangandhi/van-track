export const MATCH_THRESHOLD = 0.55

export function euclideanDistance(a, b) {
  let sum = 0
  const length = Math.min(a.length, b.length)
  for (let i = 0; i < length; i++) {
    const diff = a[i] - b[i]
    sum += diff * diff
  }
  return Math.sqrt(sum)
}

export function compareFaceDescriptors(referenceDescriptor, punchDescriptor) {
  const distance = euclideanDistance(referenceDescriptor, punchDescriptor)
  const matchScore = Math.max(0, Math.min(100, Math.round((1 - distance) * 100)))
  return {
    distance,
    matchScore,
    isMatch: distance <= MATCH_THRESHOLD,
  }
}