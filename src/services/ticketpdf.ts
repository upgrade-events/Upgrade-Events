// =============================================
// TICKET PDF GENERATOR
// =============================================
//
// Dependências necessárias:
// npm install jspdf qrcode
// npm install --save-dev @types/qrcode
//
// =============================================

import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'

interface TicketPdfData {
  ticketId: number
  ticketNumber: number
  validationCode: string
  ticketEmail: string
  eventName: string
  eventDate: string
  eventLocation: string
  tableName: string
  busGo?: { location: string; time: string } | null
  busCome?: { location: string; time: string } | null
  restrictions?: string
  logoUrl?: string
}

// Cores do branding
const COLORS = {
  black: '#020202',
  gold: '#F9B234',
  white: '#FFFFFF',
  gray: '#666666',
  lightGray: '#B5B5B5'
}

// Converter hex para RGB
const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result 
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0]
}

// Formatar data para português
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const formatTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDateTime = (dateString: string): string => {
  return `${formatDate(dateString)} às ${formatTime(dateString)}`
}

// Gerar QR Code como Data URL
const generateQRCode = async (data: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(data, {
      width: 200,
      margin: 1,
      color: {
        dark: COLORS.black,
        light: COLORS.white
      },
      errorCorrectionLevel: 'M'
    })
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error)
    throw error
  }
}

// Carregar imagem como Data URL
const loadImageAsDataUrl = async (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = url
  })
}

