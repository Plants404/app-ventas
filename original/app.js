const $=sel=>document.querySelector(sel);
const STORAGE_KEY='puestoVentas.v1';
const LOW_STOCK_THRESHOLD=3;
const GEO_TIMEOUT=15000;
const GEO_MAX_AGE=60000;
const TOAST_DURATION_SHORT=3500;
const TOAST_DURATION_LONG=7000;
const LOCALE='es-UY';
let state;
try{state=JSON.parse(localStorage.getItem(STORAGE_KEY))}catch(e){}
state=state||{p:[],v:[],c:{url:'',clave:''}};
state.sq=state.sq||[];state.aq=state.aq||[];state.sf=state.sf||0;state.c.url=state.c.url||'';state.c.clave=state.c.clave||'';
const save=()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(e){}};
const money=n=>'$ '+Number(n).toLocaleString(LOCALE,{maximumFractionDigits:2});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const find=sku=>state.p.find(x=>x.sku.toLowerCase()===String(sku).trim().toLowerCase());
const isToday=iso=>new Date(iso).toDateString()===new Date().toDateString();
let qty=1,last=null,toastTimeout;
const esperando=new Set();

/* ---------- Navegación ---------- */
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('nav button').forEach(x=>x.setAttribute('aria-selected',x===b));
  document.querySelectorAll('section').forEach(s=>s.classList.toggle('on',s.id==='t-'+b.dataset.t));
  if(b.dataset.t==='vender')$('#sku').focus();
});

/* ---------- Vender ---------- */
function preview(){
  const raw=$('#sku').value,box=$('#prev'),btn=$('#go');
  $('#qty').textContent=qty;
  if(!raw.trim()){box.innerHTML='<p class="hint">Escribí o escaneá el SKU para empezar.</p>';btn.disabled=true;btn.textContent='Registrar venta';return}
  const p=find(raw);
  if(!p){box.innerHTML='<p class="err">No existe el SKU “'+esc(raw.trim())+'”. Revisalo o agregalo en Stock.</p>';btn.disabled=true;btn.textContent='Registrar venta';return}
  const ok=p.stock>=qty;
  box.innerHTML='<h2>'+esc(p.nombre)+'</h2><p>'+money(p.precio)+' c/u · <b class="'+(p.stock?'':'err')+'">'+p.stock+' en stock</b></p>'+(ok?'':'<p class="err">'+(p.stock?'Solo quedan '+p.stock+'.':'Sin stock.')+'</p>');
  btn.disabled=!ok;
  btn.textContent='Registrar venta · '+money(p.precio*qty);
}
function sell(){
  const p=find($('#sku').value);
  if(!p||p.stock<qty)return;
  p.stock-=qty;
  const v={id:Date.now(),ts:new Date().toISOString(),sku:p.sku,nombre:p.nombre,qty,precio:p.precio,total:p.precio*qty,lat:null,lng:null};
  state.v.push(v);
  if(sheetOk()){state.sq.push(v.id);esperando.add(v.id)}
  last={v};
  save();
  toast(qty+' × '+p.nombre+' · '+(p.stock?'quedan '+p.stock:'se agotó'),true);
  $('#sku').value='';qty=1;
  renderAll();$('#sku').focus();
  locate(v);
}
function locate(v){
  const fin=()=>{esperando.delete(v.id);flushSheet()};
  if(!navigator.geolocation){fin();return}
  navigator.geolocation.getCurrentPosition(pos=>{
    v.lat=+pos.coords.latitude.toFixed(6);v.lng=+pos.coords.longitude.toFixed(6);v.acc=Math.round(pos.coords.accuracy);
    save();renderVentas();fin();
  },fin,{enableHighAccuracy:true,timeout:GEO_TIMEOUT,maximumAge:GEO_MAX_AGE});
}
function undo(){
  if(!last)return;
  const {v}=last,p=find(v.sku);
  if(p)p.stock+=v.qty;
  state.v=state.v.filter(x=>x.id!==v.id);
  const pendiente=state.sq.includes(v.id);
  state.sq=state.sq.filter(x=>x!==v.id);esperando.delete(v.id);
  if(sheetOk()&&!pendiente)state.aq.push({id:v.id,sku:v.sku});
  last=null;save();renderAll();toast('Venta deshecha');flushSheet();
}
function toast(msg,canUndo){
  $('#toast-msg').textContent=msg;
  $('#toast-act').hidden=!canUndo;
  $('#toast').classList.add('on');
  clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('#toast').classList.remove('on'),canUndo?TOAST_DURATION_LONG:TOAST_DURATION_SHORT);
}
$('#toast-act').onclick=()=>{undo();};
$('#sku').addEventListener('input',()=>{qty=1;preview()});
$('#sku').addEventListener('keydown',e=>{if(e.key==='Enter'&&!$('#go').disabled)sell()});
$('#go').onclick=sell;
$('#minus').onclick=()=>{qty=Math.max(1,qty-1);preview()};
$('#plus').onclick=()=>{qty++;preview()};

