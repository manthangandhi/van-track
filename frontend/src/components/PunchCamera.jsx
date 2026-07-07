import React, { useRef, useEffect, useState } from 'react'
import { STRINGS } from '../utils/strings'

export function PunchCamera({ onCapture, onClose, title = STRINGS.TAKE_SELFIE }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState(null)
  const [capturedImage, setCapturedImage] = useState(null)
  const [videoReady, setVideoReady] = useState(false)

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  async function startCamera() {
    try {
      setError(null)
      setVideoReady(false)
      stopCamera()
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = mediaStream
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      setError(err.message || 'Failed to access camera')
    }
  }

  function handleVideoReady() {
    if (videoRef.current?.videoWidth > 0) {
      setVideoReady(true)
    }
  }

  function handleCapture() {
    if (!videoRef.current || !canvasRef.current || !videoReady) return
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) return

    const ctx = canvasRef.current.getContext('2d')
    canvasRef.current.width = videoRef.current.videoWidth
    canvasRef.current.height = videoRef.current.videoHeight
    ctx.drawImage(videoRef.current, 0, 0)

    canvasRef.current.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      setCapturedImage(url)
    }, 'image/jpeg', 0.9)
  }

  function handleConfirm() {
    if (capturedImage && canvasRef.current) {
      canvasRef.current.toBlob((blob) => {
        stopCamera()
        onCapture(blob)
      }, 'image/jpeg', 0.9)
    }
  }

  function handleRetake() {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage)
    }
    setCapturedImage(null)
    setVideoReady(false)
    startCamera()
  }

  function handleClose() {
    stopCamera()
    onClose()
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="card p-6 max-w-sm mx-4">
          <h2 className="display-title text-lg text-red-700 mb-2">{STRINGS.ERROR}</h2>
          <p className="text-earth mb-4">{error}</p>
          <button type="button" onClick={handleClose} className="btn-secondary w-full">
            {STRINGS.CLOSE}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="absolute top-0 inset-x-0 z-10 bg-black/50 text-white text-center py-3 text-sm font-semibold">
        {title}
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {capturedImage ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <img src={capturedImage} alt="Captured" className="max-w-full max-h-3/4 rounded-lg mb-4" />
          <div className="flex gap-4 mt-auto mb-4">
            <button type="button" onClick={handleRetake} className="btn-secondary">
              {STRINGS.RETAKE}
            </button>
            <button type="button" onClick={handleConfirm} className="btn-primary">
              {STRINGS.CONFIRM}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            onLoadedMetadata={handleVideoReady}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 flex flex-col items-center gap-2">
            {!videoReady && (
              <p className="text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                {STRINGS.LOADING}...
              </p>
            )}
            <div className="flex gap-4">
              <button type="button" onClick={handleClose} className="btn-secondary">
                {STRINGS.CLOSE}
              </button>
              <button
                type="button"
                onClick={handleCapture}
                disabled={!videoReady}
                className="btn-primary px-8 py-3 rounded-full text-lg disabled:opacity-50"
              >
                {STRINGS.CAPTURE}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}