// Gerar PDF do bilhete
export const generateTicketPdf = async (data: TicketPdfData): Promise<Blob> => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - (margin * 2)

  let yPosition = margin

  // ========== HEADER (Fundo preto) ==========
  pdf.setFillColor(...hexToRgb(COLORS.black))
  pdf.rect(0, 0, pageWidth, 50, 'F')

  // Logo (se disponível)
  try {
    const logoUrl = data.logoUrl || '/logo.png'
    const logoDataUrl = await loadImageAsDataUrl(logoUrl)
    pdf.addImage(logoDataUrl, 'PNG', margin, 12, 50, 26)
  } catch (error) {
    // Se não conseguir carregar o logo, mostrar texto
    pdf.setTextColor(...hexToRgb(COLORS.gold))
    pdf.setFontSize(24)
    pdf.setFont('helvetica', 'bold')
    pdf.text('UPGRADE', margin, 30)
  }

  // QR Code no header (lado direito)
  const qrCodeDataUrl = await generateQRCode(data.validationCode)
  const qrSize = 35
  pdf.addImage(qrCodeDataUrl, 'PNG', pageWidth - margin - qrSize, 7.5, qrSize, qrSize)

  yPosition = 60

  // ========== TÍTULO DO EVENTO ==========
  pdf.setTextColor(...hexToRgb(COLORS.black))
  pdf.setFontSize(24)
  pdf.setFont('helvetica', 'bold')
  
  // Quebrar título se for muito longo
  const titleLines = pdf.splitTextToSize(data.eventName, contentWidth)
  pdf.text(titleLines, margin, yPosition)
  yPosition += (titleLines.length * 10) + 5

  // Data do evento
  pdf.setTextColor(...hexToRgb(COLORS.gray))
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'normal')
  pdf.text(formatDateTime(data.eventDate), margin, yPosition)
  yPosition += 15

  // ========== LINHA SEPARADORA DOURADA ==========
  pdf.setDrawColor(...hexToRgb(COLORS.gold))
  pdf.setLineWidth(2)
  pdf.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 15

  // ========== INFORMAÇÕES DO BILHETE ==========
  const infoBoxHeight = 100
  
  // Fundo cinza claro para a caixa de info
  pdf.setFillColor(250, 250, 250)
  pdf.roundedRect(margin, yPosition, contentWidth, infoBoxHeight, 5, 5, 'F')

  const infoX = margin + 10
  let infoY = yPosition + 15

  // Número do Bilhete
  pdf.setTextColor(...hexToRgb(COLORS.lightGray))
  pdf.setFontSize(10)
  pdf.text('N° BILHETE', infoX, infoY)
  pdf.setTextColor(...hexToRgb(COLORS.black))
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text(`#${data.ticketId}`, infoX, infoY + 6)
  
  // Participante
  pdf.setTextColor(...hexToRgb(COLORS.lightGray))
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text('PARTICIPANTE', infoX + 60, infoY)
  pdf.setTextColor(...hexToRgb(COLORS.black))
  pdf.setFontSize(12)
  pdf.text(data.ticketEmail, infoX + 60, infoY + 6)

  infoY += 25

  // Local
  pdf.setTextColor(...hexToRgb(COLORS.lightGray))
  pdf.setFontSize(10)
  pdf.text('LOCAL', infoX, infoY)
  pdf.setTextColor(...hexToRgb(COLORS.gold))
  pdf.setFontSize(16)
  const locationLines = pdf.splitTextToSize(data.eventLocation, 80)
  pdf.text(locationLines, infoX, infoY + 6)

  // Mesa
  pdf.setTextColor(...hexToRgb(COLORS.lightGray))
  pdf.setFontSize(10)
  pdf.text('MESA', infoX + 100, infoY)
  pdf.setTextColor(...hexToRgb(COLORS.gold))
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.text(data.tableName, infoX + 100, infoY + 7)

  infoY += 30

  // Restrições alimentares (se existirem)
  if (data.restrictions) {
    pdf.setTextColor(...hexToRgb(COLORS.lightGray))
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text('RESTRIÇÕES ALIMENTARES', infoX, infoY)
    pdf.setTextColor(...hexToRgb(COLORS.black))
    pdf.setFontSize(11)
    pdf.text(data.restrictions, infoX, infoY + 6)
  }

  yPosition += infoBoxHeight + 15

  // ========== AUTOCARROS (se aplicável) ==========
  if (data.busGo || data.busCome) {
    pdf.setFillColor(...hexToRgb(COLORS.gold))
    pdf.roundedRect(margin, yPosition, contentWidth, 8, 2, 2, 'F')
    pdf.setTextColor(...hexToRgb(COLORS.black))
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.text('TRANSPORTE', margin + 5, yPosition + 5.5)
    yPosition += 15

    const busBoxWidth = (contentWidth - 10) / 2

    // Autocarro Ida
    if (data.busGo) {
      pdf.setFillColor(250, 250, 250)
      pdf.roundedRect(margin, yPosition, busBoxWidth, 35, 3, 3, 'F')
      
      pdf.setTextColor(...hexToRgb(COLORS.gold))
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.text('IDA', margin + 5, yPosition + 8)
      
      pdf.setTextColor(...hexToRgb(COLORS.black))
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'normal')
      pdf.text(data.busGo.location, margin + 5, yPosition + 18)
      
      pdf.setTextColor(...hexToRgb(COLORS.gray))
      pdf.setFontSize(10)
      const busGoTime = new Date(data.busGo.time)
      pdf.text(
        `${busGoTime.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })} às ${busGoTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`,
        margin + 5, 
        yPosition + 28
      )
    }

    // Autocarro Volta
    if (data.busCome) {
      const voltaX = margin + busBoxWidth + 10
      pdf.setFillColor(250, 250, 250)
      pdf.roundedRect(voltaX, yPosition, busBoxWidth, 35, 3, 3, 'F')
      
      pdf.setTextColor(...hexToRgb(COLORS.gold))
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.text('VOLTA', voltaX + 5, yPosition + 8)
      
      pdf.setTextColor(...hexToRgb(COLORS.black))
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'normal')
      pdf.text(data.busCome.location, voltaX + 5, yPosition + 18)
      
      pdf.setTextColor(...hexToRgb(COLORS.gray))
      pdf.setFontSize(10)
      const busComeTime = new Date(data.busCome.time)
      pdf.text(
        `${busComeTime.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })} às ${busComeTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`,
        voltaX + 5, 
        yPosition + 28
      )
    }

    yPosition += 45
  }


  // ========== FOOTER ==========
  const footerY = pageHeight - 20
  pdf.setDrawColor(...hexToRgb(COLORS.gold))
  pdf.setLineWidth(0.5)
  pdf.line(margin, footerY - 10, pageWidth - margin, footerY - 10)

  pdf.setTextColor(...hexToRgb(COLORS.lightGray))
  pdf.setFontSize(9)
  pdf.text('Este bilhete é pessoal e intransmissível.', pageWidth / 2, footerY, { align: 'center' })

  // Retornar como Blob
  return pdf.output('blob')
}

// Gerar e fazer download do PDF (para teste)
export const downloadTicketPdf = async (data: TicketPdfData): Promise<void> => {
  const blob = await generateTicketPdf(data)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `bilhete-${data.ticketId}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}