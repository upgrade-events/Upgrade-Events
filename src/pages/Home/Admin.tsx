import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCurrentUser, logout } from '../../services/auth'
import { getUserRole, getAllUsers, searchUsers, updateUserRole } from '../../services/users'
import { getAllEventsAdmin, getPendingEvents, approveEvent, rejectEvent, getEventStats } from '../../services/events'
import { getEventCoverImage } from '../../services/storage'
import { supabase } from '../../supabaseClient'
import { assignValidationCodesToOrder, getTicketsForPdf } from '../../services/tickets'
import { sendTicketEmail } from '../../services/email'
import { StaffCodesManager } from '../Home/Staffcodesmanager'

interface EventWithDetails {
  id: number; name: string; location: string; date_hour: string; description?: string
  price_bus: number; price_no_bus: number; tickets_number: number; available_tickets: number
  status: 'pending' | 'approved' | 'rejected'; created_at: string; image_url?: string
  coverImage?: string | null; users?: { name: string; email: string }
  stats?: { total: number; pending: number; confirmed: number; cancelled: number }
}

interface User { id: string; name: string; email: string; role: 'user' | 'owner' | 'admin' }

interface OrderWithTickets {
  id: number; user_id: string; event_id: number; total_amount: number; status: string
  tickets_sent: boolean; tickets_sent_at: string | null; created_at: string
  users: { name: string; email: string }
  events: { id: number; name: string; date_hour: string; location: string }
  tickets: { id: number; ticket_email: string; type: string; status: string }[]
}

type MainTabType = 'events' | 'users' | 'tickets' | 'staff'
type EventTabType = 'pending' | 'all'
type TicketTabType = 'pending' | 'sent' | 'all'

