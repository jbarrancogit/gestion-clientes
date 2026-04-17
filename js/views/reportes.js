import { db, getClientes, ESTADOS } from '../db.js';
import { createChart } from '../components/charts.js';
import { daysSince } from '../urgency.js';

const ESTADO_COLORS = {
  prospecto: '#8b949e', contactado: '#58a6ff', prototipo_enviado: '#d2a8ff',
  prototipo_aprobado: '#bc8cff', contrato_firmado: '#f0883e',
  en_desarrollo: '#58a6ff', entregado: '#7ee787', cerrado: '#238636',
};
const PLAN_COLORS = { starter: '#58a6ff', profesional: '#d2a8ff', premium: '#7ee787' };

async function renderReportes(container) {
  const clientes = await getClientes();
  const pagos = await db.pagos.toArray();
  const now = new Date();

  container.innerHTML = `
    <h2 class="mb-24">Reportes</h2>
    <div class="charts-grid">
      <div class="chart-panel"><div class="chart-title">💰 Ingresos mensuales por plan</div><canvas id="chart-ingresos"></canvas></div>
      <div class="chart-panel"><div class="chart-title">🔽 Embudo de conversión</div><canvas id="chart-funnel"></canvas></div>
      <div class="chart-panel"><div class="chart-title">📊 Distribución por plan</div><canvas id="chart-planes"></canvas></div>
      <div class="chart-panel"><div class="chart-title">📅 Timeline de clientes</div><canvas id="chart-timeline"></canvas></div>
      <div class="chart-panel"><div class="chart-title">💳 Pagos recibidos vs. pendientes</div><canvas id="chart-pagos"></canvas></div>
      <div class="chart-panel"><div class="chart-title">📈 Tasa de conversión mensual</div><canvas id="chart-conversion"></canvas></div>
    </div>`;

  const meses = [];
  for (let i = 5; i >= 0; i--) meses.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  const mesLabels = meses.map(d => d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }));
  const planNames = ['starter', 'profesional', 'premium'];

  // 1. Ingresos por plan
  createChart('chart-ingresos', {
    type: 'bar',
    data: { labels: mesLabels, datasets: planNames.map(plan => ({
      label: plan.charAt(0).toUpperCase() + plan.slice(1),
      data: meses.map(m => pagos.filter(p => { const f = new Date(p.fecha); const c = clientes.find(cl => cl.id === p.cliente_id); return f.getMonth() === m.getMonth() && f.getFullYear() === m.getFullYear() && c && c.plan === plan; }).reduce((s, p) => s + p.monto, 0)),
      backgroundColor: PLAN_COLORS[plan], borderRadius: 4,
    })) },
    options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { callback: v => `$${(v/1000).toFixed(0)}k` } } } },
  });

  // 2. Funnel
  const funnelStages = [
    { label: 'Prospectos', filter: () => true },
    { label: 'Contactados', filter: c => ESTADOS.indexOf(c.estado) >= 1 },
    { label: 'Prototipo', filter: c => ESTADOS.indexOf(c.estado) >= 2 },
    { label: 'Contrato', filter: c => ESTADOS.indexOf(c.estado) >= 4 },
    { label: 'Cerrados', filter: c => ESTADOS.indexOf(c.estado) >= 6 },
  ];
  createChart('chart-funnel', {
    type: 'bar',
    data: { labels: funnelStages.map(s => s.label), datasets: [{ data: funnelStages.map(s => clientes.filter(s.filter).length), backgroundColor: ['#8b949e','#58a6ff','#d2a8ff','#f0883e','#7ee787'], borderRadius: 4 }] },
    options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } },
  });

  // 3. Donut por plan
  const noProspectos = clientes.filter(c => c.plan);
  createChart('chart-planes', {
    type: 'doughnut',
    data: { labels: planNames.map(p => p.charAt(0).toUpperCase() + p.slice(1)), datasets: [{ data: planNames.map(p => noProspectos.filter(c => c.plan === p).length), backgroundColor: planNames.map(p => PLAN_COLORS[p]) }] },
    options: { responsive: true },
  });

  // 4. Timeline
  const activeClients = clientes.filter(c => c.estado !== 'prospecto' && c.plan);
  createChart('chart-timeline', {
    type: 'bar',
    data: { labels: activeClients.map(c => c.negocio_nombre), datasets: ESTADOS.filter(e => e !== 'prospecto').map(estado => ({
      label: estado.replace(/_/g, ' '),
      data: activeClients.map(c => { const cIdx = ESTADOS.indexOf(c.estado); const eIdx = ESTADOS.indexOf(estado); return eIdx <= cIdx ? (eIdx === cIdx ? Math.max(daysSince(c.updated_at), 1) : Math.max(1, Math.floor(Math.random() * 5) + 1)) : 0; }),
      backgroundColor: ESTADO_COLORS[estado],
    })) },
    options: { indexAxis: 'y', responsive: true, scales: { x: { stacked: true, title: { display: true, text: 'Días', color: '#8b949e' } }, y: { stacked: true } }, plugins: { legend: { position: 'bottom' } } },
  });

  // 5. Pagos recibidos vs pendientes
  const pagosRecibidos = meses.map(m => pagos.filter(p => { const f = new Date(p.fecha); return f.getMonth() === m.getMonth() && f.getFullYear() === m.getFullYear(); }).reduce((s, p) => s + p.monto, 0));
  const pagosPendientes = meses.map(m => clientes.filter(c => { const f = new Date(c.fecha_inicio); return f.getMonth() === m.getMonth() && f.getFullYear() === m.getFullYear(); }).reduce((s, c) => s + Math.max(0, (c.pago_total || 0) - (c.pago_recibido || 0)), 0));
  createChart('chart-pagos', {
    type: 'bar',
    data: { labels: mesLabels, datasets: [
      { label: 'Recibido', data: pagosRecibidos, backgroundColor: '#7ee787', borderRadius: 4 },
      { label: 'Pendiente', data: pagosPendientes, backgroundColor: '#f0883e40', borderRadius: 4 },
    ] },
    options: { responsive: true, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { callback: v => `$${(v/1000).toFixed(0)}k` } } } },
  });

  // 6. Conversión mensual
  const conversionRates = meses.map(m => {
    const mesClientes = clientes.filter(c => { const f = new Date(c.fecha_inicio); return f.getMonth() === m.getMonth() && f.getFullYear() === m.getFullYear(); });
    const total = mesClientes.length || 1;
    return Math.round((mesClientes.filter(c => ['entregado', 'cerrado'].includes(c.estado)).length / total) * 100);
  });
  createChart('chart-conversion', {
    type: 'line',
    data: { labels: mesLabels, datasets: [{ label: 'Conversión (%)', data: conversionRates, borderColor: '#d2a8ff', backgroundColor: 'rgba(210,168,255,0.1)', fill: true, tension: 0.3, pointRadius: 4, pointBackgroundColor: '#d2a8ff' }] },
    options: { responsive: true, scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => `${v}%` } } } },
  });
}

export { renderReportes };
