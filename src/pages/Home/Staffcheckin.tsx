import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { validateStaffCode, processTicketScan, getTicketBusInfo, StaffAccessCode, CheckResult, TicketBusInfo } from '../../services/staffaccess'

type ScanMode = 'check_in' | 'check_out' | 'bus'

export const StaffCheckin = () => {
  // Estado de autenticação do staff
  const [accessCode, setAccessCode] = useState('')
  const [staffData, setStaffData] = useState<StaffAccessCode | null>(null)
  const [codeError, setCodeError] = useState('')
  const [validating, setValidating] = useState(false)

  // Estado do scanner
  const [scanMode, setScanMode] = useState<ScanMode>('check_in')
  const [scanning, setScanning] = useState(false)
  const [lastResult, setLastResult] = useState<CheckResult | null>(null)
  const [lastBusInfo, setLastBusInfo] = useState<TicketBusInfo | null>(null)
  const [showResult, setShowResult] = useState(false)

  // Estatísticas da sessão
  const [sessionStats, setSessionStats] = useState({ checkIns: 0, checkOuts: 0 })

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const resultTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isProcessingRef = useRef(false)
  const lastScannedCodeRef = useRef<string | null>(null)
  const scanModeRef = useRef<ScanMode>('check_in')
  const staffDataRef = useRef<StaffAccessCode | null>(null)

  // Sincronizar refs com state
  useEffect(() => {
    scanModeRef.current = scanMode
  }, [scanMode])

  useEffect(() => {
    staffDataRef.current = staffData
  }, [staffData])

  // Limpar scanner ao desmontar
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
      if (resultTimeoutRef.current) {
        clearTimeout(resultTimeoutRef.current)
      }
    }
  }, [])

  // Validar código de acesso
  const handleValidateCode = async () => {
    if (!accessCode.trim()) return
    
    setValidating(true)
    setCodeError('')

    try {
      const result = await validateStaffCode(accessCode.trim())
      
      if (result.valid && result.data) {
        setStaffData(result.data)
      } else {
        setCodeError(result.error || 'Código inválido')
      }
    } catch (error) {
      setCodeError('Erro ao validar código')
    } finally {
      setValidating(false)
    }
  }

  // Iniciar scanner
  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode('qr-reader')
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 5,
          qrbox: { width: 250, height: 250 }
        },
        handleQrCodeScanned,
        () => {}
      )

      setScanning(true)
    } catch (error) {
      console.error('Erro ao iniciar câmara:', error)
      alert('Não foi possível aceder à câmara. Verifica as permissões.')
    }
  }

  // Parar scanner
  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop()
      scannerRef.current = null
    }
    setScanning(false)
  }

  // Handler para QR Code lido
  const handleQrCodeScanned = async (decodedText: string) => {
    // BLOQUEIO 1: Se já está a processar, ignorar
    if (isProcessingRef.current) {
      return
    }

    // BLOQUEIO 2: Se é o mesmo código que acabou de ser lido, ignorar
    if (lastScannedCodeRef.current === decodedText) {
      return
    }

    // Verificar se temos staff data
    if (!staffDataRef.current) {
      return
    }

    // Marcar como a processar IMEDIATAMENTE
    isProcessingRef.current = true
    lastScannedCodeRef.current = decodedText

    // Ler o modo atual da REF (sempre atualizado!)
    const currentMode = scanModeRef.current

    try {
      // Se modo autocarro, apenas buscar info sem alterar BD
      if (currentMode === 'bus') {
        const busResult = await getTicketBusInfo(decodedText, staffDataRef.current)
        
        setLastBusInfo(busResult)
        setLastResult(null)
        setShowResult(true)

        if (busResult.success) {
          if (navigator.vibrate) {
            navigator.vibrate(200)
          }
        } else {
          if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100])
          }
        }

        // Agendar reset após 5 segundos (mais tempo para ler info do autocarro)
        resultTimeoutRef.current = setTimeout(() => {
          resetScanner()
        }, 5000)

      } else {
        // Modo check-in ou check-out normal
        const result = await processTicketScan(decodedText, staffDataRef.current, currentMode)
        
        setLastResult(result)
        setLastBusInfo(null)
        setShowResult(true)

        // Atualizar estatísticas se sucesso
        if (result.success && result.action) {
          setSessionStats(prev => ({
            checkIns: prev.checkIns + (result.action === 'check_in' ? 1 : 0),
            checkOuts: prev.checkOuts + (result.action === 'check_out' ? 1 : 0)
          }))

          if (navigator.vibrate) {
            navigator.vibrate(200)
          }
        } else {
          if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100])
          }
        }

        // Agendar reset após 3 segundos
        resultTimeoutRef.current = setTimeout(() => {
          resetScanner()
        }, 3000)
      }

    } catch (error) {
      setLastResult({ success: false, message: 'Erro ao processar bilhete' })
      setLastBusInfo(null)
      setShowResult(true)
      
      resultTimeoutRef.current = setTimeout(() => {
        resetScanner()
      }, 3000)
    }
  }

  // Reset do scanner para permitir nova leitura
  const resetScanner = () => {
    setShowResult(false)
    setLastResult(null)
    setLastBusInfo(null)
    lastScannedCodeRef.current = null
    isProcessingRef.current = false
  }

  // Fechar resultado manualmente
  const dismissResult = () => {
    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current)
    }
    resetScanner()
  }

  // Mudar modo
  const changeMode = (newMode: ScanMode) => {
    if (!showResult) {
      setScanMode(newMode)
    }
  }

  // Sair (voltar ao ecrã de código)
  const handleLogout = async () => {
    await stopScanner()
    setStaffData(null)
    setAccessCode('')
    setSessionStats({ checkIns: 0, checkOuts: 0 })
    resetScanner()
  }

  // Obter estilo do modo atual
  const getModeStyle = () => {
    switch (scanMode) {
      case 'check_in':
        return { bg: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', border: '#22c55e' }
      case 'check_out':
        return { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '#ef4444' }
      case 'bus':
        return { bg: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', border: '#3b82f6' }
    }
  }

  const getModeLabel = () => {
    switch (scanMode) {
      case 'check_in': return '➡️ MODO: ENTRADA'
      case 'check_out': return '⬅️ MODO: SAÍDA'
      case 'bus': return '🚌 MODO: AUTOCARRO'
    }
  }

  const modeStyle = getModeStyle()

  // ==================== RENDER ====================

  // Ecrã de código de acesso
  if (!staffData) {
    return (
      <div style={styles.container}>
        <div style={styles.loginCard}>
          <div style={styles.loginHeader}>
            <h1 style={styles.loginTitle}>🎫 Check-in Staff</h1>
            <p style={styles.loginSubtitle}>Insere o código de acesso fornecido pelo organizador</p>
          </div>

          <div style={styles.inputGroup}>
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              placeholder="Código (ex: ABC123)"
              style={styles.codeInput}
              maxLength={8}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleValidateCode()}
            />
            {codeError && <p style={styles.errorText}>{codeError}</p>}
          </div>

          <button
            onClick={handleValidateCode}
            disabled={validating || !accessCode.trim()}
            style={{
              ...styles.validateButton,
              opacity: validating || !accessCode.trim() ? 0.5 : 1
            }}
          >
            {validating ? 'A validar...' : 'Entrar'}
          </button>
        </div>
      </div>
    )
  }

  // Ecrã do scanner
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerInfo}>
          <h2 style={styles.eventName}>{staffData.event_name}</h2>
          <p style={styles.staffName}>👤 {staffData.name}</p>
        </div>
        <button onClick={handleLogout} style={styles.logoutButton}>Sair</button>
      </div>

      {/* Modo de scan - Entrada, Saída e Autocarro */}
      <div style={styles.modeSelector}>
        <button
          onClick={() => changeMode('check_in')}
          style={{
            ...styles.modeButton,
            ...(scanMode === 'check_in' ? styles.modeButtonActiveGreen : {}),
            opacity: showResult ? 0.5 : 1
          }}
          disabled={showResult}
        >
          ➡️ Entrada
        </button>
        <button
          onClick={() => changeMode('check_out')}
          style={{
            ...styles.modeButton,
            ...(scanMode === 'check_out' ? styles.modeButtonActiveRed : {}),
            opacity: showResult ? 0.5 : 1
          }}
          disabled={showResult}
        >
          ⬅️ Saída
        </button>
        <button
          onClick={() => changeMode('bus')}
          style={{
            ...styles.modeButton,
            ...(scanMode === 'bus' ? styles.modeButtonActiveBlue : {}),
            opacity: showResult ? 0.5 : 1
          }}
          disabled={showResult}
        >
          🚌 Autocarro
        </button>
      </div>

      {/* Indicador do modo atual */}
      <div style={{
        ...styles.currentModeIndicator,
        backgroundColor: modeStyle.bg,
        borderColor: modeStyle.border
      }}>
        <span style={{ 
          color: modeStyle.color,
          fontWeight: '600',
          fontSize: '16px'
        }}>
          {getModeLabel()}
        </span>
      </div>

      {/* Scanner */}
      <div style={styles.scannerContainer}>
        <div id="qr-reader" style={styles.scanner}></div>
        
        {!scanning && !showResult && (
          <div style={styles.scannerOverlay}>
            <button onClick={startScanner} style={styles.startButton}>
              📷 Iniciar Scanner
            </button>
          </div>
        )}

        {scanning && !showResult && (
          <p style={styles.scanningText}>Aponta para o QR Code do bilhete</p>
        )}
      </div>

      {/* Resultado do scan - Check-in/Check-out */}
      {showResult && lastResult && (
        <div 
          style={{
            ...styles.resultOverlay,
            backgroundColor: lastResult.success 
              ? 'rgba(34, 197, 94, 1)' 
              : 'rgba(239, 68, 68, 1)'
          }}
          onClick={dismissResult}
        >
          <div style={styles.resultContent}>
            <span style={styles.resultIcon}>
              {lastResult.success ? '✓' : '✕'}
            </span>
            <h3 style={styles.resultTitle}>{lastResult.message}</h3>
            
            {lastResult.ticket && (
              <div style={styles.ticketInfo}>
                <p style={styles.ticketEmail}>{lastResult.ticket.email}</p>
                {lastResult.ticket.restrictions && (
                  <p style={styles.ticketRestrictions}>🍽️ {lastResult.ticket.restrictions}</p>
                )}
              </div>
            )}

            <p style={styles.tapToDismiss}>Toca para continuar</p>
          </div>
        </div>
      )}

      {/* Resultado do scan - Autocarro */}
      {showResult && lastBusInfo && (
        <div 
          style={{
            ...styles.resultOverlay,
            backgroundColor: lastBusInfo.success 
              ? 'rgba(59, 130, 246, 1)' 
              : 'rgba(239, 68, 68, 1)'
          }}
          onClick={dismissResult}
        >
          <div style={styles.resultContent}>
            <span style={styles.resultIcon}>
              {lastBusInfo.success ? '🚌' : '✕'}
            </span>
            <h3 style={styles.resultTitle}>
              {lastBusInfo.success ? 'Informação de Autocarro' : lastBusInfo.message}
            </h3>
            
            {lastBusInfo.ticket && (
              <div style={styles.ticketInfo}>
                <p style={styles.ticketEmail}>{lastBusInfo.ticket.email}</p>
                
                <div style={styles.busInfoContainer}>
                  {/* Autocarro de Ida */}
                  <div style={styles.busInfoBox}>
                    <span style={styles.busInfoLabel}>🚌 IDA</span>
                    <span style={styles.busInfoValue}>
                      {lastBusInfo.ticket.bus_go || 'Sem autocarro'}
                    </span>
                  </div>
                  
                  {/* Autocarro de Volta */}
                  <div style={styles.busInfoBox}>
                    <span style={styles.busInfoLabel}>🚌 VOLTA</span>
                    <span style={styles.busInfoValue}>
                      {lastBusInfo.ticket.bus_come || 'Sem autocarro'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <p style={styles.tapToDismiss}>Toca para continuar</p>
          </div>
        </div>
      )}

      {/* Estatísticas da sessão */}
      <div style={styles.statsBar}>
        <div style={styles.statItem}>
          <span style={styles.statNumber}>{sessionStats.checkIns}</span>
          <span style={styles.statLabel}>Entradas</span>
        </div>
        <div style={styles.statDivider}></div>
        <div style={styles.statItem}>
          <span style={styles.statNumber}>{sessionStats.checkOuts}</span>
          <span style={styles.statLabel}>Saídas</span>
        </div>
      </div>

      {/* Controlos do scanner */}
      {scanning && !showResult && (
        <button onClick={stopScanner} style={styles.stopButton}>
          ⏹️ Parar Scanner
        </button>
      )}
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#020202',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
    flexDirection: 'column'
  },
  
  // Login
  loginCard: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '40px 24px',
    maxWidth: '400px',
    margin: '0 auto',
    width: '100%'
  },
  loginHeader: {
    textAlign: 'center',
    marginBottom: '40px'
  },
  loginTitle: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#FFFFFF',
    margin: '0 0 8px 0'
  },
  loginSubtitle: {
    fontSize: '15px',
    color: '#B5B5B5',
    margin: 0
  },
  inputGroup: {
    marginBottom: '24px'
  },
  codeInput: {
    width: '100%',
    padding: '20px',
    fontSize: '24px',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: '8px',
    backgroundColor: '#1a1a1a',
    border: '2px solid #333',
    borderRadius: '16px',
    color: '#FFFFFF',
    outline: 'none',
    boxSizing: 'border-box'
  },
  errorText: {
    color: '#ef4444',
    fontSize: '14px',
    marginTop: '12px',
    textAlign: 'center'
  },
  validateButton: {
    width: '100%',
    padding: '18px',
    backgroundColor: '#F9B234',
    color: '#020202',
    border: 'none',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },

  // Header
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#1a1a1a',
    borderBottom: '1px solid #333'
  },
  headerInfo: {
    flex: 1
  },
  eventName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#FFFFFF',
    margin: '0 0 4px 0'
  },
  staffName: {
    fontSize: '13px',
    color: '#B5B5B5',
    margin: 0
  },
  logoutButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#B5B5B5',
    border: '1px solid #333',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer'
  },

  // Mode Selector
  modeSelector: {
    display: 'flex',
    gap: '8px',
    padding: '16px 20px',
    backgroundColor: '#1a1a1a'
  },
  modeButton: {
    flex: 1,
    padding: '12px 8px',
    backgroundColor: '#2a2a2a',
    color: '#B5B5B5',
    border: '2px solid transparent',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  modeButtonActiveGreen: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    color: '#22c55e',
    borderColor: '#22c55e'
  },
  modeButtonActiveRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    borderColor: '#ef4444'
  },
  modeButtonActiveBlue: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#3b82f6',
    borderColor: '#3b82f6'
  },
  currentModeIndicator: {
    padding: '12px 20px',
    margin: '0 20px',
    borderRadius: '8px',
    textAlign: 'center',
    border: '2px solid'
  },

  // Scanner
  scannerContainer: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  scanner: {
    width: '100%',
    maxWidth: '400px',
    borderRadius: '16px',
    overflow: 'hidden'
  },
  scannerOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)'
  },
  startButton: {
    padding: '20px 40px',
    backgroundColor: '#F9B234',
    color: '#020202',
    border: 'none',
    borderRadius: '16px',
    fontSize: '18px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  scanningText: {
    color: '#B5B5B5',
    fontSize: '14px',
    marginTop: '16px',
    textAlign: 'center'
  },

  // Result Overlay
  resultOverlay: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    cursor: 'pointer'
  },
  resultContent: {
    textAlign: 'center',
    padding: '40px',
    color: '#FFFFFF',
    width: '100%',
    maxWidth: '400px'
  },
  resultIcon: {
    fontSize: '80px',
    display: 'block',
    marginBottom: '16px'
  },
  resultTitle: {
    fontSize: '24px',
    fontWeight: '700',
    margin: '0 0 24px 0'
  },
  ticketInfo: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px'
  },
  ticketEmail: {
    fontSize: '18px',
    fontWeight: '600',
    margin: '0 0 16px 0'
  },
  ticketDetail: {
    fontSize: '16px',
    margin: '4px 0',
    opacity: 0.9
  },
  ticketRestrictions: {
    fontSize: '14px',
    margin: '8px 0 0 0',
    padding: '8px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '6px'
  },
  
  // Bus Info
  busInfoContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '16px'
  },
  busInfoBox: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: '10px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  busInfoLabel: {
    fontSize: '12px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    opacity: 0.8
  },
  busInfoValue: {
    fontSize: '18px',
    fontWeight: '600'
  },

  tapToDismiss: {
    fontSize: '14px',
    opacity: 0.7,
    margin: 0
  },

  // Stats Bar
  statsBar: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#1a1a1a',
    borderTop: '1px solid #333'
  },
  statItem: {
    textAlign: 'center',
    padding: '0 32px'
  },
  statNumber: {
    display: 'block',
    fontSize: '32px',
    fontWeight: '700',
    color: '#F9B234'
  },
  statLabel: {
    fontSize: '12px',
    color: '#B5B5B5',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  statDivider: {
    width: '1px',
    height: '40px',
    backgroundColor: '#333'
  },

  // Stop Button
  stopButton: {
    margin: '0 20px 20px',
    padding: '16px',
    backgroundColor: '#333',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  }
}
