'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { ScanBarcode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/overlay'
import { normalizeBarcode } from '@/modules/assets/barcode'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScan: (value: string) => void
  title?: string
  description?: string
}

/**
 * Live camera barcode scanner for product / serial codes (1D).
 * Uses @zxing/browser. Manual entry remains available if the camera fails.
 */
export function BarcodeScannerModal({
  open,
  onOpenChange,
  onScan,
  title = 'סריקת ברקוד',
  description = 'כוונו את המצלמה לברקוד המוצר — לא לקוד QR של WhatsApp.',
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onScanRef = useRef(onScan)
  const onOpenChangeRef = useRef(onOpenChange)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [manual, setManual] = useState('')
  const handledRef = useRef(false)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  }, [onOpenChange])

  useEffect(() => {
    if (!open) return

    handledRef.current = false
    setError(null)
    setManual('')
    setStarting(true)

    let cancelled = false
    let controls: { stop: () => void } | null = null
    let videoEl: HTMLVideoElement | null = null

    async function start() {
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
        ])
        hints.set(DecodeHintType.TRY_HARDER, true)

        const reader = new BrowserMultiFormatReader(hints)
        videoEl = videoRef.current
        if (cancelled || !videoEl) return

        controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoEl,
          (result, _err, ctrl) => {
            if (!result || handledRef.current || cancelled) return
            const value = normalizeBarcode(result.getText())
            if (!value) return
            handledRef.current = true
            ctrl.stop()
            onScanRef.current(value)
            onOpenChangeRef.current(false)
          },
        )
      } catch (err) {
        if (cancelled) return
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
        if (!cancelled) setStarting(false)
      }
    }

    void start()

    return () => {
      cancelled = true
      controls?.stop()
      const stream = videoEl?.srcObject
      if (stream instanceof MediaStream) {
        for (const track of stream.getTracks()) track.stop()
      }
      if (videoEl) videoEl.srcObject = null
    }
  }, [open])

  function submitManual(e: FormEvent) {
    e.preventDefault()
    const value = normalizeBarcode(manual)
    if (!value) return
    onScan(value)
    onOpenChange(false)
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      className="w-[min(94vw,520px)]"
    >
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
            ברקוד מוצר (EAN / UPC / Code128) — לא סורקים QR של WhatsApp כאן.
          </p>
        )}

        <form onSubmit={submitManual} className="space-y-3">
          <Field label="הקלדה ידנית" htmlFor="barcode-manual">
            <Input
              id="barcode-manual"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="הדביקו או הקלידו ברקוד"
              dir="ltr"
              autoComplete="off"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              ביטול
            </Button>
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
    </Modal>
  )
}
