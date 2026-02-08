## Setup Inicial (todos)

### 1. Clona o projeto
```bash
git clone 
cd vite-react
```

### 2. Instala as dependências
```bash
npm install
```

### 3. Corre o projeto
```bash
npm run dev
```
Abre `http://localhost:5173` no browser.

---

## Estrutura do Projeto
```
src/
├── pages/           → Páginas da aplicação (frontend)
├── components/      → Componentes reutilizáveis (frontend)
├── services/        → Funções que chamam o Supabase (backend)
└── supabaseClient.ts → Configuração do Supabase
```

---

## Para a equipa de FRONTEND

### Onde trabalhar
- `src/pages/` → criar novas páginas
- `src/components/` → criar componentes (botões, cards, modals, etc.)

### Como usar dados do backend
Nunca chames o Supabase diretamente. Usa sempre os services:
```tsx
// ✅ Correto
import { getUserById } from '../services/users'
const user = await getUserById(id)

// ❌ Errado
const { data } = await supabase.from('users').select('*')
```

### Services disponíveis (equipa de Backend é para dar update à medida que vai fazendo)

**auth.ts**
- `login(email, password)` → fazer login
- `register(email, password, name)` → criar conta
- `logout()` → terminar sessão
- `getCurrentUser()` → obter user logado
- `updatePassword(newPassword)` → alterar password

**users.ts**
- `getUserById(id)` → obter dados do user (nome, role)
- `getUserRole(id)` → obter só o role
- `updateUser(id, { name })` → atualizar dados

**tickets.ts**
- `getTicketsByUser(userId)` → obter tickets de um user
- `getTicketById(id)` → obter um ticket específico

---

## Para a equipa de BACKEND

### Onde trabalhar
- `src/services/` → criar/editar funções que comunicam com o Supabase

### Como criar um novo service

1. Ir para o ficheiro, onde se pretende trabalhar, em `src/services/` (ex: `events.ts`)

2. Usar esta estrutura:
```typescript
import { supabase } from '../supabaseClient'

export const getEvents = async () => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
  if (error) throw error
  return data
}

export const getEventById = async (id: number) => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createEvent = async (eventData: {
  name: string
  location: string
  date_hour: string
}) => {
  const { data, error } = await supabase
    .from('events')
    .insert(eventData)
    .select()
    .single()
  if (error) throw error
  return data
}
```

### Operações básicas do Supabase
```typescript
// SELECT * FROM tabela
const { data } = await supabase.from('tabela').select('*')

// SELECT com WHERE
const { data } = await supabase.from('tabela').select('*').eq('coluna', valor)

// SELECT um único registo
const { data } = await supabase.from('tabela').select('*').eq('id', id).single()

// INSERT
const { data } = await supabase.from('tabela').insert({ campo: valor }).select().single()

// UPDATE
const { data } = await supabase.from('tabela').update({ campo: valor }).eq('id', id)

// DELETE
await supabase.from('tabela').delete().eq('id', id)

// SELECT com JOIN (relações)
const { data } = await supabase.from('tickets').select('*, events(*), users(*)')
```

### Tabelas disponíveis
- `users` → id mod, name, role
- `events` → id, name, location, date_hour, available_tickets, etc.
- `tickets` → id, users_id, event_id, status, type, etc.
- `bus` → id, events_id, bus_type, location, capacity, etc.
- `tables` → id, events_id, name, capacity, available_seats

---

## Git Workflow
```bash
# Antes de começar a trabalhar
git pull

# Depois de fazer alterações
git add .
git commit -m "descrição do que fizeste"
git push
```

O deploy para produção é automático após o push.

---

## Dúvidas?
Fala com o Fernando.