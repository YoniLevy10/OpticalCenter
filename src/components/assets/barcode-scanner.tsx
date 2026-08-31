'use client'

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { ScanBarcode, SwitchCamera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/overlay'
import {
  extractAssetCodeFromPayload,
  normalizeBarcode,
} from '@/modules/assets/barcode'

const DEBOUNCE_MS = 1500

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScan: (value: string) => void
  title?: string
  description?: string
  /** Keep camera open and fire onScan with debounce (mobile continuous mode). */
  continuous?: boolean
}

type CamDevice = { deviceId: string; label: string }

/**
 * Live camera barcode scanner — MediTactic patterns:
 * debounce, rear camera preference, camera switch, manual wedge entry.
 */
export function BarcodeScannerModal({
  open,
  onOpenChange,
  onScan,
  title = 'סריקת ברקוד',
  description = 'כוונו לברקוד מוצר / Code128 — או לתווית optical:asset.',
  continuous = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onScanRef = useRef(onScan)
  const onOpenChangeRef = useRef(onOpenChange)
  const lastScanRef = useRef({ code: '', at: 0 })
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [manual, setManual] = useState('')
  const [cameras, setCameras] = useState<CamDevice[]>([])
  const [cameraIndex, setCameraIndex] = useState(0)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  }, [onOpenChange])

  const emitScan = useCallback(
    (raw: string) => {
      const value = extractAssetCodeFromPayload(raw)
      if (!value) return false
      const now = Date.now()
      if (
        lastScanRef.current.code === value &&
        now - lastScanRef.current.at < DEBOUNCE_MS
      ) {
        return false
      }
      lastScanRef.current = { code: value, at: now }
      onScanRef.current(value)
      if (!continuous) onOpenChangeRef.current(false)
      return true
    },
    [continuous],
  )

  const stopControls = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
    const video = videoRef.current
    const stream = video?.srcObject
    if (stream instanceof MediaStream) {
      for (const track of stream.getTracks()) track.stop()
    }
    if (video) video.srcObject = null
  }, [])

  const startWithDevice = useCallback(
    async (deviceId: string | undefined) => {
      stopControls()
      setStarting(true)
      setError(null)

      try {
        const { BrowserMultiFormatReader, BarcodeFormat } = await import(
          '@zxing/browser'
        )
        const { DecodeHintType } = await import('@zxing/library')

        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.CODE_93,
          BarcodeFormat.ITF,
          BarcodeFormat.CODABAR,
          BarcodeFormat.RSS_14,
          BarcodeFormat.RSS_EXPANDED,
          BarcodeFormat.QR_CODE,
        ])
        hints.set(DecodeHintType.TRY_HARDER, true)

        const reader = new BrowserMultiFormatReader(hints)
        const videoEl = videoRef.current
        if (!videoEl) return

        controlsRef.current = await reader.decodeFromVideoDevice(
          deviceId,
          videoEl,
          (result) => {
            if (!result) return
            emitScan(result.getText())
            if (!continuous) controlsRef.current?.stop()
          },
        )
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'לא ניתן לפתוח את המצלמה'
        if (/Permission|NotAllowed|denied/i.test(message)) {
          setError('אין הרשאת מצלמה — אפשר להקליד את הברקוד ידנית.')
        } else if (/NotFound|DevicesNotFound|Requested device/i.test(message)) {
          setError('לא נמצאה מצלמה במכשיר — הקלידו את הברקוד ידנית.')
        } else {
          setError('הסריקה נכשלה — הקלידו את הברקוד ידנית.')
        }
      } finally {
        setStarting(false)
      }
    },
    [continuous, emitScan, stopControls],
  )

  useEffect(() => {
    if (!open) return

    lastScanRef.current = { code: '', at: 0 }
    setManual('')
    setError(null)
    let cancelled = false

    async function boot() {
      try {
        // Probe permission so labels populate in enumerateDevices.
        const probe = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        for (const track of probe.getTracks()) track.stop()

        const devices = (await navigator.mediaDevices.enumerateDevices())
          .filter((d) => d.kind === 'videoinput' && d.deviceId)
          .map((d) => ({
            deviceId: d.deviceId,
            label: d.label || 'מצלמה',
          }))

        if (cancelled) return
        if (!devices.length) {
          setError('לא נמצאה מצלמה במכשיר — הקלידו את הברקוד ידנית.')
          return
        }

        setCameras(devices)
        const backIdx = devices.findIndex((d) =>
          /back|rear|environment|אחור/i.test(d.label),
        )
        const idx = backIdx >= 0 ? backIdx : devices.length - 1
        setCameraIndex(idx)
        await startWithDevice(devices[idx]?.deviceId)
      } catch (err) {
        if (cancelled) return
        const message =
          err instanceof Error ? err.message : 'שגיאת מצלמה'
        if (/Permission|NotAllowed|denied/i.test(message)) {
          setError('אין הרשאת מצלמה — אפשר להקליד את הברקוד ידנית.')
        } else {
          setError('הסריקה נכשלה — הקלידו את הברקוד ידנית.')
        }
      }
    }

    void boot()

    return () => {
      cancelled = true
      stopControls()
    }
  }, [open, startWithDevice, stopControls])

  async function switchCamera() {
    if (cameras.length < 2) return
    const next = (cameraIndex + 1) % cameras.length
    setCameraIndex(next)
    await startWithDevice(cameras[next]?.deviceId)
  }

  function submitManual(e: FormEvent) {
    e.preventDefault()
    const value = normalizeBarcode(manual)
    if (!value) return
    emitScan(value)
  }

  const body = (
    <div className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border bg-ink">
        <video
          ref={videoRef}
          className="aspect-[4/3] w-full object-cover"
          muted
          playsInline
          autoPlay
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="h-[42%] w-[72%] rounded-[var(--radius-md)] border-2 border-white/70 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]" />
        </div>
        {starting ? (
          <p className="t-caption absolute inset-x-0 bottom-3 text-center text-white/80">
            פותח מצלמה…
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="t-meta text-[var(--signal-warning)]" role="status">
          {error}
        </p>
      ) : (
        <p className="t-meta text-ink-3">
          EAN / UPC / Code128 / תווית optical:asset — לא QR של WhatsApp.
        </p>
      )}

      {cameras.length > 1 ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => void switchCamera()}
        >
          <SwitchCamera className="h-4 w-4" aria-hidden />
          החלף מצלמה
        </Button>
      ) : null}

      <form onSubmit={submitManual} className="space-y-3">
        <Field label="הקלדה ידנית / סורק USB" htmlFor="barcode-manual">
          <Input
            id="barcode-manual"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="הדביקו או סרקו עם סורק מקלדת"
            dir="ltr"
            autoComplete="off"
          />
        </Field>
        <div className="flex justify-end gap-2">
          {!continuous ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              ביטול
            </Button>
          ) : null}
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!manual.trim()}
          >
            <ScanBarcode className="h-3.5 w-3.5" aria-hidden />
            אישור
          </Button>
        </div>
      </form>
    </div>
  )

  if (continuous) {
    return open ? body : null
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      className="w-[min(94vw,520px)]"
    >
      {body}
    </Modal>
  )
}
