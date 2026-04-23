import { getClientes, getClienteById, addCliente, updateCliente, deleteCliente, ESTADOS, PLANES_PRECIO, getActividadesByCliente, getPagosByCliente, addPago, addActividad } from '../db.js';
import { calcUrgency, getBadgeClass } from '../urgency.js';
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { ESTADO_LABELS } from './pipeline.js';

function clienteFormHTML(data = {}) {
  return `
    <div class="form-group"><label class="form-label">Nombre contacto</label><input class="form-input" name="nombre_contacto" value="${data.nombre_contacto || ''}" required></div>
    <div class="form-group"><label class="form-label">Teléfono</label><input class="form-input" name="telefono" value="${data.telefono || ''}"></div>
    <div class="form-group"><label class="form-label">Email</label><input class="form-input" name="email" type="email" value="${data.email || ''}"></div>
    <div class="form-group"><label class="form-label">Nombre negocio</label><input class="form-input" name="negocio_nombre" value="${data.negocio_nombre || ''}" required></div>
    <div class="form-group"><label class="form-label">Rubro</label><input class="form-input" name="rubro" value="${data.rubro || ''}"></div>
    <div class="form-group"><label class="form-label">Ubicación</label><input class="form-input" name="ubicacion" value="${data.ubicacion || ''}"></div>
    <div class="form-group"><label class="form-label">Plan</label>
      <select class="form-select" name="plan" id="plan-select">
        <option value="starter" ${data.plan === 'starter' ? 'selected' : ''}>Starter ($99.000)</option>
        <option value="profesional" ${data.plan === 'profesional' ? 'selected' : ''}>Profesional ($280.000)</option>
        <option value="premium" ${data.plan === 'premium' ? 'selected' : ''}>Premium ($480.000)</option>
      </select></div>
    <div class="form-group"><label class="form-label">Precio (ARS)</label><input class="form-input" name="precio" type="number" id="precio-input" value="${data.precio || PLANES_PRECIO[data.plan] || PLANES_PRECIO.starter}"></div>
    <div class="form-group"><label class="form-label">Estado</label>
      <select class="form-select" name="estado">
        ${ESTADOS.map(e => `<option value="${e}" ${data.estado === e ? 'selected' : ''}>${(ESTADO_LABELS[e] || e).replace(/^[^\s]+\s/, '')}</option>`).join('')}
      </select></div>
    <div class="form-group"><label class="form-label">Notas</label><textarea class="form-textarea" name="notas">${data.notas || ''}</textarea></div>`;
}

function openClienteForm(existing, onDone) {
  const isEdit = !!existing;
  openModal(isEdit ? 'Editar cliente' : 'Nuevo cliente', clienteFormHTML(existing || {}), {
    submitLabel: isEdit ? 'Actualizar' : 'Crear',
    onDelete: isEdit ? async () => { await deleteCliente(existing.id); showToast('Cliente eliminado', 'info'); onDone(); } : undefined,
    onSubmit: async (data) => {
      data.precio = parseInt(data.precio) || 0;
      if (isEdit) { await updateCliente(existing.id, data); showToast('Cliente actualizado', 'success'); }
      else { data.pago_total = data.precio; data.pago_recibido = 0; await addCliente(data); showToast('Cliente creado', 'success'); }
      onDone();
    },
  });
  const planSelect = document.getElementById('plan-select');
  const precioInput = document.getElementById('precio-input');
  if (planSelect && precioInput) {
    planSelect.addEventListener('change', () => { precioInput.value = PLANES_PRECIO[planSelect.value] || 0; });
  }
}

