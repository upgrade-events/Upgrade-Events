import { supabase } from '../supabaseClient'

export const getBusesByEvent = async (eventId: number) => {
  const { data, error } = await supabase
    .from('bus')
    .select('*')
    .eq('events_id', eventId)
    .order('time', { ascending: true })

  if (error) throw error
  return data || []
}

// Obter autocarros com lugares disponíveis
export const getBusesWithAvailability = async (eventId: number) => {
  // 1. Buscar todos os autocarros do evento
  const { data: buses, error: busesError } = await supabase
    .from('bus')
    .select('*')
    .eq('events_id', eventId)
    .order('time', { ascending: true })

  if (busesError) throw busesError
  if (!buses) return []

  // 2. Buscar bilhetes com autocarro de ida (pending + confirmed)
  const { data: ticketsGo, error: goError } = await supabase
    .from('tickets')
    .select('bus_go_id')
    .eq('event_id', eventId)
    .in('status', ['pending', 'confirmed'])
    .not('bus_go_id', 'is', null)

  if (goError) throw goError

  // 3. Buscar bilhetes com autocarro de volta (pending + confirmed)
  const { data: ticketsCome, error: comeError } = await supabase
    .from('tickets')
    .select('bus_come_id')
    .eq('event_id', eventId)
    .in('status', ['pending', 'confirmed'])
    .not('bus_come_id', 'is', null)

  if (comeError) throw comeError

  // 4. Contar ocupação por autocarro
  const countGoById: { [key: number]: number } = {}
  ticketsGo?.forEach(ticket => {
    if (ticket.bus_go_id) {
      countGoById[ticket.bus_go_id] = (countGoById[ticket.bus_go_id] || 0) + 1
    }
  })

  const countComeById: { [key: number]: number } = {}
  ticketsCome?.forEach(ticket => {
    if (ticket.bus_come_id) {
      countComeById[ticket.bus_come_id] = (countComeById[ticket.bus_come_id] || 0) + 1
    }
  })

  // 5. Calcular lugares disponíveis
  return buses.map(bus => {
    const occupied = bus.bus_type === 'ida' 
      ? (countGoById[bus.id] || 0)
      : (countComeById[bus.id] || 0)
    
    return {
      ...bus,
      occupied,
      available: bus.capacity - occupied
    }
  })
}

// Verificar se um autocarro tem lugar disponível
export const checkBusAvailability = async (busId: number, busType: 'ida' | 'volta', quantity: number = 1) => {
  // Buscar autocarro
  const { data: bus, error: busError } = await supabase
    .from('bus')
    .select('*')
    .eq('id', busId)
    .single()

  if (busError) throw busError

  // Contar bilhetes atuais
  const column = busType === 'ida' ? 'bus_go_id' : 'bus_come_id'
  const { count, error: countError } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq(column, busId)
    .in('status', ['pending', 'confirmed'])

  if (countError) throw countError

  const occupied = count || 0
  const available = bus.capacity - occupied

  return {
    available: available >= quantity,
    spotsLeft: available,
    capacity: bus.capacity
  }
}

export const createBus = async (busData: {
  events_id: number
  bus_type: 'ida' | 'volta'
  location: string
  time: string
  capacity: number
}) => {
  const { data, error } = await supabase
    .from('bus')
    .insert(busData)
    .select()
    .single()

  if (error) throw error
  return data
}

export const deleteBusesByEvent = async (eventId: number) => {
  const { error } = await supabase
    .from('bus')
    .delete()
    .eq('events_id', eventId)
  if (error) throw error
}

export const deleteBus = async (id: number) => {
  const { error } = await supabase
    .from('bus')
    .delete()
    .eq('id', id)

  if (error) throw error
}
