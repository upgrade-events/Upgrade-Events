import { useState, useEffect } from 'react'
import { 
  getStaffCodesByEvent, 
  createStaffAccessCode, 
  deactivateStaffCode, 
  reactivateStaffCode,
  deleteStaffCode,
  getEventCheckStats,
  getEventAttendees,
  StaffAccessCode,
  EventCheckStats
} from '../../services/staffaccess'

interface Props {
  eventId: number
  eventName: string
  onClose: () => void
}

type TabType = 'codes' | 'stats' | 'attendees'

interface Attendee {
  id: number
  ticket_email: string
  checked_in_at?: string
  checked_out_at?: string
  status: string
  tables?: { name: string } | { name: string }[]
}

export const StaffCodesManager = ({ eventId, eventName, onClose }: Props) => {
  const [activeTab, setActiveTab] = useState<TabType>('codes')
  const [codes, setCodes] = useState<StaffAccessCode[]>([])
  const [stats, setStats] = useState<EventCheckStats | null>(null)
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newStaffName, setNewStaffName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    loadData()
  }, [eventId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [codesData, statsData, attendeesData] = await Promise.all([
        getStaffCodesByEvent(eventId),
        getEventCheckStats(eventId),
        getEventAttendees(eventId)
      ])
      setCodes(codesData)
      setStats(statsData)
      setAttendees(attendeesData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCode = async () => {
    if (!newStaffName.trim()) return
    
    setCreating(true)
    try {
      await createStaffAccessCode(eventId, newStaffName.trim())
      setNewStaffName('')
      setShowCreateForm(false)
      await loadData()
    } catch (error) {
      alert('Erro ao criar código')
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (code: StaffAccessCode) => {
    try {
      if (code.is_active) {
        await deactivateStaffCode(code.id)
      } else {
        await reactivateStaffCode(code.id)
      }
      await loadData()
    } catch (error) {
      alert('Erro ao atualizar código')
    }
  }

  const handleDeleteCode = async (codeId: number) => {
    if (!confirm('Eliminar este código?')) return
    
    try {
      await deleteStaffCode(codeId)
      await loadData()
    } catch (error) {
      alert('Erro ao eliminar código')
    }
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    alert(`Código ${code} copiado!`)
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-PT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Gestão de Check-in/Check-out</h2>
            <p style={styles.subtitle}>{eventName}</p>
          </div>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(activeTab === 'codes' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('codes')}
          >
            🔑 Códigos Staff
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'stats' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('stats')}
          >
            📊 Estatísticas
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'attendees' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('attendees')}
          >
            👥 Participantes
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {loading ? (
            <div style={styles.loading}>A carregar...</div>
          ) : (
            <>
              {/* Tab: Códigos */}
              {activeTab === 'codes' && (
                <div>
                  {/* Criar novo código */}
                  {showCreateForm ? (
                    <div style={styles.createForm}>
                      <input
                        type="text"
                        value={newStaffName}
                        onChange={(e) => setNewStaffName(e.target.value)}
                        placeholder="Nome do staff (ex: João - Entrada)"
                        style={styles.input}
                        autoFocus
                      />
                      <div style={styles.createFormButtons}>
                        <button
                          onClick={handleCreateCode}
                          disabled={creating || !newStaffName.trim()}
                          style={styles.createButton}
                        >
                          {creating ? 'A criar...' : 'Criar Código'}
                        </button>
                        <button
                          onClick={() => setShowCreateForm(false)}
                          style={styles.cancelButton}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowCreateForm(true)}
                      style={styles.addButton}
                    >
                      + Novo Código de Staff
                    </button>
                  )}

                  {/* Lista de códigos */}
                  {codes.length === 0 ? (
                    <div style={styles.emptyState}>
                      <p>Ainda não criaste códigos de staff.</p>
                      <p style={styles.emptyHint}>Cria códigos para a equipa fazer check-in/check-out no evento.</p>
                    </div>
                  ) : (
                    <div style={styles.codesList}>
                      {codes.map((code) => (
                        <div 
                          key={code.id} 
                          style={{
                            ...styles.codeCard,
                            opacity: code.is_active ? 1 : 0.5
                          }}
                        >
                          <div style={styles.codeHeader}>
                            <span 
                              style={styles.codeValue}
                              onClick={() => copyToClipboard(code.code)}
                              title="Clica para copiar"
                            >
                              {code.code}
                            </span>
                            <span style={{
                              ...styles.codeStatus,
                              color: code.is_currently_valid ? '#22c55e' : '#999'
                            }}>
                              {code.is_currently_valid ? '● Ativo agora' : '○ Inativo'}
                            </span>
                          </div>
                          
                          <p style={styles.codeName}>{code.name}</p>
                          
                          <div style={styles.codeInfo}>
                            <span>Válido: {formatDateTime(code.valid_from!)} - {formatTime(code.valid_until!)}</span>
                            {code.last_used_at && (
                              <span>Último uso: {formatDateTime(code.last_used_at)}</span>
                            )}
                          </div>

                          <div style={styles.codeActions}>
                            <button
                              onClick={() => handleToggleActive(code)}
                              style={code.is_active ? styles.deactivateBtn : styles.activateBtn}
                            >
                              {code.is_active ? 'Desativar' : 'Reativar'}
                            </button>
                            <button
                              onClick={() => handleDeleteCode(code.id)}
                              style={styles.deleteBtn}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Instruções */}
                  <div style={styles.instructions}>
                    <h4>📱 Como usar:</h4>
                    <ol>
                      <li>Cria um código para cada membro da staff</li>
                      <li>Partilha o código com a pessoa (ex: WhatsApp)</li>
                      <li>No dia do evento, a pessoa acede a <strong>/staff</strong></li>
                      <li>Insere o código e pode começar a fazer check-in/check-out</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Tab: Estatísticas */}
              {activeTab === 'stats' && stats && (
                <div>
                  <div style={styles.statsGrid}>
                    <div style={styles.statCard}>
                      <span style={styles.statNumber}>{stats.total_tickets}</span>
                      <span style={styles.statLabel}>Total Bilhetes</span>
                    </div>
                    <div style={{ ...styles.statCard, backgroundColor: 'rgba(34,197,94,0.1)' }}>
                      <span style={{ ...styles.statNumber, color: '#22c55e' }}>{stats.checked_in}</span>
                      <span style={styles.statLabel}>Check-ins</span>
                    </div>
                    <div style={{ ...styles.statCard, backgroundColor: 'rgba(239,68,68,0.1)' }}>
                      <span style={{ ...styles.statNumber, color: '#ef4444' }}>{stats.checked_out}</span>
                      <span style={styles.statLabel}>Check-outs</span>
                    </div>
                    <div style={styles.statCard}>
                      <span style={styles.statNumber}>{stats.pending}</span>
                      <span style={styles.statLabel}>Por entrar</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={styles.progressSection}>
                    <div style={styles.progressHeader}>
                      <span>Presenças</span>
                      <span>{stats.total_tickets > 0 ? Math.round((stats.checked_in / stats.total_tickets) * 100) : 0}%</span>
                    </div>
                    <div style={styles.progressBar}>
                      <div 
                        style={{
                          ...styles.progressFill,
                          width: `${stats.total_tickets > 0 ? (stats.checked_in / stats.total_tickets) * 100 : 0}%`
                        }}
                      ></div>
                    </div>
                  </div>

                  <button onClick={loadData} style={styles.refreshButton}>
                    🔄 Atualizar
                  </button>
                </div>
              )}

              {/* Tab: Participantes */}
              {activeTab === 'attendees' && (
                <div>
                  <div style={styles.attendeesHeader}>
                    <span>{attendees.length} participantes confirmados</span>
                    <button onClick={loadData} style={styles.refreshButtonSmall}>🔄</button>
                  </div>

                  <div style={styles.attendeesList}>
                    {attendees.map((attendee) => (
                      <div key={attendee.id} style={styles.attendeeCard}>
                        <div style={styles.attendeeInfo}>
                          <span style={styles.attendeeEmail}>{attendee.ticket_email}</span>
                          <span style={styles.attendeeTable}>
                          Mesa: {Array.isArray(attendee.tables) 
                            ? attendee.tables[0]?.name || 'N/A' 
                            : attendee.tables?.name || 'N/A'}
                        </span>
                        </div>
                        <div style={styles.attendeeStatus}>
                          {attendee.checked_in_at ? (
                            <span style={styles.checkedIn}>
                              ✓ {formatTime(attendee.checked_in_at)}
                            </span>
                          ) : (
                            <span style={styles.notCheckedIn}>—</span>
                          )}
                          {attendee.checked_out_at && (
                            <span style={styles.checkedOut}>
                              ✓ {formatTime(attendee.checked_out_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    backgroundColor: '#FFF',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '1px solid #EEE'
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#020202',
    margin: 0
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: '4px 0 0 0'
  },
  closeButton: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#F5F5F5',
    fontSize: '18px',
    cursor: 'pointer'
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #EEE'
  },
  tab: {
    flex: 1,
    padding: '16px',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '14px',
    fontWeight: '500',
    color: '#666',
    cursor: 'pointer',
    borderBottom: '2px solid transparent'
  },
  tabActive: {
    color: '#F9B234',
    borderBottomColor: '#F9B234'
  },
  content: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666'
  },
  addButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#F9B234',
    color: '#020202',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '24px'
  },
  createForm: {
    backgroundColor: '#F9F9F9',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '24px'
  },
  input: {
    width: '100%',
    padding: '14px',
    border: '1px solid #DDD',
    borderRadius: '8px',
    fontSize: '15px',
    marginBottom: '12px',
    boxSizing: 'border-box'
  },
  createFormButtons: {
    display: 'flex',
    gap: '12px'
  },
  createButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#F9B234',
    color: '#020202',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    color: '#666',
    border: '1px solid #DDD',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#666'
  },
  emptyHint: {
    fontSize: '13px',
    color: '#999'
  },
  codesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px'
  },
  codeCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: '12px',
    padding: '16px'
  },
  codeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  codeValue: {
    fontFamily: 'monospace',
    fontSize: '24px',
    fontWeight: '700',
    color: '#F9B234',
    cursor: 'pointer',
    letterSpacing: '2px'
  },
  codeStatus: {
    fontSize: '12px',
    fontWeight: '500'
  },
  codeName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#020202',
    margin: '0 0 8px 0'
  },
  codeInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '12px',
    color: '#999',
    marginBottom: '12px'
  },
  codeActions: {
    display: 'flex',
    gap: '8px'
  },
  deactivateBtn: {
    padding: '8px 16px',
    backgroundColor: 'rgba(239,68,68,0.1)',
    color: '#ef4444',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  activateBtn: {
    padding: '8px 16px',
    backgroundColor: 'rgba(34,197,94,0.1)',
    color: '#22c55e',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  deleteBtn: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#999',
    border: '1px solid #DDD',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  instructions: {
    backgroundColor: '#FFFBEB',
    borderRadius: '12px',
    padding: '16px',
    fontSize: '13px',
    color: '#666'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '24px'
  },
  statCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center'
  },
  statNumber: {
    display: 'block',
    fontSize: '36px',
    fontWeight: '700',
    color: '#020202'
  },
  statLabel: {
    fontSize: '13px',
    color: '#666'
  },
  progressSection: {
    marginBottom: '24px'
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#666',
    marginBottom: '8px'
  },
  progressBar: {
    height: '12px',
    backgroundColor: '#EEE',
    borderRadius: '6px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: '6px',
    transition: 'width 0.3s ease'
  },
  refreshButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#F5F5F5',
    color: '#666',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  attendeesHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#666'
  },
  refreshButtonSmall: {
    padding: '8px 12px',
    backgroundColor: '#F5F5F5',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  attendeesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  attendeeCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#F9F9F9',
    borderRadius: '8px'
  },
  attendeeInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  attendeeEmail: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#020202'
  },
  attendeeTable: {
    fontSize: '12px',
    color: '#999'
  },
  attendeeStatus: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  checkedIn: {
    fontSize: '12px',
    color: '#22c55e',
    fontWeight: '500'
  },
  checkedOut: {
    fontSize: '12px',
    color: '#ef4444',
    fontWeight: '500'
  },
  notCheckedIn: {
    fontSize: '12px',
    color: '#CCC'
  }
}
