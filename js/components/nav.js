const NAV_ITEMS = [
  { hash: '#dashboard', icon: '📊', label: 'Dashboard' },
  { hash: '#pipeline', icon: '📋', label: 'Pipeline' },
  { hash: '#clientes', icon: '👥', label: 'Clientes' },
  { hash: '#prospectos', icon: '🔍', label: 'Prospectos' },
  { hash: '#reportes', icon: '📈', label: 'Reportes' },
];

function renderNav(container) {
  container.innerHTML = `
    <div class="nav-logo">📋 Gestión Clientes</div>
    <nav>
      ${NAV_ITEMS.map(item => `
        <a class="nav-item" href="${item.hash}" data-route="${item.hash}">
          <span>${item.icon}</span>
          <span>${item.label}</span>
        </a>
      `).join('')}
    </nav>
  `;
}

function updateActiveNav(hash) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.route === hash);
  });
}

export { renderNav, updateActiveNav, NAV_ITEMS };
