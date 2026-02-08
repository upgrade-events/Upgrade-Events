import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { logout, getCurrentUser } from '../../services/auth'
import { getUserRole } from '../../services/users'
import { getTicketsByUser } from '../../services/tickets'

export const Home = () => {
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string>('user')
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        navigate('/login')
        return
      }
      setUser(currentUser)

      const role = await getUserRole(currentUser.id)
      if (role) setUserRole(role)

      const userTickets = await getTicketsByUser(currentUser.id)
      setTickets(userTickets.filter((t: any) => 
        t.events?.date_hour && new Date(t.events.date_hour) > new Date()
      ).slice(0, 3))

      setLoading(false)
    }
    loadUser()
  }, [navigate])

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

  return (
    <div style={styles.container}>
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

      <div style={styles.heroSection}>
        <h1 style={styles.title}>
          <span style={styles.greeting}>
            <span style={styles.customLetterOrange}>{'\ue800'}</span>em-Vindo,
          </span>
          {' '}{user?.user_metadata?.name || 'User'}
        </h1>
      </div>

      <div style={styles.mainContent}>
        {/* Quick Stats */}

        {/* Quick Actions */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            <span style={styles.customLetterOrangeM}>{'\ue804'}</span>enu
          </h2>  
          <div style={styles.actionsGrid}>
            <Link to="/events" style={styles.actionCard}>
              <div style={styles.actionIconWrapper}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F9B234" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <div>
                <h3 style={styles.actionTitle}>Explora Eventos</h3>
                <p style={styles.actionDesc}>Descobre os Próximos Eventos</p>
              </div>
            </Link>
            
            <Link to="/my-tickets" style={styles.actionCard}>
              <div style={styles.actionIconWrapper}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F9B234" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 9a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3V9z"></path>
                  <path d="M22 9a3 3 0 0 0-3 3v1a3 3 0 0 0 3 3V9z"></path>
                  <rect x="5" y="6" width="14" height="12" rx="2"></rect>
                </svg>
              </div>
              <div>
                <h3 style={styles.actionTitle}>Bilhetes</h3>
                <p style={styles.actionDesc}>Vê os teus bilhetes</p>
              </div>
            </Link>

            <Link to="/account" style={styles.actionCard}>
              <div style={styles.actionIconWrapper}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F9B234" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </div>
              <div>
                <h3 style={styles.actionTitle}>Definições de Conta</h3>
                <p style={styles.actionDesc}>Gere o teu Perfil</p>
              </div>
            </Link>

            {(userRole === 'owner' || userRole === 'admin') && (
              <Link to="/owner" style={{...styles.actionCard, ...styles.actionCardHighlight}}>
                <div style={styles.actionIconWrapper}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F9B234" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="8.5" cy="7" r="4"></circle>
                    <line x1="20" y1="8" x2="20" y2="14"></line>
                    <line x1="23" y1="11" x2="17" y2="11"></line>
                  </svg>
                </div>
                <div>
                  <h3 style={styles.actionTitle}>Painel do Organizador</h3>
                  <p style={styles.actionDesc}>Valida pagamentos e gere eventos</p>
                </div>
              </Link>
            )}

            {(userRole === 'owner' || userRole === 'admin') && (
              <Link to="/my-events" style={{...styles.actionCard, ...styles.actionCardHighlight}}>
                <div style={styles.actionIconWrapper}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F9B234" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                </div>
                <div>
                  <h3 style={styles.actionTitle}>Os meus Eventos</h3>
                  <p style={styles.actionDesc}>Gere os teus eventos criados</p>
                </div>
              </Link>
            )}

            {(userRole === 'owner' || userRole === 'admin') && (
              <Link to="/events/create" style={{...styles.actionCard, ...styles.actionCardHighlight}}>
                <div style={styles.actionIconWrapper}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F9B234" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                  </svg>
                </div>
                <div>
                  <h3 style={styles.actionTitle}>Anunciar Evento</h3>
                  <p style={styles.actionDesc}>Anuncia o teu Próprio Evento</p>
                </div>
              </Link>
            )}

            {userRole === 'admin' && (
              <Link to="/admin" style={{...styles.actionCard, ...styles.actionCardAdmin}}>
                <div style={styles.actionIconWrapper}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F9B234" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                </div>
                <div>
                  <h3 style={styles.actionTitle}>Painel do Admin</h3>
                  <p style={styles.actionDesc}>Gestão do Sistema</p>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Upcoming Tickets */}
        {tickets.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>
                 <span style={styles.customLetterOrangeO}>{'\ue805'}</span>s meus Próximos Eventos
              </h2>
              <Link to="/my-tickets" style={styles.viewAllLink}>Ver todos</Link>
            </div>
            <div style={styles.ticketsList}>
              {tickets.map((ticket) => (
                <div key={ticket.id} style={styles.ticketCard}>
                  <div style={styles.ticketInfo}>
                    <h3 style={styles.ticketName}>{ticket.events?.name}</h3>
                    <p style={styles.ticketDate}>
                      {new Date(ticket.events?.date_hour).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <span style={{
                    ...styles.ticketStatus,
                    ...(ticket.status === 'approved' ? styles.statusApproved : 
                        ticket.status === 'pending' ? styles.statusPending : 
                        styles.statusDefault)
                  }}>
                    {ticket.status === 'approved' ? 'Confirmed' : 
                     ticket.status === 'pending' ? 'Pending' : ticket.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#020202',
    color: '#FFFFFF',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  customLetterOrange: {
  fontFamily: 'fontello',
  color: '#F9B234',
  fontSize: '0.85em',
  marginRight: '2px',
  letterSpacing: 'normal',
  display: 'inline-block',
  transform: 'translateY(-7px)',
  },
  customLetterOrangeM: {
  fontFamily: 'fontello',
  color: '#F9B234',
  fontSize: '0.85em',
  marginRight: '2px',
  letterSpacing: 'normal',
  display: 'inline-block',
  transform: 'translateY(-3px)',
  },
  customLetterOrangeO: {
  fontFamily: 'fontello',
  color: '#F9B234',
  fontSize: '0.85em',
  marginRight: '2px',
  letterSpacing: 'normal',
  display: 'inline-block',
  transform: 'translateY(-3px)',
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
  navMenu: {
    display: 'flex',
    gap: '40px',
  },
  navLink: {
    color: '#B5B5B5',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: '500',
  },
  navLinkActive: {
    color: '#F9B234',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: '500',
  },
  navButtons: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
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
  navLogoutBtn: {
    backgroundColor: 'transparent',
    color: '#EDEDED',
    border: '1px solid rgba(181, 181, 181, 0.2)',
    padding: '10px 24px',
    borderRadius: '50px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  heroSection: {
  paddingTop: '160px',
  paddingBottom: '60px',
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '160px 48px 60px',
  textAlign: 'center' as const,
  },
  greeting: {
  fontSize: '64px',
  color: '#ffffff',
  margin: '0 0 12px 0',
  fontWeight: '500',
  letterSpacing: '0px',
  },
title: {
  fontSize: '64px',
  fontWeight: '700',
  margin: 0,
  color: '#F9B234',
  letterSpacing: '-2px',
  },
  mainContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 48px 80px',
  },
  statsRow: {
    display: 'flex',
    gap: '24px',
    marginBottom: '48px',
  },
  statCard: {
    backgroundColor: '#121212',
    border: '1px solid rgba(249, 178, 52, 0.1)',
    borderRadius: '16px',
    padding: '28px 36px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: '14px',
    color: '#B5B5B5',
  },
  section: {
    marginBottom: '48px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '30px',
    fontWeight: '600',
    color: '#FFFFFF',
    margin: 0,
    marginBottom: '20px',
  },
  viewAllLink: {
    color: '#F9B234',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  actionCard: {
    backgroundColor: '#121212',
    border: '1px solid rgba(249, 178, 52, 0.1)',
    borderRadius: '16px',
    padding: '24px',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    transition: 'all 0.3s ease',
  },
  actionCardHighlight: {
    borderColor: 'rgba(249, 178, 52, 0.3)',
  },
  actionCardAdmin: {
    borderColor: 'rgba(249, 178, 52, 0.3)',
    backgroundColor: 'rgba(249, 178, 52, 0.05)',
  },
  actionIconWrapper: {
    width: '52px',
    height: '52px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(249, 178, 52, 0.1)',
    borderRadius: '12px',
    flexShrink: 0,
  },
  actionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#FFFFFF',
    margin: '0 0 4px 0',
  },
  actionDesc: {
    fontSize: '14px',
    color: '#B5B5B5',
    margin: 0,
  },
  ticketsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  ticketCard: {
    backgroundColor: '#121212',
    border: '1px solid rgba(249, 178, 52, 0.1)',
    borderRadius: '12px',
    padding: '20px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  ticketName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#FFFFFF',
    margin: 0,
  },
  ticketDate: {
    fontSize: '14px',
    color: '#B5B5B5',
    margin: 0,
  },
  ticketStatus: {
    fontSize: '13px',
    fontWeight: '500',
    padding: '6px 14px',
    borderRadius: '50px',
  },
  statusApproved: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    color: '#22c55e',
  },
  statusPending: {
    backgroundColor: 'rgba(249, 178, 52, 0.1)',
    color: '#F9B234',
  },
  statusDefault: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    color: '#6b7280',
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
