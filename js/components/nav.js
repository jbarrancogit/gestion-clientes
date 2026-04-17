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

function renderBottomNav(container) {
  container.innerHTML = NAV_ITEMS.map(item => `
    <a class="bottom-nav-item" href="${item.hash}" data-route="${item.hash}">
      <span class="nav-icon">${item.icon}</span>
      <span>${item.label}</span>
    </a>
  `).join('');
}

function updateActiveNav(hash) {
  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.route === hash);
  });
}

export { renderNav, renderBottomNav, updateActiveNav, NAV_ITEMS };
