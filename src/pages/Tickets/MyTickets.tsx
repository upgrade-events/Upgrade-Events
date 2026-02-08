import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCurrentUser, logout } from '../../services/auth'
import { getOrdersByUser, replacePaymentProof, cancelOrder } from '../../services/orders'
import { downloadTicketPdf } from '../../services/ticketpdf'

interface Ticket {
  id: number
  ticket_email: string
  status: string
  validation_code?: string
  restrictions?: string
  available_for_download?: boolean
  sent_at?: string
  tables?: { name: string }
  bus_go?: { location: string; time: string }
  bus_come?: { location: string; time: string }
}

interface Order {
  id: number
  event_id: number
  total_amount: number
  status: string
  payment_proof_url?: string
  payment_submitted_at?: string
  tickets_sent?: boolean
  tickets_sent_at?: string
  created_at: string
  events: {
    id: number
    name: string
    location: string
    date_hour: string
    price_bus: number
    price_no_bus: number
    payment_iban?: string
    payment_mbway?: string
    payment_name?: string
  }
  tickets: Ticket[]
}

export const MyTickets = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingOrderId, setUploadingOrderId] = useState<number | null>(null)
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null)
  const [downloadingTicketId, setDownloadingTicketId] = useState<number | null>(null)
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null)
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({})
  const navigate = useNavigate()

  useEffect(() => {
    const loadOrders = async () => {
      const user = await getCurrentUser()
      if (!user) { navigate('/login'); return }
      const userOrders = await getOrdersByUser(user.id)
      setOrders(userOrders)
      setLoading(false)
    }
    loadOrders()
  }, [navigate])

  const handleLogout = async () => { await logout(); navigate('/') }

  const handleFileSelect = async (orderId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('O ficheiro é demasiado grande. Máximo 5MB.'); return }
    
    setUploadingOrderId(orderId)
    try {
      const order = orders.find(o => o.id === orderId)
      const oldProofUrl = order?.payment_proof_url
      const newProofUrl = await replacePaymentProof(orderId, file, oldProofUrl)
      setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? { ...o, payment_proof_url: newProofUrl, payment_submitted_at: new Date().toISOString() } : o))
      alert('Comprovativo enviado com sucesso!')
    } catch (error) {
      console.error('Erro ao enviar comprovativo:', error)
      alert('Erro ao enviar comprovativo.')
    } finally {
      setUploadingOrderId(null)
      if (fileInputRefs.current[orderId]) fileInputRefs.current[orderId]!.value = ''
    }
  }

  const handleCancelOrder = async (orderId: number) => {
    if (!confirm('Cancelar esta compra?')) return
    setCancellingOrderId(orderId)
    try {
      await cancelOrder(orderId)
      setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o))
    } catch (error: any) { alert(error.message || 'Erro ao cancelar.') }
    finally { setCancellingOrderId(null) }
  }

  const handleDownloadTicket = async (ticket: Ticket, order: Order) => {
    if (!ticket.validation_code) { alert('Este bilhete ainda não tem código de validação.'); return }
    if (!ticket.available_for_download) { alert('Este bilhete ainda não está disponível para download.'); return }
    setDownloadingTicketId(ticket.id)
    try {
      await downloadTicketPdf({
        ticketId: ticket.id, ticketNumber: ticket.id, validationCode: ticket.validation_code,
        ticketEmail: ticket.ticket_email, eventName: order.events?.name || 'Evento',
        eventDate: order.events?.date_hour || '', eventLocation: order.events?.location || '',
        tableName: ticket.tables?.name || 'N/A', busGo: ticket.bus_go, busCome: ticket.bus_come, restrictions: ticket.restrictions
      })
    } catch (error) { console.error('Erro ao gerar PDF:', error); alert('Erro ao gerar o bilhete PDF.') }
    finally { setDownloadingTicketId(null) }
  }

  const triggerFileInput = (orderId: number) => { fileInputRefs.current[orderId]?.click() }

  const getStatusBadge = (status: string, ticketsSent?: boolean) => {
    // Se está confirmado mas bilhetes ainda não foram enviados pelo admin
    if (status === 'confirmed' && !ticketsSent) {
      return <span style={{ padding: '6px 14px', borderRadius: '50px', fontSize: '13px', fontWeight: '600', color: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)' }}>Pago - Aguarda Envio</span>
    }
    
    const config: { [k: string]: { text: string; color: string; bg: string } } = {
      pending: { text: 'Aguarda Pagamento', color: '#F9B234', bg: 'rgba(249,178,52,0.1)' },
      confirmed: { text: 'Confirmado', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
      rejected: { text: 'Rejeitado', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
      cancelled: { text: 'Cancelado', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
      expired: { text: 'Expirado', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' }
    }
    const c = config[status] || { text: status, color: '#B5B5B5', bg: 'rgba(181,181,181,0.1)' }
    return <span style={{ padding: '6px 14px', borderRadius: '50px', fontSize: '13px', fontWeight: '600', color: c.color, backgroundColor: c.bg, border: `1px solid ${c.color}30` }}>{c.text}</span>
  }

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const formatIban = (iban: string) => iban.match(/.{1,4}/g)?.join(' ') || iban

  // Verificar se algum bilhete da order está disponível para download
  const hasDownloadableTickets = (order: Order) => {
    return order.tickets?.some(t => t.available_for_download && t.validation_code)
  }

  if (loading) return <div style={styles.container}><div style={styles.loadingContainer}><div style={styles.spinner}></div></div></div>

  return (
    <div style={styles.container}>
      <nav style={styles.navbar}>
        <div style={styles.navContent}>
          <Link to="/home" style={{ textDecoration: 'none' }}><img src="/logo.png" alt="Upgrade Events" style={styles.logoImage} /></Link>
          <div style={styles.navButtons}><button onClick={handleLogout} style={styles.navLogoutBtn}>Log Out</button></div>
        </div>
      </nav>

      <div style={styles.heroSection}>
        <Link to="/home" style={styles.backLink}>← Voltar</Link>
        <h1 style={styles.title}><span style={styles.customLetterOrange}>{'\ue805'}</span>s Meus Bilhetes</h1>
        <p style={styles.subtitle}>Gere as tuas encomendas e submete comprovativos de pagamento</p>
      </div>

      <div style={styles.contentSection}>
        <div style={styles.contentWrapper}>
          {orders.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>🎫</div>
              <h3 style={styles.emptyTitle}>Ainda não tens bilhetes</h3>
              <p style={styles.emptyText}>Explora os eventos disponíveis.</p>
              <Link to="/events" style={styles.browseLink}>Explorar Eventos</Link>
            </div>
          ) : (
            <div style={styles.ordersList}>
              {orders.map((order) => (
                <div key={order.id} style={styles.orderCard}>
                  <div style={styles.orderHeader}>
                    <div style={styles.orderHeaderLeft}>
                      <span style={styles.orderId}>Compra #{order.id}</span>
                      {getStatusBadge(order.status, order.tickets_sent)}
                    </div>
                    <span style={styles.orderAmount}>€{order.total_amount.toFixed(2)}</span>
                  </div>

                  <div style={styles.orderEvent}>
                    <h3 style={styles.eventName}>{order.events?.name}</h3>
                    <p style={styles.eventDetails}>{order.events?.location} • {formatDate(order.events?.date_hour)}</p>
                  </div>

                  <div style={styles.ticketsSummary}>
                    <span style={styles.ticketsCount}>{order.tickets?.length || 0} bilhete{order.tickets?.length !== 1 ? 's' : ''}</span>
                    <button style={styles.expandButton} onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                      {expandedOrder === order.id ? 'Esconder detalhes' : 'Ver detalhes'}
                    </button>
                  </div>

                  {expandedOrder === order.id && (
                    <div style={styles.ticketsDetails}>
                      {order.tickets?.map((ticket, idx) => (
                        <div key={ticket.id} style={styles.ticketItem}>
                          <div style={styles.ticketInfo}>
                            <span style={styles.ticketNumber}>Bilhete {idx + 1}</span>
                            <span style={styles.ticketEmail}>{ticket.ticket_email}</span>
                            <span style={styles.ticketTable}>{ticket.tables?.name || 'N/A'}</span>
                          </div>
                          {/* Mostrar botão de download apenas se disponível */}
                          {ticket.available_for_download && ticket.validation_code ? (
                            <button style={styles.downloadButton} onClick={() => handleDownloadTicket(ticket, order)} disabled={downloadingTicketId === ticket.id}>
                              {downloadingTicketId === ticket.id ? '...' : '📥 PDF'}
                            </button>
                          ) : order.status === 'confirmed' ? (
                            <span style={styles.pendingDownload}>⏳ Aguarda envio</span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}

                  {order.status === 'pending' && (
                    <div style={styles.paymentSection}>
                      <h4 style={styles.paymentTitle}>💳 Dados para Pagamento</h4>
                      
                      {(order.events?.payment_iban || order.events?.payment_mbway) && (
                        <div style={styles.paymentInfo}>
                          {order.events?.payment_iban && <div style={styles.paymentRow}><span style={styles.paymentLabel}>IBAN</span><span style={styles.paymentValue}>{formatIban(order.events.payment_iban)}</span></div>}
                          {order.events?.payment_mbway && <div style={styles.paymentRow}><span style={styles.paymentLabel}>MB Way</span><span style={styles.paymentValue}>{order.events.payment_mbway}</span></div>}
                          {order.events?.payment_name && <div style={styles.paymentRow}><span style={styles.paymentLabel}>Titular</span><span style={styles.paymentValue}>{order.events.payment_name}</span></div>}
                        </div>
                      )}

                      <input type="file" ref={el => fileInputRefs.current[order.id] = el} accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => handleFileSelect(order.id, e)} style={{ display: 'none' }} />

                      {order.payment_proof_url ? (
                        <div style={styles.proofUploaded}>
                          <div style={styles.proofInfo}>
                            <span style={styles.proofIcon}>✓</span>
                            <span style={styles.proofText}>Comprovativo enviado</span>
                            <a href={order.payment_proof_url} target="_blank" rel="noopener noreferrer" style={styles.proofLink}>Ver</a>
                          </div>
                          <button style={styles.replaceButton} onClick={() => triggerFileInput(order.id)} disabled={uploadingOrderId === order.id}>
                            {uploadingOrderId === order.id ? 'A enviar...' : '🔄 Substituir'}
                          </button>
                        </div>
                      ) : (
                        <div style={styles.uploadSection}>
                          <p style={styles.uploadText}>Envia o comprovativo após efetuares o pagamento.</p>
                          <button style={styles.uploadButton} onClick={() => triggerFileInput(order.id)} disabled={uploadingOrderId === order.id}>
                            {uploadingOrderId === order.id ? 'A enviar...' : '📎 Enviar Comprovativo'}
                          </button>
                          <p style={styles.uploadNote}>JPG, PNG ou PDF (máx. 5MB)</p>
                        </div>
                      )}

                      <div style={styles.warningBox}><span>⏱</span><span>48 horas para efetuar o pagamento</span></div>
                      <button style={styles.cancelButton} onClick={() => handleCancelOrder(order.id)} disabled={cancellingOrderId === order.id}>
                        {cancellingOrderId === order.id ? 'A cancelar...' : 'Cancelar Compra'}
                      </button>
                    </div>
                  )}

                  {/* Estado: Pagamento confirmado MAS bilhetes ainda não enviados pelo admin */}
                  {order.status === 'confirmed' && !order.tickets_sent && (
                    <div style={styles.awaitingSection}>
                      <span style={styles.awaitingIcon}>⏳</span>
                      <h4 style={styles.awaitingTitle}>Pagamento confirmado!</h4>
                      <p style={styles.awaitingText}>Os teus bilhetes estão a ser processados e serão enviados em breve.</p>
                      <div style={styles.awaitingInfo}>
                        <div style={styles.awaitingInfoIcon}>📧</div>
                        <div style={styles.awaitingInfoContent}>
                          <p style={styles.awaitingInfoTitle}>Receberás os bilhetes por email</p>
                          <p style={styles.awaitingInfoText}>Quando os bilhetes forem enviados, receberás uma notificação por email e poderás fazer download aqui.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Estado: Pagamento confirmado E bilhetes já enviados pelo admin */}
                  {order.status === 'confirmed' && order.tickets_sent && (
                    <div style={styles.confirmedSection}>
                      <span style={styles.confirmedIcon}>🎉</span>
                      <h4 style={styles.confirmedTitle}>Bilhetes prontos!</h4>
                      <p style={styles.confirmedText}>Vemo-nos no evento.</p>
                      <div style={styles.emailAlert}>
                        <div style={styles.emailAlertIcon}>📧</div>
                        <div style={styles.emailAlertContent}>
                          <p style={styles.emailAlertTitle}>Os bilhetes foram enviados por email</p>
                          <p style={styles.emailAlertText}>Enviámos os bilhetes para os emails indicados em cada bilhete. <strong>Verifica também a pasta de spam ou lixo.</strong></p>
                        </div>
                      </div>
                      
                      {hasDownloadableTickets(order) && (
                        <div style={styles.downloadAllSection}>
                          <p style={styles.downloadAllText}>Também podes fazer download dos bilhetes em PDF:</p>
                          <div style={styles.downloadButtonsGrid}>
                            {order.tickets?.filter(t => t.available_for_download && t.validation_code).map((ticket, idx) => (
                              <button key={ticket.id} style={styles.downloadTicketButton} onClick={() => handleDownloadTicket(ticket, order)} disabled={downloadingTicketId === ticket.id}>
                                {downloadingTicketId === ticket.id ? 'A gerar...' : (<><span style={styles.downloadTicketIcon}>📥</span><span>Bilhete {idx + 1}</span><span style={styles.downloadTicketEmail}>{ticket.ticket_email}</span></>)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {order.status === 'rejected' && <div style={styles.rejectedSection}><p>O pagamento foi rejeitado. Contacta o organizador.</p></div>}
                  {order.status === 'cancelled' && <div style={styles.cancelledSection}><p>Esta encomenda foi cancelada.</p></div>}

                  <div style={styles.orderFooter}><span style={styles.orderDate}>Criada em {formatDate(order.created_at)}</span></div>
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
  container: { minHeight: '100vh', backgroundColor: '#020202', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  loadingContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' },
  spinner: { width: '40px', height: '40px', border: '3px solid rgba(249,178,52,0.2)', borderTop: '3px solid #F9B234', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  navbar: { padding: '20px 0', position: 'fixed', top: 0, left: 0, right: 0, backgroundColor: 'rgba(2,2,2,0.9)', backdropFilter: 'blur(20px)', zIndex: 1000, borderBottom: '1px solid rgba(249,178,52,0.1)' },
  navContent: { maxWidth: '1200px', margin: '0 auto', padding: '0 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logoImage: { height: '56px', width: 'auto' },
  navButtons: { display: 'flex', gap: '12px' },
  navLogoutBtn: { backgroundColor: 'transparent', color: '#B5B5B5', border: '1px solid rgba(181,181,181,0.2)', padding: '10px 24px', borderRadius: '50px', fontSize: '14px', cursor: 'pointer' },
  heroSection: { paddingTop: '140px', paddingBottom: '40px', textAlign: 'center', backgroundColor: '#020202' },
  backLink: { position: 'absolute', right: '48px', top: '125px', color: '#F9B234', textDecoration: 'none', fontSize: '14px', padding: '10px 20px', backgroundColor: 'rgba(249,178,52,0.1)', borderRadius: '50px', border: '1px solid rgba(249,178,52,0.2)' },
  title: { fontSize: '48px', fontWeight: '700', margin: '0 0 12px 0', color: '#FFFFFF' },
  customLetterOrange: { fontFamily: 'fontello', color: '#F9B234', fontSize: '0.85em', display: 'inline-block', transform: 'translateY(-4px)' },
  subtitle: { fontSize: '17px', color: '#B5B5B5', margin: 0 },
  contentSection: { backgroundColor: '#FFFFFF', padding: '60px 0', minHeight: '50vh' },
  contentWrapper: { maxWidth: '800px', margin: '0 auto', padding: '0 24px' },
  empty: { textAlign: 'center', padding: '80px 40px' },
  emptyIcon: { fontSize: '64px', marginBottom: '24px' },
  emptyTitle: { fontSize: '24px', fontWeight: '600', color: '#020202', margin: '0 0 8px 0' },
  emptyText: { fontSize: '15px', color: '#666', margin: '0 0 32px 0' },
  browseLink: { display: 'inline-block', padding: '16px 32px', backgroundColor: '#F9B234', color: '#020202', textDecoration: 'none', borderRadius: '50px', fontSize: '15px', fontWeight: '600' },
  ordersList: { display: 'flex', flexDirection: 'column', gap: '24px' },
  orderCard: { backgroundColor: '#FAFAFA', borderRadius: '20px', overflow: 'hidden', border: '1px solid #EEE' },
  orderHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', backgroundColor: '#020202' },
  orderHeaderLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  orderId: { fontSize: '16px', fontWeight: '600', color: '#FFF' },
  orderAmount: { fontSize: '24px', fontWeight: '700', color: '#F9B234' },
  orderEvent: { padding: '24px', borderBottom: '1px solid #EEE' },
  eventName: { fontSize: '20px', fontWeight: '600', color: '#020202', margin: '0 0 4px 0' },
  eventDetails: { fontSize: '14px', color: '#666', margin: 0 },
  ticketsSummary: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #EEE' },
  ticketsCount: { fontSize: '14px', color: '#020202', fontWeight: '500' },
  expandButton: { background: 'none', border: 'none', color: '#F9B234', fontSize: '14px', cursor: 'pointer', fontWeight: '500' },
  ticketsDetails: { padding: '16px 24px', backgroundColor: '#F5F5F5' },
  ticketItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #E5E5E5' },
  ticketInfo: { display: 'flex', gap: '16px', alignItems: 'center', flex: 1 },
  ticketNumber: { fontSize: '14px', fontWeight: '600', color: '#020202' },
  ticketEmail: { fontSize: '14px', color: '#666', flex: 1 },
  ticketTable: { fontSize: '14px', color: '#999' },
  downloadButton: { padding: '8px 16px', backgroundColor: '#F9B234', color: '#020202', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  pendingDownload: { fontSize: '12px', color: '#3b82f6', fontWeight: '500', padding: '6px 12px', backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: '20px' },
  paymentSection: { padding: '24px', backgroundColor: 'rgba(175, 126, 40, 0.08)', borderTop: '1px solid rgba(249,178,52,0.2)' },
  paymentTitle: { fontSize: '16px', fontWeight: '600', color: '#020202', margin: '0 0 16px 0' },
  paymentInfo: { backgroundColor: '#FFF', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid #EEE' },
  paymentRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F0F0F0' },
  paymentLabel: { fontSize: '13px', color: '#666' },
  paymentValue: { fontSize: '14px', fontWeight: '500', color: '#020202', fontFamily: 'monospace' },
  proofUploaded: { display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: '12px', marginBottom: '16px' },
  proofInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  proofIcon: { color: '#22c55e', fontWeight: '700' },
  proofText: { flex: 1, color: '#22c55e', fontWeight: '500' },
  proofLink: { color: '#F9B234', fontWeight: '500' },
  replaceButton: { padding: '10px 20px', backgroundColor: '#FFF', color: '#666', border: '1px solid #DDD', borderRadius: '50px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', alignSelf: 'flex-start' },
  uploadSection: { marginBottom: '16px' },
  uploadText: { fontSize: '14px', color: '#666', margin: '0 0 12px 0' },
  uploadButton: { padding: '14px 24px', backgroundColor: '#F9B234', color: '#020202', border: 'none', borderRadius: '50px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', width: '100%' },
  uploadNote: { fontSize: '12px', color: '#999', marginTop: '8px', textAlign: 'center' },
  warningBox: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', backgroundColor: '#FFF', borderRadius: '8px', fontSize: '13px', color: '#666', marginBottom: '16px' },
  cancelButton: { background: 'none', border: 'none', color: '#ef4444', fontSize: '14px', cursor: 'pointer', width: '100%', padding: '12px' },
  // Novo estado: Aguarda envio pelo admin
  awaitingSection: { padding: '32px 24px', backgroundColor: 'rgba(59,130,246,0.08)', textAlign: 'center' },
  awaitingIcon: { fontSize: '48px', display: 'block', marginBottom: '12px' },
  awaitingTitle: { fontSize: '20px', fontWeight: '700', color: '#020202', margin: '0 0 4px 0' },
  awaitingText: { color: '#666', margin: '0 0 24px 0', fontSize: '15px' },
  awaitingInfo: { display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '20px', backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid #E5E5E5', textAlign: 'left' },
  awaitingInfoIcon: { fontSize: '32px', flexShrink: 0 },
  awaitingInfoContent: { flex: 1 },
  awaitingInfoTitle: { fontSize: '15px', fontWeight: '600', color: '#020202', margin: '0 0 6px 0' },
  awaitingInfoText: { fontSize: '13px', color: '#666', margin: 0, lineHeight: '1.5' },
  // Estado confirmado com bilhetes enviados
  confirmedSection: { padding: '32px 24px', backgroundColor: 'rgba(34,197,94,0.08)', textAlign: 'center' },
  confirmedIcon: { fontSize: '48px', display: 'block', marginBottom: '12px' },
  confirmedTitle: { fontSize: '20px', fontWeight: '700', color: '#020202', margin: '0 0 4px 0' },
  confirmedText: { color: '#666', margin: '0 0 24px 0', fontSize: '15px' },
  emailAlert: { display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '20px', backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid #E5E5E5', textAlign: 'left', marginBottom: '24px' },
  emailAlertIcon: { fontSize: '32px', flexShrink: 0 },
  emailAlertContent: { flex: 1 },
  emailAlertTitle: { fontSize: '15px', fontWeight: '600', color: '#020202', margin: '0 0 6px 0' },
  emailAlertText: { fontSize: '13px', color: '#666', margin: 0, lineHeight: '1.5' },
  downloadAllSection: { backgroundColor: '#FFF', borderRadius: '12px', padding: '20px', border: '1px solid #E5E5E5' },
  downloadAllText: { fontSize: '14px', color: '#666', margin: '0 0 16px 0', textAlign: 'center' },
  downloadButtonsGrid: { display: 'flex', flexDirection: 'column', gap: '10px' },
  downloadTicketButton: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', backgroundColor: '#F9B234', color: '#020202', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', textAlign: 'left' },
  downloadTicketIcon: { fontSize: '18px' },
  downloadTicketEmail: { flex: 1, fontSize: '12px', fontWeight: '400', color: '#020202', opacity: 0.7, textAlign: 'right' },
  rejectedSection: { padding: '24px', backgroundColor: 'rgba(239,68,68,0.08)', textAlign: 'center', color: '#ef4444' },
  cancelledSection: { padding: '24px', backgroundColor: 'rgba(107,114,128,0.08)', textAlign: 'center', color: '#6b7280' },
  orderFooter: { padding: '16px 24px', borderTop: '1px solid #EEE' },
  orderDate: { fontSize: '12px', color: '#999' }
}
