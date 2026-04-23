import { getClientes, getClienteById, addCliente, updateCliente, PLANES_PRECIO, addActividad } from '../db.js';
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

function prospectoFormHTML(data = {}) {
  return `
    <div class="form-group"><label class="form-label">Nombre negocio</label><input class="form-input" name="negocio_nombre" value="${data.negocio_nombre || ''}" required></div>
    <div class="form-group"><label class="form-label">Rubro</label><input class="form-input" name="rubro" value="${data.rubro || ''}"></div>
    <div class="form-group"><label class="form-label">Teléfono</label><input class="form-input" name="telefono" value="${data.telefono || ''}"></div>
    <div class="form-group"><label class="form-label">Email</label><input class="form-input" name="email" type="email" value="${data.email || ''}"></div>
    <div class="form-group"><label class="form-label">Ubicación / Zona</label><input class="form-input" name="ubicacion" value="${data.ubicacion || ''}"></div>
    <div class="form-group"><label class="form-label">Notas</label><textarea class="form-textarea" name="notas">${data.notas || ''}</textarea></div>`;
}

async function renderProspectos(container) {
  const all = await getClientes();
  const prospectos = all.filter(c => c.estado === 'prospecto' || c.estado === 'contactado');

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h2>Prospectos</h2><button class="btn btn-primary" id="btn-new-prospecto">+ Nuevo prospecto</button>
    </div>
    <div class="filters-bar">
      <select class="filter-select" id="filter-rubro"><option value="">Todos los rubros</option>${[...new Set(prospectos.map(p => p.rubro).filter(Boolean))].map(r => `<option value="${r}">${r}</option>`).join('')}</select>
      <select class="filter-select" id="filter-zona"><option value="">Todas las zonas</option>${[...new Set(prospectos.map(p => p.ubicacion).filter(Boolean))].map(z => `<option value="${z}">${z}</option>`).join('')}</select>
      <input class="filter-input" id="filter-search-p" placeholder="Buscar...">
    </div>
    <table class="data-table"><thead><tr><th>Negocio</th><th>Rubro</th><th>Zona</th><th>Teléfono</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody id="prospectos-tbody">${prospectos.map(p => `
        <tr data-id="${p.id}"><td>${p.negocio_nombre}</td><td>${p.rubro || '—'}</td><td>${p.ubicacion || '—'}</td><td>${p.telefono || '—'}</td>
        <td>${p.estado === 'contactado' ? '<span class="badge badge-normal">Contactado</span>' : '<span class="badge badge-pending">Pendiente</span>'}</td>
        <td><button class="btn-xs btn-edit" data-convert-id="${p.id}">🔄 Convertir</button>
        ${p.telefono ? `<a href="https://wa.me/${p.telefono.replace(/[^0-9]/g, '')}" target="_blank" class="btn-xs btn-whatsapp">📱</a>` : ''}</td></tr>`).join('')}</tbody></table>`;

  container.querySelector('#btn-new-prospecto').addEventListener('click', () => {
    openModal('Nuevo prospecto', prospectoFormHTML(), {
      submitLabel: 'Crear',
      onSubmit: async (data) => { await addCliente({ ...data, estado: 'prospecto', plan: '', precio: 0 }); showToast('Prospecto creado', 'success'); renderProspectos(container); },
    });
  });

  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-convert-id]');
    if (!btn) return;
    const id = btn.dataset.convertId;
    const prospecto = await getClienteById(id);
    if (!prospecto) return;

    openModal(`Convertir "${prospecto.negocio_nombre}" a cliente`, `
      <div class="form-group"><label class="form-label">Plan</label>
        <select class="form-select" name="plan" id="convert-plan"><option value="starter">Starter ($99.000)</option><option value="profesional">Profesional ($280.000)</option><option value="premium">Premium ($480.000)</option></select></div>
      <div class="form-group"><label class="form-label">Precio (ARS)</label><input class="form-input" name="precio" type="number" id="convert-precio" value="${PLANES_PRECIO.starter}"></div>
      <div class="form-group"><label class="form-label">Nombre contacto</label><input class="form-input" name="nombre_contacto" value="${prospecto.nombre_contacto || ''}"></div>
    `, {
      submitLabel: 'Convertir a cliente',
      onSubmit: async (data) => {
        await updateCliente(id, { estado: 'contactado', plan: data.plan, precio: parseInt(data.precio) || 0, pago_total: parseInt(data.precio) || 0, pago_recibido: 0, nombre_contacto: data.nombre_contacto || prospecto.nombre_contacto || '' });
        await addActividad({ cliente_id: id, tipo: 'cambio_estado', descripcion: 'Prospecto convertido a cliente' });
        showToast('Prospecto convertido a cliente', 'success'); renderProspectos(container);
      },
    });

    setTimeout(() => {
      const planSel = document.getElementById('convert-plan');
      const precioInp = document.getElementById('convert-precio');
      if (planSel && precioInp) planSel.addEventListener('change', () => { precioInp.value = PLANES_PRECIO[planSel.value] || 0; });
    }, 50);
  });

  const filterRubro = container.querySelector('#filter-rubro');
  const filterZona = container.querySelector('#filter-zona');
  const filterSearch = container.querySelector('#filter-search-p');
  function applyFilters() {
    const rubro = filterRubro.value; const zona = filterZona.value; const search = filterSearch.value.toLowerCase();
    container.querySelectorAll('#prospectos-tbody tr').forEach(row => {
      const cells = row.querySelectorAll('td');
      const matchRubro = !rubro || cells[1].textContent === rubro;
      const matchZona = !zona || cells[2].textContent === zona;
      const matchSearch = !search || Array.from(cells).some(td => td.textContent.toLowerCase().includes(search));
      row.style.display = (matchRubro && matchZona && matchSearch) ? '' : 'none';
    });
  }
  filterRubro.addEventListener('change', applyFilters);
  filterZona.addEventListener('change', applyFilters);
  filterSearch.addEventListener('input', applyFilters);
}

export { renderProspectos };
