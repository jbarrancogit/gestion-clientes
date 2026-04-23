const ESTADOS = ['prospecto', 'contactado', 'prototipo_enviado', 'prototipo_aprobado', 'contrato_firmado', 'en_desarrollo', 'entregado', 'cerrado'];
const PLANES_PRECIO = { starter: 99000, profesional: 280000, premium: 480000 };

const uuid = () => (typeof crypto !== 'undefined' && crypto.randomUUID)
  ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });

let lastTs = 0;
function nowIso() {
  const t = Math.max(Date.now(), lastTs + 1);
  lastTs = t;
  return new Date(t).toISOString();
}

const db = new Dexie('gestion-clientes');

db.version(1).stores({
  clientes: '++id, negocio_nombre, rubro, plan, estado, fecha_inicio',
  pagos: '++id, cliente_id, fecha',
  actividades: '++id, cliente_id, tipo, fecha',
});

db.version(2).stores({
  clientes: 'id, negocio_nombre, rubro, plan, estado, fecha_inicio, updated_at, deleted_at',
  pagos: 'id, cliente_id, fecha, updated_at, deleted_at',
  actividades: 'id, cliente_id, tipo, fecha, updated_at, deleted_at',
}).upgrade(async tx => {
  const idMap = new Map();
  const cs = await tx.table('clientes').toArray();
  const newCs = cs.map(c => {
    const newId = uuid();
    idMap.set(c.id, newId);
    return { ...c, id: newId, updated_at: c.updated_at || c.created_at || nowIso(), deleted_at: null };
  });
  await tx.table('clientes').clear();
  if (newCs.length) await tx.table('clientes').bulkAdd(newCs);

  const ps = await tx.table('pagos').toArray();
  const newPs = ps.filter(p => idMap.has(p.cliente_id)).map(p => ({
    ...p, id: uuid(), cliente_id: idMap.get(p.cliente_id),
    updated_at: p.fecha || nowIso(), deleted_at: null,
  }));
  await tx.table('pagos').clear();
  if (newPs.length) await tx.table('pagos').bulkAdd(newPs);

  const as = await tx.table('actividades').toArray();
  const newAs = as.filter(a => idMap.has(a.cliente_id)).map(a => ({
    ...a, id: uuid(), cliente_id: idMap.get(a.cliente_id),
    updated_at: a.fecha || nowIso(), deleted_at: null,
  }));
  await tx.table('actividades').clear();
  if (newAs.length) await tx.table('actividades').bulkAdd(newAs);
});

const syncListeners = new Set();
function onMutation(fn) { syncListeners.add(fn); return () => syncListeners.delete(fn); }
function notify(table, op, record) { syncListeners.forEach(fn => { try { fn({ table, op, record }); } catch {} }); }

async function addCliente(data) {
  const now = nowIso();
  const id = data.id || uuid();
  const record = {
    id,
    nombre_contacto: data.nombre_contacto || '', telefono: data.telefono || '',
    email: data.email || '', negocio_nombre: data.negocio_nombre || '',
    rubro: data.rubro || '', ubicacion: data.ubicacion || '',
    plan: data.plan || 'starter', precio: data.precio || 0,
    estado: data.estado || 'prospecto', fecha_inicio: data.fecha_inicio || now,
    fecha_cierre: data.fecha_cierre || null, pago_total: data.pago_total || data.precio || 0,
    pago_recibido: data.pago_recibido || 0, notas: data.notas || '',
    created_at: data.created_at || now, updated_at: now, deleted_at: null,
  };
  await db.clientes.add(record);
  notify('clientes', 'put', record);
  return id;
}

async function getClientes(filters = {}) {
  let collection = db.clientes.toCollection();
  if (filters.estado) collection = db.clientes.where('estado').equals(filters.estado);
  else if (filters.plan) collection = db.clientes.where('plan').equals(filters.plan);
  else if (filters.rubro) collection = db.clientes.where('rubro').equals(filters.rubro);
  let results = await collection.toArray();
  results = results.filter(c => !c.deleted_at);
  if (filters.estado && filters.plan) results = results.filter(c => c.plan === filters.plan);
  if (filters.estado && filters.rubro) results = results.filter(c => c.rubro === filters.rubro);
  return results;
}

