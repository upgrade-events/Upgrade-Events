import { useEffect, useState } from 'react'
import { getCurrentUser } from '../../services/auth'
import { Link, useNavigate } from 'react-router-dom'

export const LandingPage = () => {

  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (user) {
        navigate('/home')
      } else {
        setLoading(false)
      }
    }
    checkAuth()
  }, [navigate])

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
      </div>
    )
  }


  return (
    <div style={styles.container}>
      {/* Navbar */}
      <nav style={styles.navbar}>
        <div style={styles.navContent}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div style={styles.logo}>
              <img 
                src="/logo.png" 
                alt="Upgrade Events" 
                style={styles.logoImage}
              />
            </div>
          </Link>
          
          <div style={styles.navButtons}>
            <Link to="/login" style={styles.navLoginBtn}>Log In</Link>
            <Link to="/register" style={styles.navRegisterBtn}>Criar Conta</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <p style={styles.heroTag}>Experiência Premium de Eventos</p>
          <h1 style={styles.heroTitle}>
            <span style={styles.customLetterOrange}>{'\ue802'}</span>á Upgrade aos teus
            <br />
            <span style={styles.heroTitleAccent}>
              <span style={styles.heroTitle}></span>Eventos
            </span>
          </h1>
          <p style={styles.heroSubtitle}>
            Descobre eventos, compra bilhetes ou gere todo este processo de forma 
            intuitiva, desde a criação até à entrada no evento.
          </p>
          <div style={styles.heroActions}>
            <Link to="/events" style={styles.primaryBtn}>
              Explorar Eventos
            </Link>
            <Link to="/register" style={styles.secondaryBtn}>
              Criar uma Conta
            </Link>
          </div>
        </div>
        
        {/* Decorative element */}
        <div style={styles.heroDecoration}>
          <div style={styles.decorCircle}></div>
          <div style={styles.decorCircle2}></div>
        </div>
      </section>

      {/* Features Section - Light Background */}
      <section style={styles.featuresSection}>
        <div style={styles.featuresContent}>
          <p style={styles.sectionTag}>Porquê Upgrade Events</p>
          <h2 style={styles.sectionTitle}>
            <span style={styles.customLetterBlack}>{'\ue807'}</span>udo Num Só Lugar
          </h2>
          
          <div style={styles.featuresGrid}>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F9B234" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <h3 style={styles.featureTitle}>Criação e Gestão de Eventos</h3>
              <p style={styles.featureDesc}>
                Ferramentas simples para criar eventos, definir bilhetes e acompanhar tudo em tempo real.
              </p>
            </div>
            
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F9B234" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"></path>
                </svg>
              </div>
              <h3 style={styles.featureTitle}>
                <span style={styles.featureTitle}></span>Bilheteira Digital
              </h3>
              <p style={styles.featureDesc}>
                Compra e venda de bilhetes online.
              </p>
            </div>
            
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F9B234" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h3 style={styles.featureTitle}>
                <span style={styles.featureTitle}></span>Acesso Eficiente
              </h3>
              <p style={styles.featureDesc}>
                Um Check-In/Check-Out eficiente que garante uma experiência fluida, sem filas desnecessárias.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Dark Background */}
      <section style={styles.ctaSection}>
        <div style={styles.ctaContent}>
          <h2 style={styles.ctaTitle}>
            <span style={styles.customLetterWhite}>{'\ue808'}</span>ronto para Começar?
          </h2>
          <p style={styles.ctaSubtitle}>
            Eventos bem organizados começam com uma plataforma simples e fiável.
          </p>
          <Link to="/register" style={styles.ctaBtn}>
            Criar Conta
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.footerBrand}>
            <img 
              src="/logo.png" 
              alt="Upgrade Events" 
              style={styles.footerLogo}
            />
            <p style={styles.footerText}>
              Premium event ticketing platform.
            </p>
          </div>
          
          <div style={styles.footerLinks}>
            <div style={styles.footerColumn}>
              <h4 style={styles.footerColumnTitle}>Platform</h4>
              <Link to="/events" style={styles.footerLink}>Browse Events</Link>
              <Link to="/login" style={styles.footerLink}>Sign In</Link>
              <Link to="/register" style={styles.footerLink}>Create Account</Link>
            </div>
          </div>
        </div>
        
        <div style={styles.footerBottom}>
          <p style={styles.footerCopyright}>
            © 2025 Upgrade Events. All rights reserved.
          </p>
        </div>
      </footer>
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
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#020202',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(249, 178, 52, 0.2)',
    borderTop: '3px solid #F9B234',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  
  // Custom Letter Styles
