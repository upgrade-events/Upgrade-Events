import { supabase } from '../supabaseClient'

export const getTicketsByUser = async (userId: string) => {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      events (*),
      tables (*),
      orders (*),
      bus_go:bus!bus_go_id (*),
      bus_come:bus!bus_come_id (*)
    `)
    .eq('users_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export const getTicketById = async (id: number) => {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      events (*),
      users (*),
      tables (*),
      orders (*),
      bus_go:bus!bus_go_id (*),
      bus_come:bus!bus_come_id (*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export const getTicketsByOrder = async (orderId: number) => {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      tables (*),
      bus_go:bus!bus_go_id (*),
      bus_come:bus!bus_come_id (*)
    `)
    .eq('order_id', orderId)
    .order('id', { ascending: true })

  if (error) throw error
  return data || []
}

export const getAllTickets = async () => {
  const { data, error } = await supabase
    .from('tickets')
    .select('*, events(*), users(*), orders(*)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export const getPendingTickets = async () => {
  const { data, error } = await supabase
    .from('tickets')
    .select('*, events(*), users(*), orders(*)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export const createTicket = async (ticketData: {
  users_id: string
  event_id: number
  order_id: number
  bus_go_id?: number | null
  bus_come_id?: number | null
  table_id: number
  type: string
  status: string
  restrictions?: string
  ticket_email: string
}) => {
  const { data, error } = await supabase
    .from('tickets')
    .insert(ticketData)
    .select()
    .single()

  if (error) throw error
  return data
}

export const createMultipleTickets = async (tickets: {
  users_id: string
  event_id: number
  order_id: number
  bus_go_id?: number | null
  bus_come_id?: number | null
  table_id: number
  type: string
  status: string
  restrictions?: string
  ticket_email: string
}[]) => {
  const { data, error } = await supabase
    .from('tickets')
    .insert(tickets)
    .select()

  if (error) throw error
  return data
}

export const updateTicketStatus = async (id: number, status: string) => {
  const { data, error } = await supabase
    .from('tickets')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const updateTicketsByOrder = async (orderId: number, status: string) => {
  const { data, error } = await supabase
    .from('tickets')
    .update({ status })
    .eq('order_id', orderId)
    .select()

  if (error) throw error
  return data
}

export const approveTicket = async (id: number) => {
  return updateTicketStatus(id, 'confirmed')
}

export const rejectTicket = async (id: number) => {
  return updateTicketStatus(id, 'rejected')
}

export const deleteTicket = async (id: number) => {
  const { error } = await supabase
    .from('tickets')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Gerar código de validação único
export const generateValidationCode = (ticketId: number): string => {
  const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase()
  return `TKT-${ticketId}-${randomPart}`
}

// Atribuir código de validação a um ticket
export const assignValidationCode = async (ticketId: number): Promise<string> => {
  const validationCode = generateValidationCode(ticketId)
  
  const { error } = await supabase
    .from('tickets')
    .update({ validation_code: validationCode })
    .eq('id', ticketId)

  if (error) throw error
  return validationCode
}

// Atribuir códigos de validação a todos os tickets de uma order
export const assignValidationCodesToOrder = async (orderId: number): Promise<void> => {
  // Buscar todos os tickets da order
  const { data: tickets, error: fetchError } = await supabase
    .from('tickets')
    .select('id')
    .eq('order_id', orderId)

  if (fetchError) throw fetchError
  if (!tickets || tickets.length === 0) return

  // Atribuir código a cada ticket
  for (const ticket of tickets) {
    await assignValidationCode(ticket.id)
  }
}

// Buscar ticket por código de validação
export const getTicketByValidationCode = async (validationCode: string) => {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      events (*),
      users (*),
      tables (*),
      orders (*),
      bus_go:bus!bus_go_id (*),
      bus_come:bus!bus_come_id (*)
    `)
    .eq('validation_code', validationCode)
    .single()

  if (error) throw error
  return data
}

// Check-in de um ticket
export const checkInTicket = async (validationCode: string) => {
  // Verificar se o ticket existe e está confirmado
  const ticket = await getTicketByValidationCode(validationCode)
  
  if (!ticket) {
    throw new Error('Bilhete não encontrado')
  }
  
  if (ticket.status !== 'confirmed') {
    throw new Error('Bilhete não está confirmado')
  }
  
  if (ticket.checked_in_at) {
    throw new Error('Bilhete já foi usado para check-in')
  }

  const { data, error } = await supabase
    .from('tickets')
    .update({ checked_in_at: new Date().toISOString() })
    .eq('validation_code', validationCode)
    .select(`
      *,
      events (*),
      users (*),
      tables (*)
    `)
    .single()

  if (error) throw error
  return data
}

// Check-out de um ticket
export const checkOutTicket = async (validationCode: string) => {
  // Verificar se o ticket existe e fez check-in
  const ticket = await getTicketByValidationCode(validationCode)
  
  if (!ticket) {
    throw new Error('Bilhete não encontrado')
  }
  
  if (!ticket.checked_in_at) {
    throw new Error('Bilhete não fez check-in')
  }
  
  if (ticket.checked_out_at) {
    throw new Error('Bilhete já fez check-out')
  }

  const { data, error } = await supabase
    .from('tickets')
    .update({ checked_out_at: new Date().toISOString() })
    .eq('validation_code', validationCode)
    .select(`
      *,
      events (*),
      users (*),
      tables (*)
    `)
    .single()

  if (error) throw error
  return data
}

// Obter tickets com detalhes completos para PDF (por order)
export const getTicketsForPdf = async (orderId: number) => {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      events (id, name, location, date_hour, image_url),
      tables (name),
      bus_go:bus!bus_go_id (location, time),
      bus_come:bus!bus_come_id (location, time)
    `)
    .eq('order_id', orderId)
    .order('id', { ascending: true })

  if (error) throw error
  return data || []
}
