import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCurrentUser, updatePassword, logout } from '../../services/auth'
import { getUserById } from '../../services/users'

export const Account = () => {
  const [user, setUser] = useState<any>(null)
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  
  const navigate = useNavigate()

  useEffect(() => {
    const loadData = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        navigate('/login')
        return
      }
      setUser(currentUser)

      const userProfile = await getUserById(currentUser.id)
      setUserData(userProfile)

      setLoading(false)
    }
    loadData()
  }, [navigate])

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage('')
    setPasswordError('')

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }

    try {
      await updatePassword(newPassword)
      setPasswordMessage('Password updated successfully')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPasswordError(err.message)
    }
  }

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

      <div style={styles.mainContent}>
        <Link to="/home" style={styles.backLink}>← Voltar</Link>
        <div style={styles.header}>
          <h1 style={styles.title}>
            <span style={styles.customLetterOrangeD}>{'\ue802'}</span>efinições de Conta
          </h1>
          <p style={styles.subtitle}>Gere a tua conta</p>
        </div>

        <div style={styles.grid}>
          {/* Profile Card */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Perfil</h2>
            
            <div style={styles.profileSection}>
              <div style={styles.avatar}>
                {(userData?.name || user?.user_metadata?.name || 'U')[0].toUpperCase()}
              </div>
              <div style={styles.profileInfo}>
                <h3 style={styles.profileName}>
                  {userData?.name || user?.user_metadata?.name || 'User'}
                </h3>
                <p style={styles.profileEmail}>{user?.email}</p>
              </div>
            </div>

            <div style={styles.infoList}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Role</span>
                <span style={styles.infoBadge}>{userData?.role?.toUpperCase() || 'USER'}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Membro desde</span>
                <span style={styles.infoValue}>
                  {new Date(user?.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Change Password Card */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Mudar Palavra-Passe</h2>
            
            <form onSubmit={handlePasswordChange} style={styles.form}>
              {passwordError && <div style={styles.errorBox}>{passwordError}</div>}
              {passwordMessage && <div style={styles.successBox}>{passwordMessage}</div>}
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nova Password</label>
                <input
                  type="password"
                  placeholder="Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={styles.input}
                />
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Confirma Nova Password</label>
                <input
                  type="password"
                  placeholder="Confirma a Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={styles.input}
                />
              </div>
              
              <button type="submit" style={styles.submitBtn}>Mudar Password</button>
            </form>
          </div>
        </div>

        {/* Quick Links */}
        <div style={styles.quickLinks}>
        </div>
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
  customLetterOrangeD: {
  fontFamily: 'fontello',
  color: '#F9B234',
  fontSize: '1em',      // 85% do tamanho do texto
  marginRight: '1px',      // espaço entre a letra custom e a próxima
  letterSpacing: 'normal', // reset do letter-spacing
  display: 'inline-block',
  transform: 'translateY(-5px)',
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
  back: {
    color: '#666',
    textDecoration: 'none',
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
  navButtons: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  navAccountBtnActive: {
    color: '#020202',
    backgroundColor: '#F9B234',
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
  mainContent: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '140px 48px 80px',
  },
  header: {
    marginBottom: '48px',
  },
  title: {
    fontSize: '36px',
    fontWeight: '700',
    margin: '0 0 8px 0',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: '16px',
    color: '#B5B5B5',
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '24px',
    marginBottom: '40px',
  },
  card: {
    backgroundColor: '#121212',
    border: '1px solid rgba(249, 178, 52, 0.1)',
    borderRadius: '20px',
    padding: '32px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    margin: '0 0 24px 0',
    color: '#F9B234',
  },
  profileSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
    paddingBottom: '24px',
    borderBottom: '1px solid rgba(249, 178, 52, 0.1)',
  },
  avatar: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#F9B234',
    color: '#020202',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: '18px',
    fontWeight: '600',
    margin: '0 0 4px 0',
    color: '#FFFFFF',
  },
  profileEmail: {
    fontSize: '14px',
    color: '#B5B5B5',
    margin: 0,
  },
  infoList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: '14px',
    color: '#B5B5B5',
  },
  infoValue: {
    fontSize: '14px',
    color: '#EDEDED',
  },
  infoBadge: {
    fontSize: '12px',
    fontWeight: '600',
    padding: '6px 14px',
    backgroundColor: 'rgba(249, 178, 52, 0.1)',
    borderRadius: '50px',
    color: '#F9B234',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    color: '#EDEDED',
  },
  input: {
    padding: '14px 18px',
    borderRadius: '12px',
    border: '1px solid rgba(249, 178, 52, 0.2)',
    fontSize: '15px',
    backgroundColor: 'rgba(2, 2, 2, 0.5)',
    color: '#FFFFFF',
    outline: 'none',
  },
  submitBtn: {
    padding: '14px',
    backgroundColor: '#F9B234',
    color: '#020202',
    border: 'none',
    borderRadius: '50px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
  },
  errorBox: {
    padding: '12px 16px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '12px',
    color: '#fca5a5',
    fontSize: '14px',
  },
  successBox: {
    padding: '12px 16px',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: '12px',
    color: '#86efac',
    fontSize: '14px',
  },
  quickLinks: {
    display: 'flex',
    gap: '16px',
  },
  quickLink: {
    flex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    backgroundColor: '#121212',
    border: '1px solid rgba(249, 178, 52, 0.1)',
    borderRadius: '16px',
    color: '#EDEDED',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: '500',
  },
  quickLinkArrow: {
    color: '#F9B234',
  },
  backLink: {
  position: 'absolute' as const,
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