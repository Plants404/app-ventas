import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'puestoVentas.v1'
const LOW_STOCK_THRESHOLD = 3
const GEO_TIMEOUT = 15000
const GEO_MAX_AGE = 60000
const TOAST_DURATION_SHORT = 3500
const TOAST_DURATION_LONG = 7000
const LOCALE = 'es-UY'

function loadState() {
  let state
  try { state = JSON.parse(localStorage.getItem(STORAGE_KEY)) } catch {}
  state = state || { p: [], v: [], c: { url: '', clave: '' } }
  state.sq = state.sq || []
  state.aq = state.aq || []
  state.sf = state.sf || 0
  state.c = state.c || { url: '', clave: '' }
  state.c.url = state.c.url || ''
  state.c.clave = state.c.clave || ''
  return state
}

const money = n => '$ ' + Number(n).toLocaleString(LOCALE, { maximumFractionDigits: 2 })

const findP = (state, sku) => state.p.find(x => x.sku.toLowerCase() === String(sku).trim().toLowerCase())
const isToday = iso => new Date(iso).toDateString() === new Date().toDateString()

export default function App() {
  const [state, setState] = useState(loadState)
  const [, setRev] = useState(0)
  const bump = () => { setRev(r => r + 1); setState(s => ({ ...s })) }
  const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {} }

  const [tab, setTab] = useState('vender')
  const [qty, setQty] = useState(1)
  const [sku, setSku] = useState('')
  const [last, setLast] = useState(null)
  const [toast, setToast] = useState({ msg: '', canUndo: false, on: false })
  const toastTimer = useRef(null)
  const esperando = useRef(new Set())
  const syncing = useRef(false)
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)

  const [editing, setEditing] = useState(null)
  const dlgRef = useRef(null)
  const [form, setForm] = useState({ sku: '', nom: '', pre: '', sto: '' })
  const [formErr, setFormErr] = useState('')
  const fileInputRef = useRef(null)

  const [rango, setRango] = useState('hoy')
  const [cfgUrl, setCfgUrl] = useState(state.c.url)
  const [cfgClave, setCfgClave] = useState(state.c.clave)

  const showToast = (msg, canUndo) => {
    setToast({ msg, canUndo: !!canUndo, on: true })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, on: false })), canUndo ? TOAST_DURATION_LONG : TOAST_DURATION_SHORT)
  }

  const sheetOk = () => !!(state.c.url && state.c.clave)

  const gPost = (o) => fetch(state.c.url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ clave: state.c.clave }, o)) })

  const estadoSheetText = () => {
    const n = state.sq.length + state.aq.length
    let t = !sheetOk() ? 'Sin configurar. Las ventas se guardan solo en este celular.' : n ? n + ' movimientos pendientes de enviar a Google Sheets.' : 'Conectado. Cada venta se envía sola a tu planilla.'
    if (state.sf > 0) t += ' No se pudo sincronizar (' + state.sf + ' intento' + (state.sf === 1 ? '' : 's') + ' fallido' + (state.sf === 1 ? '' : 's') + '). Revisá la URL y la clave.'
    return t
  }

  const flushSheet = async () => {
    if (syncing.current || !sheetOk() || !navigator.onLine) { bump(); return }
    syncing.current = true
    try {
      for (const a of [...state.aq]) {
        await gPost({ tipo: 'anular', id: a.id, sku: a.sku, stock: (findP(state, a.sku) || {}).stock })
        state.aq = state.aq.filter(x => x !== a)
        save()
      }
      for (const id of [...state.sq]) {
        if (esperando.current.has(id)) continue
        const v = state.v.find(x => x.id === id)
        if (!v) { state.sq = state.sq.filter(x => x !== id); continue }
        const d = new Date(v.ts)
        await gPost({ tipo: 'venta', id: v.id, fecha: d.toLocaleDateString(LOCALE), hora: d.toLocaleTimeString(LOCALE), sku: v.sku, producto: v.nombre, cantidad: v.qty, precio: v.precio, total: v.total, lat: v.lat, lng: v.lng, stock: (findP(state, v.sku) || {}).stock })
        state.sq = state.sq.filter(x => x !== id)
        save()
      }
      state.sf = 0
      save()
    } catch {
      state.sf++
      save()
    }
    syncing.current = false
    bump()
  }

  const gLeer = async () => {
    const r = await fetch(state.c.url + (state.c.url.includes('?') ? '&' : '?') + 'clave=' + encodeURIComponent(state.c.clave))
    const d = await r.json()
    if (!d.ok) throw new Error(d.error)
    return d.productos
  }

  const net = () => {
    const on = navigator.onLine
    setOnline(on)
    if (on) flushSheet()
  }

  useEffect(() => {
    const onOnline = () => net()
    const onOffline = () => { setOnline(false) }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(() => {}, () => {})
    if (navigator.onLine) flushSheet()
    setTimeout(() => document.getElementById('sku')?.focus(), 0)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (tab === 'vender') setTimeout(() => document.getElementById('sku')?.focus(), 0)
  }, [tab])

  const foundP = findP(state, sku.trim())
  const okStock = foundP ? foundP.stock >= qty : false

  const previewNode = (() => {
    if (!sku.trim()) return <p className="hint">Escribí o escaneá el SKU para empezar.</p>
    const p = foundP
    if (!p) return <p className="err">No existe el SKU “{sku.trim()}”. Revisalo o agregalo en Stock.</p>
    return (
      <>
        <h2>{p.nombre}</h2>
        <p>{money(p.precio)} c/u · <b className={p.stock ? '' : 'err'}>{p.stock} en stock</b></p>
        {!okStock && <p className="err">{p.stock ? 'Solo quedan ' + p.stock + '.' : 'Sin stock.'}</p>}
      </>
    )
  })()

  const goDisabled = !foundP || !okStock
  const goText = foundP ? 'Registrar venta · ' + money(foundP.precio * qty) : 'Registrar venta'

  const todayList = state.v.filter(v => isToday(v.ts))
  const todayText = todayList.length ? 'Hoy: ' + todayList.reduce((a, v) => a + v.qty, 0) + ' unidades · ' + money(todayList.reduce((a, v) => a + v.total, 0)) : ''

  const handleSkuInput = (e) => {
    setQty(1)
    setSku(e.target.value)
  }
  const handleSkuKeyDown = (e) => {
    if (e.key === 'Enter' && !goDisabled) sell()
  }

  function sell() {
    const p = findP(state, sku)
    if (!p || p.stock < qty) return
    p.stock -= qty
    const v = { id: Date.now(), ts: new Date().toISOString(), sku: p.sku, nombre: p.nombre, qty, precio: p.precio, total: p.precio * qty, lat: null, lng: null }
    state.v.push(v)
    if (sheetOk()) { state.sq.push(v.id); esperando.current.add(v.id) }
    setLast(v)
    save()
    showToast(qty + ' × ' + p.nombre + ' · ' + (p.stock ? 'quedan ' + p.stock : 'se agotó'), true)
    setSku('')
    setQty(1)
    bump()
    setTimeout(() => document.getElementById('sku')?.focus(), 0)
    locate(v)
  }

  function locate(v) {
    const fin = () => { esperando.current.delete(v.id); flushSheet() }
    if (!navigator.geolocation) { fin(); return }
    navigator.geolocation.getCurrentPosition(pos => {
      v.lat = +pos.coords.latitude.toFixed(6)
      v.lng = +pos.coords.longitude.toFixed(6)
      v.acc = Math.round(pos.coords.accuracy)
      save()
      bump()
      fin()
    }, fin, { enableHighAccuracy: true, timeout: GEO_TIMEOUT, maximumAge: GEO_MAX_AGE })
  }

  function undo() {
    if (!last) return
    const v = last
    const p = findP(state, v.sku)
    if (p) p.stock += v.qty
    state.v = state.v.filter(x => x.id !== v.id)
    const pendiente = state.sq.includes(v.id)
    state.sq = state.sq.filter(x => x !== v.id)
    esperando.current.delete(v.id)
    if (sheetOk() && !pendiente) state.aq.push({ id: v.id, sku: v.sku })
    setLast(null)
    save()
    bump()
    showToast('Venta deshecha')
    flushSheet()
  }

  function openDlg(p) {
    setEditing(p || null)
    setForm({ sku: p ? p.sku : '', nom: p ? p.nombre : '', pre: p ? p.precio : '', sto: p ? p.stock : '' })
    setFormErr('')
    setTimeout(() => dlgRef.current?.showModal(), 0)
  }
  function closeDlg() { dlgRef.current?.close() }

  function handleDelete() {
    if (editing && confirm('¿Eliminar "' + editing.nombre + '"? Las ventas ya registradas se mantienen.')) {
      state.p = state.p.filter(x => x !== editing)
      save()
      closeDlg()
      bump()
    }
  }
  function handleFormSubmit(e) {
    e.preventDefault()
    const skuVal = form.sku.trim()
    const dup = findP(state, skuVal)
    if (dup && dup !== editing) { setFormErr('Ya existe un producto con ese SKU.'); return }
    const d = { sku: skuVal, nombre: form.nom.trim(), precio: +form.pre, stock: Math.max(0, Math.floor(+form.sto)) }
    if (editing) Object.assign(editing, d)
    else state.p.push(d)
    save()
    closeDlg()
    bump()
  }

  function exportar() {
    if (!window.XLSX) { showToast('No se pudo cargar el módulo de planillas. Revisá tu conexión'); return }
    const wb = window.XLSX.utils.book_new()
    const hojaProductos = [['SKU', 'Producto', 'Precio', 'Stock']].concat(state.p.map(p => [p.sku, p.nombre, p.precio, p.stock]))
    const hojaVentas = [['Fecha', 'Hora', 'SKU', 'Producto', 'Cantidad', 'Precio', 'Total', 'Latitud', 'Longitud']].concat(state.v.map(v => {
      const d = new Date(v.ts)
      return [d.toLocaleDateString(LOCALE), d.toLocaleTimeString(LOCALE), v.sku, v.nombre, v.qty, v.precio, v.total, v.lat ?? '', v.lng ?? '']
    }))
    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(hojaProductos), 'Productos')
    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(hojaVentas), 'Ventas')
    window.XLSX.writeFile(wb, 'puesto-' + new Date().toISOString().slice(0, 10) + '.xlsx')
  }
  function mezclar(filas) {
    let nuevos = 0, act = 0
    filas.forEach(o => {
      const skuVal = String(o.sku || '').trim()
      if (!skuVal || /^ejemplo/i.test(skuVal)) return
      const d = { nombre: String(o.nombre || '').trim() || skuVal, precio: Number(o.precio) || 0, stock: Math.max(0, Math.floor(Number(o.stock) || 0)) }
      const p = findP(state, skuVal)
      if (p) { Object.assign(p, d); act++ } else { state.p.push(Object.assign({ sku: skuVal }, d)); nuevos++ }
    })
    save()
    bump()
    return { nuevos, act }
  }
  function importar(file) {
    if (!file) return
    if (!window.XLSX) { showToast('No se pudo cargar el módulo de planillas. Revisá tu conexión'); return }
    if (!confirm('Los productos de la planilla van a agregarse o actualizar los que ya tenéstate (precio y stock). ¿Continuar?')) return
    const r = new FileReader()
    r.onload = () => {
      try {
        const wb = window.XLSX.read(r.result, { type: 'array' })
        const ws = wb.Sheets['Productos'] || wb.Sheets[wb.SheetNames[0]]
        const filas = window.XLSX.utils.sheet_to_json(ws, { defval: '' }).map(o => {
          const headerMap = {}
          Object.keys(o).forEach(h => { headerMap[h.trim().toLowerCase()] = o[h] })
          return { sku: headerMap['sku'], nombre: headerMap['producto'] || headerMap['nombre'], precio: headerMap['precio'], stock: headerMap['stock'] }
        })
        const { nuevos, act } = mezclar(filas)
        showToast(nuevos + ' productos nuevos, ' + act + ' actualizados')
      } catch { showToast('No se pudo leer la planilla') }
    }
    r.readAsArrayBuffer(file)
  }

  const handleCfgUrl = (e) => {
    const val = e.target.value.trim()
    setCfgUrl(val)
    state.c.url = val
    save()
    flushSheet()
  }
  const handleCfgClave = (e) => {
    const val = e.target.value.trim()
    setCfgClave(val)
    state.c.clave = val
    save()
    flushSheet()
  }
  const handleGTest = async () => {
    if (!sheetOk()) { showToast('Completá la URL y la clave primero'); return }
    try { await gLeer(); showToast('Conectado con tu planilla'); flushSheet() }
    catch (e) { showToast(e.message === 'clave' ? 'La clave no coincide con la del script' : 'No se pudo conectar. Revisá la URL') }
  }
  const handleGUp = async () => {
    if (!sheetOk()) { showToast('Completá la URL y la clave primero'); return }
    if (!confirm('Esto reemplaza la hoja Productos de Google Sheets con los productos de la app. ¿Continuar?')) return
    try { await gPost({ tipo: 'productos', productos: state.p }); showToast('Productos enviados. Revisá la hoja Productos') }
    catch { showToast('No se pudo enviar. Revisá tu conexión') }
  }
  const handleGDown = async () => {
    if (!sheetOk()) { showToast('Completá la URL y la clave primero'); return }
    if (!confirm('Los productos de Google Sheets van a agregarse o actualizar los de la app (precio y stock). ¿Continuar?')) return
    try { const { nuevos, act } = mezclar(await gLeer()); showToast(nuevos + ' productos nuevos, ' + act + ' actualizados') }
    catch (e) { showToast(e.message === 'clave' ? 'La clave no coincide con la del script' : 'No se pudo conectar. Revisá la URL') }
  }

  const sortedProducts = [...state.p].sort((a, b) => a.stock - b.stock || a.nombre.localeCompare(b.nombre))

  const hoyFilter = rango === 'hoy'
  const ventasList = state.v.filter(v => !hoyFilter || isToday(v.ts)).sort((a, b) => b.id - a.id)
  const sumU = ventasList.reduce((a, v) => a + v.qty, 0)
  const sumT = ventasList.reduce((a, v) => a + v.total, 0)

  const netClass = 'net' + (online ? '' : ' off')
  const netText = online ? 'En línea' : 'Sin conexión'

  return (
    <>
      <header>
        <h1>Mi puesto</h1>
        <div className={netClass} id="net"><i></i><span>{netText}</span></div>
      </header>

      <section id="t-vender" className={tab === 'vender' ? 'on' : ''}>
        <label htmlFor="sku">SKU del producto</label>
        <input id="sku" value={sku} onChange={handleSkuInput} onKeyDown={handleSkuKeyDown} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="Ej: MAC-001" />
        <div className="card" id="prev" aria-live="polite">{previewNode}</div>
        <div className="qty">
          <button id="minus" aria-label="Restar una unidad" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
          <span className="n" id="qty">{qty}</span>
          <button id="plus" aria-label="Sumar una unidad" onClick={() => setQty(q => q + 1)}>+</button>
        </div>
        <button className="go" id="go" disabled={goDisabled} onClick={sell}>{goText}</button>
        <p className="today" id="today">{todayText}</p>
      </section>

      <section id="t-stock" className={tab === 'stock' ? 'on' : ''}>
        <div className="bar"><h2>Stock</h2><button className="pri" id="add" onClick={() => openDlg()}>Agregar producto</button></div>
        <div className="bar"><button className="ghost" id="imp" style={{ flex: 1 }} onClick={() => fileInputRef.current?.click()}>Importar planilla</button><button className="ghost" id="exp" style={{ flex: 1 }} onClick={exportar}>Exportar planilla</button></div>
        <input type="file" id="imp-file" accept=".xlsx,.xls,.csv" hidden ref={fileInputRef} onChange={e => { importar(e.target.files[0]); e.target.value = '' }} />
        <div id="plist">
          {state.p.length === 0 ? (
            <div className="empty"><p>Todavía no cargaste productos.</p><button className="ghost" id="demo" onClick={() => { state.p = [{ sku: 'MAC-001', nombre: 'Maceta chica', precio: 250, stock: 12 }, { sku: 'SUC-010', nombre: 'Suculenta', precio: 180, stock: 2 }, { sku: 'HIE-020', nombre: 'Albahaca', precio: 120, stock: 1 }]; save(); bump() }}>Cargar 3 de ejemplo</button></div>
          ) : (
            sortedProducts.map(p => (
              <button key={p.sku} className="row" data-sku={p.sku} onClick={() => openDlg(p)}>
                <span><b>{p.nombre}</b><small>{p.sku} · {money(p.precio)}</small></span>
                <span className={'chip ' + (p.stock === 0 ? 'zero' : p.stock <= LOW_STOCK_THRESHOLD ? 'low' : '')}>{p.stock === 0 ? 'Agotado' : p.stock}</span>
              </button>
            ))
          )}
        </div>
      </section>

      <section id="t-ventas" className={tab === 'ventas' ? 'on' : ''}>
        <div className="bar"><h2>Ventas</h2>
          <select id="rango" style={{ width: 'auto' }} aria-label="Período" value={rango} onChange={e => setRango(e.target.value)}>
            <option value="hoy">Hoy</option>
            <option value="todas">Todas</option>
          </select>
        </div>
        <div className="sum"><div><b id="s-u">{sumU}</b><span>unidades</span></div><div><b id="s-t">{money(sumT)}</b><span>total</span></div></div>
        <div id="vlist">
          {ventasList.length ? ventasList.map(v => {
            const d = new Date(v.ts)
            const f = (hoyFilter ? '' : d.toLocaleDateString(LOCALE) + ' ') + d.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })
            const loc = v.lat != null ? <a href={'https://www.google.com/maps?q=' + v.lat + ',' + v.lng} target="_blank" rel="noopener">Ver ubicación</a> : <span>Sin ubicación</span>
            return (
              <div key={v.id} className="sale">
                <b>{v.qty} × {v.nombre}</b>
                <span className="t">{money(v.total)}</span>
                <small>{f} · {v.sku}</small>
                <small style={{ textAlign: 'right' }}>{loc}</small>
              </div>
            )
          }) : <div className="empty"><p>{hoyFilter ? 'Todavía no hay ventas hoy.' : 'Todavía no hay ventas.'}</p></div>}
        </div>
        <button className="ghost" id="csv" style={{ width: '100%', marginTop: '14px' }} onClick={exportar}>Exportar planilla (.xlsx)</button>
      </section>

      <section id="t-ajustes" className={tab === 'ajustes' ? 'on' : ''}>
        <div className="bar"><h2>Google Sheets</h2></div>
        <label htmlFor="c-url">URL de la aplicación web</label>
        <input id="c-url" type="url" inputMode="url" autoComplete="off" placeholder="https://script.google.com/macros/s/.../exec" value={cfgUrl} onChange={handleCfgUrl} />
        <label htmlFor="c-clave">Clave</label>
        <input id="c-clave" autoComplete="off" value={cfgClave} onChange={handleCfgClave} />
        <p className="hint" id="sq-state" style={{ marginTop: '12px' }}>{estadoSheetText()}</p>
        <button className="pri" id="g-test" style={{ width: '100%', marginTop: '12px' }} onClick={handleGTest}>Probar conexión</button>
        <div className="bar" style={{ marginTop: '8px' }}><button className="ghost" id="g-up" style={{ flex: 1 }} onClick={handleGUp}>Subir productos</button><button className="ghost" id="g-down" style={{ flex: 1 }} onClick={handleGDown}>Traer productos</button></div>
        <details>
          <summary>Cómo conectar tu planilla</summary>
          <ol>
            <li>Subí <code>planilla-puesto.xlsx</code> a Google Drive y abrila con Google Sheets.</li>
            <li>Abrí <b>Extensiones &gt; Apps Script</b>, pegá el contenido de <code>Code.gs</code> y cambiá la clave.</li>
            <li>Ejecutá la función <code>preparar</code> y aceptá los permisos.</li>
            <li><b>Implementar &gt; Nueva implementación &gt; Aplicación web</b>. Ejecutar como “Yo” y acceso “Cualquier persona”.</li>
            <li>Pegá acá la URL y la misma clave, y tocá “Probar conexión”.</li>
          </ol>
        </details>
      </section>

      <nav role="tablist" aria-label="Secciones">
        <button role="tab" data-t="vender" aria-selected={tab === 'vender'} onClick={() => setTab('vender')}>Vender</button>
        <button role="tab" data-t="stock" aria-selected={tab === 'stock'} onClick={() => setTab('stock')}>Stock</button>
        <button role="tab" data-t="ventas" aria-selected={tab === 'ventas'} onClick={() => setTab('ventas')}>Ventas</button>
        <button role="tab" data-t="ajustes" aria-selected={tab === 'ajustes'} onClick={() => setTab('ajustes')}>Ajustes</button>
      </nav>

      <div id="toast" role="status" className={toast.on ? 'on' : ''}>
        <span id="toast-msg">{toast.msg}</span>
        <button id="toast-act" hidden={!toast.canUndo} onClick={undo}>Deshacer</button>
      </div>

      <dialog id="dlg" ref={dlgRef}>
        <form method="dialog" id="pform" onSubmit={handleFormSubmit}>
          <h2 id="dlg-title">{editing ? 'Editar producto' : 'Nuevo producto'}</h2>
          <label htmlFor="f-sku">SKU</label><input id="f-sku" required autoCapitalize="characters" autoComplete="off" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
          <label htmlFor="f-nom">Nombre</label><input id="f-nom" required autoComplete="off" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
          <label htmlFor="f-pre">Precio</label><input id="f-pre" type="number" inputMode="decimal" min="0" step="any" required value={form.pre} onChange={e => setForm(f => ({ ...f, pre: e.target.value }))} />
          <label htmlFor="f-sto">Stock</label><input id="f-sto" type="number" inputMode="numeric" min="0" step="1" required value={form.sto} onChange={e => setForm(f => ({ ...f, sto: e.target.value }))} />
          <p className="err" id="f-err" style={{ marginTop: '10px' }}>{formErr}</p>
          <div className="acts">
            <button type="button" className="ghost" id="f-cancel" onClick={closeDlg}>Cancelar</button>
            <button type="button" className="ghost danger" id="f-del" style={{ display: editing ? '' : 'none' }} onClick={handleDelete}>Eliminar</button>
            <button type="submit" className="pri">Guardar</button>
          </div>
        </form>
      </dialog>
    </>
  )
}
