import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createEvent, updateEvent } from '../../services/events'
import { createBus } from '../../services/buses'
import { createTable } from '../../services/tables'
import { getCurrentUser } from '../../services/auth'
import { uploadEventImages } from '../../services/storage'

interface BusForm {
  bus_type: 'ida' | 'volta'
  location: string
  time: string
  capacity: number
}

interface ImagePreview {
  file: File
  preview: string
}

const MAX_IMAGES = 10

export const CreateEvent = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Event data
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [dateHour, setDateHour] = useState('')
  const [description, setDescription] = useState('')
  const [priceBus, setPriceBus] = useState('')
  const [priceNoBus, setPriceNoBus] = useState('')
  const [ticketsNumber, setTicketsNumber] = useState('')
  
  // Dados de pagamento
  const [paymentIban, setPaymentIban] = useState('')
  const [paymentMbway, setPaymentMbway] = useState('')
  const [paymentName, setPaymentName] = useState('')
  
  // Múltiplas imagens
  const [images, setImages] = useState<ImagePreview[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Buses
  const [buses, setBuses] = useState<BusForm[]>([])
  const [showBusForm, setShowBusForm] = useState(false)
  const [newBus, setNewBus] = useState({
    bus_type: 'ida' as 'ida' | 'volta',
    location: '',
    time: '',
    capacity: ''
  })

  // Tables
  const [tableCount, setTableCount] = useState('')
  const [tableCapacity, setTableCapacity] = useState('')

  const getMinDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  }

  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser()
      if (!user) {
        navigate('/login')
        return
      }
      setUserId(user.id)
    }
    loadUser()
  }, [navigate])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      e.preventDefault()
    }
  }

  const handleAddBus = () => {
    if (!newBus.location || !newBus.time) {
      alert('Preenche a localização e hora do autocarro')
      return
    }
    setBuses([...buses, { ...newBus, capacity: Number(newBus.capacity) || 50 }])
    setNewBus({ bus_type: 'ida', location: '', time: '', capacity: '' })
    setShowBusForm(false)
  }

  const handleRemoveBus = (index: number) => {
    setBuses(buses.filter((_, i) => i !== index))
  }

  // === GESTÃO DE IMAGENS ===
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const maxSize = 5 * 1024 * 1024
    const remainingSlots = MAX_IMAGES - images.length

    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      const file = files[i]
      
      if (!allowedTypes.includes(file.type)) {
        alert(`Ficheiro "${file.name}" ignorado. Apenas JPG, PNG ou WEBP são permitidos.`)
        continue
      }

      if (file.size > maxSize) {
        alert(`Ficheiro "${file.name}" ignorado. Máximo 5MB por imagem.`)
        continue
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setImages(prev => [...prev, { file, preview: reader.result as string }])
      }
      reader.readAsDataURL(file)
    }

    if (files.length > remainingSlots) {
      alert(`Apenas foram adicionadas ${remainingSlots} imagens. Limite máximo de ${MAX_IMAGES} imagens.`)
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newImages = [...images]
    const draggedImage = newImages[draggedIndex]
    newImages.splice(draggedIndex, 1)
    newImages.splice(index, 0, draggedImage)
    setImages(newImages)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  // Formatar IBAN enquanto escreve
  const formatIban = (value: string) => {
    const cleaned = value.replace(/\s/g, '').toUpperCase()
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned
    return formatted.substring(0, 31)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const selectedDate = new Date(dateHour)
    const now = new Date()
    if (selectedDate <= now) {
      setError('A data do evento deve ser no futuro.')
      setLoading(false)
      return
    }

    if (!priceNoBus || Number(priceNoBus) <= 0) {
      setError('O preço sem autocarro deve ser maior que 0.')
      setLoading(false)
      return
    }

    if (priceBus && Number(priceBus) < 0) {
      setError('O preço com autocarro não pode ser negativo.')
      setLoading(false)
      return
    }

    const numTables = Number(tableCount) || 0
    if (numTables <= 0) {
      setError('O evento deve ter pelo menos uma mesa.')
      setLoading(false)
      return
    }

    if (!ticketsNumber || Number(ticketsNumber) <= 0) {
      setError('O número de bilhetes deve ser maior que 0.')
      setLoading(false)
      return
    }

    // Validar dados de pagamento
    if (!paymentIban && !paymentMbway) {
      setError('Deves fornecer pelo menos um IBAN ou número MB Way para receber pagamentos.')
      setLoading(false)
      return
    }

    if (paymentIban) {
      const cleanIban = paymentIban.replace(/\s/g, '')
      if (cleanIban.length < 15 || cleanIban.length > 34) {
        setError('O IBAN introduzido não parece válido.')
        setLoading(false)
        return
      }
    }

    try {
      // 1. Criar o evento com status pending
      const event = await createEvent({
        name,
        location,
        date_hour: dateHour,
        description,
        price_bus: Number(priceBus) || 0,
        price_no_bus: Number(priceNoBus) || 0,
        tickets_number: Number(ticketsNumber) || 0,
        owner_id: userId,
        image_url: null,
        status: 'pending',
        payment_iban: paymentIban.replace(/\s/g, '') || null,
        payment_mbway: paymentMbway || null,
        payment_name: paymentName || null
      })

      // 2. Upload das imagens (na ordem)
      if (images.length > 0) {
        setUploadingImage(true)
        const files = images.map(img => img.file)
        const imageUrls = await uploadEventImages(files, event.id, 0)
        setUploadingImage(false)
        
        // Guardar a primeira imagem como cover
        if (imageUrls.length > 0) {
          await updateEvent(event.id, { image_url: imageUrls[0] })
        }
      }

      // 3. Criar autocarros
      for (const bus of buses) {
        await createBus({
          events_id: event.id,
          bus_type: bus.bus_type,
          location: bus.location,
          time: bus.time,
          capacity: bus.capacity
        })
      }

      // 4. Criar mesas
      const capacity = Number(tableCapacity) || 6
      
      for (let i = 1; i <= numTables; i++) {
        await createTable({
          events_id: event.id,
          name: `Mesa ${i}`,
          capacity: capacity
        })
      }

      navigate('/my-events')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.pageContainer}>
      <div style={styles.headerSection}>
        <Link to="/home" style={styles.backLink}>← Voltar</Link>
      </div>
      
      <div style={styles.container}>
        <h1 style={styles.pageTitle}>
          <span style={styles.customLetterOrange}>{'\ue801'}</span>riar Evento
        </h1>

        {error && <p style={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
          {/* Dados do Evento */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Dados do Evento</h2>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Nome do Evento *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Localização *</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Data e Hora *</label>
              <input
                type="datetime-local"
                value={dateHour}
                onChange={(e) => setDateHour(e.target.value)}
                min={getMinDateTime()}
                style={styles.input}
                required
              />
            </div>

            {/* Upload de Múltiplas Imagens */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Imagens do Evento ({images.length}/{MAX_IMAGES})
              </label>
              <p style={styles.imageHint}>
                A primeira imagem será a capa do evento. Arrasta para reordenar.
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
                multiple
              />
              
              {/* Grid de imagens */}
              <div style={styles.imagesGrid}>
                {images.map((img, index) => (
                  <div
                    key={index}
                    style={{
                      ...styles.imageItem,
                      ...(index === 0 ? styles.coverImage : {}),
                      opacity: draggedIndex === index ? 0.5 : 1,
                    }}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <img src={img.preview} alt={`Preview ${index + 1}`} style={styles.imageThumb} />
                    {index === 0 && <span style={styles.coverBadge}>Capa</span>}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      style={styles.removeImageBtn}
                    >
                      ✕
                    </button>
                    <span style={styles.dragHandle}>⋮⋮</span>
                  </div>
                ))}
                
                {/* Botão adicionar mais */}
                {images.length < MAX_IMAGES && (
                  <div
                    style={styles.addImageBox}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span style={styles.addImageIcon}>+</span>
                    <span style={styles.addImageText}>Adicionar</span>
                  </div>
                )}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={styles.textarea}
                rows={3}
              />
            </div>

            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Preço com Autocarro (€)</label>
                <input
                  type="number"
                  value={priceBus}
                  onChange={(e) => setPriceBus(e.target.value)}
                  style={styles.input}
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Preço sem Autocarro (€) *</label>
                <input
                  type="number"
                  value={priceNoBus}
                  onChange={(e) => setPriceNoBus(e.target.value)}
                  style={styles.input}
                  min={0.01}
                  step={0.01}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Número Total de Bilhetes *</label>
              <input
                type="number"
                value={ticketsNumber}
                onChange={(e) => setTicketsNumber(e.target.value)}
                style={styles.input}
                min={1}
                placeholder="1"
                required
              />
            </div>
          </section>

          {/* Dados de Pagamento */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>💳 Dados de Pagamento</h2>
            <p style={styles.sectionHint}>
              Configura como vais receber os pagamentos dos bilhetes. Deves fornecer pelo menos um método.
            </p>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>IBAN</label>
              <input
                type="text"
                value={paymentIban}
                onChange={(e) => setPaymentIban(formatIban(e.target.value))}
                style={styles.input}
                placeholder="PT50 0000 0000 0000 0000 0000 0"
                maxLength={31}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Número MB Way</label>
              <input
                type="tel"
                value={paymentMbway}
                onChange={(e) => setPaymentMbway(e.target.value.replace(/\D/g, '').substring(0, 9))}
                style={styles.input}
                placeholder="912345678"
                maxLength={9}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Nome do Titular</label>
              <input
                type="text"
                value={paymentName}
                onChange={(e) => setPaymentName(e.target.value)}
                style={styles.input}
                placeholder="Nome para identificar a conta"
              />
            </div>

            {(paymentIban || paymentMbway) && (
              <div style={styles.paymentPreview}>
                <p style={styles.paymentPreviewTitle}>Os compradores verão:</p>
                {paymentIban && <p style={styles.paymentPreviewItem}>IBAN: {paymentIban}</p>}
                {paymentMbway && <p style={styles.paymentPreviewItem}>MB Way: {paymentMbway}</p>}
                {paymentName && <p style={styles.paymentPreviewItem}>Titular: {paymentName}</p>}
              </div>
            )}
          </section>

          {/* Autocarros */}
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Autocarros</h2>
              <button
                type="button"
                onClick={() => setShowBusForm(true)}
                style={styles.addButton}
              >
                + Adicionar Autocarro
              </button>
            </div>

            {showBusForm && (
              <div style={styles.subForm}>
                <div style={styles.row}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Tipo</label>
                    <select
                      value={newBus.bus_type}
                      onChange={(e) => setNewBus({ ...newBus, bus_type: e.target.value as 'ida' | 'volta' })}
                      style={styles.input}
                    >
                      <option value="ida">Ida</option>
                      <option value="volta">Volta</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Capacidade</label>
                    <input
                      type="number"
                      value={newBus.capacity}
                      onChange={(e) => setNewBus({ ...newBus, capacity: e.target.value })}
                      style={styles.input}
                      min={1}
                      placeholder="50"
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Local de Partida</label>
                  <input
                    type="text"
                    value={newBus.location}
                    onChange={(e) => setNewBus({ ...newBus, location: e.target.value })}
                    style={styles.input}
                    placeholder="Ex: Praça Central"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Hora de Partida</label>
                  <input
                    type="datetime-local"
                    value={newBus.time}
                    onChange={(e) => setNewBus({ ...newBus, time: e.target.value })}
                    style={styles.input}
                  />
                </div>

                <div style={styles.subFormButtons}>
                  <button type="button" onClick={handleAddBus} style={styles.confirmButton}>
                    Adicionar
                  </button>
                  <button type="button" onClick={() => setShowBusForm(false)} style={styles.cancelButton}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {buses.length > 0 && (
              <div style={styles.itemList}>
                {buses.map((bus, index) => (
                  <div key={index} style={styles.item}>
                    <div>
                      <strong>{bus.bus_type === 'ida' ? '🚌 Ida' : '🚌 Volta'}</strong>
                      <span> - {bus.location} às {new Date(bus.time).toLocaleString('pt-PT')}</span>
                      <span style={styles.itemDetail}> ({bus.capacity} lugares)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveBus(index)}
                      style={styles.removeButton}
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}

            {buses.length === 0 && !showBusForm && (
              <p style={styles.emptyText}>Nenhum autocarro adicionado.</p>
            )}
          </section>

          {/* Mesas */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Mesas</h2>
            
            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Número de Mesas *</label>
                <input
                  type="number"
                  value={tableCount}
                  onChange={(e) => setTableCount(e.target.value)}
                  style={styles.input}
                  min={1}
                  placeholder="1"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Lugares por Mesa *</label>
                <input
                  type="number"
                  value={tableCapacity}
                  onChange={(e) => setTableCapacity(e.target.value)}
                  style={styles.input}
                  min={1}
                  placeholder="6"
                  required
                />
              </div>
            </div>

            {Number(tableCount) > 0 && Number(tableCapacity) > 0 && (
              <div style={styles.tablePreview}>
                <p style={styles.tablePreviewText}>
                  Serão criadas <strong>{tableCount} mesas</strong> com <strong>{tableCapacity} lugares</strong> cada
                </p>
                <p style={styles.tablePreviewSubtext}>
                  Total: {Number(tableCount) * Number(tableCapacity)} lugares em mesas
                </p>
              </div>
            )}
          </section>

          <button type="submit" style={styles.submitButton} disabled={loading}>
            {loading ? (uploadingImage ? 'A carregar imagens...' : 'A criar evento...') : 'Criar Evento'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  pageContainer: {
    minHeight: '100vh',
    backgroundColor: '#020202',
    padding: '20px',
    width: '100%',
    boxSizing: 'border-box',
  },
  headerSection: {
    maxWidth: '900px',
    margin: '0 auto 20px',
  },
  backLink: {
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
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    backgroundColor: '#121212',
    borderRadius: '24px',
    padding: '40px',
    border: '1px solid rgba(249, 178, 52, 0.1)',
  },
  pageTitle: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: '32px',
  },
  customLetterOrange: {
    fontFamily: 'fontello',
    color: '#F9B234',
    fontSize: '0.85em',
    marginRight: '0px',
    display: 'inline-block',
    transform: 'translateY(-4px)',
  },
  error: {
    color: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  section: {
    marginTop: '32px',
    padding: '24px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(249, 178, 52, 0.1)',
    borderRadius: '16px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#F9B234',
    margin: '0 0 20px 0',
  },
  sectionHint: {
    color: '#B5B5B5',
    fontSize: '14px',
    margin: '-12px 0 20px 0',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  formGroup: {
    marginBottom: '20px',
    flex: 1,
  },
  label: {
    display: 'block',
    color: '#EDEDED',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
  },
  imageHint: {
    color: '#B5B5B5',
    fontSize: '13px',
    margin: '0 0 16px 0',
  },
  row: {
    display: 'flex',
    gap: '16px',
  },
  input: {
    width: '100%',
    padding: '14px 18px',
    borderRadius: '12px',
    border: '1px solid rgba(249, 178, 52, 0.2)',
    fontSize: '15px',
    backgroundColor: 'rgba(2, 2, 2, 0.5)',
    color: '#FFFFFF',
    boxSizing: 'border-box',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    padding: '14px 18px',
    borderRadius: '12px',
    border: '1px solid rgba(249, 178, 52, 0.2)',
    fontSize: '15px',
    backgroundColor: 'rgba(2, 2, 2, 0.5)',
    color: '#FFFFFF',
    boxSizing: 'border-box',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
  },
  imagesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '12px',
  },
  imageItem: {
    position: 'relative',
    aspectRatio: '1',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'grab',
    border: '2px solid transparent',
  },
  coverImage: {
    border: '2px solid #F9B234',
  },
  imageThumb: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  coverBadge: {
    position: 'absolute',
    top: '8px',
    left: '8px',
    padding: '4px 10px',
    backgroundColor: '#F9B234',
    color: '#020202',
    fontSize: '11px',
    fontWeight: '700',
    borderRadius: '50px',
  },
  removeImageBtn: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '24px',
    height: '24px',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    position: 'absolute',
    bottom: '8px',
    right: '8px',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '14px',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
  },
  addImageBox: {
    aspectRatio: '1',
    borderRadius: '12px',
    border: '2px dashed rgba(249, 178, 52, 0.3)',
    backgroundColor: 'rgba(249, 178, 52, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  addImageIcon: {
    fontSize: '32px',
    color: '#F9B234',
    lineHeight: 1,
  },
  addImageText: {
    fontSize: '12px',
    color: '#B5B5B5',
    marginTop: '4px',
  },
  addButton: {
    padding: '10px 20px',
    backgroundColor: '#F9B234',
    color: '#020202',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  subForm: {
    padding: '20px',
    backgroundColor: 'rgba(249, 178, 52, 0.05)',
    borderRadius: '12px',
    marginBottom: '16px',
    border: '1px solid rgba(249, 178, 52, 0.1)',
  },
  subFormButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
  },
  confirmButton: {
    padding: '10px 24px',
    backgroundColor: '#F9B234',
    color: '#020202',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  cancelButton: {
    padding: '10px 24px',
    backgroundColor: 'transparent',
    color: '#B5B5B5',
    border: '1px solid rgba(181, 181, 181, 0.3)',
    borderRadius: '50px',
    cursor: 'pointer',
  },
  itemList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: 'rgba(249, 178, 52, 0.05)',
    borderRadius: '12px',
    color: '#EDEDED',
  },
  itemDetail: {
    color: '#B5B5B5',
    fontSize: '14px',
  },
  removeButton: {
    padding: '6px 14px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '50px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  emptyText: {
    color: '#666666',
    fontStyle: 'italic',
  },
  tablePreview: {
    padding: '16px 20px',
    backgroundColor: 'rgba(249, 178, 52, 0.1)',
    borderRadius: '12px',
    border: '1px solid rgba(249, 178, 52, 0.2)',
  },
  tablePreviewText: {
    color: '#EDEDED',
    margin: '0 0 4px 0',
    fontSize: '15px',
  },
  tablePreviewSubtext: {
    color: '#F9B234',
    margin: 0,
    fontSize: '14px',
    fontWeight: '600',
  },
  paymentPreview: {
    padding: '16px 20px',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: '12px',
    border: '1px solid rgba(34, 197, 94, 0.2)',
  },
  paymentPreviewTitle: {
    color: '#22c55e',
    margin: '0 0 8px 0',
    fontSize: '13px',
    fontWeight: '600',
  },
  paymentPreviewItem: {
    color: '#EDEDED',
    margin: '4px 0',
    fontSize: '14px',
    fontFamily: 'monospace',
  },
  submitButton: {
    marginTop: '32px',
    width: '100%',
    padding: '18px',
    backgroundColor: '#F9B234',
    color: '#020202',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '700',
  },
}