function openPagoForm(clienteId, onDone) {
  const today = new Date().toISOString().split('T')[0];
  openModal('Registrar pago', `
    <div class="form-group"><label class="form-label">Monto (ARS)</label><input class="form-input" name="monto" type="number" required></div>
    <div class="form-group"><label class="form-label">Fecha</label><input class="form-input" name="fecha" type="date" value="${today}"></div>
    <div class="form-group"><label class="form-label">Concepto</label>
      <select class="form-select" name="concepto"><option value="anticipo 50%">Anticipo 50%</option><option value="saldo final">Saldo final</option><option value="pago parcial">Pago parcial</option><option value="otro">Otro</option></select></div>
    <div class="form-group"><label class="form-label">Método</label>
      <select class="form-select" name="metodo"><option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option><option value="mercadopago">MercadoPago</option></select></div>
  `, {
    submitLabel: 'Registrar pago',
    onSubmit: async (data) => {
      await addPago({ cliente_id: clienteId, monto: parseInt(data.monto) || 0, fecha: data.fecha ? new Date(data.fecha).toISOString() : new Date().toISOString(), concepto: data.concepto, metodo: data.metodo });
      showToast('Pago registrado', 'success'); onDone();
    },
  });
}

async function renderDetail(container, clienteId) {
  const cliente = await getClienteById(clienteId);
  if (!cliente) { container.innerHTML = '<p>Cliente no encontrado</p>'; return; }
  const actividades = await getActividadesByCliente(clienteId);
  const urgency = calcUrgency(cliente);
  const pctPaid = cliente.pago_total ? Math.round((cliente.pago_recibido / cliente.pago_total) * 100) : 0;

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
      <a href="#clientes" style="color:var(--blue);text-decoration:none;">← Volver</a>
      <h2>${cliente.negocio_nombre}</h2>
      <span class="badge ${getBadgeClass(urgency)}">${(ESTADO_LABELS[cliente.estado] || cliente.estado).replace(/^[^\s]+\s/, '')}</span>
    </div>
    <div class="detail-panel">
      <div class="detail-header">
        <div>
          <div class="detail-field"><span class="detail-label">Contacto</span><div class="detail-value">${cliente.nombre_contacto}</div></div>
          <div class="detail-field"><span class="detail-label">Teléfono</span><div class="detail-value">${cliente.telefono || '—'}</div></div>
          <div class="detail-field"><span class="detail-label">Email</span><div class="detail-value">${cliente.email || '—'}</div></div>
          <div class="detail-field"><span class="detail-label">Rubro</span><div class="detail-value">${cliente.rubro || '—'}</div></div>
          <div class="detail-field"><span class="detail-label">Ubicación</span><div class="detail-value">${cliente.ubicacion || '—'}</div></div>
        </div>
        <div>
          <div class="detail-field"><span class="detail-label">Plan</span><div class="detail-value">${cliente.plan}</div></div>
          <div class="detail-field"><span class="detail-label">Precio</span><div class="detail-value">$${(cliente.pago_total || 0).toLocaleString('es-AR')}</div></div>
          <div class="detail-field"><span class="detail-label">Pagado</span><div class="detail-value text-green">$${(cliente.pago_recibido || 0).toLocaleString('es-AR')} (${pctPaid}%)</div></div>
          <div class="progress-bar" style="width:150px;"><div class="progress-bar-fill" style="width:${pctPaid}%;background:var(--green)"></div></div>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button class="btn btn-primary" id="btn-edit-cliente">✏️ Editar</button>
        <button class="btn btn-secondary" id="btn-add-pago">💰 Registrar pago</button>
        ${cliente.telefono ? `<a href="https://wa.me/${cliente.telefono.replace(/[^0-9]/g, '')}" target="_blank" class="btn btn-secondary">📱 WhatsApp</a>` : ''}
      </div>
    </div>
    <h3 class="mb-16" style="margin-top:24px;">Historial de actividades</h3>
    <div class="timeline">
      ${actividades.length === 0 ? '<p class="text-muted">Sin actividades registradas</p>' :
        actividades.map(a => `
          <div class="timeline-item type-${a.tipo}">
            <div class="timeline-date">${new Date(a.fecha).toLocaleDateString('es-AR')} ${new Date(a.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div>
            <div class="timeline-text">${a.descripcion}</div>
          </div>`).join('')}
    </div>`;

  container.querySelector('#btn-edit-cliente').addEventListener('click', () => openClienteForm(cliente, () => renderDetail(container, clienteId)));
  container.querySelector('#btn-add-pago').addEventListener('click', () => openPagoForm(clienteId, () => renderDetail(container, clienteId)));
}

async function renderClientes(container) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const detailId = params.get('id');
  if (detailId) return renderDetail(container, detailId);

  const clientes = await getClientes();
  const noProspectos = clientes.filter(c => c.estado !== 'prospecto');
  const ESTADO_LABELS_SHORT = { contactado: 'Contactado', prototipo_enviado: 'Prototipo enviado', prototipo_aprobado: 'Prototipo aprobado', contrato_firmado: 'Contrato firmado', en_desarrollo: 'En desarrollo', entregado: 'Entregado', cerrado: 'Cerrado' };

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h2>Clientes</h2><button class="btn btn-primary" id="btn-new-cliente">+ Nuevo cliente</button>
    </div>
    <div class="filters-bar">
      <select class="filter-select" id="filter-estado"><option value="">Todos los estados</option>${ESTADOS.filter(e => e !== 'prospecto').map(e => `<option value="${e}">${ESTADO_LABELS_SHORT[e] || e}</option>`).join('')}</select>
      <select class="filter-select" id="filter-plan"><option value="">Todos los planes</option><option value="starter">Starter</option><option value="profesional">Profesional</option><option value="premium">Premium</option></select>
      <input class="filter-input" id="filter-search" placeholder="Buscar...">
    </div>
    <table class="data-table"><thead><tr><th>Negocio</th><th>Contacto</th><th>Plan</th><th>Estado</th><th>Precio</th><th>Pagado</th></tr></thead>
      <tbody id="clientes-tbody">${noProspectos.map(c => `
        <tr data-id="${c.id}"><td>${c.negocio_nombre}</td><td>${c.nombre_contacto || '—'}</td><td>${c.plan}</td>
        <td><span class="badge ${getBadgeClass(calcUrgency(c))}">${ESTADO_LABELS_SHORT[c.estado] || c.estado}</span></td>
        <td>$${(c.precio || 0).toLocaleString('es-AR')}</td><td>$${(c.pago_recibido || 0).toLocaleString('es-AR')}</td></tr>`).join('')}</tbody></table>`;

  container.querySelector('#btn-new-cliente').addEventListener('click', () => openClienteForm(null, () => renderClientes(container)));
  container.querySelector('#clientes-tbody').addEventListener('click', (e) => {
    const row = e.target.closest('tr[data-id]');
    if (row) location.hash = `#clientes?id=${row.dataset.id}`;
  });

  const filterEstado = container.querySelector('#filter-estado');
  const filterPlan = container.querySelector('#filter-plan');
  const filterSearch = container.querySelector('#filter-search');
  function applyFilters() {
    const estado = filterEstado.value; const plan = filterPlan.value; const search = filterSearch.value.toLowerCase();
    container.querySelectorAll('#clientes-tbody tr').forEach(row => {
      const cells = row.querySelectorAll('td');
      const matchEstado = !estado || cells[3].textContent.toLowerCase().includes((ESTADO_LABELS_SHORT[estado] || estado).toLowerCase());
      const matchPlan = !plan || cells[2].textContent === plan;
      const matchSearch = !search || Array.from(cells).some(td => td.textContent.toLowerCase().includes(search));
      row.style.display = (matchEstado && matchPlan && matchSearch) ? '' : 'none';
    });
  }
  filterEstado.addEventListener('change', applyFilters);
  filterPlan.addEventListener('change', applyFilters);
  filterSearch.addEventListener('input', applyFilters);
}

export { renderClientes, openClienteForm, openPagoForm };
