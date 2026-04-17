import { db, getClientes, ESTADOS } from '../db.js';
import { calcUrgency, getPendingActions, getUrgencyEmoji } from '../urgency.js';
import { createChart } from '../components/charts.js';
import { showImportBanner } from '../import.js';

async function renderDashboard(container) {
  const clientes = await getClientes();
  const now = new Date();
  const mesActual = now.getMonth();
  const anioActual = now.getFullYear();

  const activos = clientes.filter(c => !['prospecto', 'cerrado'].includes(c.estado));
  const prospectos = clientes.filter(c => c.estado === 'prospecto');
  const ingresosMes = clientes
    .filter(c => { const f = new Date(c.fecha_inicio); return f.getMonth() === mesActual && f.getFullYear() === anioActual; })
    .reduce((sum, c) => sum + (c.pago_recibido || 0), 0);

  const totalProspectos = prospectos.length || 1;
  const cerrados = clientes.filter(c => ['entregado', 'cerrado'].includes(c.estado)).length;
  const conversion = Math.round((cerrados / totalProspectos) * 100);

  const urgentes = clientes.filter(c => { const u = calcUrgency(c); return u === 'critical' || u === 'urgent'; });

  const conAcciones = clientes
    .filter(c => c.estado !== 'cerrado')
    .map(c => ({ ...c, urgency: calcUrgency(c), action: getPendingActions(c) }))
    .sort((a, b) => {
      const order = { critical: 0, urgent: 1, normal: 2, pending: 3 };
      return (order[a.urgency] || 3) - (order[b.urgency] || 3);
    })
    .slice(0, 8);

  const pagos = await db.pagos.toArray();
  const meses = [];
  const ingresosPorMes = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(anioActual, mesActual - i, 1);
    meses.push(d.toLocaleDateString('es-AR', { month: 'short' }));
    ingresosPorMes.push(pagos
      .filter(p => { const f = new Date(p.fecha); return f.getMonth() === d.getMonth() && f.getFullYear() === d.getFullYear(); })
      .reduce((s, p) => s + p.monto, 0));
  }

  container.innerHTML = `
    <h2 class="mb-16">Dashboard</h2>
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-value text-green">$${(ingresosMes / 1000).toFixed(0)}k</div><div class="kpi-label">Ingresos del mes</div></div>
      <div class="kpi-card"><div class="kpi-value text-blue">${activos.length}</div><div class="kpi-label">Clientes activos</div></div>
      <div class="kpi-card"><div class="kpi-value text-purple">${conversion}%</div><div class="kpi-label">Tasa de conversión</div></div>
      <div class="kpi-card"><div class="kpi-value text-red">${urgentes.length}</div><div class="kpi-label">Requieren atención</div></div>
    </div>
    <div class="bottom-grid">
      <div class="panel">
        <div class="panel-title text-orange">⚡ Acciones pendientes</div>
        ${conAcciones.length === 0 ? '<p class="text-muted">Todo al día</p>' :
          conAcciones.map(c => `<div class="action-item"><span>${getUrgencyEmoji(c.urgency)}</span><span>${c.action}</span></div>`).join('')}
      </div>
      <div class="panel">
        <div class="panel-title text-blue">📊 Ingresos mensuales</div>
        <canvas id="chart-ingresos-mini" height="180"></canvas>
      </div>
    </div>
  `;

  createChart('chart-ingresos-mini', {
    type: 'bar',
    data: { labels: meses, datasets: [{ label: 'Ingresos ($)', data: ingresosPorMes, backgroundColor: ingresosPorMes.map((_, i) => i === ingresosPorMes.length - 1 ? '#58a6ff' : '#238636'), borderRadius: 4 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => `$${(v / 1000).toFixed(0)}k` } } } },
  });

  await showImportBanner(container);
}

export { renderDashboard };
