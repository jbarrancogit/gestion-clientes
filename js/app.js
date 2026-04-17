import { renderNav, renderBottomNav, updateActiveNav } from './components/nav.js';
import { renderDashboard } from './views/dashboard.js';
import { renderPipeline } from './views/pipeline.js';
import { renderClientes } from './views/clientes.js';
import { renderProspectos } from './views/prospectos.js';
import { renderReportes } from './views/reportes.js';

const appEl = document.getElementById('app');
const navContainer = document.getElementById('nav-container');

const views = {
  '#dashboard': renderDashboard,
  '#pipeline': renderPipeline,
  '#clientes': renderClientes,
  '#prospectos': renderProspectos,
  '#reportes': renderReportes,
};

async function navigate() {
  const hash = (location.hash || '#dashboard').split('?')[0];
  updateActiveNav(hash);

  if (views[hash]) {
    await views[hash](appEl);
  } else {
    appEl.innerHTML = `<h2>Vista no encontrada</h2><p>Ruta: ${hash}</p>`;
  }
}

renderNav(navContainer);
renderBottomNav(document.getElementById('bottom-nav'));
window.addEventListener('hashchange', navigate);
navigate();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
