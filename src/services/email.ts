// =============================================
// EMAIL SERVICE - Via Supabase Edge Function
// =============================================
//
// Envia emails com QR Code através da Edge Function
// O QR Code é gerado na Edge Function (não no frontend)
//
// =============================================

import { supabase } from '../supabaseClient'

interface TicketEmailData {
  ticketId: number
  validationCode: string
  ticketEmail: string
  eventName: string
  eventDate: string
  eventLocation: string
  tableName: string
  busGo?: { location: string; time: string } | null
  busCome?: { location: string; time: string } | null
  restrictions?: string
}

export const sendTicketEmail = async (data: TicketEmailData): Promise<boolean> => {
  try {
    console.log(`Enviando email para: ${data.ticketEmail}`)

    // Formatar datas dos autocarros
    const formatBusTime = (time: string) => {
      const date = new Date(time)
      return date.toLocaleString('pt-PT', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const ticketData = {
      ticketId: data.ticketId,
      validationCode: data.validationCode,
      eventName: data.eventName,
      eventDate: data.eventDate,
      eventLocation: data.eventLocation,
      tableName: data.tableName,
      busGo: data.busGo ? {
        location: data.busGo.location,
        time: formatBusTime(data.busGo.time)
      } : null,
      busCome: data.busCome ? {
        location: data.busCome.location,
        time: formatBusTime(data.busCome.time)
      } : null,
      restrictions: data.restrictions
    }

    const { data: responseData, error } = await supabase.functions.invoke('send-ticket-email', {
      body: {
        to: data.ticketEmail,
        subject: `🎫 O teu bilhete para ${data.eventName}`,
        ticketData
      }
    })

    if (error) {
      console.error('Erro ao chamar Edge Function:', error)
      throw new Error(error.message || 'Erro ao enviar email')
    }

    if (responseData?.error) {
      console.error('Erro retornado pela Edge Function:', responseData.error)
      throw new Error(responseData.error)
    }

    console.log('Email enviado com sucesso:', responseData)
    return true
  } catch (error: any) {
    console.error('Erro ao enviar email:', error)
    throw error
  }
}