async function getClienteById(id) {
  const c = await db.clientes.get(id);
  return c && !c.deleted_at ? c : undefined;
}

async function updateCliente(id, changes) {
  changes.updated_at = nowIso();
  await db.clientes.update(id, changes);
  const record = await db.clientes.get(id);
  if (record) notify('clientes', 'put', record);
  return record;
}

async function deleteCliente(id) {
  const now = nowIso();
  await db.transaction('rw', [db.clientes, db.pagos, db.actividades], async () => {
    await db.clientes.update(id, { deleted_at: now, updated_at: now });
    const pagos = await db.pagos.where('cliente_id').equals(id).toArray();
    for (const p of pagos) await db.pagos.update(p.id, { deleted_at: now, updated_at: now });
    const acts = await db.actividades.where('cliente_id').equals(id).toArray();
    for (const a of acts) await db.actividades.update(a.id, { deleted_at: now, updated_at: now });
  });
  const cliente = await db.clientes.get(id);
  if (cliente) notify('clientes', 'put', cliente);
}

async function addPago(data) {
  const now = nowIso();
  const id = data.id || uuid();
  const record = {
    id, cliente_id: data.cliente_id, monto: data.monto,
    fecha: data.fecha || now, concepto: data.concepto || '', metodo: data.metodo || '',
    updated_at: now, deleted_at: null,
  };
  await db.pagos.add(record);
  notify('pagos', 'put', record);
  const cliente = await db.clientes.get(data.cliente_id);
  if (cliente) await updateCliente(data.cliente_id, { pago_recibido: (cliente.pago_recibido || 0) + data.monto });
  await addActividad({ cliente_id: data.cliente_id, tipo: 'pago', descripcion: `Pago registrado: $${data.monto.toLocaleString('es-AR')} (${data.concepto || data.metodo})` });
  return id;
}

async function getPagosByCliente(clienteId) {
  const rows = await db.pagos.where('cliente_id').equals(clienteId).toArray();
  return rows.filter(p => !p.deleted_at).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
}

async function addActividad(data) {
  const now = nowIso();
  const id = data.id || uuid();
  const record = {
    id, cliente_id: data.cliente_id, tipo: data.tipo,
    descripcion: data.descripcion || '', fecha: data.fecha || now,
    updated_at: now, deleted_at: null,
  };
  await db.actividades.add(record);
  notify('actividades', 'put', record);
  return id;
}

async function getActividadesByCliente(clienteId) {
  const rows = await db.actividades.where('cliente_id').equals(clienteId).toArray();
  return rows.filter(a => !a.deleted_at).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
}

async function advanceEstado(clienteId) {
  const cliente = await db.clientes.get(clienteId);
  if (!cliente) return null;
  const idx = ESTADOS.indexOf(cliente.estado);
  if (idx < 0 || idx >= ESTADOS.length - 1) return null;
  const nuevoEstado = ESTADOS[idx + 1];
  await updateCliente(clienteId, { estado: nuevoEstado });
  await addActividad({ cliente_id: clienteId, tipo: 'cambio_estado', descripcion: `${cliente.estado} → ${nuevoEstado}` });
  return nuevoEstado;
}

async function changeEstado(clienteId, nuevoEstado) {
  const cliente = await db.clientes.get(clienteId);
  if (!cliente || !ESTADOS.includes(nuevoEstado)) return null;
  const anterior = cliente.estado;
  await updateCliente(clienteId, { estado: nuevoEstado });
  await addActividad({ cliente_id: clienteId, tipo: 'cambio_estado', descripcion: `${anterior} → ${nuevoEstado}` });
  return nuevoEstado;
}

async function applyRemote(table, record) {
  const local = await db.table(table).get(record.id);
  if (local && local.updated_at >= record.updated_at) return false;
  await db.table(table).put(record);
  return true;
}

async function getAllForSync(table) {
  return db.table(table).toArray();
}

export {
  db, ESTADOS, PLANES_PRECIO, uuid,
  addCliente, getClientes, getClienteById, updateCliente, deleteCliente,
  addPago, getPagosByCliente, addActividad, getActividadesByCliente,
  advanceEstado, changeEstado,
  onMutation, applyRemote, getAllForSync,
};
