import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCurrentUser, logout } from '../../services/auth'
import { getUserRole } from '../../services/users'
import { getEventsByOwner } from '../../services/events'
import { getOrdersByOwner, confirmOrder, rejectOrder } from '../../services/orders'

interface TicketData {
  id: number
  ticket_email: string
  restrictions?: string
  tables?: { name: string }
  bus_go?: { location: string; time: string }
  bus_come?: { location: string; time: string }
}

interface OrderData {
  id: number
  total_amount: number
  status: string
  payment_proof_url?: string
  created_at: string
  events: { id: number; name: string }
  users: { name: string; email: string }
  tickets: TicketData[]
}

interface EventWithOrders {
  id: number
  name: string
  location: string
  date_hour: string
  pendingOrders: OrderData[]
  confirmedOrders: OrderData[]
}

type TabType = 'pending' | 'confirmed'

export const Owner = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [eventsWithOrders, setEventsWithOrders] = useState<EventWithOrders[]>([])
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null)
  const [expandedTicket, setExpandedTicket] = useState<number | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [totalPending, setTotalPending] = useState(0)
  const [totalConfirmed, setTotalConfirmed] = useState(0)

  useEffect(() => {
    const load = async () => {
      const user = await getCurrentUser()
      if (!user) { navigate('/login'); return }
      const role = await getUserRole(user.id)
      if (role !== 'owner' && role !== 'admin') { navigate('/home'); return }
      setUserId(user.id)
      await loadData(user.id)
      setLoading(false)
    }
    load()
  }, [navigate])

  const loadData = async (ownerId: string) => {
    const [events, orders] = await Promise.all([
      getEventsByOwner(ownerId),
      getOrdersByOwner(ownerId)
    ])

    const grouped: EventWithOrders[] = events.map((event: any) => {
      const eventOrders = orders.filter((o: any) => o.event_id === event.id)
      return {
        id: event.id,
        name: event.name,
        location: event.location,
        date_hour: event.date_hour,
        pendingOrders: eventOrders.filter((o: any) => o.status === 'pending' && o.payment_proof_url),
        confirmedOrders: eventOrders.filter((o: any) => o.status === 'confirmed')
      }
    }).filter((e: EventWithOrders) => e.pendingOrders.length > 0 || e.confirmedOrders.length > 0)

    setEventsWithOrders(grouped)
    setTotalPending(grouped.reduce((sum, e) => sum + e.pendingOrders.length, 0))
    setTotalConfirmed(grouped.reduce((sum, e) => sum + e.confirmedOrders.length, 0))
  }

  const handleConfirm = async (orderId: number) => {
    if (!confirm('Confirmar este pagamento?\n\nOs bilhetes serão posteriormente enviados pelo administrador.')) return
    
    setActionLoading(orderId)
    try {
      await confirmOrder(orderId)
      alert('✅ Pagamento confirmado!\n\nOs bilhetes serão enviados pelo administrador.')
      await loadData(userId)
    } catch (error: any) {
      console.error('Erro ao confirmar:', error)
      alert(`Erro ao confirmar pagamento: ${error.message || 'Erro desconhecido'}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (orderId: number) => {
    if (!confirm('Rejeitar este pagamento?')) return
    setActionLoading(orderId)
    try {
      await rejectOrder(orderId)
      await loadData(userId)
    } catch {
      alert('Erro ao rejeitar pagamento')
    } finally {
      setActionLoading(null)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-PT', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  const formatShortDate = (d: string) => new Date(d).toLocaleDateString('pt-PT', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  })

  const filteredEvents = eventsWithOrders.filter(e => 
    activeTab === 'pending' ? e.pendingOrders.length > 0 : e.confirmedOrders.length > 0
  )

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}><div style={styles.spinner}></div></div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <nav style={styles.navbar}>
        <div style={styles.navContent}>
          <Link to="/home" style={{ textDecoration: 'none' }}>
            <img src="/logo.png" alt="Logo" style={styles.logoImage} />
          </Link>
          <div style={styles.navButtons}>
            <Link to="/home" style={styles.navLink}>Home</Link>
            <button onClick={handleLogout} style={styles.logoutBtn}>Terminar Sessão</button>
          </div>
        </div>
      </nav>

      <div style={styles.heroSection}>
        <p style={styles.heroTag}>Área do Organizador</p>
        <h1 style={styles.pageTitle}>
          <span style={styles.customLetter}>{'\ue808'}</span>ainel do Organizador
        </h1>
        <p style={styles.subtitle}>Confirma os comprovativos de pagamento dos teus eventos</p>
      </div>

      <div style={styles.contentSection}>
        <div style={styles.contentContainer}>
          
          {/* Info Box */}
          <div style={styles.infoBox}>
            <span style={styles.infoIcon}>ℹ️</span>
            <div style={styles.infoContent}>
              <p style={styles.infoTitle}>Fluxo de Confirmação</p>
              <p style={styles.infoText}>
                Após confirmares o pagamento, os bilhetes serão enviados pelo administrador para os emails dos clientes.
              </p>
            </div>
          </div>

          <div style={styles.tabsContainer}>
            <button
              style={{ ...styles.tab, ...(activeTab === 'pending' ? styles.tabActive : {}) }}
              onClick={() => setActiveTab('pending')}
            >
              <span style={styles.tabIcon}>⏳</span>
              Por Validar
              {totalPending > 0 && <span style={styles.tabBadge}>{totalPending}</span>}
            </button>
            <button
              style={{ ...styles.tab, ...(activeTab === 'confirmed' ? styles.tabActive : {}) }}
              onClick={() => setActiveTab('confirmed')}
            >
              <span style={styles.tabIcon}>✓</span>
              Confirmados
              {totalConfirmed > 0 && <span style={styles.tabBadgeGreen}>{totalConfirmed}</span>}
            </button>
          </div>

          {filteredEvents.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>{activeTab === 'pending' ? '✓' : '📋'}</span>
              <h3 style={styles.emptyTitle}>
                {activeTab === 'pending' ? 'Sem pagamentos por validar' : 'Sem pagamentos confirmados'}
              </h3>
              <p style={styles.emptyText}>
                {activeTab === 'pending'
                  ? 'Não tens comprovativos à espera de validação.'
                  : 'Ainda não confirmaste nenhum pagamento.'}
              </p>
            </div>
          ) : (
            <div style={styles.eventsList}>
              {filteredEvents.map(event => {
                const orders = activeTab === 'pending' ? event.pendingOrders : event.confirmedOrders
                const ticketCount = orders.reduce((sum, o) => sum + (o.tickets?.length || 0), 0)

                return (
                  <div key={event.id} style={styles.eventCard}>
                    <div style={styles.eventHeader}>
                      <div style={styles.eventInfo}>
                        <h2 style={styles.eventName}>{event.name}</h2>
                        <p style={styles.eventMeta}>📍 {event.location} • 📅 {formatDate(event.date_hour)}</p>
                      </div>
                      <div style={styles.eventStats}>
                        <div style={styles.statBox}>
                          <span style={styles.statNumber}>{orders.length}</span>
                          <span style={styles.statLabel}>Encomendas</span>
                        </div>
                        <div style={styles.statBox}>
                          <span style={styles.statNumber}>{ticketCount}</span>
                          <span style={styles.statLabel}>Bilhetes</span>
                        </div>
                      </div>
                    </div>

                    <div style={styles.ordersList}>
                      {orders.map(order => (
                        <div key={order.id} style={styles.orderCard}>
                          <div style={styles.orderHeader}>
                            <div style={styles.orderMainInfo}>
                              <span style={styles.orderId}>#{order.id}</span>
                              <span style={styles.orderCustomer}>{order.users?.name || 'Cliente'}</span>
                              <span style={styles.orderEmail}>{order.users?.email}</span>
                            </div>
                            <div style={styles.orderAmountSection}>
                              <span style={styles.orderAmount}>€{order.total_amount.toFixed(2)}</span>
                              <span style={styles.orderTickets}>{order.tickets?.length || 0} bilhete{(order.tickets?.length || 0) !== 1 ? 's' : ''}</span>
                            </div>
                          </div>

                          <div style={styles.orderDetails}>
                            <button
                              style={styles.expandBtn}
                              onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                            >
                              {expandedOrder === order.id ? '▲ Esconder detalhes' : '▼ Ver detalhes'}
                            </button>
                            <span style={styles.orderDate}>{formatShortDate(order.created_at)}</span>
                          </div>

                          {expandedOrder === order.id && (
                            <div style={styles.ticketsList}>
                              {order.tickets?.map((ticket, idx) => (
                                <div key={ticket.id} style={styles.ticketItem}>
                                  <div 
                                    style={styles.ticketRow}
                                    onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                                  >
                                    <span style={styles.ticketNum}>Bilhete {idx + 1}</span>
                                    <span style={styles.ticketEmail}>{ticket.ticket_email}</span>
                                    <span style={styles.ticketExpand}>{expandedTicket === ticket.id ? '▲' : '▼'}</span>
                                  </div>
                                  
                                  {expandedTicket === ticket.id && (
                                    <div style={styles.ticketDetails}>
                                      <div style={styles.ticketDetailRow}>
                                        <span style={styles.ticketDetailLabel}>🪑 Mesa</span>
                                        <span style={styles.ticketDetailValue}>{ticket.tables?.name || 'Não atribuída'}</span>
                                      </div>
                                      
                                      <div style={styles.ticketDetailRow}>
                                        <span style={styles.ticketDetailLabel}>🚌 Autocarro Ida</span>
                                        <span style={styles.ticketDetailValue}>
                                          {ticket.bus_go 
                                            ? `${ticket.bus_go.location} - ${new Date(ticket.bus_go.time).toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                                            : 'Sem autocarro'}
                                        </span>
                                      </div>
                                      
                                      <div style={styles.ticketDetailRow}>
                                        <span style={styles.ticketDetailLabel}>🚌 Autocarro Volta</span>
                                        <span style={styles.ticketDetailValue}>
                                          {ticket.bus_come 
                                            ? `${ticket.bus_come.location} - ${new Date(ticket.bus_come.time).toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                                            : 'Sem autocarro'}
                                        </span>
                                      </div>
                                      
                                      <div style={styles.ticketDetailRow}>
                                        <span style={styles.ticketDetailLabel}>🍽️ Restrições</span>
                                        <span style={styles.ticketDetailValue}>
                                          {ticket.restrictions || 'Nenhuma'}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {activeTab === 'pending' && (
                            <div style={styles.orderActions}>
                              {order.payment_proof_url && (
                                <a href={order.payment_proof_url} target="_blank" rel="noopener noreferrer" style={styles.proofLink}>
                                  📎 Ver Comprovativo
                                </a>
                              )}
                              <div style={styles.actionButtons}>
                                <button
                                  style={styles.confirmBtn}
                                  onClick={() => handleConfirm(order.id)}
                                  disabled={actionLoading === order.id}
                                >
                                  {actionLoading === order.id ? '...' : '✓ Confirmar Pagamento'}
                                </button>
                                <button
                                  style={styles.rejectBtn}
                                  onClick={() => handleReject(order.id)}
                                  disabled={actionLoading === order.id}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          )}

                          {activeTab === 'confirmed' && (
                            <div style={styles.confirmedBadge}>
                              <span>✓ Pagamento Confirmado • Aguarda envio dos bilhetes pelo admin</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { minHeight: '100vh', backgroundColor: '#020202', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  loadingContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' },
  spinner: { width: 40, height: 40, border: '3px solid rgba(249,178,52,0.2)', borderTop: '3px solid #F9B234', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  navbar: { padding: '20px 0', position: 'fixed', top: 0, left: 0, right: 0, backgroundColor: 'rgba(2,2,2,0.9)', backdropFilter: 'blur(20px)', zIndex: 1000, borderBottom: '1px solid rgba(249,178,52,0.1)' },
  navContent: { maxWidth: 1400, margin: '0 auto', padding: '0 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logoImage: { height: 56 },
  navButtons: { display: 'flex', gap: 16, alignItems: 'center' },
  navLink: { color: '#EDEDED', textDecoration: 'none', fontSize: 14, fontWeight: 500 },
  logoutBtn: { backgroundColor: 'transparent', color: '#B5B5B5', border: '1px solid rgba(181,181,181,0.2)', padding: '10px 24px', borderRadius: 50, fontSize: 14, cursor: 'pointer' },
  heroSection: { paddingTop: 140, paddingBottom: 40, textAlign: 'center' },
  heroTag: { color: '#F9B234', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 12 },
  pageTitle: { fontSize: 48, fontWeight: 700, color: '#FFF', margin: '0 0 12px' },
  customLetter: { fontFamily: 'fontello', color: '#F9B234', fontSize: '0.85em', display: 'inline-block', transform: 'translateY(-4px)' },
  subtitle: { fontSize: 17, color: '#B5B5B5', margin: 0 },
  contentSection: { backgroundColor: '#FFF', padding: '60px 0', minHeight: '60vh' },
  contentContainer: { maxWidth: 1000, margin: '0 auto', padding: '0 48px' },
  // Info Box
  infoBox: { display: 'flex', alignItems: 'flex-start', gap: 16, padding: 20, backgroundColor: 'rgba(59,130,246,0.08)', borderRadius: 16, marginBottom: 32, border: '1px solid rgba(59,130,246,0.2)' },
  infoIcon: { fontSize: 24, flexShrink: 0 },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 15, fontWeight: 600, color: '#020202', margin: '0 0 4px' },
  infoText: { fontSize: 14, color: '#666', margin: 0, lineHeight: 1.5 },
  // Tabs
  tabsContainer: { display: 'flex', gap: 12, marginBottom: 40 },
  tab: { flex: 1, padding: '20px 24px', backgroundColor: '#FAFAFA', color: '#666', border: '2px solid #EEE', borderRadius: 16, fontSize: 16, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 },
  tabActive: { backgroundColor: '#020202', color: '#FFF', borderColor: '#020202' },
  tabIcon: { fontSize: 18 },
  tabBadge: { backgroundColor: '#F9B234', color: '#020202', padding: '4px 12px', borderRadius: 50, fontSize: 14, fontWeight: 700 },
  tabBadgeGreen: { backgroundColor: '#22c55e', color: '#FFF', padding: '4px 12px', borderRadius: 50, fontSize: 14, fontWeight: 700 },
  // Empty State
  emptyState: { textAlign: 'center', padding: '80px 40px' },
  emptyIcon: { fontSize: 64, display: 'block', marginBottom: 24, opacity: 0.5 },
  emptyTitle: { fontSize: 24, fontWeight: 600, color: '#020202', margin: '0 0 8px' },
  emptyText: { fontSize: 15, color: '#666', margin: 0 },
  // Events
  eventsList: { display: 'flex', flexDirection: 'column', gap: 32 },
  eventCard: { backgroundColor: '#FAFAFA', borderRadius: 20, overflow: 'hidden', border: '1px solid #EEE' },
  eventHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 28px', backgroundColor: '#020202', gap: 20, flexWrap: 'wrap' },
  eventInfo: { flex: 1, minWidth: 200 },
  eventName: { fontSize: 22, fontWeight: 700, color: '#FFF', margin: '0 0 6px' },
  eventMeta: { fontSize: 14, color: '#B5B5B5', margin: 0 },
  eventStats: { display: 'flex', gap: 16 },
  statBox: { textAlign: 'center', padding: '12px 20px', backgroundColor: 'rgba(249,178,52,0.1)', borderRadius: 12 },
  statNumber: { display: 'block', fontSize: 24, fontWeight: 700, color: '#F9B234' },
  statLabel: { fontSize: 11, color: '#B5B5B5', textTransform: 'uppercase', letterSpacing: 0.5 },
  // Orders
  ordersList: { padding: 20, display: 'flex', flexDirection: 'column', gap: 12 },
  orderCard: { backgroundColor: '#FFF', borderRadius: 12, border: '1px solid #EEE', overflow: 'hidden' },
  orderHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #F5F5F5', flexWrap: 'wrap', gap: 12 },
  orderMainInfo: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  orderId: { fontSize: 14, fontWeight: 700, color: '#F9B234', backgroundColor: 'rgba(249,178,52,0.1)', padding: '4px 10px', borderRadius: 6 },
  orderCustomer: { fontSize: 15, fontWeight: 600, color: '#020202' },
  orderEmail: { fontSize: 13, color: '#999' },
  orderAmountSection: { textAlign: 'right' },
  orderAmount: { display: 'block', fontSize: 20, fontWeight: 700, color: '#020202' },
  orderTickets: { fontSize: 12, color: '#999' },
  orderDetails: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', backgroundColor: '#FAFAFA' },
  expandBtn: { background: 'none', border: 'none', color: '#666', fontSize: 13, cursor: 'pointer', padding: 0 },
  orderDate: { fontSize: 12, color: '#999' },
  // Tickets
  ticketsList: { padding: '0 20px 16px', backgroundColor: '#FAFAFA' },
  ticketItem: { marginBottom: 8 },
  ticketRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#FFF', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '1px solid #EEE' },
  ticketNum: { fontWeight: 600, color: '#020202' },
  ticketEmail: { color: '#666', flex: 1, marginLeft: 12 },
  ticketExpand: { color: '#999', fontSize: 10 },
  ticketDetails: { backgroundColor: '#FFF', borderRadius: '0 0 8px 8px', padding: '12px 16px', marginTop: -8, borderTop: '1px dashed #EEE', border: '1px solid #EEE', borderTopStyle: 'dashed' },
  ticketDetailRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F5F5F5' },
  ticketDetailLabel: { fontSize: 13, color: '#666' },
  ticketDetailValue: { fontSize: 13, color: '#020202', fontWeight: 500, textAlign: 'right', maxWidth: '60%' },
  // Actions
  orderActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid #F5F5F5', backgroundColor: 'rgba(249,178,52,0.05)', flexWrap: 'wrap', gap: 12 },
  proofLink: { color: '#F9B234', textDecoration: 'none', fontSize: 14, fontWeight: 600 },
  actionButtons: { display: 'flex', gap: 8 },
  confirmBtn: { padding: '10px 24px', backgroundColor: '#22c55e', color: '#FFF', border: 'none', borderRadius: 50, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  rejectBtn: { padding: '10px 16px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 50, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  confirmedBadge: { padding: '12px 20px', backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontSize: 13, fontWeight: 500, textAlign: 'center' }
}
