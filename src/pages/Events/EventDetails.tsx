import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getEventById } from '../../services/events'
import { logout, getCurrentUser } from '../../services/auth'
import { getEventImages } from '../../services/storage'

export const EventDetails = () => {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<any>(null)
  const [images, setImages] = useState<string[]>([])
  const [selectedImage, setSelectedImage] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      const user = await getCurrentUser()
      setIsLoggedIn(!!user)
      
      const eventData = await getEventById(Number(id))
      setEvent(eventData)
      
      // Carregar todas as imagens do evento
      const eventImages = await getEventImages(Number(id))
      setImages(eventImages)
      
      setLoading(false)
    }
    load()
  }, [id])

  const handleLogout = async () => {
    await logout()
    navigate('/')
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
  
  if (!event) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <h2 style={styles.errorTitle}>Evento não encontrado</h2>
          <Link to="/events" style={styles.backLink}>← Voltar a Eventos</Link>
        </div>
      </div>
    )
  }

  const busesIda = event.bus?.filter((b: any) => b.bus_type === 'ida') || []
  const busesVolta = event.bus?.filter((b: any) => b.bus_type === 'volta') || []

  return (
    <div style={styles.container}>
      <nav style={styles.navbar}>
        <div style={styles.navContent}>
          <Link to={isLoggedIn ? "/home" : "/"} style={{ textDecoration: 'none' }}>
            <img src="/logo.png" alt="Upgrade Events" style={styles.logoImage} />
          </Link>
          
          <div style={styles.navButtons}>
            {isLoggedIn ? (
              <button onClick={handleLogout} style={styles.navLogoutBtn}>Terminar Sessão</button>
            ) : (
              <Link to="/login" style={styles.navLoginBtn}>Entrar</Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero - Dark (sem imagem de fundo) */}
      <div style={styles.heroSection}>
        <div style={styles.heroContent}>
          <Link to="/events" style={styles.backLink}>← Voltar aos eventos</Link>
          
          <div style={styles.heroText}>
            <p style={styles.heroTag}>
              {new Date(event.date_hour).toLocaleDateString('pt-PT', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
            <h1 style={styles.eventTitle}>{event.name}</h1>
            <p style={styles.eventLocation}>{event.location}</p>
          </div>

          <div style={styles.heroButtons}>
            {event.available_tickets > 0 ? (
              <Link to={`/events/${id}/buy`} style={styles.buyButton}>
                Comprar Bilhetes 
              </Link>
            ) : (
              <span style={styles.soldOut}>Esgotado</span>
            )}
          </div>
        </div>
      </div>

      {/* Details - Light */}
      <div style={styles.detailsSection}>
        <div style={styles.detailsContent}>
          
          {/* Galeria de Imagens */}
          {images.length > 0 && (
            <div style={styles.galleryCard}>
              <h2 style={styles.cardTitle}>Imagens</h2>
              
              {/* Imagem principal */}
              <div style={styles.mainImageContainer}>
                <img 
                  src={images[selectedImage]} 
                  alt={`${event.name} - Imagem ${selectedImage + 1}`}
                  style={styles.mainImage}
                />
              </div>
              
              {/* Thumbnails */}
              {images.length > 1 && (
                <div style={styles.thumbnailsContainer}>
                  {images.map((img, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      style={{
                        ...styles.thumbnail,
                        ...(selectedImage === index ? styles.thumbnailActive : {})
                      }}
                    >
                      <img src={img} alt={`Thumbnail ${index + 1}`} style={styles.thumbnailImage} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={styles.grid}>
            {/* Event Info */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Detalhes do Evento</h2>
              
              <div style={styles.detailsList}>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Data</span>
                  <span style={styles.detailValue}>
                    {new Date(event.date_hour).toLocaleDateString('pt-PT', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Hora</span>
                  <span style={styles.detailValue}>
                    {new Date(event.date_hour).toLocaleTimeString('pt-PT', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Bilhetes Disponíveis</span>
                  <span style={styles.detailValue}>
                    {event.available_tickets} / {event.tickets_number}
                  </span>
                </div>
              </div>

              {event.description && (
                <div style={styles.description}>
                  <h3 style={styles.descTitle}>Sobre</h3>
                  <p style={styles.descText}>{event.description}</p>
                </div>
              )}
            </div>

            {/* Pricing */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Preços</h2>
              
              <div style={styles.priceOptions}>
                <div style={styles.priceCard}>
                  <div>
                    <span style={styles.priceLabel}>Standard</span>
                    <span style={styles.priceNote}>Sem transporte</span>
                  </div>
                  <span style={styles.priceAmount}>€{event.price_no_bus}</span>
                </div>
                
                {event.price_bus > 0 && (
                  <div style={{...styles.priceCard}}>
                    <div>
                      <span style={styles.priceLabel}>Com Transporte</span>
                      <span style={styles.priceNote}>Inclui autocarro</span>
                    </div>
                    <span style={styles.priceAmount}>€{event.price_bus}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Buses */}
          {(busesIda.length > 0 || busesVolta.length > 0) && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Opções de Transporte</h2>
              
              <div style={styles.busGrid}>
                {busesIda.length > 0 && (
                  <div>
                    <h3 style={styles.busTitle}>Ida</h3>
                    {busesIda.map((bus: any) => (
                      <div key={bus.id} style={styles.busItem}>
                        <div>
                          <p style={styles.busLocation}>{bus.location}</p>
                          <p style={styles.busTime}>
                            {new Date(bus.time).toLocaleString('pt-PT', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <span style={styles.busSeats}>{bus.available_seats} lugares</span>
                      </div>
                    ))}
                  </div>
                )}

                {busesVolta.length > 0 && (
                  <div>
                    <h3 style={styles.busTitle}>Volta</h3>
                    {busesVolta.map((bus: any) => (
                      <div key={bus.id} style={styles.busItem}>
                        <div>
                          <p style={styles.busLocation}>{bus.location}</p>
                          <p style={styles.busTime}>
                            {new Date(bus.time).toLocaleString('pt-PT', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <span style={styles.busSeats}>{bus.available_seats} lugares</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tables */}
          {event.tables && event.tables.length > 0 && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Mesas</h2>
              <div style={styles.tablesGrid}>
                {event.tables.map((table: any) => (
                  <div key={table.id} style={styles.tableItem}>
                    <span style={styles.tableName}>{table.name}</span>
                    <span style={styles.tableSeats}>
                      {table.available_seats}/{table.capacity}
                    </span>
                  </div>
                ))}
              </div>
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
  navLoginBtn: {
    backgroundColor: '#F9B234',
    color: '#020202',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '600',
    padding: '10px 24px',
    borderRadius: '50px',
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
    paddingBottom: '80px',
    backgroundColor: '#020202',
  },
  heroContent: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '0 48px',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  heroText: {
    marginBottom: '40px',
  },
  heroTag: {
    color: '#F9B234',
    fontSize: '14px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    marginBottom: '16px',
  },
  eventTitle: {
    fontSize: '48px',
    fontWeight: '700',
    margin: '0 0 12px 0',
    letterSpacing: '-1px',
  },
  eventLocation: {
    fontSize: '18px',
    color: '#B5B5B5',
    margin: 0,
  },
  heroButtons: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  buyButton: {
    display: 'inline-block',
    padding: '18px 48px',
    backgroundColor: '#F9B234',
    color: '#020202',
    textDecoration: 'none',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: '600',
  },
  soldOut: {
    display: 'inline-block',
    padding: '18px 48px',
    backgroundColor: '#333333',
    color: '#888888',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: '600',
  },
  
  // Details Section
  detailsSection: {
    backgroundColor: '#FFFFFF',
    padding: '80px 0',
  },
  detailsContent: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '0 48px',
  },
  
  // Gallery
  galleryCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: '20px',
    padding: '32px',
    marginBottom: '24px',
  },
  mainImageContainer: {
    width: '100%',
    borderRadius: '16px',
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    marginBottom: '16px',
  },
  mainImage: {
    width: '100%',
    maxHeight: '500px',
    objectFit: 'contain',
    display: 'block',
  },
  thumbnailsContainer: {
    display: 'flex',
    gap: '12px',
    overflowX: 'auto',
    paddingBottom: '8px',
  },
  thumbnail: {
    width: '80px',
    height: '80px',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    border: '3px solid transparent',
    flexShrink: 0,
  },
  thumbnailActive: {
    borderColor: '#F9B234',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    marginBottom: '24px',
  },
  card: {
    backgroundColor: '#FAFAFA',
    borderRadius: '20px',
    padding: '32px',
    marginBottom: '24px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    margin: '0 0 24px 0',
    color: '#020202',
  },
  detailsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '16px',
    borderBottom: '1px solid #EEEEEE',
  },
  detailLabel: {
    fontSize: '14px',
    color: '#666666',
  },
  detailValue: {
    fontSize: '14px',
    color: '#020202',
    fontWeight: '500',
  },
  description: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #EEEEEE',
  },
  descTitle: {
    fontSize: '15px',
    fontWeight: '600',
    margin: '0 0 12px 0',
    color: '#020202',
  },
  descText: {
    fontSize: '14px',
    color: '#666666',
    lineHeight: '1.7',
    margin: 0,
  },
  priceOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  priceCard: {
    padding: '20px 24px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #EEEEEE',
  },
  priceCardHighlight: {
    border: '2px solid #F9B234',
    backgroundColor: 'rgba(249, 178, 52, 0.05)',
  },
  priceLabel: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#020202',
    display: 'block',
  },
  priceNote: {
    fontSize: '13px',
    color: '#666666',
    display: 'block',
    marginTop: '2px',
  },
  priceAmount: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#020202',
  },
  busGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '32px',
  },
  busTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#666666',
    margin: '0 0 16px 0',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  busItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    marginBottom: '8px',
    border: '1px solid #EEEEEE',
  },
  busLocation: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#020202',
    margin: '0 0 4px 0',
  },
  busTime: {
    fontSize: '13px',
    color: '#666666',
    margin: 0,
  },
  busSeats: {
    fontSize: '13px',
    color: '#F9B234',
    fontWeight: '600',
  },
  tablesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '12px',
  },
  tableItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #EEEEEE',
  },
  tableName: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#020202',
  },
  tableSeats: {
    fontSize: '13px',
    color: '#F9B234',
    fontWeight: '600',
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
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '20px',
    color: '#FFFFFF',
  },
  errorTitle: {
    fontSize: '24px',
    fontWeight: '600',
    margin: 0,
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
}
