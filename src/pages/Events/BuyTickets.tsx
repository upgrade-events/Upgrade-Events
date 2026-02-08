import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getEventById, decrementAvailableTickets } from '../../services/events'
import { getTablesWithAvailability, checkTableAvailability } from '../../services/tables'
import { getBusesWithAvailability, checkBusAvailability } from '../../services/buses'
import { createOrder, countUserTicketsForEvent } from '../../services/orders'
import { createMultipleTickets } from '../../services/tickets'
import { getCurrentUser, logout } from '../../services/auth'

const MAX_TICKETS_PER_USER = 10

interface TableWithAvailability {
  id: number
  name: string
  capacity: number
  occupied: number
  available: number
}

interface BusWithAvailability {
  id: number
  bus_type: 'ida' | 'volta'
  location: string
  time: string
  capacity: number
  occupied: number
  available: number
}

interface TicketForm {
  email: string
  tableId: number | null
  busGoId: number | null
  busComeId: number | null
  restrictions: string
}

export const BuyTickets = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [event, setEvent] = useState<any>(null)
  const [tables, setTables] = useState<TableWithAvailability[]>([])
  const [buses, setBuses] = useState<BusWithAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string>('')
  const [existingTickets, setExistingTickets] = useState(0)
  const [maxAllowed, setMaxAllowed] = useState(MAX_TICKETS_PER_USER)

  const [quantity, setQuantity] = useState(1)
  const [ticketForms, setTicketForms] = useState<TicketForm[]>([{
    email: '',
    tableId: null,
    busGoId: null,
    busComeId: null,
    restrictions: ''
  }])

  useEffect(() => {
    const loadData = async () => {
      const user = await getCurrentUser()
      if (!user) { navigate('/login'); return }
      setUserId(user.id)
      setTicketForms([{ email: user.email || '', tableId: null, busGoId: null, busComeId: null, restrictions: '' }])

      const eventData = await getEventById(Number(id))
      if (!eventData) { navigate('/events'); return }
      setEvent(eventData)

      // Contar bilhetes que o utilizador já tem para este evento
      const userTicketCount = await countUserTicketsForEvent(user.id, Number(id))
      setExistingTickets(userTicketCount)
      
      // Calcular máximo permitido
      const remaining = MAX_TICKETS_PER_USER - userTicketCount
      setMaxAllowed(remaining)

      // Se já atingiu o limite, mostrar erro
      if (remaining <= 0) {
        setError(`Já tens ${userTicketCount} bilhete${userTicketCount > 1 ? 's' : ''} para este evento. O limite máximo é de ${MAX_TICKETS_PER_USER} bilhetes por conta.`)
      }

      const tablesData = await getTablesWithAvailability(Number(id))
      setTables(tablesData)

      const busesData = await getBusesWithAvailability(Number(id))
      setBuses(busesData)

      setLoading(false)
    }
    loadData()
  }, [id, navigate])

  const handleLogout = async () => { await logout(); navigate('/') }

  const handleQuantityChange = (newQuantity: number) => {
    const maxByEvent = event?.available_tickets || 0
    const maxByLimit = maxAllowed
    const actualMax = Math.min(maxByEvent, maxByLimit)
    
    if (newQuantity < 1 || newQuantity > actualMax) return
    setQuantity(newQuantity)
    const currentForms = [...ticketForms]
    if (newQuantity > currentForms.length) {
      for (let i = currentForms.length; i < newQuantity; i++) {
        currentForms.push({ email: '', tableId: null, busGoId: null, busComeId: null, restrictions: '' })
      }
    } else {
      currentForms.splice(newQuantity)
    }
    setTicketForms(currentForms)
  }

  const updateTicketForm = (index: number, field: keyof TicketForm, value: any) => {
    const updated = [...ticketForms]
    updated[index] = { ...updated[index], [field]: value }
    setTicketForms(updated)
  }

  const calculateTotal = () => {
    return ticketForms.reduce((total, form) => {
      const hasBus = form.busGoId || form.busComeId
      return total + (hasBus && event?.price_bus > 0 ? event.price_bus : event?.price_no_bus || 0)
    }, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    for (let i = 0; i < ticketForms.length; i++) {
      if (!ticketForms[i].email) { setError(`Preenche o email do bilhete ${i + 1}`); setSubmitting(false); return }
      if (!ticketForms[i].tableId) { setError(`Seleciona uma mesa para o bilhete ${i + 1}`); setSubmitting(false); return }
    }

    try {
      // Verificar mesas
      const tableSelections: { [key: number]: number } = {}
      ticketForms.forEach(f => { if (f.tableId) tableSelections[f.tableId] = (tableSelections[f.tableId] || 0) + 1 })
      
      for (const [tableId, count] of Object.entries(tableSelections)) {
        const check = await checkTableAvailability(Number(tableId), count)
        if (!check.available) {
          const table = tables.find(t => t.id === Number(tableId))
          setError(`A mesa "${table?.name}" já não tem ${count} lugar(es). Apenas ${check.spotsLeft} disponível(eis).`)
          setTables(await getTablesWithAvailability(Number(id)))
          setSubmitting(false)
          return
        }
      }

      // Verificar autocarros ida
      const busGoSelections: { [key: number]: number } = {}
      ticketForms.forEach(f => { if (f.busGoId) busGoSelections[f.busGoId] = (busGoSelections[f.busGoId] || 0) + 1 })
      
      for (const [busId, count] of Object.entries(busGoSelections)) {
        const check = await checkBusAvailability(Number(busId), 'ida', count)
        if (!check.available) {
          const bus = buses.find(b => b.id === Number(busId))
          setError(`Autocarro ida "${bus?.location}" sem lugares suficientes. Apenas ${check.spotsLeft} disponível(eis).`)
          setBuses(await getBusesWithAvailability(Number(id)))
          setSubmitting(false)
          return
        }
      }

      // Verificar autocarros volta
      const busComeSelections: { [key: number]: number } = {}
      ticketForms.forEach(f => { if (f.busComeId) busComeSelections[f.busComeId] = (busComeSelections[f.busComeId] || 0) + 1 })
      
      for (const [busId, count] of Object.entries(busComeSelections)) {
        const check = await checkBusAvailability(Number(busId), 'volta', count)
        if (!check.available) {
          const bus = buses.find(b => b.id === Number(busId))
          setError(`Autocarro volta "${bus?.location}" sem lugares suficientes. Apenas ${check.spotsLeft} disponível(eis).`)
          setBuses(await getBusesWithAvailability(Number(id)))
          setSubmitting(false)
          return
        }
      }

      // Criar encomenda
      const order = await createOrder({ user_id: userId, event_id: Number(id), total_amount: calculateTotal() })
      
      await createMultipleTickets(ticketForms.map(form => ({
        users_id: userId,
        event_id: Number(id),
        order_id: order.id,
        bus_go_id: form.busGoId,
        bus_come_id: form.busComeId,
        table_id: form.tableId!,
        type: (form.busGoId || form.busComeId) ? 'with_bus' : 'no_bus',
        status: 'pending',
        restrictions: form.restrictions || '',
        ticket_email: form.email
      })))

      await decrementAvailableTickets(Number(id), quantity)
      navigate(`/purchase-success/${order.id}`)
    } catch (err: any) {
      setError(err.message || 'Erro ao processar compra')
    } finally {
      setSubmitting(false)
    }
  }

  const busesIda = buses.filter(b => b.bus_type === 'ida')
  const busesVolta = buses.filter(b => b.bus_type === 'volta')

  if (loading) return <div style={styles.container}><div style={styles.loadingContainer}><div style={styles.spinner}></div></div></div>

  return (
    <div style={styles.container}>
      <nav style={styles.navbar}>
        <div style={styles.navContent}>
          <Link to="/home" style={{ textDecoration: 'none' }}><img src="/logo.png" alt="Logo" style={styles.logoImage} /></Link>
          <button onClick={handleLogout} style={styles.navLogoutBtn}>Terminar Sessão</button>
        </div>
      </nav>

      <div style={styles.heroSection}>
        <Link to={`/events/${id}`} style={styles.backLink}>← Voltar ao Evento</Link>
        <h1 style={styles.pageTitle}><span style={styles.customLetter}>{'\ue801'}</span>omprar Bilhetes</h1>
        <p style={styles.eventName}>{event?.name}</p>
      </div>

      <div style={styles.contentSection}>
        <div style={styles.contentWrapper}>
          {error && <p style={styles.error}>{error}</p>}

          <form onSubmit={handleSubmit}>
            <div style={styles.quantitySection}>
              <h2 style={styles.sectionTitle}>Quantidade de Bilhetes</h2>
              
              {existingTickets > 0 && (
                <div style={styles.existingTicketsInfo}>
                  Já tens {existingTickets} bilhete{existingTickets > 1 ? 's' : ''} para este evento
                </div>
              )}
              
              {maxAllowed <= 0 ? (
                <div style={styles.limitReached}>
                  <span style={styles.limitIcon}>⚠️</span>
                  <p>Atingiste o limite de {MAX_TICKETS_PER_USER} bilhetes por conta para este evento.</p>
                </div>
              ) : (
                <>
                  <div style={styles.quantityControls}>
                    <button type="button" style={styles.quantityBtn} onClick={() => handleQuantityChange(quantity - 1)} disabled={quantity <= 1}>−</button>
                    <span style={styles.quantityValue}>{quantity}</span>
                    <button type="button" style={styles.quantityBtn} onClick={() => handleQuantityChange(quantity + 1)} disabled={quantity >= Math.min(event?.available_tickets || 0, maxAllowed)}>+</button>
                  </div>
                  <p style={styles.availableText}>
                    {event?.available_tickets} bilhetes disponíveis
                    {maxAllowed < (event?.available_tickets || 0) && (
                      <span style={styles.limitText}> • Podes comprar até {maxAllowed}</span>
                    )}
                  </p>
                </>
              )}
            </div>

            {ticketForms.map((form, index) => (
              <div key={index} style={styles.ticketCard}>
                <div style={styles.ticketCardHeader}>
                  <h3 style={styles.ticketCardTitle}>Bilhete {index + 1}</h3>
                  <span style={styles.ticketPrice}>€{(form.busGoId || form.busComeId) && event?.price_bus > 0 ? event.price_bus : event?.price_no_bus}</span>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Email do Participante *</label>
                  <input type="email" value={form.email} onChange={(e) => updateTicketForm(index, 'email', e.target.value)} style={styles.input} placeholder="email@exemplo.com" required />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Mesa *</label>
                  <select value={form.tableId || ''} onChange={(e) => updateTicketForm(index, 'tableId', e.target.value ? Number(e.target.value) : null)} style={styles.select} required>
                    <option value="">Seleciona uma mesa</option>
                    {tables.map(table => (
                      <option key={table.id} value={table.id} disabled={table.available <= 0}>
                        {table.name} - {table.available}/{table.capacity} lugares {table.available <= 0 ? '(Esgotado)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {busesIda.length > 0 && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Autocarro Ida (opcional)</label>
                    <select value={form.busGoId || ''} onChange={(e) => updateTicketForm(index, 'busGoId', e.target.value ? Number(e.target.value) : null)} style={styles.select}>
                      <option value="">Sem autocarro de ida</option>
                      {busesIda.map(bus => (
                        <option key={bus.id} value={bus.id} disabled={bus.available <= 0}>
                          {bus.location} - {new Date(bus.time).toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} ({bus.available} lugares) {bus.available <= 0 ? '- Esgotado' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {busesVolta.length > 0 && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Autocarro Volta (opcional)</label>
                    <select value={form.busComeId || ''} onChange={(e) => updateTicketForm(index, 'busComeId', e.target.value ? Number(e.target.value) : null)} style={styles.select}>
                      <option value="">Sem autocarro de volta</option>
                      {busesVolta.map(bus => (
                        <option key={bus.id} value={bus.id} disabled={bus.available <= 0}>
                          {bus.location} - {new Date(bus.time).toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} ({bus.available} lugares) {bus.available <= 0 ? '- Esgotado' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={styles.formGroup}>
                  <label style={styles.label}>Restrições Alimentares (opcional)</label>
                  <input type="text" value={form.restrictions} onChange={(e) => updateTicketForm(index, 'restrictions', e.target.value)} style={styles.input} placeholder="Ex: Vegetariano, sem glúten..." />
                </div>
              </div>
            ))}

            <div style={styles.checkoutCard}>
              <h2 style={styles.checkoutTitle}>Resumo da Compra</h2>
              <div style={styles.checkoutRow}><span>{quantity} bilhete{quantity > 1 ? 's' : ''}</span><span>€{calculateTotal().toFixed(2)}</span></div>
              <div style={styles.checkoutDivider}></div>
              <div style={styles.checkoutTotal}><span>Total a Pagar</span><span style={styles.totalAmount}>€{calculateTotal().toFixed(2)}</span></div>
              <button type="submit" style={styles.submitButton} disabled={submitting || maxAllowed <= 0}>{submitting ? 'A verificar...' : 'Confirmar Compra'}</button>
              <p style={styles.checkoutNote}>A disponibilidade será verificada no momento da confirmação.</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { minHeight: '100vh', backgroundColor: '#020202', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',color: '#1a1a1a', },
  loadingContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' },
  spinner: { width: 40, height: 40, border: '3px solid rgba(249,178,52,0.2)', borderTop: '3px solid #F9B234', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  navbar: { padding: '20px 0', position: 'fixed', top: 0, left: 0, right: 0, backgroundColor: 'rgba(2,2,2,0.9)', backdropFilter: 'blur(20px)', zIndex: 1000, borderBottom: '1px solid rgba(249,178,52,0.1)' },
  navContent: { maxWidth: 1200, margin: '0 auto', padding: '0 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logoImage: { height: 56 },
  navLogoutBtn: { backgroundColor: 'transparent', color: '#B5B5B5', border: '1px solid rgba(181,181,181,0.2)', padding: '10px 24px', borderRadius: 50, fontSize: 14, cursor: 'pointer' },
  heroSection: { paddingTop: 140, paddingBottom: 40, textAlign: 'center', backgroundColor: '#020202' },
  backLink: { color: '#B5B5B5', textDecoration: 'none', fontSize: 14, display: 'inline-block', marginBottom: 24 },
  pageTitle: { fontSize: 42, fontWeight: 700, color: '#FFF', margin: '0 0 12px', letterSpacing: -1 },
  customLetter: { fontFamily: 'fontello', color: '#F9B234', fontSize: '0.85em', display: 'inline-block', transform: 'translateY(-4px)' },
  eventName: { fontSize: 18, color: '#F9B234', margin: 0, fontWeight: 500 },
  contentSection: { backgroundColor: '#FFF', padding: '60px 0', minHeight: '60vh' },
  contentWrapper: { maxWidth: 700, margin: '0 auto', padding: '0 24px' },
  error: { color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', padding: '16px 20px', borderRadius: 12, marginBottom: 24, fontSize: 14, border: '1px solid rgba(239,68,68,0.3)' },
  quantitySection: { textAlign: 'center', marginBottom: 40, padding: 32, backgroundColor: '#FAFAFA', borderRadius: 20, border: '1px solid #EEE' },
  sectionTitle: { fontSize: 18, fontWeight: 600, color: '#020202', margin: '0 0 20px' },
  quantityControls: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 },
  quantityBtn: { width: 48, height: 48, borderRadius: '50%', border: '2px solid #020202', backgroundColor: 'transparent', fontSize: 24, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  quantityValue: { fontSize: 32, fontWeight: 700, color: '#020202', minWidth: 60, textAlign: 'center' },
  availableText: { marginTop: 16, color: '#666', fontSize: 14 },
  existingTicketsInfo: { backgroundColor: 'rgba(249,178,52,0.1)', color: '#B8860B', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14, fontWeight: 500, textAlign: 'center', border: '1px solid rgba(249,178,52,0.3)' },
  limitReached: { backgroundColor: 'rgba(239,68,68,0.1)', padding: 24, borderRadius: 12, textAlign: 'center', border: '1px solid rgba(239,68,68,0.3)' },
  limitIcon: { fontSize: 32, display: 'block', marginBottom: 8 },
  limitText: { color: '#F9B234', fontWeight: 500 },
  ticketCard: { backgroundColor: '#FAFAFA', borderRadius: 20, padding: 28, marginBottom: 20, border: '1px solid #EEE' },
  ticketCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #EEE' },
  ticketCardTitle: { fontSize: 18, fontWeight: 600, color: '#020202', margin: 0 },
  ticketPrice: { fontSize: 24, fontWeight: 700, color: '#F9B234' },
  formGroup: { marginBottom: 20 },
  label: { display: 'block', fontSize: 14, fontWeight: 500, color: '#020202', marginBottom: 8 },
  input: { width: '100%', padding: '14px 18px', borderRadius: 12, border: '1px solid #DDD', fontSize: 15, backgroundColor: '#FFF', boxSizing: 'border-box', outline: 'none' },
  select: { width: '100%', padding: '14px 18px', borderRadius: 12, border: '1px solid #DDD', fontSize: 15, backgroundColor: '#FFF', boxSizing: 'border-box', outline: 'none', cursor: 'pointer' },
  checkoutCard: { backgroundColor: '#020202', borderRadius: 24, padding: 32, marginTop: 32, border: '2px solid #F9B234' },
  checkoutTitle: { fontSize: 20, fontWeight: 600, color: '#FFF', margin: '0 0 24px' },
  checkoutRow: { display: 'flex', justifyContent: 'space-between', color: '#B5B5B5', fontSize: 15, marginBottom: 12 },
  checkoutDivider: { height: 1, backgroundColor: 'rgba(249,178,52,0.2)', margin: '20px 0' },
  checkoutTotal: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, color: '#FFF' },
  totalAmount: { fontSize: 32, fontWeight: 700, color: '#F9B234' },
  submitButton: { width: '100%', padding: 18, backgroundColor: '#F9B234', color: '#020202', border: 'none', borderRadius: 50, fontSize: 16, fontWeight: 700, cursor: 'pointer' },
  checkoutNote: { marginTop: 16, fontSize: 13, color: '#666', textAlign: 'center' }
}
