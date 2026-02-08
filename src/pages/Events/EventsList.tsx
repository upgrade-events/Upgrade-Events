import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAvailableEvents } from '../../services/events'
import { getCurrentUser } from '../../services/auth'
import { getEventCoverImage } from '../../services/storage'

interface EventWithCover {
  id: number
  name: string
  location: string
  date_hour: string
  price_no_bus: number
  available_tickets: number
  coverImage: string | null
}

export const EventsList = () => {
  const [events, setEvents] = useState<EventWithCover[]>([])
  const [filteredEvents, setFilteredEvents] = useState<EventWithCover[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const load = async () => {
      const user = await getCurrentUser()
      setIsLoggedIn(!!user)
      
      const availableEvents = await getAvailableEvents()
      
      // Carregar imagem de capa para cada evento
      const eventsWithCovers = await Promise.all(
        availableEvents.map(async (event: any) => {
          const coverImage = await getEventCoverImage(event.id)
          return {
            ...event,
            coverImage
          }
        })
      )
      
      setEvents(eventsWithCovers)
      setFilteredEvents(eventsWithCovers)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    const filtered = events.filter(event =>
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredEvents(filtered)
  }, [searchTerm, events])

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
      <nav style={styles.navbar}>
        <div style={styles.navContent}>
          <Link to={isLoggedIn ? "/home" : "/"} style={{ textDecoration: 'none' }}>
            <img src="/logo.png" alt="Upgrade Events" style={styles.logoImage} />
          </Link>
          
          <div style={styles.navButtons}>
            {isLoggedIn ? (
              <Link to="/account" style={styles.navAccountBtn}>Conta</Link>
            ) : (
              <>
                <Link to="/login" style={styles.navLoginBtn}>Entrar</Link>
                <Link to="/register" style={styles.navRegisterBtn}>Registar</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section - Dark */}
      <div style={styles.heroSection}>
        <p style={styles.heroTag}>Descobre</p>
        <h1 style={styles.title}>
          <span style={styles.customLetterOrangeE}>{'\ue803'}</span>ventos
        </h1>
        <p style={styles.subtitle}>Descobre e Reserva Bilhetes para os Próximos Eventos</p>
        
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="Pesquisar eventos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* Events Section - Light */}
      <div style={styles.eventsSection}>
        <div style={styles.eventsContent}>
          {filteredEvents.length === 0 ? (
            <div style={styles.empty}>
              <h3 style={styles.emptyTitle}>
                {searchTerm ? 'Nenhum evento encontrado' : 'Sem eventos disponíveis'}
              </h3>
              <p style={styles.emptyText}>
                {searchTerm 
                  ? 'Tenta um termo de pesquisa diferente'
                  : 'Volta mais tarde para novos eventos'}
              </p>
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} style={styles.clearBtn}>
                  Limpar Pesquisa
                </button>
              )}
            </div>
          ) : (
            <div style={styles.eventsGrid}>
              {filteredEvents.map((event) => (
                <Link 
                  key={event.id} 
                  to={`/events/${event.id}`}
                  style={styles.eventCard}
                >
                  {/* Imagem do evento - centrada e contida */}
                  <div style={styles.eventImageContainer}>
                    {event.coverImage ? (
                      <img 
                        src={event.coverImage} 
                        alt={event.name} 
                        style={styles.eventImage}
                      />
                    ) : (
                      <div style={styles.eventImagePlaceholder}>
                        <span style={styles.placeholderIcon}>📷</span>
                      </div>
                    )}
                    <span style={styles.eventDate}>
                      {new Date(event.date_hour).toLocaleDateString('pt-PT', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  
                  <div style={styles.eventContent}>
                    <h3 style={styles.eventName}>{event.name}</h3>
                    <p style={styles.eventLocation}>{event.location}</p>
                    
                    <div style={styles.eventFooter}>
                      <span style={styles.eventPrice}>€{event.price_no_bus}</span>
                      <span style={styles.eventTickets}>
                        {event.available_tickets} restantes
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#020202',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  customLetterOrangeE: {
    fontFamily: 'fontello',
    color: '#F9B234',
    fontSize: '0.85em',
    marginRight: '-3px',
    letterSpacing: 'normal',
    display: 'inline-block',
    transform: 'translateY(-7px)',
  },
  navbar: {
    padding: '20px 0',
    position: 'fixed' as const,
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
    alignItems: 'center',
  },
  navLoginBtn: {
    color: '#EDEDED',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    padding: '10px 20px',
  },
  navRegisterBtn: {
    backgroundColor: '#F9B234',
    color: '#020202',
    textDecoration: 'none',
    padding: '10px 24px',
    borderRadius: '50px',
    fontSize: '14px',
    fontWeight: '600',
  },
  navAccountBtn: {
    color: '#EDEDED',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    padding: '10px 24px',
    border: '1px solid rgba(237, 237, 237, 0.2)',
    borderRadius: '50px',
  },
  heroSection: {
    paddingTop: '140px',
    paddingBottom: '60px',
    textAlign: 'center' as const,
    maxWidth: '600px',
    margin: '0 auto',
    padding: '140px 48px 60px',
    color: '#FFFFFF',
  },
  heroTag: {
    color: '#F9B234',
    fontSize: '14px',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '3px',
    marginBottom: '12px',
  },
  title: {
    fontSize: '56px',
    fontWeight: '700',
    margin: '0 0 16px 0',
    letterSpacing: '-1px',
  },
  subtitle: {
    fontSize: '17px',
    color: '#B5B5B5',
    margin: '0 0 40px 0',
  },
  searchContainer: {
    maxWidth: '500px',
    margin: '0 auto',
  },
  searchInput: {
    width: '100%',
    padding: '18px 28px',
    fontSize: '15px',
    border: '1px solid rgba(249, 178, 52, 0.2)',
    borderRadius: '50px',
    backgroundColor: '#121212',
    color: '#FFFFFF',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  eventsSection: {
    backgroundColor: '#FFFFFF',
    padding: '80px 0',
    minHeight: '50vh',
  },
  eventsContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 48px',
  },
  eventsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '28px',
  },
  eventCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: '20px',
    overflow: 'hidden',
    textDecoration: 'none',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    border: '1px solid #EEEEEE',
  },
  eventImageContainer: {
    height: '220px',
    backgroundColor: '#E5E5E5',
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: '100%',
    objectFit: 'fill' as const,
  },
  eventImagePlaceholder: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #F9B234 0%, #E09A1E 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: '48px',
    opacity: 0.5,
  },
  eventDate: {
    position: 'absolute' as const,
    top: '16px',
    left: '16px',
    padding: '10px 16px',
    backgroundColor: '#020202',
    borderRadius: '50px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  eventContent: {
    padding: '28px',
  },
  eventName: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#020202',
    margin: '0 0 8px 0',
  },
  eventLocation: {
    fontSize: '14px',
    color: '#666666',
    margin: '0 0 24px 0',
  },
  eventFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventPrice: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#020202',
  },
  eventTickets: {
    fontSize: '13px',
    color: '#F9B234',
    fontWeight: '600',
    padding: '6px 14px',
    backgroundColor: 'rgba(249, 178, 52, 0.1)',
    borderRadius: '50px',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '80px 40px',
  },
  emptyTitle: {
    fontSize: '24px',
    color: '#020202',
    margin: '0 0 8px 0',
  },
  emptyText: {
    fontSize: '15px',
    color: '#666666',
    margin: '0 0 24px 0',
  },
  clearBtn: {
    padding: '14px 28px',
    backgroundColor: '#F9B234',
    color: '#020202',
    border: 'none',
    borderRadius: '50px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
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
    border: '3px solid rgba(249, 178, 52, 0.2)',
    borderTop: '3px solid #F9B234',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
}
