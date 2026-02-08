import { supabase } from '../supabaseClient'

export const getTablesByEvent = async (eventId: number) => {
  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .eq('events_id', eventId)
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

// Obter mesas com lugares disponíveis (descontando bilhetes pending + confirmed)
export const getTablesWithAvailability = async (eventId: number) => {
  // 1. Buscar todas as mesas do evento
  const { data: tables, error: tablesError } = await supabase
    .from('tables')
    .select('*')
    .eq('events_id', eventId)
    .order('name', { ascending: true })

  if (tablesError) throw tablesError
  if (!tables) return []

  // 2. Buscar contagem de bilhetes por mesa (pending + confirmed)
  const { data: ticketCounts, error: ticketsError } = await supabase
    .from('tickets')
    .select('table_id')
    .eq('event_id', eventId)
    .in('status', ['pending', 'confirmed'])

  if (ticketsError) throw ticketsError

  // 3. Contar bilhetes por mesa
  const countByTable: { [key: number]: number } = {}
  ticketCounts?.forEach(ticket => {
    countByTable[ticket.table_id] = (countByTable[ticket.table_id] || 0) + 1
  })

  // 4. Calcular lugares disponíveis
  return tables.map(table => ({
    ...table,
    occupied: countByTable[table.id] || 0,
    available: table.capacity - (countByTable[table.id] || 0)
  }))
}

// Verificar se uma mesa tem lugar disponível
export const checkTableAvailability = async (tableId: number, quantity: number = 1) => {
  // Buscar mesa
  const { data: table, error: tableError } = await supabase
    .from('tables')
    .select('*')
    .eq('id', tableId)
    .single()

  if (tableError) throw tableError

  // Contar bilhetes atuais
  const { count, error: countError } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('table_id', tableId)
    .in('status', ['pending', 'confirmed'])

  if (countError) throw countError

  const occupied = count || 0
  const available = table.capacity - occupied

  return {
    available: available >= quantity,
    spotsLeft: available,
    capacity: table.capacity
  }
}

export const createTable = async (tableData: {
  events_id: number
  name: string
  capacity: number
}) => {
  const { data, error } = await supabase
    .from('tables')
    .insert(tableData)
    .select()
    .single()

  if (error) throw error
  return data
}

export const deleteTablesByEvent = async (eventId: number) => {
  const { error } = await supabase
    .from('tables')
    .delete()
    .eq('events_id', eventId)
  if (error) throw error
}

export const deleteTable = async (id: number) => {
  const { error } = await supabase
    .from('tables')
    .delete()
    .eq('id', id)

  if (error) throw error
}