/* ---------- Stock ---------- */
function renderStock(){
  const l=$('#plist');
  if(!state.p.length){l.innerHTML='<div class="empty"><p>Todavía no cargaste productos.</p><button class="ghost" id="demo">Cargar 3 de ejemplo</button></div>';
    $('#demo').onclick=()=>{state.p=[{sku:'MAC-001',nombre:'Maceta chica',precio:250,stock:12},{sku:'SUC-010',nombre:'Suculenta',precio:180,stock:2},{sku:'HIE-020',nombre:'Albahaca',precio:120,stock:1}];save();renderAll()};return}
  l.innerHTML=[...state.p].sort((a,b)=>a.stock-b.stock||a.nombre.localeCompare(b.nombre)).map(p=>
    '<button class="row" data-sku="'+esc(p.sku)+'"><span><b>'+esc(p.nombre)+'</b><small>'+esc(p.sku)+' · '+money(p.precio)+'</small></span><span class="chip '+(p.stock===0?'zero':p.stock<=LOW_STOCK_THRESHOLD?'low':'')+'">'+(p.stock===0?'Agotado':p.stock)+'</span></button>').join('');
}
$('#plist').onclick=e=>{const r=e.target.closest('.row');if(r)openDlg(find(r.dataset.sku))};
let editing=null;
function openDlg(p){
  editing=p||null;
  $('#dlg-title').textContent=p?'Editar producto':'Nuevo producto';
  $('#f-sku').value=p?p.sku:'';$('#f-nom').value=p?p.nombre:'';$('#f-pre').value=p?p.precio:'';$('#f-sto').value=p?p.stock:'';
  $('#f-err').textContent='';$('#f-del').style.display=p?'':'none';
  $('#dlg').showModal();
}
$('#add').onclick=()=>openDlg();
$('#f-cancel').onclick=()=>$('#dlg').close();
$('#f-del').onclick=()=>{if(editing&&confirm('¿Eliminar "'+editing.nombre+'"? Las ventas ya registradas se mantienen.')){state.p=state.p.filter(x=>x!==editing);save();$('#dlg').close();renderAll()}};
$('#pform').onsubmit=e=>{
  e.preventDefault();
  const sku=$('#f-sku').value.trim(),dup=find(sku);
  if(dup&&dup!==editing){$('#f-err').textContent='Ya existe un producto con ese SKU.';return}
  const d={sku,nombre:$('#f-nom').value.trim(),precio:+$('#f-pre').value,stock:Math.max(0,Math.floor(+$('#f-sto').value))};
  if(editing)Object.assign(editing,d);else state.p.push(d);
  save();$('#dlg').close();renderAll();
};

