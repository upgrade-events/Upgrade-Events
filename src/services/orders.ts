import { supabase } from '../supabaseClient'

export interface Order {
  id: number
  user_id: string
  event_id: number
  total_amount: number
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'expired'
  payment_proof_url?: string
  payment_submitted_at?: string
  created_at: string
  updated_at: string
  events?: {
    id: number
    name: string
    location: string
    date_hour: string
    price_bus: number
    price_no_bus: number
    payment_iban?: string
    payment_mbway?: string
    payment_name?: string
  }
  users?: {
    name: string
    email: string
  }
  tickets?: any[]
}

// Criar uma nova order
export const createOrder = async (orderData: {
  user_id: string
  event_id: number
  total_amount: number
}) => {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      ...orderData,
      status: 'pending'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Obter order por ID
export const getOrderById = async (id: number) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      events (id, name, location, date_hour, price_bus, price_no_bus, payment_iban, payment_mbway, payment_name),
      tickets (*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Obter orders do utilizador
export const getOrdersByUser = async (userId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      events (id, name, location, date_hour, price_bus, price_no_bus, payment_iban, payment_mbway, payment_name),
      tickets (
        *,
        tables (name),
        bus_go:bus!bus_go_id (location, time),
        bus_come:bus!bus_come_id (location, time)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Obter orders de eventos do owner
export const getOrdersByOwner = async (ownerId: string) => {
  // Primeiro buscar os eventos do owner
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id')
    .eq('owner_id', ownerId)

  if (eventsError) throw eventsError

  const eventIds = events?.map(e => e.id) || []

  if (eventIds.length === 0) return []

  // Buscar orders desses eventos
  // CORRIGIDO: Especificar users!user_id para evitar ambiguidade com tickets_sent_by
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      users!user_id(name, email),
      events(id, name),
      tickets(id, ticket_email, restrictions, tables(name), bus_go:bus!bus_go_id(location, time), bus_come:bus!bus_come_id(location, time))
    `)
    .in('event_id', eventIds)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}


// Obter orders pendentes com comprovativo (para owner validar)
export const getPendingOrdersWithProof = async (ownerId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      events!inner (id, name, date_hour, owner_id),
      users!user_id (name, email),
      tickets (*, tables (name))
    `)
    .eq('events.owner_id', ownerId)
    .eq('status', 'pending')
    .not('payment_proof_url', 'is', null)
    .order('payment_submitted_at', { ascending: true })

  if (error) throw error
  return data || []
}

// Submeter comprovativo de pagamento
export const submitPaymentProof = async (orderId: number, proofUrl: string) => {
  const { data, error } = await supabase
    .from('orders')
    .update({
      payment_proof_url: proofUrl,
      payment_submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Confirmar order (owner aprova pagamento)
export const confirmOrder = async (orderId: number) => {
  // 1. Atualizar status da order para confirmed
  const { error: orderError } = await supabase
    .from('orders')
    .update({ 
      status: 'confirmed',
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)

  if (orderError) throw orderError

  // 2. Atualizar status dos tickets para confirmed (mas NÃO available_for_download)
  const { error: ticketsError } = await supabase
    .from('tickets')
    .update({ 
      status: 'confirmed'
    })
    .eq('order_id', orderId)

  if (ticketsError) throw ticketsError

  return { success: true }
}

export const sendOrderTickets = async (orderId: number, adminUserId: string) => {
  // 1. Atualizar order como enviada
  const { error: orderError } = await supabase
    .from('orders')
    .update({
      tickets_sent: true,
      tickets_sent_at: new Date().toISOString(),
      tickets_sent_by: adminUserId
    })
    .eq('id', orderId)

  if (orderError) throw orderError

  // 2. Atualizar tickets como disponíveis para download
  const { error: ticketsError } = await supabase
    .from('tickets')
    .update({
      available_for_download: true,
      sent_at: new Date().toISOString()
    })
    .eq('order_id', orderId)

  if (ticketsError) throw ticketsError

  // TODO: Chamar Edge Function para enviar emails
  // await supabase.functions.invoke('send-tickets-email', { body: { orderId } })

  return { success: true }
}



// Confirmar order E enviar emails com bilhetes
// Esta função deve ser chamada no Owner.tsx
export const confirmOrderAndSendTickets = async (orderId: number): Promise<{ success: boolean; emailsSent: number; errors: string[] }> => {
  const errors: string[] = []
  let emailsSent = 0

  try {
    // 1. Confirmar a order
    await confirmOrder(orderId)

    // 2. Importar funções necessárias (lazy import para evitar circular deps)
    const { assignValidationCodesToOrder, getTicketsForPdf } = await import('./tickets')
    const { sendTicketEmail } = await import('./email')

    // 3. Atribuir códigos de validação
    await assignValidationCodesToOrder(orderId)

    // 4. Buscar tickets atualizados com códigos
    const tickets = await getTicketsForPdf(orderId)

    // 5. Enviar email para cada ticket
    for (const ticket of tickets) {
      try {
        // Formatar data para o email
        const eventDate = new Date(ticket.events?.date_hour || '').toLocaleDateString('pt-PT', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })

        // Enviar email (QR Code é gerado na Edge Function)
        await sendTicketEmail({
          ticketId: ticket.id,
          validationCode: ticket.validation_code,
          ticketEmail: ticket.ticket_email,
          eventName: ticket.events?.name || 'Evento',
          eventDate,
          eventLocation: ticket.events?.location || '',
          tableName: ticket.tables?.name || 'N/A',
          busGo: ticket.bus_go,
          busCome: ticket.bus_come,
          restrictions: ticket.restrictions
        })
        emailsSent++
        console.log(`Email enviado para ${ticket.ticket_email}`)
      } catch (emailError: any) {
        console.error(`Erro ao enviar email para ${ticket.ticket_email}:`, emailError)
        errors.push(`${ticket.ticket_email}: ${emailError.message || 'Erro desconhecido'}`)
      }
    }

    return { success: true, emailsSent, errors }
  } catch (error: any) {
    console.error('Erro ao confirmar order:', error)
    throw error
  }
}

// Rejeitar order
export const rejectOrder = async (orderId: number) => {
  // 1. Buscar a order com tickets para restaurar quantidades
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('*, tickets(*)')
    .eq('id', orderId)
    .single()

  if (fetchError) throw fetchError

  // 2. Atualizar status da order
  const { error: orderError } = await supabase
    .from('orders')
    .update({ 
      status: 'rejected',
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)

  if (orderError) throw orderError

  // 3. Atualizar status dos tickets
  const { error: ticketsError } = await supabase
    .from('tickets')
    .update({ status: 'rejected' })
    .eq('order_id', orderId)

  if (ticketsError) throw ticketsError

  // 4. Restaurar bilhetes disponíveis no evento
  if (order.tickets && order.tickets.length > 0) {
    const { error: eventError } = await supabase.rpc('increment_available_tickets', {
      p_event_id: order.event_id,
      p_amount: order.tickets.length
    })
    
    // Se a função RPC não existir, fazer manualmente
    if (eventError) {
      const { data: event } = await supabase
        .from('events')
        .select('available_tickets')
        .eq('id', order.event_id)
        .single()
      
      if (event) {
        await supabase
          .from('events')
          .update({ available_tickets: event.available_tickets + order.tickets.length })
          .eq('id', order.event_id)
      }
    }
  }

  return { success: true }
}


// Cancelar order (pelo utilizador)
export const cancelOrder = async (orderId: number) => {
  // 1. Obter dados da order
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('event_id, status, tickets(id)')
    .eq('id', orderId)
    .single()

  if (fetchError) throw fetchError

  // Só pode cancelar se estiver pendente
  if (order.status !== 'pending') {
    throw new Error('Só é possível cancelar encomendas pendentes')
  }

  // 2. Atualizar status da order
  const { error: orderError } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)

  if (orderError) throw orderError

  // 3. Atualizar status dos tickets
  const { error: ticketsError } = await supabase
    .from('tickets')
    .update({ status: 'cancelled' })
    .eq('order_id', orderId)

  if (ticketsError) throw ticketsError

  // 4. Restaurar bilhetes disponíveis
  const ticketCount = order.tickets?.length || 0
  if (ticketCount > 0) {
    const { data: event } = await supabase
      .from('events')
      .select('available_tickets')
      .eq('id', order.event_id)
      .single()

    if (event) {
      await supabase
        .from('events')
        .update({ available_tickets: event.available_tickets + ticketCount })
        .eq('id', order.event_id)
    }
  }

  return true
}

// Contar bilhetes ativos do utilizador para um evento (pending + confirmed)
export const countUserTicketsForEvent = async (userId: string, eventId: number): Promise<number> => {
  const { data, error } = await supabase
    .from('orders')
    .select('tickets(id)')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .in('status', ['pending', 'confirmed'])

  if (error) throw error

  // Contar total de tickets em todas as orders ativas
  let totalTickets = 0
  data?.forEach(order => {
    totalTickets += order.tickets?.length || 0
  })

  return totalTickets
}

// Upload de comprovativo para storage
export const uploadOrderPaymentProof = async (file: File, orderId: number): Promise<string> => {
  const fileExt = file.name.split('.').pop()
  const filePath = `order-${orderId}/${Date.now()}.${fileExt}`

  const { error } = await supabase.storage
    .from('payment-proofs')
    .upload(filePath, file)

  if (error) throw error

  const { data } = supabase.storage
    .from('payment-proofs')
    .getPublicUrl(filePath)

  return data.publicUrl
}

// Apagar comprovativo antigo do storage
export const deleteOldPaymentProof = async (proofUrl: string): Promise<void> => {
  try {
    // Extrair path do URL
    // URL format: https://xxx.supabase.co/storage/v1/object/public/payment-proofs/order-123/timestamp.ext
    const urlParts = proofUrl.split('/payment-proofs/')
    if (urlParts.length < 2) return
    
    const filePath = urlParts[1]
    
    await supabase.storage
      .from('payment-proofs')
      .remove([filePath])
  } catch (error) {
    // Ignorar erros ao apagar - ficheiro pode não existir
    console.warn('Erro ao apagar comprovativo antigo:', error)
  }
}

// Substituir comprovativo de pagamento (apaga o antigo e faz upload do novo)
export const replacePaymentProof = async (orderId: number, newFile: File, oldProofUrl?: string): Promise<string> => {
  // 1. Apagar comprovativo antigo se existir
  if (oldProofUrl) {
    await deleteOldPaymentProof(oldProofUrl)
  }

  // 2. Fazer upload do novo comprovativo
  const newProofUrl = await uploadOrderPaymentProof(newFile, orderId)

  // 3. Atualizar a order com o novo URL
  await submitPaymentProof(orderId, newProofUrl)

  return newProofUrl
}

// CORRIGIDO: Especificar users!user_id para evitar ambiguidade com tickets_sent_by
export const getConfirmedOrders = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      users!user_id(name, email),
      events(id, name, date_hour, location),
      tickets(id, ticket_email, type, status)
    `)
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}