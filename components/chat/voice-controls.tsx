"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Mic, Volume2, VolumeX, Settings, Square } from "lucide-react"
import { useVoiceRecording } from "@/hooks/use-voice-recording"
import { SpeechRecognitionService } from "@/services/speech-recognition-service"
import { TextToSpeechService } from "@/services/text-to-speech-service"
import VoiceSettingsDialog from "./voice-settings-dialog"

interface VoiceControlsProps {
  onVoiceInput: (text: string) => void
  onSpeakResponse: (text: string) => void
  isEnabled: boolean
}

const LOCAL_STORAGE_KEY = "runash.voiceSettings.v1"

export default function VoiceControls({ onVoiceInput, onSpeakResponse, isEnabled }: VoiceControlsProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState("")
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])

  // Persistable settings: voiceId is either voiceURI or name
  const [voiceSettings, setVoiceSettings] = useState(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(LOCAL_STORAGE_KEY) : null
      if (raw) return JSON.parse(raw)
    } catch (e) {
      // ignore parse errors
    }

    return {
      rate: 1,
      pitch: 1,
      volume: 0.8,
      autoSpeak: true,
      voiceId: null as string | null,
    }
  })

  const [ttsSupported, setTtsSupported] = useState(false)
  const [srSupported, setSrSupported] = useState(false)

  const speechRecognitionRef = useRef<SpeechRecognitionService | null>(null)
  const ttsServiceRef = useRef<TextToSpeechService | null>(null)
  const { isRecording, audioLevel, duration, startRecording, stopRecording } = useVoiceRecording()

  // Helper to resolve voiceId -> SpeechSynthesisVoice | null
  const getSelectedVoice = useCallback(() => {
    const vid = (voiceSettings as any).voiceId
    if (!vid || !availableVoices?.length) return null
    return (
      availableVoices.find((v) => v.voiceURI === vid) || availableVoices.find((v) => v.name === vid) || null
    )
  }, [voiceSettings, availableVoices])

  // Initialize services and load voices
  useEffect(() => {
    let voicesChangedHandler: (() => void) | null = null

    try {
      const sr = new SpeechRecognitionService()
      speechRecognitionRef.current = sr
      setSrSupported(!!sr.isSupported())
    } catch (err) {
      console.warn("Failed to initialize speech recognition", err)
      speechRecognitionRef.current = null
      setSrSupported(false)
    }

    try {
      const tts = new TextToSpeechService()
      ttsServiceRef.current = tts
      setTtsSupported(!!tts.isSupported())

      if (tts.isSupported()) {
        const loadVoices = () => {
          try {
            const voices = (typeof tts.getVoices === "function" ? tts.getVoices() : window.speechSynthesis.getVoices()) || []
            setAvailableVoices(voices)

            // if there's a stored voiceId, ensure it maps to an actual voice; otherwise pick a default
            setVoiceSettings((prev: any) => {
              try {
                if (prev.voiceId) {
                  const mapped = voices.find((v: SpeechSynthesisVoice) => v.voiceURI === prev.voiceId) ||
                    voices.find((v: SpeechSynthesisVoice) => v.name === prev.voiceId)
                  if (mapped) return prev
                }

                // pick default english voice or first
                const defaultVoice = voices.find((v: SpeechSynthesisVoice) => v.lang?.startsWith("en")) || voices[0] || null
                if (!defaultVoice) return prev
                return { ...prev, voiceId: defaultVoice.voiceURI || defaultVoice.name }
              } catch (e) {
                return prev
              }
            })
          } catch (err) {
            console.warn("Failed to load voices", err)
            setAvailableVoices([])
          }
        }

        loadVoices()

        // attach voiceschanged event for browsers that populate voices asynchronously
        try {
          voicesChangedHandler = loadVoices
          if (window.speechSynthesis && typeof window.speechSynthesis.addEventListener === "function") {
            window.speechSynthesis.addEventListener("voiceschanged", voicesChangedHandler)
          } else if (window.speechSynthesis) {
            // fallback
            ;(window.speechSynthesis as any).onvoiceschanged = voicesChangedHandler
          }
        } catch (err) {
          // ignore
        }
      }
    } catch (err) {
      console.warn("TTS initialization failed", err)
      ttsServiceRef.current = null
      setTtsSupported(false)
    }

    return () => {
      try {
        if (voicesChangedHandler) {
          if (window.speechSynthesis && typeof window.speechSynthesis.removeEventListener === "function") {
            window.speechSynthesis.removeEventListener("voiceschanged", voicesChangedHandler)
          } else if (window.speechSynthesis) {
            ;(window.speechSynthesis as any).onvoiceschanged = null
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }, [])

  // Persist voice settings (serializable)
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(voiceSettings))
    } catch (e) {
      console.warn("Failed to persist voice settings", e)
    }
  }, [voiceSettings])

  const handleStartListening = useCallback(() => {
    if (!srSupported) {
      alert("Speech recognition is not supported in this browser")
      return
    }

    const sr = speechRecognitionRef.current
    if (!sr) {
      alert("Speech recognition service is not available")
      return
    }

    try {
      setIsListening(true)
      setInterimTranscript("")
      startRecording()

      sr.startListening(
        (result) => {
          try {
            setInterimTranscript(result.transcript || "")

            if (result.isFinal && result.transcript && result.transcript.trim()) {
              // call parent with finalized transcript
              try {
                onVoiceInput(result.transcript.trim())
              } catch (e) {
                console.error("onVoiceInput handler threw", e)
              }

              setInterimTranscript("")
              // stop after final
              try {
                stopRecording()
              } catch (e) {
                // ignore
              }
              try {
                sr.stopListening()
              } catch (e) {
                // ignore
              }
              setIsListening(false)
            }
          } catch (e) {
            console.error("Error handling recognition result", e)
          }
        },
        (error) => {
          console.error("Speech recognition error:", error)
          try {
            alert("Speech recognition encountered an error: " + (error?.message || error))
          } catch (e) {
            // ignore alert failures
          }
          try {
            stopRecording()
          } catch (e) {
            // ignore
          }
          try {
            sr.stopListening()
          } catch (e) {
            // ignore
          }
          setIsListening(false)
          setInterimTranscript("")
        },
      )
    } catch (e) {
      console.error("Failed to start speech recognition", e)
      alert("Failed to start speech recognition: " + (e as any)?.message || e)
      setIsListening(false)
      try {
        stopRecording()
      } catch (err) {
        // ignore
      }
    }
  }, [onVoiceInput, startRecording, stopRecording, srSupported])

  const handleStopListening = useCallback(() => {
    try {
      if (isListening) setIsListening(false)
      try {
        stopRecording()
      } catch (e) {
        // ignore
      }
      try {
        speechRecognitionRef.current?.stopListening()
      } catch (e) {
        // ignore
      }
      setInterimTranscript("")
    } catch (e) {
      console.warn("Error stopping listening", e)
    }
  }, [stopRecording, isListening])

  const handleSpeakResponse = useCallback(
    (text: string) => {
      if (!ttsSupported) {
        alert("Text-to-speech is not supported in this browser")
        return
      }

      const tts = ttsServiceRef.current
      if (!tts) {
        alert("Text-to-speech service is not available")
        return
      }

      const selectedVoice = getSelectedVoice()

      // notify parent that we're about to speak (useful for UI updates)
      try {
        onSpeakResponse(text)
      } catch (e) {
        console.error("onSpeakResponse handler threw", e)
      }

      setIsSpeaking(true)
      try {
        tts.speak(
          text,
          { ...(voiceSettings as any), voice: selectedVoice },
          () => setIsSpeaking(false),
          (error: any) => {
            console.error("TTS error:", error)
            try {
              alert("Text-to-speech error: " + (error?.message || error))
            } catch (err) {
              // ignore
            }
            setIsSpeaking(false)
          },
        )
      } catch (e) {
        console.error("Failed to start TTS", e)
        try {
          alert("Failed to start text-to-speech: " + (e as any)?.message || e)
        } catch (err) {
          // ignore
        }
        setIsSpeaking(false)
      }
    },
    [onSpeakResponse, voiceSettings, ttsSupported, getSelectedVoice],
  )

  const handleStopSpeaking = useCallback(() => {
    try {
      ttsServiceRef.current?.stop()
    } catch (e) {
      console.warn("Failed to stop TTS", e)
    }
    setIsSpeaking(false)
  }, [])

  // keyboard shortcut: press 'v' to toggle listening (when focused on page)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ignore if user is typing in an input/textarea or content editable
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName?.toLowerCase()
        const editable = target.getAttribute?.("contenteditable")
        if (tag === "input" || tag === "textarea" || editable === "true") return
      }

      if (e.key.toLowerCase() === "v") {
        e.preventDefault()
        if (!isEnabled) return
        if (isListening) handleStopListening()
        else handleStartListening()
      }
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [handleStartListening, handleStopListening, isListening, isEnabled])

  if (!isEnabled) return null

  // derive selected voice name for display
  const selectedVoice = getSelectedVoice()
  const selectedVoiceName = selectedVoice?.name || selectedVoice?.voiceURI || "Default"

  return (
    <div className="space-y-3">
      {/* Voice Activity Indicator */}
      {(isListening || interimTranscript) && (
        <Card className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isListening ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                {isListening ? "Listening..." : "Processing..."}
              </span>
              {isRecording && <span className="text-xs text-green-600 dark:text-green-400">{duration}s</span>}
            </div>

            {/* Audio Level Indicator */}
            {isRecording && (
              <div className="flex items-center space-x-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 h-4 rounded-full transition-all duration-100 ${
                      audioLevel > i * 0.2 ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {interimTranscript && (
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 italic">"{interimTranscript}"</p>
          )}
        </Card>
      )}

      {/* Voice Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Microphone Control */}
          <Button
            variant={isListening ? "destructive" : "outline"}
            size="sm"
            onClick={isListening ? handleStopListening : handleStartListening}
            className={isListening ? "animate-pulse" : ""}
            disabled={!srSupported}
            title={!srSupported ? "Speech recognition not supported" : "Toggle voice input (shortcut: V)"}
          >
            {isListening ? (
              <>
                <Square className="h-4 w-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-2" />
                Voice
              </>
            )}
          </Button>

          {/* Speaker Control */}
          <Button
            variant={isSpeaking ? "destructive" : "outline"}
            size="sm"
            onClick={
              isSpeaking
                ? handleStopSpeaking
                : () => handleSpeakResponse("This is a test of the text to speech functionality.")
            }
            disabled={!ttsSupported}
            title={!ttsSupported ? "Text to speech not supported" : "Play a test response"}
          >
            {isSpeaking ? (
              <>
                <VolumeX className="h-4 w-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4 mr-2" />
                Speak
              </>
            )}
          </Button>

          {/* Show selected voice name */}
          <div className="ml-2 text-xs text-muted-foreground">
            {ttsSupported ? (
              availableVoices.length ? (
                <span title={selectedVoiceName}>Voice: {selectedVoiceName}</span>
              ) : (
                <span>Loading voices...</span>
              )
            ) : (
              <span>Speech not supported</span>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Voice Settings Dialog */}
      {showSettings && (
        <VoiceSettingsDialog
          // VoiceSettingsDialog expects a settings object with a 'voice' property (SpeechSynthesisVoice | null)
          settings={{ ...voiceSettings, voice: getSelectedVoice() }}
          availableVoices={availableVoices}
          onSave={(s: any) => {
            try {
              // s.voice might be an object; persist its voiceURI or name as voiceId
              const newVoiceId = s?.voice?.voiceURI || s?.voice?.name || null
              const newSettings = {
                rate: s.rate ?? voiceSettings.rate,
                pitch: s.pitch ?? voiceSettings.pitch,
                volume: s.volume ?? voiceSettings.volume,
                autoSpeak: s.autoSpeak ?? voiceSettings.autoSpeak,
                voiceId: newVoiceId,
              }
              setVoiceSettings(newSettings)
            } catch (e) {
              console.warn("Failed to save voice settings", e)
            }

            setShowSettings(false)
          }}
          onClose={() => setShowSettings(false)}
          ttsService={ttsServiceRef.current}
        />
      )}
    </div>
  )
}
