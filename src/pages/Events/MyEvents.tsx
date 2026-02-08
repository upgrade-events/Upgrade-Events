import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCurrentUser, logout } from '../../services/auth'
import { getEventsByOwner, deleteEvent } from '../../services/events'
import { deleteBusesByEvent } from '../../services/buses'
import { deleteTablesByEvent } from '../../services/tables'

export const MyEvents = () => {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const loadEvents = async () => {
      const user = await getCurrentUser()
      if (!user) {
        navigate('/login')
        return
      }

      const myEvents = await getEventsByOwner(user.id)
      setEvents(myEvents)
      setLoading(false)
    }
    loadEvents()
  }, [navigate])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleDelete = async (eventId: number) => {
    if (!confirm('Tens a certeza que queres apagar este evento? Esta ação não pode ser revertida.')) {
      return
    }

    setDeleting(eventId)
    try {
      await deleteBusesByEvent(eventId)
      await deleteTablesByEvent(eventId)
      await deleteEvent(eventId)
      
      setEvents(events.filter(e => e.id !== eventId))
    } catch (err: any) {
      alert('Erro ao apagar evento: ' + err.message)
    }
    setDeleting(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Verificar se o evento ainda não começou (para mostrar status)
  const isEventActive = (dateString: string) => {
    return new Date(dateString) > new Date()
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
        <Link to="/home" style={styles.backLink}>← Voltar</Link>
        <h1 style={styles.title}>
          <span style={styles.customLetterOrange}>{'\ue805'}</span>s Meus Eventos
        </h1>
        <p style={styles.subtitle}>Gere os eventos que criaste</p>
        
        {events.length > 0 && (
          <Link to="/events/create" style={styles.createButtonHero}>
            + Criar Novo Evento
          </Link>
        )}
      </div>

      {/* Content Section */}
      <div style={styles.contentSection}>
        <div style={styles.contentWrapper}>
          {events.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>🎭</div>
              <h3 style={styles.emptyTitle}>Ainda não criaste nenhum evento</h3>
              <p style={styles.emptyText}>Cria o teu primeiro evento e começa a vender bilhetes!</p>
              <Link to="/events/create" style={styles.createButton}>
                + Criar Primeiro Evento
              </Link>
            </div>
          ) : (
            <div style={styles.eventList}>
              {events.map((event) => (
                <div key={event.id} style={styles.eventCard}>
                  <div style={styles.eventHeader}>
                    <div style={styles.eventHeaderLeft}>
                      <h3 style={styles.eventName}>{event.name}</h3>
                      <span style={styles.eventDate}>{formatDate(event.date_hour)}</span>
                    </div>
                    <div style={styles.eventStatus}>
                      {isEventActive(event.date_hour) ? (
                        <span style={styles.statusActive}>Ativo</span>
                      ) : (
                        <span style={styles.statusPast}>Terminado</span>
                      )}
                    </div>
                  </div>

                  <div style={styles.eventBody}>
                    <div style={styles.eventDetails}>
                      <div style={styles.eventDetailItem}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F9B234" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <span>{event.location}</span>
                      </div>
                      
                      <div style={styles.eventDetailItem}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F9B234" strokeWidth="2">
                          <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                          <line x1="2" y1="10" x2="22" y2="10"></line>
                        </svg>
                        <span>{event.price_no_bus}€ sem transporte / {event.price_bus}€ com transporte</span>
                      </div>
                    </div>

                    <div style={styles.eventStats}>
                      <div style={styles.statBox}>
                        <span style={styles.statNumber}>{event.available_tickets}</span>
                        <span style={styles.statLabel}>Disponíveis</span>
                      </div>
                      <div style={styles.statDivider}>/</div>
                      <div style={styles.statBox}>
                        <span style={styles.statNumber}>{event.tickets_number}</span>
                        <span style={styles.statLabel}>Total</span>
                      </div>
                      {event.bus && event.bus.length > 0 && (
                        <div style={styles.statBox}>
                          <span style={styles.statNumber}>{event.bus.length}</span>
                          <span style={styles.statLabel}>Autocarros</span>
                        </div>
                      )}
                      {event.tables && event.tables.length > 0 && (
                        <div style={styles.statBox}>
                          <span style={styles.statNumber}>{event.tables.length}</span>
                          <span style={styles.statLabel}>Mesas</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div style={styles.eventActions}>
                    <Link to={`/events/${event.id}`} style={styles.viewButton}>
                      Ver Evento
                    </Link>
                    <Link to={`/events/edit/${event.id}`} style={styles.editButton}>
                      Editar
                    </Link>
                    <button
                      onClick={() => handleDelete(event.id)}
                      disabled={deleting === event.id}
                      style={{
                        ...styles.deleteButton,
                        opacity: deleting === event.id ? 0.6 : 1,
                        cursor: deleting === event.id ? 'wait' : 'pointer',
                      }}
                    >
                      {deleting === event.id ? 'A apagar...' : 'Apagar'}
                    </button>
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
  
  // Navbar
  navbar: {
    padding: '20px 0',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(2, 2, 2, 0.9)',
    backdropFilter: 'blur(20px)',
    zIndex: 1000,
    borderBottom: '1px solid rgba(249, 178, 52, 0.1)',
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
    border: '1px solid rgba(181, 181, 181, 0.2)',
    padding: '10px 24px',
    borderRadius: '50px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  
  // Hero Section
  heroSection: {
    paddingTop: '140px',
    paddingBottom: '60px',
    textAlign: 'center',
    maxWidth: '800px',
    margin: '0 auto',
    padding: '140px 48px 60px',
    color: '#FFFFFF',
  },
  backLink: {
    position: 'absolute',
    right: '48px',
    top: '125px',
    color: '#F9B234',
    textDecoration: 'none',
    fontSize: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    padding: '10px 20px',
    backgroundColor: 'rgba(249, 178, 52, 0.1)',
    borderRadius: '50px',
    border: '1px solid rgba(249, 178, 52, 0.2)',
  },
  title: {
    fontSize: '48px',
    fontWeight: '700',
    margin: '0 0 16px 0',
    letterSpacing: '-1px',
    color: '#FFFFFF',
  },
  customLetterOrange: {
    fontFamily: 'fontello',
    color: '#F9B234',
    fontSize: '0.85em',
    marginRight: '2px',
    display: 'inline-block',
    transform: 'translateY(-4px)',
  },
  subtitle: {
    fontSize: '17px',
    color: '#B5B5B5',
    margin: '0 0 32px 0',
  },
  createButtonHero: {
    display: 'inline-block',
    padding: '14px 32px',
    backgroundColor: '#F9B234',
    color: '#020202',
    textDecoration: 'none',
    borderRadius: '50px',
    fontSize: '15px',
    fontWeight: '600',
  },
  
  // Content Section
  contentSection: {
    backgroundColor: '#FFFFFF',
    padding: '80px 0',
    minHeight: '50vh',
  },
  contentWrapper: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '0 48px',
  },
  
  // Empty State
  empty: {
    textAlign: 'center',
    padding: '80px 40px',
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
    color: '#666666',
    margin: '0 0 32px 0',
  },
  createButton: {
    display: 'inline-block',
    padding: '16px 32px',
    backgroundColor: '#F9B234',
    color: '#020202',
    textDecoration: 'none',
    borderRadius: '50px',
    fontSize: '15px',
    fontWeight: '600',
  },
  
  // Event List
  eventList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  eventCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: '20px',
    overflow: 'hidden',
    border: '1px solid #EEEEEE',
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '24px 28px',
    backgroundColor: '#020202',
    borderBottom: '1px solid rgba(249, 178, 52, 0.2)',
  },
  eventHeaderLeft: {
    flex: 1,
  },
  eventName: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#FFFFFF',
    margin: '0 0 8px 0',
  },
  eventDate: {
    fontSize: '14px',
    color: '#B5B5B5',
  },
  eventStatus: {
    marginLeft: '16px',
  },
  statusActive: {
    padding: '6px 14px',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    color: '#22c55e',
    borderRadius: '50px',
    fontSize: '13px',
    fontWeight: '600',
    border: '1px solid rgba(34, 197, 94, 0.3)',
  },
  statusPast: {
    padding: '6px 14px',
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    color: '#6b7280',
    borderRadius: '50px',
    fontSize: '13px',
    fontWeight: '600',
    border: '1px solid rgba(107, 114, 128, 0.3)',
  },
  eventBody: {
    padding: '24px 28px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '32px',
    flexWrap: 'wrap',
  },
  eventDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: 1,
  },
  eventDetailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    color: '#666666',
  },
  eventStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  statBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #EEEEEE',
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#020202',
  },
  statLabel: {
    fontSize: '12px',
    color: '#666666',
    marginTop: '2px',
  },
  statDivider: {
    fontSize: '24px',
    color: '#CCCCCC',
    fontWeight: '300',
  },
  eventActions: {
    display: 'flex',
    gap: '12px',
    padding: '0 28px 24px',
    flexWrap: 'wrap',
  },
  viewButton: {
    flex: 1,
    minWidth: '100px',
    padding: '12px 20px',
    backgroundColor: 'transparent',
    color: '#020202',
    textDecoration: 'none',
    borderRadius: '50px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: '600',
    border: '1px solid #DDDDDD',
  },
  editButton: {
    flex: 1,
    minWidth: '100px',
    padding: '12px 20px',
    backgroundColor: '#F9B234',
    color: '#020202',
    textDecoration: 'none',
    borderRadius: '50px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    minWidth: '100px',
    padding: '12px 20px',
    backgroundColor: 'transparent',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '50px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  
  // Loading
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(249, 178, 52, 0.2)',
    borderTop: '3px solid #F9B234',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
}
