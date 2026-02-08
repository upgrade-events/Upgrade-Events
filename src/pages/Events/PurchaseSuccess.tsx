import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getOrderById } from '../../services/orders'

export const PurchaseSuccess = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadOrder = async () => {
      if (orderId) {
        const orderData = await getOrderById(Number(orderId))
        setOrder(orderData)
      }
      setLoading(false)
    }
    loadOrder()
  }, [orderId])

  const formatIban = (iban: string) => {
    return iban.match(/.{1,4}/g)?.join(' ') || iban
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}><div style={styles.spinner}></div></div>
      </div>
    )
  }

  const ticketCount = order?.tickets?.length || 0
  const hasPaymentInfo = order?.events?.payment_iban || order?.events?.payment_mbway

  return (
    <div style={styles.container}>
      <nav style={styles.navbar}>
        <div style={styles.navContent}>
          <Link to="/home" style={{ textDecoration: 'none' }}>
            <img src="/logo.png" alt="Upgrade Events" style={styles.logoImage} />
          </Link>
        </div>
      </nav>

      <div style={styles.content}>
        <div style={styles.card}>
          <div style={styles.iconCircle}>
            <span style={styles.icon}>✓</span>
          </div>
          
          <h1 style={styles.title}>
            <span style={styles.customLetter}>{'\ue801'}</span>ompra Registada!
          </h1>
          <p style={styles.subtitle}>
            {ticketCount > 1 
              ? `Os teus ${ticketCount} bilhetes foram reservados com sucesso.`
              : 'O teu bilhete foi reservado com sucesso.'}
          </p>

          {/* Dados de Pagamento */}
          {hasPaymentInfo && (
            <div style={styles.paymentCard}>
              <h3 style={styles.paymentTitle}>💳 Dados para Pagamento</h3>
              
              <div style={styles.amountBox}>
                <span style={styles.amountLabel}>Total a Pagar</span>
                <span style={styles.amountValue}>€{order?.total_amount?.toFixed(2) || '0.00'}</span>
              </div>

              {order?.events?.payment_iban && (
                <div style={styles.paymentRow}>
                  <span style={styles.paymentLabel}>IBAN</span>
                  <span style={styles.paymentValue}>{formatIban(order.events.payment_iban)}</span>
                </div>
              )}

              {order?.events?.payment_mbway && (
                <div style={styles.paymentRow}>
                  <span style={styles.paymentLabel}>MB Way</span>
                  <span style={styles.paymentValue}>{order.events.payment_mbway}</span>
                </div>
              )}

              {order?.events?.payment_name && (
                <div style={styles.paymentRow}>
                  <span style={styles.paymentLabel}>Titular</span>
                  <span style={styles.paymentValue}>{order.events.payment_name}</span>
                </div>
              )}

              
            </div>
          )}

          <div style={styles.infoCard}>
            <h3 style={styles.infoTitle}>Próximos Passos</h3>
            
            <div style={styles.step}>
              <span style={styles.stepNumber}>1</span>
              <p style={styles.stepText}>Efetua o pagamento por transferência bancária ou MB Way usando os dados acima</p>
            </div>
            
            <div style={styles.step}>
              <span style={styles.stepNumber}>2</span>
              <p style={styles.stepText}>Vai a "Os Meus Bilhetes" e envia o comprovativo de pagamento</p>
            </div>
            
            <div style={styles.step}>
              <span style={styles.stepNumber}>3</span>
              <p style={styles.stepText}>Aguarda a confirmação do organizador (normalmente em 24-48h)</p>
            </div>

            <div style={styles.warning}>
              <span style={styles.warningIcon}>⏱</span>
              <p style={styles.warningText}>
                Tens <strong>48 horas</strong> para efetuar o pagamento e enviar o comprovativo, caso contrário a reserva será cancelada automaticamente.
              </p>
            </div>
          </div>

          <div style={styles.buttons}>
            <Link to="/my-tickets" style={styles.primaryButton}>
              Ver Os Meus Bilhetes
            </Link>
            <Link to="/events" style={styles.secondaryButton}>
              Explorar Mais Eventos
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { minHeight: '100vh', backgroundColor: '#020202', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  loadingContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' },
  spinner: { width: 40, height: 40, border: '3px solid rgba(249,178,52,0.2)', borderTop: '3px solid #F9B234', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  navbar: { padding: '20px 0', position: 'fixed', top: 0, left: 0, right: 0, backgroundColor: 'rgba(2,2,2,0.9)', backdropFilter: 'blur(20px)', zIndex: 1000, borderBottom: '1px solid rgba(249,178,52,0.1)' },
  navContent: { maxWidth: 1200, margin: '0 auto', padding: '0 48px', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  logoImage: { height: 56 },
  content: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 48px 60px' },
  card: { maxWidth: 600, width: '100%', textAlign: 'center' },
  iconCircle: { width: 100, height: 100, borderRadius: '50%', backgroundColor: '#F9B234', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px', boxShadow: '0 8px 32px rgba(249,178,52,0.3)' },
  icon: { fontSize: 48, color: '#020202', fontWeight: 700 },
  title: { fontSize: 40, fontWeight: 700, color: '#FFF', margin: '0 0 12px', letterSpacing: -1 },
  customLetter: { fontFamily: 'fontello', color: '#F9B234', fontSize: '0.85em', display: 'inline-block', transform: 'translateY(-4px)' },
  subtitle: { fontSize: 17, color: '#B5B5B5', margin: '0 0 40px' },
  paymentCard: { backgroundColor: '#F9B234', borderRadius: 20, padding: 28, marginBottom: 24, textAlign: 'left' },
  paymentTitle: { fontSize: 18, fontWeight: 700, color: '#020202', margin: '0 0 20px' },
  amountBox: { backgroundColor: '#020202', borderRadius: 12, padding: 20, marginBottom: 20, textAlign: 'center' },
  amountLabel: { display: 'block', fontSize: 13, color: '#B5B5B5', marginBottom: 4 },
  amountValue: { fontSize: 36, fontWeight: 700, color: '#F9B234' },
  paymentRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(2,2,2,0.1)' },
  paymentRowHighlight: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', marginTop: 8, backgroundColor: 'rgba(2,2,2,0.1)', borderRadius: 8, paddingLeft: 12, paddingRight: 12 },
  paymentLabel: { fontSize: 14, color: 'rgba(2,2,2,0.7)' },
  paymentValue: { fontSize: 15, fontWeight: 600, color: '#020202', fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'right', maxWidth: '65%' },
  paymentValueRef: { fontSize: 16, fontWeight: 700, color: '#020202', fontFamily: 'monospace' },
  paymentNote: { fontSize: 13, color: 'rgba(2,2,2,0.7)', margin: '16px 0 0', padding: '12px', backgroundColor: 'rgba(2,2,2,0.05)', borderRadius: 8 },
  infoCard: { backgroundColor: '#121212', borderRadius: 20, padding: 32, marginBottom: 32, textAlign: 'left', border: '1px solid rgba(249,178,52,0.1)' },
  infoTitle: { fontSize: 18, fontWeight: 600, color: '#F9B234', margin: '0 0 24px' },
  step: { display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 },
  stepNumber: { width: 28, height: 28, borderRadius: '50%', backgroundColor: 'rgba(249,178,52,0.1)', color: '#F9B234', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0 },
  stepText: { margin: 0, color: '#EDEDED', fontSize: 15, lineHeight: 1.6, paddingTop: 3 },
  warning: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 20px', backgroundColor: 'rgba(249,178,52,0.1)', borderRadius: 12, marginTop: 24, border: '1px solid rgba(249,178,52,0.2)' },
  warningIcon: { fontSize: 20 },
  warningText: { margin: 0, color: '#F9B234', fontSize: 14, flex: 1 },
  buttons: { display: 'flex', flexDirection: 'column', gap: 12 },
  primaryButton: { padding: '18px 32px', backgroundColor: '#F9B234', color: '#020202', textDecoration: 'none', borderRadius: 50, fontWeight: 600, fontSize: 16 },
  secondaryButton: { padding: '18px 32px', backgroundColor: 'transparent', color: '#EDEDED', textDecoration: 'none', borderRadius: 50, fontWeight: 500, fontSize: 16, border: '1px solid rgba(237,237,237,0.2)' }
}
