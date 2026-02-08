import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCurrentUser, logout } from '../../services/auth'
import { getUserRole } from '../../services/users'
import { supabase } from '../../supabaseClient'

interface OrderWithTickets {
  id: number
  user_id: string
  event_id: number
  total_amount: number
  status: string
  tickets_sent: boolean
  tickets_sent_at: string | null
  created_at: string
  users: {
    name: string
    email: string
  }
  events: {
    name: string
    date_hour: string
    location: string
  }
  tickets: {
    id: number
    ticket_email: string
    type: string
    status: string
  }[]
}

export const TicketsManagement = () => {
  const [orders, setOrders] = useState<OrderWithTickets[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<number | null>(null)
  const [filter, setFilter] = useState<'pending' | 'sent' | 'all'>('pending')
  const navigate = useNavigate()

  useEffect(() => {
    const checkAdminAndLoad = async () => {
      const user = await getCurrentUser()
      if (!user) {
        navigate('/login')
        return
      }

      const role = await getUserRole(user.id)
      if (role !== 'admin') {
        navigate('/home')
        return
      }

      await loadOrders()
    }
    checkAdminAndLoad()
  }, [navigate])

  const loadOrders = async () => {
    setLoading(true)
    
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        users(name, email),
        events(name, date_hour, location),
        tickets(id, ticket_email, type, status)
      `)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao carregar orders:', error)
    } else {
      setOrders(data || [])
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleSendTickets = async (orderId: number) => {
    if (!confirm('Tens a certeza que queres enviar os bilhetes?\n\nEsta ação irá:\n• Enviar email com os bilhetes\n• Disponibilizar para download na área do cliente')) {
      return
    }

    setSending(orderId)

    try {
      const user = await getCurrentUser()

      const { error: orderError } = await supabase
        .from('orders')
        .update({
          tickets_sent: true,
          tickets_sent_at: new Date().toISOString(),
          tickets_sent_by: user?.id
        })
        .eq('id', orderId)

      if (orderError) throw orderError

      const { error: ticketsError } = await supabase
        .from('tickets')
        .update({
          available_for_download: true,
          sent_at: new Date().toISOString()
        })
        .eq('order_id', orderId)

      if (ticketsError) throw ticketsError

      // TODO: Chamar Edge Function para enviar emails
      // await supabase.functions.invoke('send-tickets-email', { body: { orderId } })

      alert('Bilhetes enviados com sucesso!')
      await loadOrders()

    } catch (error: any) {
      console.error('Erro ao enviar bilhetes:', error)
      alert('Erro ao enviar bilhetes: ' + error.message)
    } finally {
      setSending(null)
    }
  }

  const filteredOrders = orders.filter(order => {
    if (filter === 'pending') return !order.tickets_sent
    if (filter === 'sent') return order.tickets_sent
    return true
  })

  const pendingCount = orders.filter(o => !o.tickets_sent).length
  const sentCount = orders.filter(o => o.tickets_sent).length

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Navbar */}
      <nav style={styles.navbar}>
        <div style={styles.navContent}>
          <Link to="/home" style={{ textDecoration: 'none' }}>
            <img src="/logo.png" alt="Upgrade Events" style={styles.logoImage} />
          </Link>
          <div style={styles.navButtons}>
            <button onClick={handleLogout} style={styles.navLogoutBtn}>Log Out</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div style={styles.heroSection}>
        <Link to="/dashboard" style={styles.backLink}>← Voltar ao Dashboard</Link>
        <h1 style={styles.title}>Envio de Bilhetes</h1>
        <p style={styles.subtitle}>Enviar bilhetes após confirmação de pagamento pelo organizador</p>
      </div>

      {/* Content Section */}
      <div style={styles.contentSection}>
        <div style={styles.contentWrapper}>
          
          {/* Stats Cards */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <span style={styles.statNumber}>{pendingCount}</span>
              <span style={styles.statLabel}>Por Enviar</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statNumberGreen}>{sentCount}</span>
              <span style={styles.statLabel}>Enviados</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statNumberGray}>{orders.length}</span>
              <span style={styles.statLabel}>Total Confirmados</span>
            </div>
          </div>

          {/* Filters */}
          <div style={styles.filters}>
            <button
              onClick={() => setFilter('pending')}
              style={{
                ...styles.filterBtn,
                ...(filter === 'pending' ? styles.filterBtnActive : {})
              }}
            >
              Por Enviar ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('sent')}
              style={{
                ...styles.filterBtn,
                ...(filter === 'sent' ? styles.filterBtnActive : {})
              }}
            >
              Enviados ({sentCount})
            </button>
            <button
              onClick={() => setFilter('all')}
              style={{
                ...styles.filterBtn,
                ...(filter === 'all' ? styles.filterBtnActive : {})
              }}
            >
              Todos ({orders.length})
            </button>
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>📧</div>
              <h3 style={styles.emptyTitle}>
                {filter === 'pending' ? 'Nenhum bilhete por enviar' : 
                 filter === 'sent' ? 'Nenhum bilhete enviado' : 
                 'Nenhuma encomenda confirmada'}
              </h3>
              <p style={styles.emptyText}>
                {filter === 'pending' 
                  ? 'Quando os organizadores confirmarem pagamentos, aparecerão aqui.' 
                  : 'As encomendas enviadas aparecerão aqui.'}
              </p>
            </div>
          ) : (
            <div style={styles.ordersList}>
              {filteredOrders.map(order => (
                <div key={order.id} style={styles.orderCard}>
                  <div style={styles.orderHeader}>
                    <div style={styles.orderHeaderLeft}>
                      <span style={styles.orderId}>Encomenda #{order.id}</span>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: order.tickets_sent ? 'rgba(34,197,94,0.1)' : 'rgba(249,178,52,0.1)',
                        color: order.tickets_sent ? '#22c55e' : '#F9B234',
                        border: `1px solid ${order.tickets_sent ? 'rgba(34,197,94,0.3)' : 'rgba(249,178,52,0.3)'}`
                      }}>
                        {order.tickets_sent ? '✓ Enviado' : '⏳ Por Enviar'}
                      </span>
                    </div>
                    <span style={styles.orderAmount}>€{order.total_amount.toFixed(2)}</span>
                  </div>

                  <div style={styles.orderBody}>
                    <div style={styles.orderDetails}>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Evento</span>
                        <span style={styles.detailValue}>{order.events?.name}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Data do Evento</span>
                        <span style={styles.detailValue}>{formatDate(order.events?.date_hour)}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Cliente</span>
                        <span style={styles.detailValue}>{order.users?.name}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Email do Cliente</span>
                        <span style={styles.detailValue}>{order.users?.email}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Bilhetes</span>
                        <span style={styles.detailValue}>{order.tickets?.length || 0}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Compra em</span>
                        <span style={styles.detailValue}>{formatDate(order.created_at)}</span>
                      </div>
                    </div>

                    {/* Emails dos bilhetes */}
                    <div style={styles.ticketEmails}>
                      <span style={styles.ticketEmailsLabel}>Emails dos bilhetes:</span>
                      <div style={styles.ticketEmailsList}>
                        {order.tickets?.map((ticket) => (
                          <span key={ticket.id} style={styles.ticketEmail}>
                            {ticket.ticket_email}
                          </span>
                        ))}
                      </div>
                    </div>

                    {order.tickets_sent && order.tickets_sent_at && (
                      <div style={styles.sentInfo}>
                        <span style={styles.sentIcon}>✓</span>
                        <span>Enviado em {formatDate(order.tickets_sent_at)}</span>
                      </div>
                    )}

                    {!order.tickets_sent && (
                      <button
                        onClick={() => handleSendTickets(order.id)}
                        disabled={sending === order.id}
                        style={{
                          ...styles.sendBtn,
                          opacity: sending === order.id ? 0.7 : 1,
                          cursor: sending === order.id ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {sending === order.id ? 'A enviar...' : '📧 Enviar Bilhetes'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#020202',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(249,178,52,0.2)',
    borderTop: '3px solid #F9B234',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  
  // Navbar
  navbar: {
    padding: '20px 0',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(2,2,2,0.9)',
    backdropFilter: 'blur(20px)',
    zIndex: 1000,
    borderBottom: '1px solid rgba(249,178,52,0.1)',
  },
  navContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 48px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoImage: {
    height: '56px',
    width: 'auto',
  },
  navButtons: {
    display: 'flex',
    gap: '12px',
  },
  navLogoutBtn: {
    backgroundColor: 'transparent',
    color: '#B5B5B5',
    border: '1px solid rgba(181,181,181,0.2)',
    padding: '10px 24px',
    borderRadius: '50px',
    fontSize: '14px',
    cursor: 'pointer',
  },

  // Hero Section
  heroSection: {
    paddingTop: '140px',
    paddingBottom: '40px',
    textAlign: 'center',
    backgroundColor: '#020202',
  },
  backLink: {
    position: 'absolute',
    right: '48px',
    top: '125px',
    color: '#F9B234',
    textDecoration: 'none',
    fontSize: '14px',
    padding: '10px 20px',
    backgroundColor: 'rgba(249,178,52,0.1)',
    borderRadius: '50px',
    border: '1px solid rgba(249,178,52,0.2)',
  },
  title: {
    fontSize: '48px',
    fontWeight: '700',
    margin: '0 0 12px 0',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: '17px',
    color: '#B5B5B5',
    margin: 0,
  },

  // Content Section
  contentSection: {
    backgroundColor: '#FFFFFF',
    padding: '60px 0',
    minHeight: '50vh',
  },
  contentWrapper: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '0 24px',
  },

  // Stats
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '32px',
  },
  statCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: '16px',
    padding: '24px',
    textAlign: 'center',
    border: '1px solid #EEE',
  },
  statNumber: {
    display: 'block',
    fontSize: '36px',
    fontWeight: '700',
    color: '#F9B234',
    marginBottom: '4px',
  },
  statNumberGreen: {
    display: 'block',
    fontSize: '36px',
    fontWeight: '700',
    color: '#22c55e',
    marginBottom: '4px',
  },
  statNumberGray: {
    display: 'block',
    fontSize: '36px',
    fontWeight: '700',
    color: '#020202',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
  },

  // Filters
  filters: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  filterBtn: {
    padding: '12px 24px',
    border: '1px solid #EEE',
    borderRadius: '50px',
    backgroundColor: '#FAFAFA',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#666',
    transition: 'all 0.2s ease',
  },
  filterBtnActive: {
    backgroundColor: '#020202',
    color: '#FFFFFF',
    borderColor: '#020202',
  },

  // Empty State
  empty: {
    textAlign: 'center',
    padding: '80px 40px',
    backgroundColor: '#FAFAFA',
    borderRadius: '20px',
    border: '1px solid #EEE',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '24px',
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#020202',
    margin: '0 0 8px 0',
  },
  emptyText: {
    fontSize: '15px',
    color: '#666',
    margin: 0,
  },

  // Orders List
  ordersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  orderCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: '20px',
    overflow: 'hidden',
    border: '1px solid #EEE',
  },
  orderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    backgroundColor: '#020202',
  },
  orderHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  orderId: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  badge: {
    padding: '6px 14px',
    borderRadius: '50px',
    fontSize: '13px',
    fontWeight: '600',
  },
  orderAmount: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#F9B234',
  },
  orderBody: {
    padding: '24px',
  },
  orderDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '20px',
  },
  detailRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  detailLabel: {
    fontSize: '12px',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  detailValue: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#020202',
  },
  ticketEmails: {
    padding: '16px',
    backgroundColor: '#F5F5F5',
    borderRadius: '12px',
    marginBottom: '20px',
  },
  ticketEmailsLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#666',
    marginBottom: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  ticketEmailsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  ticketEmail: {
    display: 'inline-block',
    padding: '6px 12px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E5E5',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#020202',
  },
  sentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: '12px',
    fontSize: '14px',
    color: '#22c55e',
    fontWeight: '500',
  },
  sentIcon: {
    fontWeight: '700',
  },
  sendBtn: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#F9B234',
    color: '#020202',
    border: 'none',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
}
