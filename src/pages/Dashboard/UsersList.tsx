import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../../services/auth'
import { getUserRole, getAllUsers, searchUsers, updateUserRole } from '../../services/users'

export const UsersList = () => {
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const checkAdminAndLoad = async () => {
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

      const allUsers = await getAllUsers()
      setUsers(allUsers)
      setLoading(false)
    }
    checkAdminAndLoad()
  }, [navigate])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    if (search.trim() === '') {
      const allUsers = await getAllUsers()
      setUsers(allUsers)
    } else {
      const results = await searchUsers(search)
      setUsers(results)
    }
    
    setLoading(false)
  }

  const handlePromote = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'owner' ? 'user' : 'owner'
    const action = newRole === 'owner' ? 'promover a Owner' : 'despromover a User'
    
    if (!confirm(`Tens a certeza que queres ${action}?`)) {
      return
    }

    setUpdating(userId)
    try {
      await updateUserRole(userId, newRole)
      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ))
    } catch (err) {
      alert('Erro ao atualizar role')
    }
    setUpdating(null)
  }

  if (loading) return <div>A carregar...</div>

  return (
    <div style={styles.container}>
      <Link to="/dashboard" style={styles.back}>← Voltar ao Dashboard</Link>
      
      <h1>Gerir Utilizadores</h1>

      <form onSubmit={handleSearch} style={styles.searchForm}>
        <input
          type="text"
          placeholder="Pesquisar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <button type="submit" style={styles.searchButton}>
          Pesquisar
        </button>
      </form>

      <div style={styles.stats}>
        <p>Total: {users.length} utilizadores</p>
      </div>

      <div style={styles.userList}>
        {users.length === 0 ? (
          <p>Nenhum utilizador encontrado.</p>
        ) : (
          users.map((user) => (
            <div key={user.id} style={styles.userCard}>
              <div style={styles.userInfo}>
                <h3>{user.name || 'Sem nome'}</h3>
                <span style={{
                  ...styles.roleBadge,
                  backgroundColor: 
                    user.role === 'admin' ? '#dc3545' : 
                    user.role === 'owner' ? '#28a745' : '#6c757d'
                }}>
                  {user.role}
                </span>
              </div>
              
              <div style={styles.userActions}>
                {user.role !== 'admin' && (
                  <button
                    onClick={() => handlePromote(user.id, user.role)}
                    disabled={updating === user.id}
                    style={{
                      ...styles.actionButton,
                      backgroundColor: user.role === 'owner' ? '#dc3545' : '#28a745'
                    }}
                  >
                    {updating === user.id 
                      ? 'A atualizar...' 
                      : user.role === 'owner' 
                        ? 'Despromover' 
                        : 'Promover a Owner'
                    }
                  </button>
                )}
                {user.role === 'admin' && (
                  <span style={styles.adminNote}>Admin não pode ser alterado</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    padding: '40px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  back: {
    color: '#666',
    textDecoration: 'none',
  },
  searchForm: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
    marginBottom: '24px',
  },
  searchInput: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '16px',
  },
  searchButton: {
    padding: '12px 24px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  stats: {
    marginBottom: '16px',
    color: '#666',
  },
  userList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  userCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#fff',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  roleBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  userActions: {
    display: 'flex',
    gap: '8px',
  },
  actionButton: {
    padding: '8px 16px',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  adminNote: {
    color: '#999',
    fontSize: '14px',
    fontStyle: 'italic',
  },
}