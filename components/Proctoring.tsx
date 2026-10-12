'use client'

import { useEffect, useRef } from 'react'
import { FaceDetection, Results } from '@mediapipe/face_detection'

interface ProctoringProps {
  videoElement: HTMLVideoElement | null
  onWarning: (msg: string) => void
  active: boolean
}

export function Proctoring({ videoElement, onWarning, active }: ProctoringProps) {
  const violationFrames = useRef<number>(0)
  const onWarningRef = useRef(onWarning)

  useEffect(() => {
    onWarningRef.current = onWarning
  }, [onWarning])

  useEffect(() => {
    if (!videoElement || !active) return

    let faceDetection: FaceDetection
    let audioContext: AudioContext | null = null
    let sourceNode: MediaStreamAudioSourceNode | null = null
    let analyser: AnalyserNode | null = null
    let dataArray: any = null
    let bufferLength = 0
    let speakingTicks = 0
    let baselineNoise = 10

    try {
      faceDetection = new FaceDetection({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
      })

      faceDetection.setOptions({
        model: 'short',
        minDetectionConfidence: 0.5,
      })

      faceDetection.onResults((results: Results) => {
        if (!results || !results.detections) return
        
        const numFaces = results.detections.length
        if (numFaces !== 1) {
          violationFrames.current++
          if (violationFrames.current > 30) { // approx 1 sec at 30fps
            onWarningRef.current(numFaces === 0 ? "No face detected! Please look at the screen." : "Multiple people detected in frame!")
            violationFrames.current = -150 // 5 seconds cooldown
          }
        } else {
          // Check for head movement/turning to the side
          const detection = results.detections[0]
          const landmarks = detection.landmarks
          let isViolating = false
          let violationMessage = ""

          if (landmarks && landmarks.length >= 4) {
            const rightEye = landmarks[0]
            const leftEye = landmarks[1]
            const nose = landmarks[2]
            const mouth = landmarks[3]

            if (rightEye && leftEye && nose && mouth) {
              // 1. Horizontal Turn (Yaw)
              const distToRightEye = Math.abs(nose.x - rightEye.x)
              const distToLeftEye = Math.abs(nose.x - leftEye.x)
              const horizontalSum = distToRightEye + distToLeftEye
              
              if (horizontalSum > 0) {
                const horizontalAsymmetry = Math.abs(distToRightEye - distToLeftEye) / horizontalSum
                // A threshold of 0.22 represents a very slight head turn
                if (horizontalAsymmetry > 0.22) {
                  isViolating = true
                  violationMessage = "Head turned to the side! Please look straight at the screen."
                }
              }

              // 2. Vertical Pitch (Looking Up/Down)
              const eyeY = (rightEye.y + leftEye.y) / 2
              const distEyesToNose = nose.y - eyeY
              const distNoseToMouth = mouth.y - nose.y

              if (distEyesToNose > 0 && distNoseToMouth > 0) {
                const verticalSum = distEyesToNose + distNoseToMouth
                if (verticalSum > 0) {
                  const verticalAsymmetry = (distEyesToNose - distNoseToMouth) / verticalSum
                  if (verticalAsymmetry > 0.35) {
                    isViolating = true
                    violationMessage = "Looking down detected! Please look at the screen."
                  } else if (verticalAsymmetry < -0.35) {
                    isViolating = true
                    violationMessage = "Looking up detected! Please look at the screen."
                  }
                }
              }
            }
          }

          if (isViolating) {
            violationFrames.current++
            if (violationFrames.current > 30) { // approx 1 sec at 30fps
              onWarningRef.current(violationMessage)
              violationFrames.current = -150 // 5 seconds cooldown
            }
          } else {
            if (violationFrames.current > 0) {
              violationFrames.current = 0 // reset
            } else if (violationFrames.current < 0) {
              violationFrames.current++ // recovering from cooldown
            }
          }
        }
      })

      // Audio analysis interval (100ms ticks)
      const audioInterval = setInterval(() => {
        if (!active || !videoElement) return

        // Lazy initialize AudioContext once srcObject stream is available on videoElement
        const stream = videoElement.srcObject as MediaStream
        if (stream && !audioContext) {
          const audioTracks = stream.getAudioTracks()
          if (audioTracks.length > 0) {
            try {
              const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
              if (AudioContextClass) {
                audioContext = new AudioContextClass()
                sourceNode = audioContext.createMediaStreamSource(stream)
                analyser = audioContext.createAnalyser()
                analyser.fftSize = 512
                sourceNode.connect(analyser)
                bufferLength = analyser.frequencyBinCount
                dataArray = new Uint8Array(bufferLength)
              }
            } catch (err) {
              console.error("Audio detection initialization failed:", err)
            }
          }
        }

        // Analyze frequency volume levels if ready
        if (analyser && dataArray) {
          analyser.getByteFrequencyData(dataArray)
          let sum = 0
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i]
          }
          const avg = sum / bufferLength

          // Slowly adapt the baseline background noise level
          if (avg < baselineNoise) {
            baselineNoise = baselineNoise * 0.95 + avg * 0.05
          } else {
            baselineNoise = baselineNoise * 0.99 + avg * 0.01
          }

          // speakingThreshold is baseline + 20 (min 30 to prevent silence triggers)
          const threshold = Math.max(30, baselineNoise + 20)

          if (avg > threshold) {
            speakingTicks++
            if (speakingTicks > 15) { // ~1.5s of continuous audio
              onWarningRef.current("Speaking detected! Please remain silent during the test.")
              speakingTicks = -30 // 3 seconds cooldown
            }
          } else {
            if (speakingTicks > 0) {
              speakingTicks--
            }
          }
        }
      }, 100)

      let animationFrameId: number

      const detectFrame = async () => {
        try {
          if (videoElement && videoElement.readyState >= 2 && active) {
            await faceDetection.send({ image: videoElement })
          }
        } catch (err) {
          // ignore transient frame errors
        }
        animationFrameId = requestAnimationFrame(detectFrame)
      }

      faceDetection.initialize().then(() => {
        detectFrame()
      }).catch(err => {
        console.error('Face detection initialization failed:', err)
      })
      
      return () => {
        cancelAnimationFrame(animationFrameId)
        clearInterval(audioInterval)
        if (audioContext) {
          try {
            audioContext.close()
          } catch (err) {
            // ignore
          }
        }
        if (faceDetection) faceDetection.close()
      }
    } catch (err) {
      console.error('Proctoring initialization error:', err)
    }
  }, [videoElement, active])

  return null
}
