import React from 'react'
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer'
import QRCode from 'qrcode'
import { storeWhatsAppDeepLink } from '@/modules/stores/whatsapp-link'

export type QrStoreCard = {
  code: string
  name: string
  waLink: string
  qrDataUrl: string
}

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 11,
  },
  title: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#e8e8e4',
    borderRadius: 6,
    padding: 10,
    marginBottom: 14,
    alignItems: 'center',
  },
  qr: {
    width: 140,
    height: 140,
    marginBottom: 8,
  },
  name: {
    fontSize: 12,
    marginBottom: 2,
    textAlign: 'center',
  },
  code: {
    fontSize: 10,
    color: '#555',
    marginBottom: 4,
  },
  link: {
    fontSize: 7,
    color: '#888',
    textAlign: 'center',
  },
})

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

function QrBatchDocument({
  cards,
  title,
}: {
  cards: QrStoreCard[]
  title: string
}) {
  const pages = chunk(cards, 6)
  return (
    <Document>
      {pages.map((pageCards, pageIdx) => (
        <Page key={pageIdx} size="A4" style={styles.page}>
          {pageIdx === 0 ? <Text style={styles.title}>{title}</Text> : null}
          <View style={styles.grid}>
            {pageCards.map((c) => (
              <View key={c.code} style={styles.card} wrap={false}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image */}
                <Image src={c.qrDataUrl} style={styles.qr} />
                <Text style={styles.name}>{c.name}</Text>
                <Text style={styles.code}>חנות {c.code}</Text>
                <Text style={styles.link}>{c.waLink}</Text>
              </View>
            ))}
          </View>
        </Page>
      ))}
    </Document>
  )
}

export async function buildStoresQrPdf(
  stores: { code: string; name: string }[],
  businessPhone: string,
): Promise<Buffer> {
  const cards: QrStoreCard[] = await Promise.all(
    stores.map(async (s) => {
      const waLink = storeWhatsAppDeepLink(s.code, businessPhone)
      const qrDataUrl = await QRCode.toDataURL(waLink, {
        margin: 1,
        width: 280,
        errorCorrectionLevel: 'M',
      })
      return { code: s.code, name: s.name, waLink, qrDataUrl }
    }),
  )

  return renderToBuffer(
    <QrBatchDocument
      cards={cards}
      title={`Optical Center — QR לכל החנויות (${cards.length})`}
    />,
  )
}