customLetterOrange: {
  fontFamily: 'fontello',
  color: '#F9B234',
  fontSize: '0.85em',      // 85% do tamanho do texto
  marginRight: '1px',      // espaço entre a letra custom e a próxima
  letterSpacing: 'normal', // reset do letter-spacing
  display: 'inline-block',
  transform: 'translateY(-5px)',
},
customLetterBlack: {
  fontFamily: 'fontello',
  color: '#F9B234',
  fontSize: '1.em',      // 85% do tamanho do texto
  marginRight: '-10px',      // espaço entre a letra custom e a próxima
  letterSpacing: 'normal', // reset do letter-spacing
  display: 'inline-block',
  transform: 'translateY(-5px)',
},
customLetterWhite: {
  fontFamily: 'fontello',
  color: '#F9B234',
  fontSize: '1em',      // 85% do tamanho do texto
  marginRight: '-1zpx',      // espaço entre a letra custom e a próxima
  letterSpacing: 'normal', // reset do letter-spacing
  display: 'inline-block',
  transform: 'translateY(-5px)',
},
customLetterDark: {
  fontFamily: 'fontello',
  color: '#F9B234',
  fontSize: '0.85em',
  marginRight: '4px',
},
  
  // Navbar
  navbar: {
    padding: '24px 0',
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
  logo: {
    display: 'flex',
    alignItems: 'center',
  },
  logoImage: {
    height: '56px',
    width: 'auto',
  },
  navMenu: {
    display: 'flex',
    gap: '48px',
  },
  navLink: {
    color: '#B5B5B5',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: '500',
    transition: 'color 0.3s ease',
  },
  navLinkActive: {
    color: '#F9B234',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: '500',
  },
  navButtons: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  navLoginBtn: {
    color: '#EDEDED',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: '500',
    padding: '10px 20px',
  },
  navRegisterBtn: {
    backgroundColor: '#F9B234',
    color: '#020202',
    textDecoration: 'none',
    padding: '12px 28px',
    borderRadius: '50px',
    fontSize: '15px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
  },
  
  // Hero Section
  hero: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '120px 48px 80px',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  heroContent: {
    maxWidth: '800px',
    textAlign: 'center' as const,
    position: 'relative' as const,
    zIndex: 2,
  },
  heroTag: {
    color: '#F9B234',
    fontSize: '14px',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '3px',
    marginBottom: '24px',
  },
  heroTitle: {
    fontSize: '72px',
    fontWeight: '700',
    lineHeight: '1.1',
    marginBottom: '24px',
    color: '#FFFFFF',
    letterSpacing: '-2px',
  },
  heroTitleAccent: {
    color: '#F9B234',
  },
  heroSubtitle: {
    fontSize: '18px',
    color: '#B5B5B5',
    lineHeight: '1.7',
    marginBottom: '48px',
    maxWidth: '560px',
    margin: '0 auto 48px',
  },
  heroActions: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
  },
  primaryBtn: {
    backgroundColor: '#F9B234',
    color: '#020202',
    textDecoration: 'none',
    padding: '18px 40px',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    color: '#EDEDED',
    textDecoration: 'none',
    padding: '18px 40px',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: '600',
    border: '1px solid rgba(237, 237, 237, 0.3)',
    transition: 'all 0.3s ease',
  },
  heroDecoration: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    pointerEvents: 'none' as const,
  },
  decorCircle: {
    position: 'absolute' as const,
    top: '20%',
    right: '10%',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    border: '1px solid rgba(249, 178, 52, 0.1)',
  },
  decorCircle2: {
    position: 'absolute' as const,
    bottom: '10%',
    left: '5%',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    border: '1px solid rgba(249, 178, 52, 0.05)',
  },
  
  // Features Section - Light
  featuresSection: {
    backgroundColor: '#FFFFFF',
    padding: '120px 48px',
  },
  featuresContent: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  sectionTag: {
    color: '#F9B234',
    fontSize: '14px',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '3px',
    marginBottom: '16px',
    textAlign: 'center' as const,
  },
  sectionTitle: {
    fontSize: '42px',
    fontWeight: '700',
    color: '#020202',
    textAlign: 'center' as const,
    marginBottom: '64px',
    letterSpacing: '-1px',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '40px',
  },
  featureCard: {
    padding: '40px',
    backgroundColor: '#FAFAFA',
    borderRadius: '24px',
    textAlign: 'center' as const,
    transition: 'transform 0.3s ease',
  },
  featureIcon: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    backgroundColor: 'rgba(249, 178, 52, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
  },
  featureTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#020202',
    marginBottom: '12px',
  },
  featureDesc: {
    fontSize: '15px',
    color: '#666666',
    lineHeight: '1.6',
    margin: 0,
  },
  
  // CTA Section - Dark
  ctaSection: {
    backgroundColor: '#121212',
    padding: '100px 48px',
    textAlign: 'center' as const,
  },
  ctaContent: {
    maxWidth: '600px',
    margin: '0 auto',
  },
  ctaTitle: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: '16px',
    letterSpacing: '-1px',
  },
  ctaSubtitle: {
    fontSize: '17px',
    color: '#B5B5B5',
    marginBottom: '40px',
  },
  ctaBtn: {
    display: 'inline-block',
    backgroundColor: '#F9B234',
    color: '#020202',
    textDecoration: 'none',
    padding: '18px 48px',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: '600',
  },
  
  // Footer
  footer: {
    backgroundColor: '#020202',
    padding: '80px 48px 32px',
    borderTop: '1px solid rgba(249, 178, 52, 0.1)',
  },
  footerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '60px',
  },
  footerBrand: {
    maxWidth: '300px',
  },
  footerLogo: {
    height: '48px',
    marginBottom: '16px',
  },
  footerText: {
    fontSize: '15px',
    color: '#B5B5B5',
    lineHeight: '1.6',
    margin: 0,
  },
  footerLinks: {
    display: 'flex',
    gap: '80px',
  },
  footerColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  footerColumnTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  footerLink: {
    color: '#B5B5B5',
    textDecoration: 'none',
    fontSize: '15px',
    transition: 'color 0.3s ease',
  },
  footerBottom: {
    maxWidth: '1200px',
    margin: '0 auto',
    paddingTop: '32px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  },
  footerCopyright: {
    fontSize: '14px',
    color: '#666666',
    margin: 0,
  },
}