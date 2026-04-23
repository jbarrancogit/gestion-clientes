import { describe, it, expect, beforeEach } from 'vitest';

let db, addCliente, getClientes, getClienteById, updateCliente, deleteCliente;
let addPago, getPagosByCliente;
let addActividad, getActividadesByCliente;
let ESTADOS, PLANES_PRECIO;

beforeEach(async () => {
  const mod = await import('../js/db.js');
  db = mod.db; addCliente = mod.addCliente; getClientes = mod.getClientes;
  getClienteById = mod.getClienteById; updateCliente = mod.updateCliente;
  deleteCliente = mod.deleteCliente; addPago = mod.addPago;
  getPagosByCliente = mod.getPagosByCliente; addActividad = mod.addActividad;
  getActividadesByCliente = mod.getActividadesByCliente;
  ESTADOS = mod.ESTADOS; PLANES_PRECIO = mod.PLANES_PRECIO;
  await db.clientes.clear(); await db.pagos.clear(); await db.actividades.clear();
});

describe('ESTADOS', () => {
  it('has 8 pipeline stages in order', () => {
    expect(ESTADOS).toEqual(['prospecto', 'contactado', 'prototipo_enviado', 'prototipo_aprobado', 'contrato_firmado', 'en_desarrollo', 'entregado', 'cerrado']);
  });
});

describe('PLANES_PRECIO', () => {
  it('maps plan names to prices', () => {
    expect(PLANES_PRECIO.starter).toBe(99000);
    expect(PLANES_PRECIO.profesional).toBe(280000);
    expect(PLANES_PRECIO.premium).toBe(480000);
  });
});

describe('addCliente / getClientes', () => {
  it('adds a client and retrieves it', async () => {
    const id = await addCliente({ nombre_contacto: 'Juan', telefono: '261-555-0001', negocio_nombre: 'Test Shop', rubro: 'comercio', plan: 'starter', precio: 99000, estado: 'prospecto' });
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
    const all = await getClientes();
    expect(all).toHaveLength(1);
    expect(all[0].nombre_contacto).toBe('Juan');
    expect(all[0].created_at).toBeDefined();
  });
});

describe('getClienteById', () => {
  it('returns a single client by id', async () => {
    const id = await addCliente({ nombre_contacto: 'María', negocio_nombre: 'Tienda', plan: 'profesional', precio: 280000, estado: 'contactado' });
    const c = await getClienteById(id);
    expect(c.nombre_contacto).toBe('María');
  });
});

describe('updateCliente', () => {
  it('updates fields and bumps updated_at', async () => {
    const id = await addCliente({ nombre_contacto: 'Pedro', negocio_nombre: 'Bar', plan: 'starter', precio: 99000, estado: 'prospecto' });
    const before = await getClienteById(id);
    await new Promise(r => setTimeout(r, 10));
    await updateCliente(id, { estado: 'contactado' });
    const after = await getClienteById(id);
    expect(after.estado).toBe('contactado');
    expect(after.updated_at).not.toBe(before.updated_at);
  });
});

describe('deleteCliente', () => {
  it('removes the client', async () => {
    const id = await addCliente({ nombre_contacto: 'Ana', negocio_nombre: 'Café', plan: 'starter', precio: 99000, estado: 'prospecto' });
    await deleteCliente(id);
    expect(await getClientes()).toHaveLength(0);
  });
});

describe('getClientes filtering', () => {
  it('filters by estado', async () => {
    await addCliente({ negocio_nombre: 'A', estado: 'prospecto', plan: 'starter', precio: 99000 });
    await addCliente({ negocio_nombre: 'B', estado: 'contactado', plan: 'starter', precio: 99000 });
    await addCliente({ negocio_nombre: 'C', estado: 'prospecto', plan: 'starter', precio: 99000 });
    expect(await getClientes({ estado: 'prospecto' })).toHaveLength(2);
  });
  it('filters by plan', async () => {
    await addCliente({ negocio_nombre: 'A', estado: 'prospecto', plan: 'starter', precio: 99000 });
    await addCliente({ negocio_nombre: 'B', estado: 'prospecto', plan: 'premium', precio: 480000 });
    const premium = await getClientes({ plan: 'premium' });
    expect(premium).toHaveLength(1);
    expect(premium[0].negocio_nombre).toBe('B');
  });
});

describe('addPago / getPagosByCliente', () => {
  it('registers a payment and updates pago_recibido', async () => {
    const clienteId = await addCliente({ negocio_nombre: 'Shop', plan: 'starter', precio: 99000, pago_total: 99000, pago_recibido: 0, estado: 'contrato_firmado' });
    await addPago({ cliente_id: clienteId, monto: 49500, fecha: new Date().toISOString(), concepto: 'anticipo 50%', metodo: 'transferencia' });
    const pagos = await getPagosByCliente(clienteId);
    expect(pagos).toHaveLength(1);
    expect(pagos[0].monto).toBe(49500);
    const updated = await getClienteById(clienteId);
    expect(updated.pago_recibido).toBe(49500);
  });
});

describe('addActividad / getActividadesByCliente', () => {
  it('logs activities sorted by date desc', async () => {
    const clienteId = await addCliente({ negocio_nombre: 'Shop', plan: 'starter', precio: 99000, estado: 'prospecto' });
    await addActividad({ cliente_id: clienteId, tipo: 'cambio_estado', descripcion: 'Pasó a contactado' });
    await addActividad({ cliente_id: clienteId, tipo: 'nota', descripcion: 'Llamar mañana' });
    const acts = await getActividadesByCliente(clienteId);
    expect(acts).toHaveLength(2);
    expect(acts[0].tipo).toBe('nota');
  });
});