/* ---------- Ventas ---------- */
function renderVentas(){
  const hoy=$('#rango').value==='hoy';
  const vs=state.v.filter(v=>!hoy||isToday(v.ts)).sort((a,b)=>b.id-a.id);
  $('#s-u').textContent=vs.reduce((acc,v)=>acc+v.qty,0);
  $('#s-t').textContent=money(vs.reduce((acc,v)=>acc+v.total,0));
  $('#vlist').innerHTML=vs.length?vs.map(v=>{
    const d=new Date(v.ts),f=(hoy?'':d.toLocaleDateString(LOCALE)+' ')+d.toLocaleTimeString(LOCALE,{hour:'2-digit',minute:'2-digit'});
    const loc=v.lat!=null?'<a href="https://www.google.com/maps?q='+v.lat+','+v.lng+'" target="_blank" rel="noopener">Ver ubicación</a>':'<span>Sin ubicación</span>';
    return '<div class="sale"><b>'+v.qty+' × '+esc(v.nombre)+'</b><span class="t">'+money(v.total)+'</span><small>'+f+' · '+esc(v.sku)+'</small><small style="text-align:right">'+loc+'</small></div>';
  }).join(''):'<div class="empty"><p>'+(hoy?'Todavía no hay ventas hoy.':'Todavía no hay ventas.')+'</p></div>';
  const t=state.v.filter(v=>isToday(v.ts));
  $('#today').textContent=t.length?'Hoy: '+t.reduce((acc,v)=>acc+v.qty,0)+' unidades · '+money(t.reduce((acc,v)=>acc+v.total,0)):'';
}
$('#rango').onchange=renderVentas;
/* ---------- Planillas (.xlsx) ---------- */
const hojaProductos=()=>[['SKU','Producto','Precio','Stock']].concat(state.p.map(p=>[p.sku,p.nombre,p.precio,p.stock]));
const hojaVentas=()=>[['Fecha','Hora','SKU','Producto','Cantidad','Precio','Total','Latitud','Longitud']].concat(state.v.map(v=>{const d=new Date(v.ts);return [d.toLocaleDateString(LOCALE),d.toLocaleTimeString(LOCALE),v.sku,v.nombre,v.qty,v.precio,v.total,v.lat??'',v.lng??'']}));
function exportar(){
  if(!window.XLSX){toast('No se pudo cargar el módulo de planillas. Revisá tu conexión');return}
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(hojaProductos()),'Productos');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(hojaVentas()),'Ventas');
  XLSX.writeFile(wb,'puesto-'+new Date().toISOString().slice(0,10)+'.xlsx');
}
function mezclar(filas){
  let nuevos=0,act=0;
  filas.forEach(o=>{
    const sku=String(o.sku||'').trim();
    if(!sku||/^ejemplo/i.test(sku))return;
    const d={nombre:String(o.nombre||'').trim()||sku,precio:Number(o.precio)||0,stock:Math.max(0,Math.floor(Number(o.stock)||0))};
    const p=find(sku);
    if(p){Object.assign(p,d);act++}else{state.p.push(Object.assign({sku},d));nuevos++}
  });
  save();renderAll();
  return {nuevos,act};
}
function importar(file){
  if(!file)return;
  if(!window.XLSX){toast('No se pudo cargar el módulo de planillas. Revisá tu conexión');return}
  if(!confirm('Los productos de la planilla van a agregarse o actualizar los que ya tenéstate (precio y stock). ¿Continuar?'))return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const wb=XLSX.read(r.result,{type:'array'});
      const ws=wb.Sheets['Productos']||wb.Sheets[wb.SheetNames[0]];
      const filas=XLSX.utils.sheet_to_json(ws,{defval:''}).map(o=>{
        const headerMap={};Object.keys(o).forEach(h=>headerMap[h.trim().toLowerCase()]=o[h]);
        return {sku:headerMap['sku'],nombre:headerMap['producto']||headerMap['nombre'],precio:headerMap['precio'],stock:headerMap['stock']};
      });
      const {nuevos,act}=mezclar(filas);
      toast(nuevos+' productos nuevos, '+act+' actualizados');
    }catch(e){toast('No se pudo leer la planilla')}
  };
  r.readAsArrayBuffer(file);
}
$('#imp').onclick=()=>$('#imp-file').click();
$('#imp-file').onchange=e=>{importar(e.target.files[0]);e.target.value=''};
$('#exp').onclick=exportar;
$('#csv').onclick=exportar;

