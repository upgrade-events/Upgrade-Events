import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../../services/auth'
import { getUserRole } from '../../services/users'

export const Dashboard = () => {
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const checkAdmin = async () => {
      const currentUser = await getCurrentUser()
      
      if (!currentUser) {
        navigate('/login')
        return
      }

      const role = await getUserRole(currentUser.id)

      if (role !== 'admin') {
        navigate('/home')
        return
      }

      setLoading(false)
    }
    checkAdmin()
  }, [navigate])

  if (loading) return <div>A verificar permissões...</div>

  return (
    <div style={styles.container}>
      <Link to="/home" style={styles.back}>← Voltar</Link>
      
      <h1>Dashboard Admin</h1>

      <div style={styles.menu}>
        <Link to="/dashboard/events" style={styles.card}>
          <h3>📅 Gerir Eventos</h3>
          <p>Criar, editar e eliminar eventos</p>
        </Link>

        <Link to="/dashboard/tickets" style={styles.card}>
          <h3>🎫 Gerir Tickets</h3>
          <p>Ver e aprovar tickets</p>
        </Link>

        <Link to="/dashboard/users" style={styles.card}>
          <h3>👥 Gerir Utilizadores</h3>
          <p>Ver utilizadores e alterar roles</p>
        </Link>

        <Link to="/dashboard/buses" style={styles.card}>
          <h3>🚌 Gerir Autocarros</h3>
          <p>Configurar transportes</p>
        </Link>
      </div>
    </div>
  )
}

const styles = {
  container: {
    padding: '40px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  back: {
    color: '#666',
    textDecoration: 'none',
  },
  menu: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginTop: '32px',
  },
  card: {
    padding: '24px',
    border: '1px solid #ddd',
    borderRadius: '12px',
    textDecoration: 'none',
    color: 'inherit',
  },
}