import { db, addCliente, getAllForSync, applyRemote } from '../db.js';
import { showToast } from './toast.js';
import { init as initSync, signIn, signOut, getUser, getStatus, onAuthChange, onStatusChange, SYNC_ENABLED } from '../sync.js';

const STATUS_LABELS = {
  idle: '⚫ sin sincronizar',
  'signing-in': '🔵 iniciando sesión...',
  syncing: '🔄 sincronizando...',
  synced: '🟢 sincronizado',
  error: '🔴 error de sync',
};

function renderSettingsButton() {
  const btn = document.createElement('button');
  btn.id = 'settings-btn';
  btn.className = 'settings-btn';
  btn.innerHTML = '⚙️';
  btn.title = 'Ajustes y backup';
  btn.addEventListener('click', openPanel);
  document.body.appendChild(btn);
}

function openPanel() {
  let overlay = document.querySelector('.settings-overlay');
  if (overlay) { overlay.remove(); }
  overlay = document.createElement('div');
  overlay.className = 'settings-overlay';
  overlay.innerHTML = `<div class="settings-panel" id="settings-panel"></div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  renderPanelContent(overlay.querySelector('#settings-panel'));

  onAuthChange(() => renderPanelContent(overlay.querySelector('#settings-panel')));
  onStatusChange(() => renderPanelContent(overlay.querySelector('#settings-panel')));
}

function renderPanelContent(panel) {
  if (!panel) return;
  const user = getUser();
  const status = getStatus();

  let syncSection = '';
  if (!SYNC_ENABLED) {
    syncSection = `
      <div class="settings-section">
        <h3>Sync en la nube</h3>
        <p class="settings-muted">Sync desactivado. Pegá tu <code>firebaseConfig</code> en <code>js/firebase-config.js</code> para activar.
        Ver <code>SETUP_FIREBASE.md</code>.</p>
      </div>`;
  } else if (!user) {
    syncSection = `
      <div class="settings-section">
        <h3>Sync en la nube</h3>
        <p class="settings-muted">Iniciá sesión para sincronizar tus datos y no volver a perderlos.</p>
        <button class="btn btn-primary" id="btn-signin">Iniciar sesión con Google</button>
      </div>`;
  } else {
    syncSection = `
      <div class="settings-section">
        <h3>Sync en la nube</h3>
        <div class="settings-row">
          <div>
            <div class="settings-user">${user.displayName || user.email}</div>
            <div class="settings-muted">${user.email}</div>
          </div>
          <button class="btn btn-secondary" id="btn-signout">Salir</button>
        </div>
        <div class="settings-status">${STATUS_LABELS[status] || status}</div>
      </div>`;
  }

  panel.innerHTML = `
    <div class="settings-header">
      <h2>Ajustes</h2>
      <button class="settings-close" aria-label="Cerrar">✕</button>
    </div>
    ${syncSection}
    <div class="settings-section">
      <h3>Backup local</h3>
      <p class="settings-muted">Descargá todo a un archivo <code>.json</code> o restaurá desde uno.</p>
      <div class="settings-actions">
        <button class="btn btn-primary" id="btn-export">⬇ Exportar JSON</button>
        <button class="btn btn-secondary" id="btn-import">⬆ Importar JSON</button>
      </div>
    </div>
  `;

  panel.querySelector('.settings-close').addEventListener('click', () => panel.closest('.settings-overlay').remove());
  const signInBtn = panel.querySelector('#btn-signin');
  if (signInBtn) signInBtn.addEventListener('click', signIn);
  const signOutBtn = panel.querySelector('#btn-signout');
  if (signOutBtn) signOutBtn.addEventListener('click', signOut);
  panel.querySelector('#btn-export').addEventListener('click', exportAll);
  panel.querySelector('#btn-import').addEventListener('click', pickImport);
}

async function exportAll() {
  const data = {
    version: 2,
    exported_at: new Date().toISOString(),
    clientes: await getAllForSync('clientes'),
    pagos: await getAllForSync('pagos'),
    actividades: await getAllForSync('actividades'),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().split('T')[0];
  a.download = `gestion-clientes-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup descargado', 'success');
}

function pickImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.clientes)) throw new Error('Archivo no válido');
      if (!confirm(`¿Importar backup con ${data.clientes.length} clientes? Los registros existentes con el mismo id serán reemplazados si el backup es más reciente.`)) return;
      let count = 0;
      for (const t of ['clientes', 'pagos', 'actividades']) {
        for (const r of (data[t] || [])) {
          if (!r.id) r.id = crypto.randomUUID();
          if (!r.updated_at) r.updated_at = r.created_at || r.fecha || new Date().toISOString();
          await applyRemote(t, r);
          count++;
        }
      }
      showToast(`${count} registros importados`, 'success');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (e) {
      showToast(`Error: ${e.message}`, 'error');
    }
  });
  input.click();
}

async function mount() {
  renderSettingsButton();
  if (SYNC_ENABLED) await initSync();
}

export { mount };