/* ---------- Google Sheets ---------- */
const sheetOk=()=>!!(state.c.url&&state.c.clave);
let syncing=false;
const gPost=o=>fetch(state.c.url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({clave:state.c.clave},o))});
function estadoSheet(){
  const n=state.sq.length+state.aq.length;
  $('#sq-state').textContent=!sheetOk()?'Sin configurar. Las ventas se guardan solo en este celular.':n?n+' movimientos pendientes de enviar a Google Sheets.':'Conectado. Cada venta se envía sola a tu planilla.';
  if(state.sf>0)$('#sq-state').textContent+=' No se pudo sincronizar ('+state.sf+' intento'+(state.sf===1?'':'s')+' fallido'+(state.sf===1?'':'s')+'). Revisá la URL y la clave.';
}
async function flushSheet(){
  estadoSheet();
  if(syncing||!sheetOk()||!navigator.onLine)return;
  syncing=true;
  try{
    for(const a of [...state.aq]){
      await gPost({tipo:'anular',id:a.id,sku:a.sku,stock:(find(a.sku)||{}).stock});
      state.aq=state.aq.filter(x=>x!==a);save();
    }
    for(const id of [...state.sq]){
      if(esperando.has(id))continue;
      const v=state.v.find(x=>x.id===id);
      if(!v){state.sq=state.sq.filter(x=>x!==id);continue}
      const d=new Date(v.ts);
      await gPost({tipo:'venta',id:v.id,fecha:d.toLocaleDateString(LOCALE),hora:d.toLocaleTimeString(LOCALE),sku:v.sku,producto:v.nombre,cantidad:v.qty,precio:v.precio,total:v.total,lat:v.lat,lng:v.lng,stock:(find(v.sku)||{}).stock});
      state.sq=state.sq.filter(x=>x!==id);save();
    }
    state.sf=0;save();
  }catch(e){state.sf++;save()}
  syncing=false;estadoSheet();
}
async function gLeer(){
  const r=await fetch(state.c.url+(state.c.url.includes('?')?'&':'?')+'clave='+encodeURIComponent(state.c.clave));
  const d=await r.json();
  if(!d.ok)throw new Error(d.error);
  return d.productos;
}
$('#g-test').onclick=async()=>{
  if(!sheetOk()){toast('Completá la URL y la clave primero');return}
  try{await gLeer();toast('Conectado con tu planilla');flushSheet()}
  catch(e){toast(e.message==='clave'?'La clave no coincide con la del script':'No se pudo conectar. Revisá la URL')}
};
$('#g-up').onclick=async()=>{
  if(!sheetOk()){toast('Completá la URL y la clave primero');return}
  if(!confirm('Esto reemplaza la hoja Productos de Google Sheets con los productos de la app. ¿Continuar?'))return;
  try{await gPost({tipo:'productos',productos:state.p});toast('Productos enviados. Revisá la hoja Productos')}
  catch(e){toast('No se pudo enviar. Revisá tu conexión')}
};
$('#g-down').onclick=async()=>{
  if(!sheetOk()){toast('Completá la URL y la clave primero');return}
  if(!confirm('Los productos de Google Sheets van a agregarse o actualizar los de la app (precio y stock). ¿Continuar?'))return;
  try{const {nuevos,act}=mezclar(await gLeer());toast(nuevos+' productos nuevos, '+act+' actualizados')}
  catch(e){toast(e.message==='clave'?'La clave no coincide con la del script':'No se pudo conectar. Revisá la URL')}
};
[['url','#c-url'],['clave','#c-clave']].forEach(([key,id])=>{
  $(id).value=state.c[key]||'';
  $(id).addEventListener('input',()=>{state.c[key]=$(id).value.trim();save();flushSheet()});
});

/* ---------- Estado y arranque ---------- */
function net(){const on=navigator.onLine;$('#net').className='net'+(on?'':' off');$('#net span').textContent=on?'En línea':'Sin conexión';if(on)flushSheet()}
addEventListener('online',net);addEventListener('offline',net);
function renderAll(){preview();renderStock();renderVentas();estadoSheet()}
renderAll();net();
if(navigator.geolocation)navigator.geolocation.getCurrentPosition(()=>{},()=>{});
$('#sku').focus();









