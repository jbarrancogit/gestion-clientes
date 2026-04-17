const WAITING_STATES = ['prototipo_enviado', 'prototipo_aprobado', 'contactado'];

function daysSince(isoDate) {
  if (!isoDate) return 0;
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000);
}

function calcUrgency(cliente) {
  const { estado, updated_at, pago_recibido, pago_total } = cliente;
  if (estado === 'prospecto') return 'pending';
  if (estado === 'cerrado' || estado === 'entregado') return 'normal';
  const days = daysSince(updated_at);
  if (WAITING_STATES.includes(estado) && days > 5) return 'critical';
  if (WAITING_STATES.includes(estado) && days > 3) return 'urgent';
  if (estado === 'contrato_firmado' && (pago_recibido || 0) === 0 && days > 3) return 'urgent';
  if (estado === 'en_desarrollo' && (pago_recibido || 0) === 0) return 'urgent';
  return 'normal';
}

function getUrgencyClass(level) { return `urgency-${level}`; }
function getBadgeClass(level) { return `badge-${level}`; }

function getPendingActions(cliente) {
  const { negocio_nombre, estado, updated_at, pago_recibido, pago_total } = cliente;
  const days = daysSince(updated_at);
  const name = negocio_nombre || 'Sin nombre';
  if (estado === 'prospecto') return `${name}: contactar prospecto`;
  if (estado === 'contactado' && days > 3) return `${name}: seguimiento contacto (${days} días)`;
  if (estado === 'prototipo_enviado') return `${name}: esperando aprobación prototipo (${days} días)`;
  if (estado === 'prototipo_aprobado' && days > 3) return `${name}: enviar contrato (${days} días)`;
  if (estado === 'contrato_firmado' && (pago_recibido || 0) === 0) return `${name}: cobrar pago inicial`;
  if (estado === 'en_desarrollo' && (pago_recibido || 0) === 0) return `${name}: cobrar pago pendiente`;
  if (estado === 'en_desarrollo') return `${name}: desarrollo en curso`;
  if (estado === 'entregado' && (pago_recibido || 0) < (pago_total || 0)) return `${name}: cobrar saldo final ($${((pago_total || 0) - (pago_recibido || 0)).toLocaleString('es-AR')})`;
  return `${name}: al día`;
}

function getUrgencyEmoji(level) {
  const map = { critical: '🔴', urgent: '🟡', normal: '🟢', pending: '⚪' };
  return map[level] || '⚪';
}

export { calcUrgency, getUrgencyClass, getBadgeClass, getPendingActions, getUrgencyEmoji, daysSince };
