import { supabase } from '../supabaseClient'



export interface StaffAccessCode {
  id: number
  event_id: number
  code: string
  name: string
  is_active: boolean
  created_at: string
  last_used_at?: string
  // Da view
  event_name?: string
  event_date?: string
  event_location?: string
  valid_from?: string
  valid_until?: string
  is_currently_valid?: boolean
}

export interface StaffActionLog {
  id: number
  access_code_id: number
  ticket_id: number
  action: 'check_in' | 'check_out'
  staff_name: string
  ticket_email: string
  event_id: number
  created_at: string
}

// =============================================
// GESTÃO DE CÓDIGOS (para Owner)
// =============================================

// Gerar código único
const generateCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Sem O, 0, I, 1 para evitar confusão
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Criar novo código de acesso
export const createStaffAccessCode = async (eventId: number, staffName: string): Promise<StaffAccessCode> => {
  // Gerar código único
  let code = generateCode()
  let attempts = 0
  
  while (attempts < 10) {
    const { data: existing } = await supabase
      .from('staff_access_codes')
      .select('id')
      .eq('code', code)
      .single()
    
    if (!existing) break
    code = generateCode()
    attempts++
  }

  const { data, error } = await supabase
    .from('staff_access_codes')
    .insert({
      event_id: eventId,
      code,
      name: staffName
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Obter códigos de um evento
export const getStaffCodesByEvent = async (eventId: number): Promise<StaffAccessCode[]> => {
  const { data, error } = await supabase
    .from('staff_codes_with_validity')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Desativar código
export const deactivateStaffCode = async (codeId: number): Promise<void> => {
  const { error } = await supabase
    .from('staff_access_codes')
    .update({ is_active: false })
    .eq('id', codeId)

  if (error) throw error
}

// Reativar código
export const reactivateStaffCode = async (codeId: number): Promise<void> => {
  const { error } = await supabase
    .from('staff_access_codes')
    .update({ is_active: true })
    .eq('id', codeId)

  if (error) throw error
}

// Eliminar código
export const deleteStaffCode = async (codeId: number): Promise<void> => {
  const { error } = await supabase
    .from('staff_access_codes')
    .delete()
    .eq('id', codeId)

  if (error) throw error
}

// =============================================
// VALIDAÇÃO DE CÓDIGO (para Staff)
// =============================================

// Verificar se código é válido
export const validateStaffCode = async (code: string): Promise<{
  valid: boolean
  error?: string
  data?: StaffAccessCode
}> => {
  const { data, error } = await supabase
    .from('staff_codes_with_validity')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (error || !data) {
    return { valid: false, error: 'Código inválido' }
  }

  if (!data.is_active) {
    return { valid: false, error: 'Este código foi desativado' }
  }

  if (!data.is_currently_valid) {
    const eventDate = new Date(data.event_date)
    const validFrom = new Date(data.valid_from)
    const validUntil = new Date(data.valid_until)
    const now = new Date()

    if (now < validFrom) {
      const hoursUntil = Math.ceil((validFrom.getTime() - now.getTime()) / (1000 * 60 * 60))
      return { 
        valid: false, 
        error: `Este código só fica ativo ${hoursUntil}h antes do evento (${eventDate.toLocaleDateString('pt-PT')})` 
      }
    }

    if (now > validUntil) {
      return { valid: false, error: 'Este código já expirou (evento terminado)' }
    }
  }

  // Atualizar last_used_at
  await supabase
    .from('staff_access_codes')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)

  return { valid: true, data }
}

// =============================================
// CHECK-IN / CHECK-OUT
// =============================================

export interface CheckResult {
  success: boolean
  action?: 'check_in' | 'check_out'
  message: string
  ticket?: {
    id: number
    email: string
    table: string
    restrictions?: string
  }
}

// Processar scan de QR Code

// Processar scan de QR Code - USANDO RPC
export const processTicketScan = async (
  validationCode: string, 
  staffAccessCode: StaffAccessCode,
  mode: 'check_in' | 'check_out'
): Promise<CheckResult> => {
  
  if (mode === 'check_in') {
    const { data, error } = await supabase
      .rpc('staff_checkin_ticket', {
        p_code: staffAccessCode.code,
        p_validation_code: validationCode
      })

    if (error) {
      console.error('Erro RPC check-in:', error)
      return { success: false, message: 'Erro ao processar. Tenta novamente.' }
    }

    const result = data?.[0] || data

    if (!result) {
      return { success: false, message: 'Erro ao processar bilhete' }
    }

    return {
      success: result.success,
      action: result.success ? 'check_in' : undefined,
      message: result.message,
      ticket: result.ticket_email ? {
        id: 0,
        email: result.ticket_email,
        table: result.table_name || 'N/A',
        restrictions: result.restrictions || undefined
      } : undefined
    }

  } else {
    const { data, error } = await supabase
      .rpc('staff_checkout_ticket', {
        p_code: staffAccessCode.code,
        p_validation_code: validationCode
      })

    if (error) {
      console.error('Erro RPC check-out:', error)
      return { success: false, message: 'Erro ao processar. Tenta novamente.' }
    }

    const result = data?.[0] || data

    if (!result) {
      return { success: false, message: 'Erro ao processar bilhete' }
    }

    return {
      success: result.success,
      action: result.success ? 'check_out' : undefined,
      message: result.message,
      ticket: result.ticket_email ? {
        id: 0,
        email: result.ticket_email,
        table: result.table_name || 'N/A',
        restrictions: undefined
      } : undefined
    }
  }
}
// =============================================
// ESTATÍSTICAS (para Owner)
// =============================================

export interface EventCheckStats {
  total_tickets: number
  checked_in: number
  checked_out: number
  pending: number
}

// Obter estatísticas de check-in/out de um evento
export const getEventCheckStats = async (eventId: number): Promise<EventCheckStats> => {
  const { data, error } = await supabase
    .from('tickets')
    .select('id, checked_in_at, checked_out_at, status')
    .eq('event_id', eventId)
    .eq('status', 'confirmed')

  if (error) throw error

  const tickets = data || []
  
  return {
    total_tickets: tickets.length,
    checked_in: tickets.filter(t => t.checked_in_at).length,
    checked_out: tickets.filter(t => t.checked_out_at).length,
    pending: tickets.filter(t => !t.checked_in_at).length
  }
}

// Obter log de ações de um evento
export const getEventActionsLog = async (eventId: number, limit: number = 50): Promise<StaffActionLog[]> => {
  const { data, error } = await supabase
    .from('staff_actions_log')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// Obter lista de participantes com status
export const getEventAttendees = async (eventId: number) => {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      id,
      ticket_email,
      checked_in_at,
      checked_out_at,
      status,
      tables (name)
    `)
    .eq('event_id', eventId)
    .eq('status', 'confirmed')
    .order('checked_in_at', { ascending: false, nullsFirst: false })

  if (error) throw error
  return data || []
}

export interface TicketBusInfo {
  success: boolean
  message: string
  ticket?: {
    email: string
    bus_go?: string | null
    bus_come?: string | null
    table?: string
  }
}

// Buscar info de autocarro do bilhete (sem alterar BD)
export const getTicketBusInfo = async (
  validationCode: string,
  staffAccessCode: StaffAccessCode
): Promise<TicketBusInfo> => {
  
  const { data, error } = await supabase
    .rpc('staff_get_ticket_bus_info', {
      p_code: staffAccessCode.code,
      p_validation_code: validationCode
    })

  if (error) {
    console.error('Erro RPC bus info:', error)
    return { success: false, message: 'Erro ao processar bilhete' }
  }

  const result = data?.[0] || data

  if (!result) {
    return { success: false, message: 'Erro ao processar bilhete' }
  }

  return {
    success: result.success,
    message: result.message,
    ticket: result.success ? {
      email: result.ticket_email,
      bus_go: result.bus_go,
      bus_come: result.bus_come,
      table: result.table_name || 'N/A'
    } : undefined
  }
}