export const Admin = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [mainTab, setMainTab] = useState<MainTabType>('events')
  const [events, setEvents] = useState<EventWithDetails[]>([])
  const [selectedEvent, setSelectedEvent] = useState<EventWithDetails | null>(null)
  const [eventTab, setEventTab] = useState<EventTabType>('pending')
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [updatingUser, setUpdatingUser] = useState<string | null>(null)
  const [orders, setOrders] = useState<OrderWithTickets[]>([])
  const [ticketTab, setTicketTab] = useState<TicketTabType>('pending')
  const [sendingOrder, setSendingOrder] = useState<number | null>(null)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [approvedEvents, setApprovedEvents] = useState<EventWithDetails[]>([])
  const [checkinEvent, setCheckinEvent] = useState<{id: number, name: string} | null>(null)
  const [staffEventsLoading, setStaffEventsLoading] = useState(false)
  
  
  

  useEffect(() => {
    const load = async () => {
      const user = await getCurrentUser()
      if (!user) { navigate('/login'); return }
      const role = await getUserRole(user.id)
      if (role !== 'admin') { navigate('/home'); return }
      await loadEvents(); await loadUsers(); await loadOrders(); await loadApprovedEvents()
      setLoading(false)
    }
    load()
  }, [navigate])

  const loadEvents = async () => {
    const data = eventTab === 'pending' ? await getPendingEvents() : await getAllEventsAdmin()
    const eventsWithDetails = await Promise.all(data.map(async (event: any) => {
      const coverImage = await getEventCoverImage(event.id)
      const stats = await getEventStats(event.id)
      return { ...event, coverImage, stats }
    }))
    setEvents(eventsWithDetails)
  }

  useEffect(() => { if (!loading && mainTab === 'events') loadEvents() }, [eventTab])

  const handleApprove = async (eventId: number) => {
    setActionLoading(eventId)
    try { await approveEvent(eventId); await loadEvents(); await loadApprovedEvents(); setSelectedEvent(null) }
    catch (err) { console.error('Erro ao aprovar:', err) }
    finally { setActionLoading(null) }
  }

  const handleReject = async (eventId: number) => {
    setActionLoading(eventId)
    try { await rejectEvent(eventId); await loadEvents(); setSelectedEvent(null) }
    catch (err) { console.error('Erro ao rejeitar:', err) }
    finally { setActionLoading(null) }
  }

  const loadUsers = async () => { setUsers(await getAllUsers()) }

  const handleUserSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (userSearch.trim() === '') await loadUsers()
    else setUsers(await searchUsers(userSearch))
  }

  const handlePromote = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'owner' ? 'user' : 'owner'
    if (!confirm(`Tens a certeza que queres ${newRole === 'owner' ? 'promover a Owner' : 'despromover a User'}?`)) return
    setUpdatingUser(userId)
    try { await updateUserRole(userId, newRole); setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as 'user' | 'owner' | 'admin' } : u)) }
    catch (err) { alert('Erro ao atualizar role') }
    setUpdatingUser(null)
  }

  const loadOrders = async () => {
    setOrdersLoading(true)
    const { data, error } = await supabase.from('orders').select(`*, users!user_id(name, email), events(id, name, date_hour, location), tickets(id, ticket_email, type, status)`).eq('status', 'confirmed').order('created_at', { ascending: false })
    if (error) console.error('Erro ao carregar orders:', error)
    else setOrders(data || [])
    setOrdersLoading(false)
  }

  useEffect(() => { if (!loading && mainTab === 'tickets') loadOrders() }, [ticketTab, mainTab])

  const handleSendTickets = async (orderId: number) => {
    if (!confirm('Tens a certeza que queres enviar os bilhetes?')) return
    setSendingOrder(orderId)
    const errors: string[] = []; let emailsSent = 0
    try {
      const user = await getCurrentUser()
      await assignValidationCodesToOrder(orderId)
      const tickets = await getTicketsForPdf(orderId)
      for (const ticket of tickets) {
        try {
          const eventDate = new Date(ticket.events?.date_hour || '').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          await sendTicketEmail({ ticketId: ticket.id, validationCode: ticket.validation_code, ticketEmail: ticket.ticket_email, eventName: ticket.events?.name || 'Evento', eventDate, eventLocation: ticket.events?.location || '', tableName: ticket.tables?.name || 'N/A', busGo: ticket.bus_go, busCome: ticket.bus_come, restrictions: ticket.restrictions })
          emailsSent++
        } catch (emailError: any) { errors.push(`${ticket.ticket_email}: ${emailError.message || 'Erro'}`) }
      }
      await supabase.from('orders').update({ tickets_sent: true, tickets_sent_at: new Date().toISOString(), tickets_sent_by: user?.id }).eq('id', orderId)
      await supabase.from('tickets').update({ available_for_download: true, sent_at: new Date().toISOString() }).eq('order_id', orderId)
      if (emailsSent > 0 && errors.length === 0) alert(`✅ ${emailsSent} email(s) enviado(s).`)
      else if (errors.length > 0) alert(`⚠️ Erros: ${errors.join('\n')}`)
      await loadOrders()
    } catch (error: any) { alert('Erro: ' + error.message) }
    finally { setSendingOrder(null) }
  }

  const getFilteredOrders = () => {
    if (ticketTab === 'pending') return orders.filter(o => !o.tickets_sent)
    if (ticketTab === 'sent') return orders.filter(o => o.tickets_sent)
    return orders
  }

  const loadApprovedEvents = async () => {
    setStaffEventsLoading(true)
    const { data, error } = await supabase
      .from('events')
      .select(`*, users!events_owner_id_fkey(name, email)`)
      .eq('status', 'approved')
      .order('date_hour', { ascending: true })

    if (error) console.error('Erro:', error)
    else {
      const eventsWithDetails = await Promise.all((data || []).map(async (event: any) => {
        const coverImage = await getEventCoverImage(event.id)
        const stats = await getEventStats(event.id)
        return { ...event, coverImage, stats }
      }))
      
      // Ordenar: check-in ativo primeiro, depois próximos, depois terminados
      const sortedEvents = eventsWithDetails.sort((a, b) => {
        const aCanCheckin = isCheckinAvailable(a.date_hour)
        const bCanCheckin = isCheckinAvailable(b.date_hour)
        
        // Se um tem check-in ativo e outro não, o ativo vem primeiro
        if (aCanCheckin && !bCanCheckin) return -1
        if (!aCanCheckin && bCanCheckin) return 1
        
        // Se ambos têm check-in ativo ou ambos não têm, ordenar por data
        const aDate = new Date(a.date_hour).getTime()
        const bDate = new Date(b.date_hour).getTime()
        const now = Date.now()
        
        // Se ambos são futuros ou ambos são passados, ordenar por data
        const aIsFuture = aDate > now
        const bIsFuture = bDate > now
        
        // Futuros primeiro
        if (aIsFuture && !bIsFuture) return -1
        if (!aIsFuture && bIsFuture) return 1
        
        // Dentro do mesmo grupo, ordenar por data (mais próximo primeiro para futuros, mais recente primeiro para passados)
        if (aIsFuture) return aDate - bDate
        return bDate - aDate
      })
      
      setApprovedEvents(sortedEvents)
    }
    setStaffEventsLoading(false)
  }

  useEffect(() => { if (!loading && mainTab === 'staff') loadApprovedEvents() }, [mainTab])

  const isCheckinAvailable = (dateString: string) => {
    const eventDate = new Date(dateString); const now = new Date()
    const twoHoursBefore = new Date(eventDate.getTime() - 2 * 60 * 60 * 1000)
    const twentyFourHoursAfter = new Date(eventDate.getTime() + 24 * 60 * 60 * 1000)
    return now >= twoHoursBefore && now <= twentyFourHoursAfter
  }

  const getEventTimeStatus = (dateString: string) => {
    const eventDate = new Date(dateString); const now = new Date()
    const twoHoursBefore = new Date(eventDate.getTime() - 2 * 60 * 60 * 1000)
    const twentyFourHoursAfter = new Date(eventDate.getTime() + 24 * 60 * 60 * 1000)
    if (now < twoHoursBefore) return { status: 'upcoming', label: 'Próximo', color: '#3b82f6' }
    else if (now >= twoHoursBefore && now <= twentyFourHoursAfter) return { status: 'active', label: 'Check-in Ativo', color: '#22c55e' }
    else return { status: 'past', label: 'Terminado', color: '#6b7280' }
  }

  const handleLogout = async () => { await logout(); navigate('/') }

  const getStatusBadge = (status: string) => {
    const statusStyles: { [key: string]: React.CSSProperties } = {
      pending: { backgroundColor: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)' },
      approved: { backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)' },
      rejected: { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }
    }
    const labels: { [key: string]: string } = { pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado' }
    return <span style={{ ...styles.statusBadge, ...statusStyles[status] }}>{labels[status]}</span>
  }

  const getRoleBadge = (role: string) => {
    const roleStyles: { [key: string]: React.CSSProperties } = {
      admin: { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' },
      owner: { backgroundColor: 'rgba(249, 178, 52, 0.1)', color: '#F9B234', border: '1px solid rgba(249, 178, 52, 0.3)' },
      user: { backgroundColor: 'rgba(107, 114, 128, 0.1)', color: '#6b7280', border: '1px solid rgba(107, 114, 128, 0.3)' }
    }
    const labels: { [key: string]: string } = { admin: 'Admin', owner: 'Owner', user: 'User' }
    return <span style={{ ...styles.roleBadge, ...roleStyles[role] }}>{labels[role]}</span>
  }

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  if (loading) return <div style={styles.container}><div style={styles.loadingContainer}><div style={styles.spinner}></div></div></div>

  const pendingEventsCount = events.filter(e => e.status === 'pending').length
  const pendingTicketsCount = orders.filter(o => !o.tickets_sent).length
  const activeCheckinCount = approvedEvents.filter(e => isCheckinAvailable(e.date_hour)).length
  const filteredOrders = getFilteredOrders()

  return (
    <div style={styles.container}>
      <nav style={styles.navbar}>
        <div style={styles.navContent}>
          <Link to="/home" style={{ textDecoration: 'none' }}><img src="/logo.png" alt="Upgrade Events" style={styles.logoImage} /></Link>
          <div style={styles.navButtons}><button onClick={handleLogout} style={styles.navLogoutBtn}>Log Out</button></div>
        </div>
      </nav>

      <div style={styles.heroSection}>
        <p style={styles.heroTag}>Administração</p>
        <h1 style={styles.pageTitle}><span style={styles.customLetter}>{'\ue808'}</span>ainel de administração</h1>
        <p style={styles.subtitle}>Gere eventos, utilizadores, envio de bilhetes e códigos de staff</p>
      </div>

      <div style={styles.contentSection}>
        <div style={styles.contentContainer}>
          <div style={styles.mainTabs}>
            <button style={{ ...styles.mainTab, ...(mainTab === 'events' ? styles.mainTabActive : {}) }} onClick={() => setMainTab('events')}>
              🎫 Eventos {pendingEventsCount > 0 && <span style={styles.mainTabBadge}>{pendingEventsCount}</span>}
            </button>
            <button style={{ ...styles.mainTab, ...(mainTab === 'tickets' ? styles.mainTabActive : {}) }} onClick={() => setMainTab('tickets')}>
              📧 Envio de Bilhetes {pendingTicketsCount > 0 && <span style={styles.mainTabBadge}>{pendingTicketsCount}</span>}
            </button>
            <button style={{ ...styles.mainTab, ...(mainTab === 'staff' ? styles.mainTabActive : {}) }} onClick={() => setMainTab('staff')}>
              🎫 Códigos de Staff {activeCheckinCount > 0 && <span style={{ ...styles.mainTabBadge, backgroundColor: '#22c55e' }}>{activeCheckinCount}</span>}
            </button>
            <button style={{ ...styles.mainTab, ...(mainTab === 'users' ? styles.mainTabActive : {}) }} onClick={() => setMainTab('users')}>
              👥 Utilizadores
            </button>
          </div>

          {/* Events Tab */}
          {mainTab === 'events' && (
            <>
              <div style={styles.subTabs}>
                <button style={{ ...styles.subTab, ...(eventTab === 'pending' ? styles.subTabActive : {}) }} onClick={() => setEventTab('pending')}>Pendentes</button>
                <button style={{ ...styles.subTab, ...(eventTab === 'all' ? styles.subTabActive : {}) }} onClick={() => setEventTab('all')}>Todos</button>
              </div>
              {events.length === 0 ? (
                <div style={styles.emptyState}><span style={styles.emptyIcon}>📋</span><h3 style={styles.emptyTitle}>{eventTab === 'pending' ? 'Sem eventos pendentes' : 'Sem eventos'}</h3></div>
              ) : (
                <div style={styles.eventsGrid}>
                  {events.map((event) => (
                    <div key={event.id} style={styles.eventCard}>
                      <div style={styles.eventImageContainer}>
                        {event.coverImage ? <img src={event.coverImage} alt={event.name} style={styles.eventImage} /> : <div style={styles.eventImagePlaceholder}><span>📷</span></div>}
                        {getStatusBadge(event.status)}
                      </div>
                      <div style={styles.eventContent}>
                        <h3 style={styles.eventName}>{event.name}</h3>
                        <p style={styles.eventLocation}>{event.location}</p>
                        <p style={styles.eventDate}>{formatDate(event.date_hour)}</p>
                        {event.users && <p style={styles.eventOwner}>Organizador: {event.users.name || event.users.email}</p>}
                        <div style={styles.statsRow}>
                          <div style={styles.statItem}><span style={styles.statValue}>{event.stats?.confirmed || 0}</span><span style={styles.statLabel}>Confirmados</span></div>
                          <div style={styles.statItem}><span style={styles.statValue}>{event.stats?.pending || 0}</span><span style={styles.statLabel}>Pendentes</span></div>
                          <div style={styles.statItem}><span style={styles.statValue}>{event.available_tickets}</span><span style={styles.statLabel}>Disponíveis</span></div>
                        </div>
                        <div style={styles.priceRow}><span style={styles.priceTag}>€{event.price_no_bus}</span>{event.price_bus > 0 && <span style={styles.priceBus}>€{event.price_bus} c/ autocarro</span>}</div>
                        <div style={styles.actionButtons}>
                          <button style={styles.detailsButton} onClick={() => setSelectedEvent(event)}>Ver Detalhes</button>
                          {event.status === 'pending' && (
                            <>
                              <button style={styles.approveButton} onClick={() => handleApprove(event.id)} disabled={actionLoading === event.id}>{actionLoading === event.id ? '...' : 'Aprovar'}</button>
                              <button style={styles.rejectButton} onClick={() => handleReject(event.id)} disabled={actionLoading === event.id}>{actionLoading === event.id ? '...' : 'Rejeitar'}</button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Tickets Tab */}
          {mainTab === 'tickets' && (
            <>
              <div style={styles.ticketStatsGrid}>
                <div style={styles.ticketStatCard}><span style={styles.ticketStatNumber}>{orders.filter(o => !o.tickets_sent).length}</span><span style={styles.ticketStatLabel}>Por Enviar</span></div>
                <div style={styles.ticketStatCard}><span style={{ ...styles.ticketStatNumber, color: '#22c55e' }}>{orders.filter(o => o.tickets_sent).length}</span><span style={styles.ticketStatLabel}>Enviados</span></div>
                <div style={styles.ticketStatCard}><span style={{ ...styles.ticketStatNumber, color: '#020202' }}>{orders.length}</span><span style={styles.ticketStatLabel}>Total</span></div>
              </div>
              <div style={styles.subTabs}>
                <button style={{ ...styles.subTab, ...(ticketTab === 'pending' ? styles.subTabActive : {}) }} onClick={() => setTicketTab('pending')}>Por Enviar ({orders.filter(o => !o.tickets_sent).length})</button>
                <button style={{ ...styles.subTab, ...(ticketTab === 'sent' ? styles.subTabActive : {}) }} onClick={() => setTicketTab('sent')}>Enviados ({orders.filter(o => o.tickets_sent).length})</button>
                <button style={{ ...styles.subTab, ...(ticketTab === 'all' ? styles.subTabActive : {}) }} onClick={() => setTicketTab('all')}>Todos ({orders.length})</button>
              </div>
              {ordersLoading ? <div style={styles.loadingContainer}><div style={styles.spinner}></div></div> : filteredOrders.length === 0 ? (
                <div style={styles.emptyState}><span style={styles.emptyIcon}>📧</span><h3 style={styles.emptyTitle}>Nenhuma encomenda</h3></div>
              ) : (
                <div style={styles.ordersList}>
                  {filteredOrders.map(order => (
                    <div key={order.id} style={styles.orderCard}>
                      <div style={styles.orderHeader}>
                        <div style={styles.orderHeaderLeft}>
                          <span style={styles.orderId}>Encomenda #{order.id}</span>
                          <span style={{ ...styles.orderBadge, backgroundColor: order.tickets_sent ? 'rgba(34,197,94,0.1)' : 'rgba(249,178,52,0.1)', color: order.tickets_sent ? '#22c55e' : '#F9B234', border: `1px solid ${order.tickets_sent ? 'rgba(34,197,94,0.3)' : 'rgba(249,178,52,0.3)'}` }}>{order.tickets_sent ? '✓ Enviado' : '⏳ Por Enviar'}</span>
                        </div>
                        <span style={styles.orderAmount}>€{order.total_amount.toFixed(2)}</span>
                      </div>
                      <div style={styles.orderBody}>
                        <div style={styles.orderDetails}>
                          <div style={styles.orderDetailRow}><span style={styles.orderDetailLabel}>Evento</span><span style={styles.orderDetailValue}>{order.events?.name}</span></div>
                          <div style={styles.orderDetailRow}><span style={styles.orderDetailLabel}>Data</span><span style={styles.orderDetailValue}>{formatDate(order.events?.date_hour)}</span></div>
                          <div style={styles.orderDetailRow}><span style={styles.orderDetailLabel}>Cliente</span><span style={styles.orderDetailValue}>{order.users?.name}</span></div>
                          <div style={styles.orderDetailRow}><span style={styles.orderDetailLabel}>Email</span><span style={styles.orderDetailValue}>{order.users?.email}</span></div>
                          <div style={styles.orderDetailRow}><span style={styles.orderDetailLabel}>Bilhetes</span><span style={styles.orderDetailValue}>{order.tickets?.length || 0}</span></div>
                          <div style={styles.orderDetailRow}><span style={styles.orderDetailLabel}>Compra</span><span style={styles.orderDetailValue}>{formatDate(order.created_at)}</span></div>
                        </div>
                        <div style={styles.ticketEmailsBox}>
                          <span style={styles.ticketEmailsLabel}>Emails dos bilhetes:</span>
                          <div style={styles.ticketEmailsList}>{order.tickets?.map((ticket) => <span key={ticket.id} style={styles.ticketEmailTag}>{ticket.ticket_email}</span>)}</div>
                        </div>
                        {order.tickets_sent && order.tickets_sent_at && <div style={styles.sentInfo}><span style={styles.sentIcon}>✓</span><span>Enviado em {formatDate(order.tickets_sent_at)}</span></div>}
                        {!order.tickets_sent && <button onClick={() => handleSendTickets(order.id)} disabled={sendingOrder === order.id} style={{ ...styles.sendTicketsBtn, opacity: sendingOrder === order.id ? 0.7 : 1 }}>{sendingOrder === order.id ? 'A enviar...' : '📧 Enviar Bilhetes'}</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Staff Codes Tab */}
          {mainTab === 'staff' && (
            <>
              <div style={styles.staffInfoBox}>
                <span style={styles.staffInfoIcon}>ℹ️</span>
                <div>
                  <p style={styles.staffInfoTitle}>Gestão de Códigos de Staff</p>
                  <p style={styles.staffInfoText}>Aqui podes gerir os códigos de acesso para o staff fazer check-in. O botão fica disponível desde <strong>2 horas antes</strong> até <strong>24 horas depois</strong> do evento.</p>
                </div>
              </div>
              <div style={styles.ticketStatsGrid}>
                <div style={styles.ticketStatCard}><span style={{ ...styles.ticketStatNumber, color: '#22c55e' }}>{activeCheckinCount}</span><span style={styles.ticketStatLabel}>Check-in Ativo</span></div>
                <div style={styles.ticketStatCard}><span style={{ ...styles.ticketStatNumber, color: '#3b82f6' }}>{approvedEvents.filter(e => !isCheckinAvailable(e.date_hour) && new Date(e.date_hour) > new Date()).length}</span><span style={styles.ticketStatLabel}>Próximos</span></div>
                <div style={styles.ticketStatCard}><span style={{ ...styles.ticketStatNumber, color: '#020202' }}>{approvedEvents.length}</span><span style={styles.ticketStatLabel}>Total Aprovados</span></div>
              </div>
              {staffEventsLoading ? <div style={styles.loadingContainer}><div style={styles.spinner}></div></div> : approvedEvents.length === 0 ? (
                <div style={styles.emptyState}><span style={styles.emptyIcon}>🎫</span><h3 style={styles.emptyTitle}>Nenhum evento aprovado</h3></div>
              ) : (
                <div style={styles.staffEventsList}>
                  {approvedEvents.map(event => {
                    const timeStatus = getEventTimeStatus(event.date_hour)
                    const canCheckin = isCheckinAvailable(event.date_hour)
                    return (
                      <div key={event.id} style={styles.staffEventCard}>
                        <div style={styles.staffEventHeader}>
                          <div style={styles.staffEventImageContainer}>
                            {event.coverImage ? <img src={event.coverImage} alt={event.name} style={styles.staffEventImage} /> : <div style={styles.staffEventImagePlaceholder}><span>📷</span></div>}
                          </div>
                          <div style={styles.staffEventInfo}>
                            <div style={styles.staffEventTitleRow}>
                              <h3 style={styles.staffEventName}>{event.name}</h3>
                              <span style={{ ...styles.staffEventStatusBadge, backgroundColor: `${timeStatus.color}15`, color: timeStatus.color, border: `1px solid ${timeStatus.color}30` }}>{timeStatus.label}</span>
                            </div>
                            <p style={styles.staffEventLocation}>📍 {event.location}</p>
                            <p style={styles.staffEventDate}>📅 {formatDate(event.date_hour)}</p>
                            {event.users && <p style={styles.staffEventOwner}>Organizador: {event.users.name || event.users.email}</p>}
                          </div>
                        </div>
                        <div style={styles.staffEventStats}>
                          <div style={styles.staffEventStatItem}><span style={styles.staffEventStatValue}>{event.stats?.confirmed || 0}</span><span style={styles.staffEventStatLabel}>Confirmados</span></div>
                          <div style={styles.staffEventStatItem}><span style={styles.staffEventStatValue}>{event.stats?.pending || 0}</span><span style={styles.staffEventStatLabel}>Pendentes</span></div>
                          <div style={styles.staffEventStatItem}><span style={styles.staffEventStatValue}>{event.available_tickets}</span><span style={styles.staffEventStatLabel}>Disponíveis</span></div>
                        </div>
                        <div style={styles.staffEventActions}>
                          {canCheckin ? (
                            <button onClick={() => setCheckinEvent({ id: event.id, name: event.name })} style={styles.staffCheckinButton}>🎫 Gerir Códigos de Check-in</button>
                          ) : (
                            <div style={styles.staffCheckinDisabled}>{timeStatus.status === 'upcoming' ? '⏰ Check-in disponível 2h antes' : '✓ Evento terminado'}</div>
                          )}
                          <Link to={`/events/${event.id}`} style={styles.staffViewEventBtn}>Ver Evento</Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* Users Tab */}
          {mainTab === 'users' && (
            <>
              <form onSubmit={handleUserSearch} style={styles.searchForm}>
                <input type="text" placeholder="Pesquisar por nome ou email..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} style={styles.searchInput} />
                <button type="submit" style={styles.searchButton}>Pesquisar</button>
                {userSearch && <button type="button" style={styles.clearButton} onClick={() => { setUserSearch(''); loadUsers(); }}>Limpar</button>}
              </form>
              <p style={styles.userCount}>{users.length} utilizadores encontrados</p>
              <div style={styles.usersList}>
                {users.length === 0 ? <div style={styles.emptyState}><span style={styles.emptyIcon}>👥</span><h3 style={styles.emptyTitle}>Nenhum utilizador</h3></div> : users.map((user) => (
                  <div key={user.id} style={styles.userCard}>
                    <div style={styles.userInfo}>
                      <div style={styles.userAvatar}>{(user.name || user.email || '?').charAt(0).toUpperCase()}</div>
                      <div style={styles.userDetails}><h3 style={styles.userName}>{user.name || 'Sem nome'}</h3><p style={styles.userEmail}>{user.email}</p></div>
                      {getRoleBadge(user.role)}
                    </div>
                    <div style={styles.userActions}>
                      {user.role === 'admin' ? <span style={styles.adminNote}>Admin</span> : (
                        <button onClick={() => handlePromote(user.id, user.role)} disabled={updatingUser === user.id} style={user.role === 'owner' ? styles.demoteButton : styles.promoteButton}>
                          {updatingUser === user.id ? 'A atualizar...' : user.role === 'owner' ? 'Despromover' : 'Promover a Owner'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div style={styles.modalOverlay} onClick={() => setSelectedEvent(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => setSelectedEvent(null)}>✕</button>
            <div style={styles.modalHeader}>{getStatusBadge(selectedEvent.status)}<h2 style={styles.modalTitle}>{selectedEvent.name}</h2><p style={styles.modalSubtitle}>{selectedEvent.location}</p></div>
            {selectedEvent.coverImage && <div style={styles.modalImageContainer}><img src={selectedEvent.coverImage} alt={selectedEvent.name} style={styles.modalImage} /></div>}
            <div style={styles.modalDetails}>
              <div style={styles.modalRow}><span style={styles.modalLabel}>Data e Hora</span><span style={styles.modalValue}>{formatDate(selectedEvent.date_hour)}</span></div>
              <div style={styles.modalRow}><span style={styles.modalLabel}>Organizador</span><span style={styles.modalValue}>{selectedEvent.users?.name || 'N/A'} ({selectedEvent.users?.email || 'N/A'})</span></div>
              <div style={styles.modalRow}><span style={styles.modalLabel}>Descrição</span><span style={styles.modalValue}>{selectedEvent.description || 'Sem descrição'}</span></div>
              <div style={styles.modalDivider}></div>
              <h3 style={styles.modalSectionTitle}>Preços</h3>
              <div style={styles.modalPrices}>
                <div style={styles.modalPriceItem}><span style={styles.modalPriceValue}>€{selectedEvent.price_no_bus}</span><span style={styles.modalPriceLabel}>Sem autocarro</span></div>
                {selectedEvent.price_bus > 0 && <div style={styles.modalPriceItem}><span style={styles.modalPriceValue}>€{selectedEvent.price_bus}</span><span style={styles.modalPriceLabel}>Com autocarro</span></div>}
              </div>
              <div style={styles.modalDivider}></div>
              <h3 style={styles.modalSectionTitle}>Estatísticas</h3>
              <div style={styles.modalStats}>
                <div style={styles.modalStatCard}><span style={styles.modalStatNumber}>{selectedEvent.tickets_number}</span><span style={styles.modalStatLabel}>Total</span></div>
                <div style={styles.modalStatCard}><span style={{ ...styles.modalStatNumber, color: '#22c55e' }}>{selectedEvent.stats?.confirmed || 0}</span><span style={styles.modalStatLabel}>Confirmados</span></div>
                <div style={styles.modalStatCard}><span style={{ ...styles.modalStatNumber, color: '#fbbf24' }}>{selectedEvent.stats?.pending || 0}</span><span style={styles.modalStatLabel}>Pendentes</span></div>
                <div style={styles.modalStatCard}><span style={styles.modalStatNumber}>{selectedEvent.available_tickets}</span><span style={styles.modalStatLabel}>Disponíveis</span></div>
              </div>
            </div>
            {selectedEvent.status === 'pending' && (
              <div style={styles.modalActions}>
                <button style={styles.modalApproveBtn} onClick={() => handleApprove(selectedEvent.id)} disabled={actionLoading === selectedEvent.id}>{actionLoading === selectedEvent.id ? 'A processar...' : '✓ Aprovar'}</button>
                <button style={styles.modalRejectBtn} onClick={() => handleReject(selectedEvent.id)} disabled={actionLoading === selectedEvent.id}>{actionLoading === selectedEvent.id ? 'A processar...' : '✕ Rejeitar'}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Staff Codes Modal */}
      {checkinEvent && <StaffCodesManager eventId={checkinEvent.id} eventName={checkinEvent.name} onClose={() => setCheckinEvent(null)} />}
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { minHeight: '100vh', backgroundColor: '#020202', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  loadingContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' },
  spinner: { width: '40px', height: '40px', border: '3px solid rgba(249, 178, 52, 0.2)', borderTop: '3px solid #F9B234', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  navbar: { padding: '20px 0', position: 'fixed', top: 0, left: 0, right: 0, backgroundColor: 'rgba(2, 2, 2, 0.9)', backdropFilter: 'blur(20px)', zIndex: 1000, borderBottom: '1px solid rgba(249, 178, 52, 0.1)' },
  navContent: { maxWidth: '1400px', margin: '0 auto', padding: '0 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logoImage: { height: '56px', width: 'auto' },
  navButtons: { display: 'flex', gap: '16px', alignItems: 'center' },
  navLogoutBtn: { backgroundColor: 'transparent', color: '#B5B5B5', border: '1px solid rgba(181, 181, 181, 0.2)', padding: '10px 24px', borderRadius: '50px', fontSize: '14px', cursor: 'pointer' },
  heroSection: { paddingTop: '140px', paddingBottom: '40px', textAlign: 'center', backgroundColor: '#020202' },
  heroTag: { color: '#F9B234', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '12px' },
  pageTitle: { fontSize: '48px', fontWeight: '700', color: '#FFFFFF', margin: '0 0 12px 0', letterSpacing: '-1px' },
  customLetter: { fontFamily: 'fontello', color: '#F9B234', fontSize: '0.85em', display: 'inline-block', transform: 'translateY(-5px)' },
  subtitle: { fontSize: '17px', color: '#B5B5B5', margin: 0 },
  contentSection: { backgroundColor: '#FFFFFF', padding: '60px 0', minHeight: '60vh' },
  contentContainer: { maxWidth: '1400px', margin: '0 auto', padding: '0 48px' },
  mainTabs: { display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' },
  mainTab: { padding: '16px 32px', backgroundColor: '#FAFAFA', color: '#666666', border: '1px solid #EEEEEE', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' },
  mainTabActive: { backgroundColor: '#020202', color: '#FFFFFF', border: '1px solid #020202' },
  mainTabBadge: { backgroundColor: '#F9B234', color: '#020202', padding: '4px 10px', borderRadius: '50px', fontSize: '13px', fontWeight: '700' },
  subTabs: { display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #EEEEEE', paddingBottom: '16px', flexWrap: 'wrap' },
  subTab: { padding: '10px 20px', backgroundColor: 'transparent', color: '#666666', border: 'none', borderRadius: '50px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  subTabActive: { backgroundColor: 'rgba(249, 178, 52, 0.1)', color: '#F9B234' },
  emptyState: { textAlign: 'center', padding: '80px 40px' },
  emptyIcon: { fontSize: '64px', marginBottom: '24px', display: 'block' },
  emptyTitle: { fontSize: '24px', color: '#020202', margin: '0 0 8px 0' },
  eventsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '24px' },
  eventCard: { backgroundColor: '#FAFAFA', borderRadius: '20px', overflow: 'hidden', border: '1px solid #EEEEEE' },
  eventImageContainer: { height: '180px', backgroundColor: '#E5E5E5', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  eventImage: { width: '100%', height: '100%', objectFit: 'cover' },
  eventImagePlaceholder: { fontSize: '48px', opacity: 0.3 },
  statusBadge: { position: 'absolute', top: '12px', right: '12px', padding: '6px 14px', borderRadius: '50px', fontSize: '12px', fontWeight: '600' },
  eventContent: { padding: '24px' },
  eventName: { fontSize: '20px', fontWeight: '600', color: '#020202', margin: '0 0 4px 0' },
  eventLocation: { fontSize: '14px', color: '#666666', margin: '0 0 4px 0' },
  eventDate: { fontSize: '13px', color: '#999999', margin: '0 0 12px 0' },
  eventOwner: { fontSize: '13px', color: '#F9B234', margin: '0 0 16px 0', fontWeight: '500' },
  statsRow: { display: 'flex', gap: '16px', marginBottom: '16px' },
  statItem: { display: 'flex', flexDirection: 'column', gap: '2px' },
  statValue: { fontSize: '20px', fontWeight: '700', color: '#020202' },
  statLabel: { fontSize: '11px', color: '#999999', textTransform: 'uppercase', letterSpacing: '0.5px' },
  priceRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' },
  priceTag: { fontSize: '24px', fontWeight: '700', color: '#020202' },
  priceBus: { fontSize: '13px', color: '#666666' },
  actionButtons: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  detailsButton: { padding: '10px 20px', backgroundColor: '#020202', color: '#FFFFFF', border: 'none', borderRadius: '50px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' },
  approveButton: { padding: '10px 20px', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '50px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  rejectButton: { padding: '10px 20px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '50px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  ticketStatsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' },
  ticketStatCard: { backgroundColor: '#FAFAFA', borderRadius: '16px', padding: '24px', textAlign: 'center', border: '1px solid #EEE' },
  ticketStatNumber: { display: 'block', fontSize: '36px', fontWeight: '700', color: '#F9B234', marginBottom: '4px' },
  ticketStatLabel: { fontSize: '14px', color: '#666' },
  ordersList: { display: 'flex', flexDirection: 'column', gap: '20px' },
  orderCard: { backgroundColor: '#FAFAFA', borderRadius: '20px', overflow: 'hidden', border: '1px solid #EEE' },
  orderHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', backgroundColor: '#020202' },
  orderHeaderLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  orderId: { fontSize: '16px', fontWeight: '600', color: '#FFFFFF' },
  orderBadge: { padding: '6px 14px', borderRadius: '50px', fontSize: '13px', fontWeight: '600' },
  orderAmount: { fontSize: '24px', fontWeight: '700', color: '#F9B234' },
  orderBody: { padding: '24px' },
  orderDetails: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' },
  orderDetailRow: { display: 'flex', flexDirection: 'column', gap: '4px' },
  orderDetailLabel: { fontSize: '12px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' },
  orderDetailValue: { fontSize: '14px', fontWeight: '500', color: '#020202' },
  ticketEmailsBox: { padding: '16px', backgroundColor: '#F5F5F5', borderRadius: '12px', marginBottom: '20px' },
  ticketEmailsLabel: { display: 'block', fontSize: '12px', color: '#666', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  ticketEmailsList: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  ticketEmailTag: { display: 'inline-block', padding: '6px 12px', backgroundColor: '#FFFFFF', border: '1px solid #E5E5E5', borderRadius: '8px', fontSize: '13px', color: '#020202' },
  sentInfo: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: '12px', fontSize: '14px', color: '#22c55e', fontWeight: '500' },
  sentIcon: { fontWeight: '700' },
  sendTicketsBtn: { width: '100%', padding: '16px', backgroundColor: '#F9B234', color: '#020202', border: 'none', borderRadius: '50px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  staffInfoBox: { display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '20px 24px', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.2)', marginBottom: '32px' },
  staffInfoIcon: { fontSize: '24px' },
  staffInfoTitle: { fontSize: '15px', fontWeight: '600', color: '#020202', margin: '0 0 4px 0' },
  staffInfoText: { fontSize: '14px', color: '#666', margin: 0, lineHeight: '1.5' },
  staffEventsList: { display: 'flex', flexDirection: 'column', gap: '20px' },
  staffEventCard: { backgroundColor: '#FAFAFA', borderRadius: '20px', overflow: 'hidden', border: '1px solid #EEE' },
  staffEventHeader: { display: 'flex', gap: '20px', padding: '24px' },
  staffEventImageContainer: { width: '120px', height: '120px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#E5E5E5' },
  staffEventImage: { width: '100%', height: '100%', objectFit: 'cover' },
  staffEventImagePlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', opacity: 0.3 },
  staffEventInfo: { flex: 1 },
  staffEventTitleRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' },
  staffEventName: { fontSize: '20px', fontWeight: '700', color: '#020202', margin: 0 },
  staffEventStatusBadge: { padding: '6px 14px', borderRadius: '50px', fontSize: '12px', fontWeight: '600' },
  staffEventLocation: { fontSize: '14px', color: '#666', margin: '0 0 6px 0' },
  staffEventDate: { fontSize: '14px', color: '#666', margin: '0 0 8px 0' },
  staffEventOwner: { fontSize: '13px', color: '#F9B234', margin: 0, fontWeight: '500' },
  staffEventStats: { display: 'flex', gap: '24px', padding: '16px 24px', borderTop: '1px solid #EEE', borderBottom: '1px solid #EEE' },
  staffEventStatItem: { display: 'flex', flexDirection: 'column', gap: '2px' },
  staffEventStatValue: { fontSize: '20px', fontWeight: '700', color: '#020202' },
  staffEventStatLabel: { fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' },
  staffEventActions: { display: 'flex', gap: '12px', padding: '20px 24px', flexWrap: 'wrap' },
  staffCheckinButton: { flex: 2, minWidth: '200px', padding: '14px 24px', backgroundColor: '#22c55e', color: '#FFFFFF', border: 'none', borderRadius: '50px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
  staffCheckinDisabled: { flex: 2, minWidth: '200px', padding: '14px 24px', backgroundColor: '#F5F5F5', color: '#999', borderRadius: '50px', fontSize: '14px', textAlign: 'center' },
  staffViewEventBtn: { flex: 1, minWidth: '100px', padding: '14px 24px', backgroundColor: 'transparent', color: '#020202', textDecoration: 'none', borderRadius: '50px', fontSize: '14px', fontWeight: '600', border: '1px solid #DDD', textAlign: 'center' },
  searchForm: { display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' },
  searchInput: { flex: 1, minWidth: '200px', padding: '14px 20px', borderRadius: '50px', border: '1px solid #DDDDDD', fontSize: '15px', outline: 'none' },
  searchButton: { padding: '14px 28px', backgroundColor: '#F9B234', color: '#020202', border: 'none', borderRadius: '50px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  clearButton: { padding: '14px 28px', backgroundColor: 'transparent', color: '#666666', border: '1px solid #DDDDDD', borderRadius: '50px', fontSize: '14px', cursor: 'pointer' },
  userCount: { color: '#666666', fontSize: '14px', marginBottom: '20px' },
  usersList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  userCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', backgroundColor: '#FAFAFA', borderRadius: '16px', border: '1px solid #EEEEEE', flexWrap: 'wrap', gap: '16px' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '16px' },
  userAvatar: { width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#020202', color: '#F9B234', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '600' },
  userDetails: { display: 'flex', flexDirection: 'column', gap: '2px' },
  userName: { fontSize: '16px', fontWeight: '600', color: '#020202', margin: 0 },
  userEmail: { fontSize: '14px', color: '#666666', margin: 0 },
  roleBadge: { padding: '6px 14px', borderRadius: '50px', fontSize: '12px', fontWeight: '600' },
  userActions: { display: 'flex', gap: '8px' },
  promoteButton: { padding: '10px 20px', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '50px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  demoteButton: { padding: '10px 20px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '50px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  adminNote: { color: '#999999', fontSize: '13px', fontStyle: 'italic' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' },
  modal: { backgroundColor: '#FFFFFF', borderRadius: '24px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'auto', position: 'relative' },
  modalClose: { position: 'absolute', top: '20px', right: '20px', width: '40px', height: '40px', backgroundColor: 'rgba(0, 0, 0, 0.1)', border: 'none', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', zIndex: 10 },
  modalHeader: { padding: '32px 32px 0' },
  modalTitle: { fontSize: '28px', fontWeight: '700', color: '#020202', margin: '12px 0 4px 0' },
  modalSubtitle: { fontSize: '16px', color: '#666666', margin: 0 },
  modalImageContainer: { margin: '24px 32px', borderRadius: '16px', overflow: 'hidden', height: '200px' },
  modalImage: { width: '100%', height: '100%', objectFit: 'cover' },
  modalDetails: { padding: '0 32px 32px' },
  modalRow: { marginBottom: '16px' },
  modalLabel: { display: 'block', fontSize: '12px', color: '#999999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' },
  modalValue: { fontSize: '15px', color: '#020202' },
  modalDivider: { height: '1px', backgroundColor: '#EEEEEE', margin: '24px 0' },
  modalSectionTitle: { fontSize: '14px', fontWeight: '600', color: '#020202', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '1px' },
  modalPrices: { display: 'flex', gap: '24px' },
  modalPriceItem: { display: 'flex', flexDirection: 'column' },
  modalPriceValue: { fontSize: '28px', fontWeight: '700', color: '#020202' },
  modalPriceLabel: { fontSize: '13px', color: '#666666' },
  modalStats: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' },
  modalStatCard: { backgroundColor: '#FAFAFA', padding: '16px', borderRadius: '12px', textAlign: 'center' },
  modalStatNumber: { fontSize: '24px', fontWeight: '700', color: '#020202', display: 'block' },
  modalStatLabel: { fontSize: '11px', color: '#999999', textTransform: 'uppercase' },
  modalActions: { display: 'flex', gap: '12px', padding: '24px 32px', borderTop: '1px solid #EEEEEE', backgroundColor: '#FAFAFA' },
  modalApproveBtn: { flex: 1, padding: '16px', backgroundColor: '#22c55e', color: '#FFFFFF', border: 'none', borderRadius: '50px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
  modalRejectBtn: { flex: 1, padding: '16px', backgroundColor: '#ef4444', color: '#FFFFFF', border: 'none', borderRadius: '50px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
}
