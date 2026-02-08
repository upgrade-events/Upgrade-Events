import { supabase } from '../supabaseClient'

// === COMPROVATIVOS DE PAGAMENTO ===

export const uploadPaymentProof = async (file: File, ticketId: number): Promise<string> => {
  const fileExt = file.name.split('.').pop()
  const filePath = `ticket-${ticketId}/${Date.now()}.${fileExt}`
  
  const { error } = await supabase.storage
    .from('payment-proofs')
    .upload(filePath, file)
  if (error) throw error
  
  return getPaymentProofUrl(filePath)
}

export const getPaymentProofUrl = (path: string): string => {
  const { data } = supabase.storage
    .from('payment-proofs')
    .getPublicUrl(path)
  return data.publicUrl
}

export const deletePaymentProof = async (path: string): Promise<void> => {
  const { error } = await supabase.storage
    .from('payment-proofs')
    .remove([path])
  if (error) throw error
}

// === IMAGENS DE EVENTOS (MÚLTIPLAS - máx 10) ===

// Upload de uma imagem para um evento com índice de ordem
export const uploadEventImage = async (file: File, eventId: number, orderIndex: number = 0): Promise<string> => {
  const fileExt = file.name.split('.').pop()
  const timestamp = Date.now()
  // Formato: event-{id}/{order}_{timestamp}.{ext}
  const filePath = `event-${eventId}/${String(orderIndex).padStart(3, '0')}_${timestamp}.${fileExt}`
  
  const { error } = await supabase.storage
    .from('event-images')
    .upload(filePath, file)
  if (error) throw error
  
  return getEventImageUrl(filePath)
}

// Upload de múltiplas imagens
export const uploadEventImages = async (files: File[], eventId: number, startIndex: number = 0): Promise<string[]> => {
  const urls: string[] = []
  
  for (let i = 0; i < files.length; i++) {
    const url = await uploadEventImage(files[i], eventId, startIndex + i)
    urls.push(url)
  }
  
  return urls
}

export const getEventImageUrl = (path: string): string => {
  const { data } = supabase.storage
    .from('event-images')
    .getPublicUrl(path)
  return data.publicUrl
}

// Apagar uma imagem específica pelo URL
export const deleteEventImage = async (imageUrl: string): Promise<void> => {
  // Extrair o path do URL público
  const urlParts = imageUrl.split('/event-images/')
  if (urlParts.length < 2) return
  
  const path = urlParts[1]
  
  const { error } = await supabase.storage
    .from('event-images')
    .remove([path])
  if (error) throw error
}

// Apagar todas as imagens de um evento
export const deleteAllEventImages = async (eventId: number): Promise<void> => {
  const { data: files, error: listError } = await supabase.storage
    .from('event-images')
    .list(`event-${eventId}`)
  
  if (listError) throw listError
  if (!files || files.length === 0) return
  
  const paths = files.map((file: { name: string }) => `event-${eventId}/${file.name}`)
  
  const { error } = await supabase.storage
    .from('event-images')
    .remove(paths)
  if (error) throw error
}

// Listar todas as imagens de um evento (ordenadas pelo índice)
export const getEventImages = async (eventId: number): Promise<string[]> => {
  const { data, error } = await supabase.storage
    .from('event-images')
    .list(`event-${eventId}`, {
      sortBy: { column: 'name', order: 'asc' }
    })
  
  if (error) throw error
  if (!data || data.length === 0) return []
  
  return data
    .filter((file: { name: string }) => !file.name.startsWith('.'))
    .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))
    .map((file: { name: string }) => getEventImageUrl(`event-${eventId}/${file.name}`))
}

// Obter apenas a primeira imagem (para o card na lista)
export const getEventCoverImage = async (eventId: number): Promise<string | null> => {
  const images = await getEventImages(eventId)
  return images.length > 0 ? images[0] : null
}

// Atualizar ticket com comprovativo
export const updateTicketPaymentProof = async (ticketId: number, proofUrl: string): Promise<boolean> => {
  const { error } = await supabase
    .from('tickets')
    .update({ payment_proof_url: proofUrl })
    .eq('id', ticketId)
  
  if (error) throw error
  return true
}
