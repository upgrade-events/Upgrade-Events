import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../../services/auth'

export const Register = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      await register(email, password, name)
      navigate('/login')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <nav style={styles.navbar}>
        <div style={styles.navContent}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <img src="/logo.png" alt="Upgrade Events" style={styles.logoImage} />
          </Link>
          
          <Link to="/" style={styles.navBackBtn}>← Back</Link>
        </div>
      </nav>

      <div style={styles.formWrapper}>
        <div style={styles.formContainer}>
          <div style={styles.formHeader}>
            <h1 style={styles.title}>
              <span style={styles.customLetterOrangeC}>{'\ue801'}</span>riar Conta
            </h1>
            <p style={styles.subtitle}>Começa agora com a tua conta</p>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            {error && <div style={styles.errorBox}>{error}</div>}
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>Nome</label>
              <input
                type="text"
                placeholder="O teu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={styles.input}
                required
              />
            </div>
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                placeholder="teu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                required
              />
            </div>
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                required
              />
            </div>
            
            <button 
              type="submit" 
              style={{
                ...styles.button,
                ...(loading ? styles.buttonDisabled : {}),
              }} 
              disabled={loading}
            >
              {loading ? 'A Criar Conta..' : 'Criar Conta'}
            </button>
            
            <div style={styles.divider}>
              <span style={styles.dividerLine}></span>
              <span style={styles.dividerText}>or</span>
              <span style={styles.dividerLine}></span>
            </div>
            
            <p style={styles.signupText}>
              Ja tens conta?{' '}
              <Link to="/login" style={styles.signupLink}>Log in</Link>
            </p>
          </form>
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
  customLetterOrangeC: {
  fontFamily: 'fontello',
  color: '#F9B234',
  fontSize: '0.85em',      // 85% do tamanho do texto
  marginRight: '1px',      // espaço entre a letra custom e a próxima
  letterSpacing: 'normal', // reset do letter-spacing
  display: 'inline-block',
  transform: 'translateY(-3px)',
  },
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
  logoImage: {
    height: '56px',
    width: 'auto',
  },
  navBackBtn: {
    color: '#B5B5B5',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: '500',
  },
  formWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '120px 24px 40px',
  },
  formContainer: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#121212',
    border: '1px solid rgba(249, 178, 52, 0.1)',
    borderRadius: '24px',
    padding: '48px 40px',
  },
  formHeader: {
    marginBottom: '32px',
    textAlign: 'center' as const,
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '8px',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: '15px',
    color: '#B5B5B5',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#EDEDED',
  },
  input: {
    padding: '16px 20px',
    borderRadius: '12px',
    border: '1px solid rgba(249, 178, 52, 0.2)',
    fontSize: '15px',
    backgroundColor: 'rgba(2, 2, 2, 0.5)',
    color: '#FFFFFF',
    outline: 'none',
    transition: 'border-color 0.3s ease',
  },
  button: {
    padding: '16px',
    backgroundColor: '#F9B234',
    color: '#020202',
    border: 'none',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'all 0.3s ease',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  errorBox: {
    padding: '14px 18px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '12px',
    color: '#fca5a5',
    fontSize: '14px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    margin: '8px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: 'rgba(249, 178, 52, 0.1)',
  },
  dividerText: {
    fontSize: '13px',
    color: '#666666',
  },
  signupText: {
    textAlign: 'center' as const,
    fontSize: '14px',
    color: '#B5B5B5',
    margin: 0,
  },
  signupLink: {
    color: '#F9B234',
    textDecoration: 'none',
    fontWeight: '600',
  },
}