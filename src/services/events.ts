import { supabase } from '../supabaseClient'

export const getAllEvents = async () => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date_hour', { ascending: true })
  if (error) throw error
  return data || []
}

export const getAvailableEvents = async () => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'approved')
    .gt('available_tickets', 0)
    .gte('date_hour', new Date().toISOString())
    .order('date_hour', { ascending: true })
  if (error) throw error
  return data || []
}

export const getEventById = async (id: number) => {
  const { data, error } = await supabase
    .from('events')
    .select('*, bus(*), tables(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const getEventsByOwner = async (ownerId: string) => {
  const { data, error } = await supabase
    .from('events')
    .select('*, bus(*), tables(*)')
    .eq('owner_id', ownerId)
    .order('date_hour', { ascending: true })
  if (error) throw error
  return data || []
}

export const createEvent = async (eventData: {
  name: string
  location: string
  date_hour: string
  description?: string
  price_bus: number
  price_no_bus: number
  tickets_number: number
  owner_id: string
  image_url?: string | null
  status?: 'pending' | 'approved' | 'rejected'
  payment_iban?: string | null
  payment_mbway?: string | null
  payment_name?: string | null
}) => {
  const { data, error } = await supabase
    .from('events')
    .insert({
      ...eventData,
      available_tickets: eventData.tickets_number,
      status: eventData.status || 'pending'
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateEvent = async (id: number, updates: {
  name?: string
  location?: string
  date_hour?: string
  description?: string
  price_bus?: number
  price_no_bus?: number
  tickets_number?: number
  available_tickets?: number
  image_url?: string | null
  status?: 'pending' | 'approved' | 'rejected'
  payment_iban?: string | null
  payment_mbway?: string | null
  payment_name?: string | null
}) => {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteEvent = async (id: number) => {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export const decrementAvailableTickets = async (id: number, quantity: number) => {
  const { error } = await supabase.rpc('decrement_available_tickets', {
    p_event_id: id,
    p_amount: quantity
  })
  
  if (error) throw new Error(error.message || 'Erro ao decrementar bilhetes')
}

export const incrementAvailableTickets = async (id: number, quantity: number) => {
  const { data: event } = await supabase
    .from('events')
    .select('available_tickets, tickets_number')
    .eq('id', id)
    .single()
  
  if (!event) throw new Error('Evento não encontrado')

  const newAvailable = Math.min(event.available_tickets + quantity, event.tickets_number)

  const { error } = await supabase
    .from('events')
    .update({ available_tickets: newAvailable })
    .eq('id', id)
  
  if (error) throw error
}

// === FUNÇÕES ADMIN ===

// Obter todos os eventos com info do owner (admin)
export const getAllEventsAdmin = async () => {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      users!fk_events_owner (name, email)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Obter eventos pendentes (admin)
export const getPendingEvents = async () => {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      users!fk_events_owner (name, email)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

// Aprovar evento (admin)
export const approveEvent = async (id: number) => {
  const { data, error } = await supabase
    .from('events')
    .update({ status: 'approved' })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Rejeitar evento (admin)
export const rejectEvent = async (id: number) => {
  const { data, error } = await supabase
    .from('events')
    .update({ status: 'rejected' })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Obter estatísticas de um evento (bilhetes vendidos/confirmados)
export const getEventStats = async (eventId: number) => {
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('status')
    .eq('event_id', eventId)

  if (error) throw error

  const stats = {
    total: tickets?.length || 0,
    pending: tickets?.filter((t: { status: string }) => t.status === 'pending').length || 0,
    confirmed: tickets?.filter((t: { status: string }) => t.status === 'confirmed').length || 0,
    cancelled: tickets?.filter((t: { status: string }) => t.status === 'cancelled').length || 0
  }

  return stats
}
