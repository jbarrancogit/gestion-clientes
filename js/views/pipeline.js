import { getClientes, ESTADOS, changeEstado, advanceEstado } from '../db.js';
import { calcUrgency, getUrgencyClass, getBadgeClass, getPendingActions, getUrgencyEmoji, daysSince } from '../urgency.js';
import { showToast } from '../components/toast.js';

const ESTADO_LABELS = {
  prospecto: '📋 Prospecto', contactado: '📞 Contactado',
  prototipo_enviado: '🎨 Prototipo enviado', prototipo_aprobado: '✅ Prototipo aprobado',
  contrato_firmado: '📝 Contrato firmado', en_desarrollo: '🔨 En desarrollo',
  entregado: '📦 Entregado', cerrado: '🏁 Cerrado',
};

function renderCard(cliente) {
  const urgency = calcUrgency(cliente);
  const days = daysSince(cliente.updated_at);
  const pctPaid = cliente.pago_total ? Math.round((cliente.pago_recibido / cliente.pago_total) * 100) : 0;
  const whatsappLink = cliente.telefono ? `https://wa.me/${cliente.telefono.replace(/[^0-9]/g, '')}` : '#';

  return `
    <div class="kanban-card ${getUrgencyClass(urgency)}" data-id="${cliente.id}" onclick="this.classList.toggle('expanded')">
      <div class="kanban-card-header">
        <span class="kanban-card-title">${cliente.negocio_nombre || 'Sin nombre'}</span>
        <span class="badge ${getBadgeClass(urgency)}">${days}d</span>
      </div>
      <div class="kanban-card-sub">${cliente.plan || ''} · $${(cliente.precio || 0).toLocaleString('es-AR')}</div>
      <div class="kanban-card-details">
        <div class="kanban-card-detail-row">📍 ${cliente.ubicacion || 'Sin ubicación'} · ${cliente.rubro || ''}</div>
        <div class="kanban-card-detail-row">📱 ${cliente.telefono || 'Sin teléfono'}</div>
        <div class="kanban-card-detail-row">💰 Pagado: $${(cliente.pago_recibido || 0).toLocaleString('es-AR')} / $${(cliente.pago_total || 0).toLocaleString('es-AR')}</div>
        <div class="progress-bar"><div class="progress-bar-fill" style="width:${pctPaid}%;background:${pctPaid >= 100 ? 'var(--green)' : 'var(--blue)'}"></div></div>
        <div class="kanban-card-detail-row">${getUrgencyEmoji(urgency)} ${getPendingActions(cliente)}</div>
        <div class="kanban-card-actions" onclick="event.stopPropagation()">
          <a href="${whatsappLink}" target="_blank" class="btn-xs btn-whatsapp">📱 WhatsApp</a>
          <button class="btn-xs btn-edit" data-edit-id="${cliente.id}">✏️ Editar</button>
          <button class="btn-xs btn-advance" data-advance-id="${cliente.id}">▶ Avanzar</button>
        </div>
      </div>
    </div>`;
}

async function renderPipeline(container) {
  const clientes = await getClientes();
  const grouped = {};
  for (const estado of ESTADOS) grouped[estado] = [];
  for (const c of clientes) { if (grouped[c.estado]) grouped[c.estado].push(c); }

  container.innerHTML = `
    <h2 class="mb-16">Pipeline</h2>
    <div class="kanban-board" id="kanban-board">
      ${ESTADOS.map(estado => `
        <div class="kanban-column" data-estado="${estado}">
          <div class="kanban-column-header"><span>${ESTADO_LABELS[estado] || estado}</span><span>${grouped[estado].length}</span></div>
          <div class="kanban-column-cards" data-estado="${estado}">${grouped[estado].map(renderCard).join('')}</div>
        </div>`).join('')}
    </div>`;

  container.querySelectorAll('.kanban-column-cards').forEach(col => {
    new Sortable(col, {
      group: 'pipeline', animation: 150, ghostClass: 'sortable-ghost',
      onEnd: async (evt) => {
        const cardId = parseInt(evt.item.dataset.id);
        const newEstado = evt.to.dataset.estado;
        if (!cardId || !newEstado) return;
        await changeEstado(cardId, newEstado);
        showToast(`Estado actualizado a "${ESTADO_LABELS[newEstado] || newEstado}"`, 'success');
      },
    });
  });

  container.addEventListener('click', async (e) => {
    const advanceBtn = e.target.closest('[data-advance-id]');
    if (advanceBtn) {
      const id = parseInt(advanceBtn.dataset.advanceId);
      const nuevoEstado = await advanceEstado(id);
      if (nuevoEstado) { showToast(`Avanzado a "${ESTADO_LABELS[nuevoEstado] || nuevoEstado}"`, 'success'); await renderPipeline(container); }
    }
    const editBtn = e.target.closest('[data-edit-id]');
    if (editBtn) { location.hash = `#clientes?id=${editBtn.dataset.editId}`; }
  });
}

export { renderPipeline, ESTADO_LABELS };
