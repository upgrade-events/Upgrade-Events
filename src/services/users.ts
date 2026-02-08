import { supabase } from '../supabaseClient'

export const getUserById = async (id: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const getUserRole = async (id: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', id)
    .single()
  if (error) throw error
  return data?.role
}

export const updateUser = async (id: string, updates: { name?: string }) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}


export const getAllUsers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export const searchUsers = async (searchTerm: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('name', `%${searchTerm}%`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export const updateUserRole = async (id: string, role: string) => {
  const { data, error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}