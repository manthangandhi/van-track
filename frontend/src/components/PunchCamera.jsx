import React, { useRef, useEffect, useState } from 'react'
import { STRINGS } from '../utils/strings'

export function PunchCamera({ onCapture, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [error, setError] = useState(null)
  const [capturedImage, setCapturedImage] = useState(null)

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  async function startCamera() {
    try {
      setError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      setError(err.message || 'Failed to access camera')
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
    }
  }

  function handleCapture() {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      canvasRef.current.width = videoRef.current.videoWidth
      canvasRef.current.height = videoRef.current.videoHeight
      ctx.drawImage(videoRef.current, 0, 0)

      canvasRef.current.toBlob((blob) => {
        const url = URL.createObjectURL(blob)
        setCapturedImage(url)
      }, 'image/jpeg', 0.9)
    }
  }

  function handleConfirm() {
    if (capturedImage && canvasRef.current) {
      canvasRef.current.toBlob(onCapture, 'image/jpeg', 0.9)
      stopCamera()
    }
  }

  function handleRetake() {
    setCapturedImage(null)
    if (!stream || !stream.active) {
      startCamera()
    }
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
          <h2 className="text-lg font-bold text-red-600 mb-2">{STRINGS.ERROR}</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="w-full bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded"
          >
            {STRINGS.CLOSE}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <canvas ref={canvasRef} className="hidden" />

      {capturedImage ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <img src={capturedImage} alt="Captured" className="max-w-full max-h-3/4 rounded-lg mb-4" />
          <div className="flex gap-4 mt-auto mb-4">
            <button
              onClick={handleRetake}
              className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded"
            >
              {STRINGS.RETAKE}
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded"
            >
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
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 flex gap-4">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded"
            >
              {STRINGS.CLOSE}
            </button>
            <button
              onClick={handleCapture}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full text-lg"
            >
              📷 {STRINGS.CAPTURE}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
