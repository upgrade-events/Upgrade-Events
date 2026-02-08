import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getEventById, updateEvent } from '../../services/events'
import { getBusesByEvent, createBus, deleteBus } from '../../services/buses'
import { getTablesByEvent, createTable, deleteTable } from '../../services/tables'
import { getCurrentUser, logout } from '../../services/auth'
import { getUserRole } from '../../services/users'
import { getEventImages, uploadEventImage, deleteEventImage, deleteAllEventImages } from '../../services/storage'

interface BusForm {
  id?: number
  bus_type: 'ida' | 'volta'
  location: string
  time: string
  capacity: number
}

interface ImageItem {
  url: string
  isNew: boolean
  file?: File
}

const MAX_IMAGES = 10

export const EditEvent = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [dateHour, setDateHour] = useState('')
  const [description, setDescription] = useState('')
  const [priceBus, setPriceBus] = useState('')
  const [priceNoBus, setPriceNoBus] = useState('')
  const [ticketsNumber, setTicketsNumber] = useState('')
  const [originalTicketsNumber, setOriginalTicketsNumber] = useState(0)
  const [originalAvailableTickets, setOriginalAvailableTickets] = useState(0)
  
  const [images, setImages] = useState<ImageItem[]>([])
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [uploadingImages, setUploadingImages] = useState(false)

  const [buses, setBuses] = useState<BusForm[]>([])
  const [busesToDelete, setBusesToDelete] = useState<number[]>([])
  const [showBusForm, setShowBusForm] = useState(false)
  const [newBus, setNewBus] = useState({ bus_type: 'ida' as 'ida' | 'volta', location: '', time: '', capacity: '' })

  const [existingTables, setExistingTables] = useState<{id: number, name: string, capacity: number}[]>([])
  const [tablesToDelete, setTablesToDelete] = useState<number[]>([])
  const [newTableCount, setNewTableCount] = useState('')
  const [newTableCapacity, setNewTableCapacity] = useState('')

  const getMinDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  }

  useEffect(() => {
    const loadEvent = async () => {
      const user = await getCurrentUser()
      if (!user) { navigate('/login'); return }

      const userRole = await getUserRole(user.id)
      const event = await getEventById(Number(id))
      if (!event) { navigate('/my-events'); return }
      if (event.owner_id !== user.id && userRole !== 'admin') { navigate('/my-events'); return }

      setName(event.name || '')
      setLocation(event.location || '')
      setDateHour(event.date_hour ? event.date_hour.slice(0, 16) : '')
      setDescription(event.description || '')
      setPriceBus(event.price_bus?.toString() || '')
      setPriceNoBus(event.price_no_bus?.toString() || '')
      setTicketsNumber(event.tickets_number?.toString() || '')
      setOriginalTicketsNumber(event.tickets_number || 0)
      setOriginalAvailableTickets(event.available_tickets || 0)

      const eventImages = await getEventImages(Number(id))
      setImages(eventImages.map(url => ({ url, isNew: false })))

      const eventBuses = await getBusesByEvent(Number(id))
      setBuses(eventBuses.map((b: any) => ({ id: b.id, bus_type: b.bus_type, location: b.location, time: b.time ? b.time.slice(0, 16) : '', capacity: b.capacity })))

      const eventTables = await getTablesByEvent(Number(id))
      setExistingTables(eventTables.map((t: any) => ({ id: t.id, name: t.name, capacity: t.capacity })))

      setLoading(false)
    }
    loadEvent()
  }, [id, navigate])

  const handleLogout = async () => { await logout(); navigate('/') }
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault() }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const maxSize = 5 * 1024 * 1024
    const remainingSlots = MAX_IMAGES - images.length

    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      const file = files[i]
      if (!allowedTypes.includes(file.type)) { alert(`"${file.name}" ignorado. Apenas JPG, PNG ou WEBP.`); continue }
      if (file.size > maxSize) { alert(`"${file.name}" ignorado. Máximo 5MB.`); continue }
      const reader = new FileReader()
      reader.onloadend = () => { setImages(prev => [...prev, { url: reader.result as string, isNew: true, file }]) }
      reader.readAsDataURL(file)
    }
    if (files.length > remainingSlots) alert(`Limite de ${MAX_IMAGES} imagens.`)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemoveImage = (index: number) => {
    const image = images[index]
    if (!image.isNew) setImagesToDelete(prev => [...prev, image.url])
    setImages(images.filter((_, i) => i !== index))
  }

  const handleDragStart = (index: number) => { setDraggedIndex(index) }
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
  const handleDragEnd = () => { setDraggedIndex(null) }

  const handleAddBus = () => {
    if (!newBus.location || !newBus.time) { alert('Preenche localização e hora'); return }
    setBuses([...buses, { bus_type: newBus.bus_type, location: newBus.location, time: newBus.time, capacity: Number(newBus.capacity) || 50 }])
    setNewBus({ bus_type: 'ida', location: '', time: '', capacity: '' })
    setShowBusForm(false)
  }

  const handleRemoveBus = (index: number) => {
    const bus = buses[index]
    if (bus.id) setBusesToDelete([...busesToDelete, bus.id])
    setBuses(buses.filter((_, i) => i !== index))
  }

  const handleRemoveExistingTable = (tableId: number) => {
    setTablesToDelete([...tablesToDelete, tableId])
    setExistingTables(existingTables.filter(t => t.id !== tableId))
  }

  const ticketsSold = originalTicketsNumber - originalAvailableTickets
  const newAvailableTickets = Math.max(0, Number(ticketsNumber) - ticketsSold)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    if (new Date(dateHour) <= new Date()) { setError('A data deve ser no futuro.'); setSaving(false); return }

    // Validar preços
    if (!priceNoBus || Number(priceNoBus) <= 0) {
      setError('O preço sem autocarro deve ser maior que 0.')
      setSaving(false)
      return
    }

    if (priceBus && Number(priceBus) < 0) {
      setError('O preço com autocarro não pode ser negativo.')
      setSaving(false)
      return
    }

    // Validar mesas - deve ter pelo menos uma mesa após as alterações
    const totalTablesAfterSave = existingTables.length + (Number(newTableCount) || 0)
    if (totalTablesAfterSave <= 0) {
      setError('O evento deve ter pelo menos uma mesa.')
      setSaving(false)
      return
    }

    // Validar bilhetes
    if (!ticketsNumber || Number(ticketsNumber) <= 0) {
      setError('O número de bilhetes deve ser maior que 0.')
      setSaving(false)
      return
    }

    try {
      // Eliminar imagens marcadas
      for (const imageUrl of imagesToDelete) {
        try { await deleteEventImage(imageUrl) } catch (err) { console.log('Erro ao apagar imagem:', err) }
      }

      // Apagar todas e re-upload na nova ordem
      await deleteAllEventImages(Number(id))
      
      setUploadingImages(true)
      const newImageUrls: string[] = []
      
      for (let i = 0; i < images.length; i++) {
        const img = images[i]
        if (img.isNew && img.file) {
          const url = await uploadEventImage(img.file, Number(id), i)
          newImageUrls.push(url)
        } else if (!img.isNew) {
          const response = await fetch(img.url)
          const blob = await response.blob()
          const file = new File([blob], `image_${i}.jpg`, { type: blob.type })
          const url = await uploadEventImage(file, Number(id), i)
          newImageUrls.push(url)
        }
      }
      setUploadingImages(false)

      await updateEvent(Number(id), {
        name, location, date_hour: dateHour, description,
        price_bus: Number(priceBus) || 0,
        price_no_bus: Number(priceNoBus) || 0,
        tickets_number: Number(ticketsNumber) || 0,
        available_tickets: newAvailableTickets,
        image_url: newImageUrls.length > 0 ? newImageUrls[0] : null,
        status: 'pending'
      })

      for (const busId of busesToDelete) { await deleteBus(busId) }
      for (const tableId of tablesToDelete) { await deleteTable(tableId) }
      for (const bus of buses) { if (!bus.id) await createBus({ events_id: Number(id), bus_type: bus.bus_type, location: bus.location, time: bus.time, capacity: bus.capacity }) }

      const numNewTables = Number(newTableCount) || 0
      const capacity = Number(newTableCapacity) || 6
      const startIndex = existingTables.length + 1
      for (let i = 0; i < numNewTables; i++) { await createTable({ events_id: Number(id), name: `Mesa ${startIndex + i}`, capacity }) }

      navigate('/my-events')
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  if (loading) return <div style={styles.pageContainer}><div style={styles.loadingContainer}><div style={styles.spinner}></div></div></div>

  return (
    <div style={styles.container}>
      <nav style={styles.navbar}>
        <div style={styles.navContent}>
          <Link to="/home" style={{ textDecoration: 'none' }}><img src="/logo.png" alt="Upgrade Events" style={styles.logoImage} /></Link>
          <button onClick={handleLogout} style={styles.navLogoutBtn}>Terminar Sessão</button>
        </div>
      </nav>

      <div style={styles.pageContent}>
        <Link to="/my-events" style={styles.backLink}>← Os Meus Eventos</Link>
        
        <div style={styles.formContainer}>
          <h1 style={styles.pageTitle}><span style={styles.customLetter}>{'\ue802'}</span>ditar Evento</h1>
          {error && <p style={styles.error}>{error}</p>}

          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Dados do Evento</h2>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Nome *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={styles.input} required />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Localização *</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} style={styles.input} required />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Data e Hora *</label>
                <input type="datetime-local" value={dateHour} onChange={(e) => setDateHour(e.target.value)} min={getMinDateTime()} style={styles.input} required />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Imagens ({images.length}/{MAX_IMAGES})</label>
                <p style={styles.imageHint}>A primeira imagem será a capa. Arrasta para reordenar.</p>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} multiple />
                
                <div style={styles.imagesGrid}>
                  {images.map((img, index) => (
                    <div key={index} style={{...styles.imageItem, ...(index === 0 ? styles.coverImage : {}), opacity: draggedIndex === index ? 0.5 : 1}}
                      draggable onDragStart={() => handleDragStart(index)} onDragOver={(e) => handleDragOver(e, index)} onDragEnd={handleDragEnd}>
                      <img src={img.url} alt={`Imagem ${index + 1}`} style={styles.imageThumb} />
                      {index === 0 && <span style={styles.coverBadge}>Capa</span>}
                      {img.isNew && <span style={styles.newBadge}>Nova</span>}
                      <button type="button" onClick={() => handleRemoveImage(index)} style={styles.removeImageBtn}>✕</button>
                      <span style={styles.dragHandle}>⋮⋮</span>
                    </div>
                  ))}
                  {images.length < MAX_IMAGES && (
                    <div style={styles.addImageBox} onClick={() => fileInputRef.current?.click()}>
                      <span style={styles.addImageIcon}>+</span>
                      <span style={styles.addImageText}>Adicionar</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Descrição</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={styles.textarea} rows={3} />
              </div>

              <div style={styles.row}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Preço c/ Autocarro (€)</label>
                  <input type="number" value={priceBus} onChange={(e) => setPriceBus(e.target.value)} style={styles.input} min={0} step={0.01} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Preço s/ Autocarro (€) *</label>
                  <input type="number" value={priceNoBus} onChange={(e) => setPriceNoBus(e.target.value)} style={styles.input} min={0.01} step={0.01} required />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Total de Bilhetes *</label>
                <input type="number" value={ticketsNumber} onChange={(e) => setTicketsNumber(e.target.value)} style={styles.input} min={Math.max(1, ticketsSold)} required />
                <div style={styles.ticketInfo}><strong>{ticketsSold}</strong> vendidos • <strong>{newAvailableTickets}</strong> disponíveis após guardar</div>
              </div>
            </section>

            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Autocarros</h2>
                <button type="button" onClick={() => setShowBusForm(true)} style={styles.addButton}>+ Adicionar</button>
              </div>

              {showBusForm && (
                <div style={styles.subForm}>
                  <div style={styles.row}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Tipo</label>
                      <select value={newBus.bus_type} onChange={(e) => setNewBus({...newBus, bus_type: e.target.value as 'ida'|'volta'})} style={styles.input}>
                        <option value="ida">Ida</option><option value="volta">Volta</option>
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Capacidade</label>
                      <input type="number" value={newBus.capacity} onChange={(e) => setNewBus({...newBus, capacity: e.target.value})} style={styles.input} placeholder="50" />
                    </div>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Local</label>
                    <input type="text" value={newBus.location} onChange={(e) => setNewBus({...newBus, location: e.target.value})} style={styles.input} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Hora</label>
                    <input type="datetime-local" value={newBus.time} onChange={(e) => setNewBus({...newBus, time: e.target.value})} style={styles.input} />
                  </div>
                  <div style={styles.subFormButtons}>
                    <button type="button" onClick={handleAddBus} style={styles.confirmButton}>Adicionar</button>
                    <button type="button" onClick={() => setShowBusForm(false)} style={styles.cancelButton}>Cancelar</button>
                  </div>
                </div>
              )}

              {buses.length > 0 ? (
                <div style={styles.itemList}>
                  {buses.map((bus, i) => (
                    <div key={i} style={styles.item}>
                      <div><strong>{bus.bus_type === 'ida' ? '🚌 Ida' : '🚌 Volta'}</strong> - {bus.location} às {new Date(bus.time).toLocaleString('pt-PT')} ({bus.capacity} lug.)</div>
                      <button type="button" onClick={() => handleRemoveBus(i)} style={styles.removeButton}>Remover</button>
                    </div>
                  ))}
                </div>
              ) : <p style={styles.emptyText}>Nenhum autocarro.</p>}
            </section>

            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Mesas</h2>
              
              {existingTables.length > 0 && (
                <div style={{marginBottom: '20px'}}>
                  <h3 style={styles.subTitle}>Existentes</h3>
                  <div style={styles.itemList}>
                    {existingTables.map(t => (
                      <div key={t.id} style={styles.item}>
                        <span>{t.name} ({t.capacity} lug.)</span>
                        <button type="button" onClick={() => handleRemoveExistingTable(t.id)} style={styles.removeButton}>Remover</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h3 style={styles.subTitle}>Adicionar Novas</h3>
              <div style={styles.row}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Quantidade</label>
                  <input type="number" value={newTableCount} onChange={(e) => setNewTableCount(e.target.value)} style={styles.input} min={0} placeholder="0" />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Lugares/Mesa</label>
                  <input type="number" value={newTableCapacity} onChange={(e) => setNewTableCapacity(e.target.value)} style={styles.input} min={1} placeholder="6" />
                </div>
              </div>
              {Number(newTableCount) > 0 && <p style={styles.previewText}>+{newTableCount} mesas de {newTableCapacity || 6} lugares</p>}
            </section>

            <button type="submit" style={styles.submitButton} disabled={saving}>
              {saving ? (uploadingImages ? 'A carregar imagens...' : 'A guardar...') : 'Guardar Alterações'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { minHeight: '100vh', backgroundColor: '#020202', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  pageContainer: { minHeight: '100vh', backgroundColor: '#020202' },
  navbar: { padding: '20px 0', position: 'fixed', top: 0, left: 0, right: 0, backgroundColor: 'rgba(2,2,2,0.9)', backdropFilter: 'blur(20px)', zIndex: 1000, borderBottom: '1px solid rgba(249,178,52,0.1)' },
  navContent: { maxWidth: '1200px', margin: '0 auto', padding: '0 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logoImage: { height: '56px', width: 'auto' },
  navLogoutBtn: { backgroundColor: 'transparent', color: '#B5B5B5', border: '1px solid rgba(181,181,181,0.2)', padding: '10px 24px', borderRadius: '50px', fontSize: '14px', cursor: 'pointer' },
  pageContent: { paddingTop: '120px', paddingBottom: '60px', maxWidth: '900px', margin: '0 auto', padding: '120px 48px 60px' },
  backLink: { color: '#B5B5B5', textDecoration: 'none', fontSize: '14px', display: 'inline-block', marginBottom: '24px' },
  formContainer: { backgroundColor: '#121212', borderRadius: '24px', padding: '40px', border: '1px solid rgba(249,178,52,0.1)' },
  pageTitle: { fontSize: '32px', fontWeight: '700', color: '#FFFFFF', marginBottom: '32px' },
  customLetter: { fontFamily: 'fontello', color: '#F9B234', fontSize: '0.85em', display: 'inline-block', transform: 'translateY(-4px)' },
  error: { color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' },
  section: { marginTop: '32px', padding: '24px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(249,178,52,0.1)', borderRadius: '16px' },
  sectionTitle: { fontSize: '20px', fontWeight: '600', color: '#F9B234', margin: '0 0 20px 0' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  subTitle: { fontSize: '14px', fontWeight: '600', color: '#B5B5B5', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '1px' },
  formGroup: { marginBottom: '20px', flex: 1 },
  label: { display: 'block', color: '#EDEDED', fontSize: '14px', fontWeight: '500', marginBottom: '8px' },
  imageHint: { color: '#B5B5B5', fontSize: '13px', margin: '0 0 16px 0' },
  row: { display: 'flex', gap: '16px' },
  input: { width: '100%', padding: '14px 18px', borderRadius: '12px', border: '1px solid rgba(249,178,52,0.2)', fontSize: '15px', backgroundColor: 'rgba(2,2,2,0.5)', color: '#FFFFFF', boxSizing: 'border-box', outline: 'none' },
  textarea: { width: '100%', padding: '14px 18px', borderRadius: '12px', border: '1px solid rgba(249,178,52,0.2)', fontSize: '15px', backgroundColor: 'rgba(2,2,2,0.5)', color: '#FFFFFF', boxSizing: 'border-box', resize: 'vertical', outline: 'none', fontFamily: 'inherit' },
  ticketInfo: { marginTop: '8px', padding: '12px 16px', backgroundColor: 'rgba(249,178,52,0.1)', borderRadius: '8px', fontSize: '13px', color: '#EDEDED' },
  imagesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' },
  imageItem: { position: 'relative', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', cursor: 'grab', border: '2px solid transparent' },
  coverImage: { border: '2px solid #F9B234' },
  imageThumb: { width: '100%', height: '100%', objectFit: 'cover' },
  coverBadge: { position: 'absolute', top: '6px', left: '6px', padding: '3px 8px', backgroundColor: '#F9B234', color: '#020202', fontSize: '10px', fontWeight: '700', borderRadius: '50px' },
  newBadge: { position: 'absolute', top: '6px', left: '6px', padding: '3px 8px', backgroundColor: '#22c55e', color: '#FFFFFF', fontSize: '10px', fontWeight: '700', borderRadius: '50px' },
  removeImageBtn: { position: 'absolute', top: '6px', right: '6px', width: '22px', height: '22px', backgroundColor: 'rgba(239,68,68,0.9)', color: '#FFF', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  dragHandle: { position: 'absolute', bottom: '6px', right: '6px', color: 'rgba(255,255,255,0.7)', fontSize: '12px', textShadow: '0 1px 2px rgba(0,0,0,0.5)' },
  addImageBox: { aspectRatio: '1', borderRadius: '12px', border: '2px dashed rgba(249,178,52,0.3)', backgroundColor: 'rgba(249,178,52,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  addImageIcon: { fontSize: '28px', color: '#F9B234', lineHeight: 1 },
  addImageText: { fontSize: '11px', color: '#B5B5B5', marginTop: '4px' },
  addButton: { padding: '10px 20px', backgroundColor: '#F9B234', color: '#020202', border: 'none', borderRadius: '50px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  subForm: { padding: '20px', backgroundColor: 'rgba(249,178,52,0.05)', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(249,178,52,0.1)' },
  subFormButtons: { display: 'flex', gap: '12px', marginTop: '16px' },
  confirmButton: { padding: '10px 24px', backgroundColor: '#F9B234', color: '#020202', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: '600' },
  cancelButton: { padding: '10px 24px', backgroundColor: 'transparent', color: '#B5B5B5', border: '1px solid rgba(181,181,181,0.3)', borderRadius: '50px', cursor: 'pointer' },
  itemList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  item: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', backgroundColor: 'rgba(249,178,52,0.05)', borderRadius: '12px', color: '#EDEDED', fontSize: '14px' },
  removeButton: { padding: '6px 14px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '50px', cursor: 'pointer', fontSize: '12px' },
  emptyText: { color: '#666666', fontStyle: 'italic' },
  previewText: { color: '#F9B234', fontSize: '14px', fontWeight: '600', marginTop: '8px' },
  submitButton: { marginTop: '32px', width: '100%', padding: '18px', backgroundColor: '#F9B234', color: '#020202', border: 'none', borderRadius: '50px', cursor: 'pointer', fontSize: '16px', fontWeight: '700' },
  loadingContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' },
  spinner: { width: '40px', height: '40px', border: '3px solid rgba(249,178,52,0.2)', borderTop: '3px solid #F9B234', borderRadius: '50%', animation: 'spin 1s linear infinite' },
}
