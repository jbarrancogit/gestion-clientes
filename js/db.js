const ESTADOS = ['prospecto', 'contactado', 'prototipo_enviado', 'prototipo_aprobado', 'contrato_firmado', 'en_desarrollo', 'entregado', 'cerrado'];
const PLANES_PRECIO = { starter: 99000, profesional: 280000, premium: 480000 };

const db = new Dexie('gestion-clientes');
db.version(1).stores({
  clientes: '++id, negocio_nombre, rubro, plan, estado, fecha_inicio',
  pagos: '++id, cliente_id, fecha',
  actividades: '++id, cliente_id, tipo, fecha',
});

async function addCliente(data) {
  const now = new Date().toISOString();
  return db.clientes.add({
    nombre_contacto: data.nombre_contacto || '', telefono: data.telefono || '',
    email: data.email || '', negocio_nombre: data.negocio_nombre || '',
    rubro: data.rubro || '', ubicacion: data.ubicacion || '',
    plan: data.plan || 'starter', precio: data.precio || 0,
    estado: data.estado || 'prospecto', fecha_inicio: data.fecha_inicio || now,
    fecha_cierre: data.fecha_cierre || null, pago_total: data.pago_total || data.precio || 0,
    pago_recibido: data.pago_recibido || 0, notas: data.notas || '',
    created_at: now, updated_at: now,
  });
}

async function getClientes(filters = {}) {
  let collection = db.clientes.toCollection();
  if (filters.estado) collection = db.clientes.where('estado').equals(filters.estado);
  else if (filters.plan) collection = db.clientes.where('plan').equals(filters.plan);
  else if (filters.rubro) collection = db.clientes.where('rubro').equals(filters.rubro);
  let results = await collection.toArray();
  if (filters.estado && filters.plan) results = results.filter(c => c.plan === filters.plan);
  if (filters.estado && filters.rubro) results = results.filter(c => c.rubro === filters.rubro);
  return results;
}

async function getClienteById(id) { return db.clientes.get(id); }

async function updateCliente(id, changes) {
  changes.updated_at = new Date().toISOString();
  return db.clientes.update(id, changes);
}

async function deleteCliente(id) {
  await db.transaction('rw', [db.clientes, db.pagos, db.actividades], async () => {
    await db.pagos.where('cliente_id').equals(id).delete();
    await db.actividades.where('cliente_id').equals(id).delete();
    await db.clientes.delete(id);
  });
}

async function addPago(data) {
  const id = await db.pagos.add({
    cliente_id: data.cliente_id, monto: data.monto,
    fecha: data.fecha || new Date().toISOString(),
    concepto: data.concepto || '', metodo: data.metodo || '',
  });
  const cliente = await db.clientes.get(data.cliente_id);
  if (cliente) await updateCliente(data.cliente_id, { pago_recibido: (cliente.pago_recibido || 0) + data.monto });
  await addActividad({ cliente_id: data.cliente_id, tipo: 'pago', descripcion: `Pago registrado: $${data.monto.toLocaleString('es-AR')} (${data.concepto || data.metodo})` });
  return id;
}

async function getPagosByCliente(clienteId) {
  return db.pagos.where('cliente_id').equals(clienteId).reverse().sortBy('fecha');
}

async function addActividad(data) {
  return db.actividades.add({
    cliente_id: data.cliente_id, tipo: data.tipo,
    descripcion: data.descripcion || '', fecha: data.fecha || new Date().toISOString(),
  });
}

async function getActividadesByCliente(clienteId) {
  return db.actividades.where('cliente_id').equals(clienteId).reverse().sortBy('fecha');
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

export { db, ESTADOS, PLANES_PRECIO, addCliente, getClientes, getClienteById, updateCliente, deleteCliente, addPago, getPagosByCliente, addActividad, getActividadesByCliente, advanceEstado, changeEstado };
