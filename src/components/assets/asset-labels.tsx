'use client'

import { useEffect, useRef } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buildAssetQrPayload } from '@/modules/assets/barcode'
import { assetWhatsAppPrefill } from '@/modules/assets/service'

type Props = {
  code: string
  name: string
  barcode?: string | null
  storeCode?: string
}

function Code128Svg({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    let cancelled = false
    async function draw() {
      if (!ref.current || !value) return
      try {
        const JsBarcode = (await import('jsbarcode')).default
        if (cancelled || !ref.current) return
        JsBarcode(ref.current, value, {
          format: 'CODE128',
          displayValue: true,
          fontSize: 13,
          height: 56,
          margin: 8,
          width: 1.6,
        })
      } catch {
        if (ref.current) ref.current.innerHTML = ''
      }
    }
    void draw()
    return () => {
      cancelled = true
    }
  }, [value])

  return (
    <svg
      ref={ref}
      className="max-w-full"
      role="img"
      aria-label={`ברקוד ${value}`}
    />
  )
}

/**
 * Printable asset labels: product Code128 + Optical asset QR payload.
 * WhatsApp QR remains available separately via store QR API.
 */
export function AssetLabels({ code, name, barcode, storeCode }: Props) {
  const qrWrapRef = useRef<HTMLDivElement>(null)
  const barcodeWrapRef = useRef<HTMLDivElement>(null)
  const labelValue = (barcode?.trim() || code).toUpperCase()
  const assetQr = buildAssetQrPayload(code)

  function downloadQr() {
    const canvas = qrWrapRef.current?.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `${code}-asset-qr.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  function downloadBarcode() {
    const svg = barcodeWrapRef.current?.querySelector('svg')
    if (!svg) return
    const blob = new Blob([svg.outerHTML], {
      type: 'image/svg+xml;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `${code}-barcode.svg`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface-sunken/40 p-4">
        <p className="t-caption text-ink-3">Code 128 · ברקוד מוצר</p>
        <div ref={barcodeWrapRef}>
          <Code128Svg value={labelValue} />
        </div>
        <p className="t-body-strong text-center text-ink">{name}</p>
        <p className="t-caption t-num text-ink-3" dir="ltr">
          {labelValue}
          {barcode && barcode.toUpperCase() !== code.toUpperCase()
            ? ` · code ${code}`
            : ''}
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={downloadBarcode}>
          <Download className="h-3.5 w-3.5" aria-hidden />
          הורדת ברקוד
        </Button>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface-sunken/40 p-4">
        <p className="t-caption text-ink-3">QR · תווית נכס (optical:asset)</p>
        <div ref={qrWrapRef}>
          <AssetQrCanvas value={assetQr} />
        </div>
        <p className="t-caption t-num text-ink-3" dir="ltr">
          {assetQr}
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={downloadQr}>
          <Download className="h-3.5 w-3.5" aria-hidden />
          הורדת QR נכס
        </Button>
      </div>

      {storeCode ? (
        <p className="t-meta text-center text-ink-3">
          QR ל־WhatsApp נשאר נפרד בפעולת QR בשורה ·{' '}
          <span className="t-num" dir="ltr">
            {assetWhatsAppPrefill(storeCode, code)}
          </span>
        </p>
      ) : null}
    </div>
  )
}

function AssetQrCanvas({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false
    async function draw() {
      if (!canvasRef.current || !value) return
      try {
        const QRCode = await import('qrcode')
        if (cancelled || !canvasRef.current) return
        await QRCode.toCanvas(canvasRef.current, value, {
          width: 160,
          margin: 2,
          errorCorrectionLevel: 'M',
        })
      } catch {
        /* ignore */
      }
    }
    void draw()
    return () => {
      cancelled = true
    }
  }, [value])

  return (
    <canvas
      ref={canvasRef}
      className="rounded-[var(--radius-md)] border border-border bg-surface"
      aria-label={`QR ${value}`}
    />
  )
}
