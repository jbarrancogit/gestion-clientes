import { addCliente, getClientes, PLANES_PRECIO } from './db.js';
import { showToast } from './components/toast.js';

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = (values[i] || '').trim(); });
    return obj;
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
    else { current += ch; }
  }
  result.push(current);
  return result;
}

const ESTADO_MAP = {
  pendiente: 'prospecto', contactado: 'contactado',
  prototipo_enviado: 'prototipo_enviado', prototipo_aprobado: 'prototipo_aprobado',
  contrato_firmado: 'contrato_firmado', en_desarrollo: 'en_desarrollo',
  entregado: 'entregado', cerrado: 'cerrado',
};

function mapProspectoCSV(row) {
  const rawEstado = (row.Estado || row.estado || 'pendiente').toLowerCase().trim();
  return {
    negocio_nombre: row.Negocio || row.negocio || row.nombre_negocio || '',
    rubro: row.Rubro || row.rubro || '',
    telefono: row.Telefono || row.telefono || row.WhatsApp || '',
    email: row.Email || row.email || '',
    ubicacion: row.Direccion || row.direccion || row.departamento || row.Zona || '',
    estado: ESTADO_MAP[rawEstado] || 'prospecto',
    notas: row.Notas || row.notas || '',
    plan: '', precio: 0,
  };
}

function mapClienteJSON(data) {
  return {
    nombre_contacto: data.nombre_contacto || '',
    telefono: data.telefono || '',
    email: data.email || '',
    negocio_nombre: data.negocio_nombre || '',
    rubro: data.sector || data.rubro || '',
    ubicacion: data.ubicacion || data.direccion || '',
    plan: data.plan || 'starter',
    precio: data.precio || PLANES_PRECIO[data.plan] || 0,
    estado: data.estado || 'prototipo_enviado',
    fecha_inicio: data.fecha_inicio || new Date().toISOString(),
    notas: data.notas || '',
    pago_total: data.precio || PLANES_PRECIO[data.plan] || 0,
    pago_recibido: 0,
  };
}

async function showImportBanner(container) {
  const all = await getClientes();
  if (all.length > 0) return;

  const banner = document.createElement('div');
  banner.className = 'import-banner';
  banner.innerHTML = `
    <span>📥 ¿Querés importar tus datos existentes? (JSON de clientes o CSV de prospectos)</span>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-primary" id="btn-import-json">Importar JSON</button>
      <button class="btn btn-secondary" id="btn-import-csv">Importar CSV</button>
      <button class="btn btn-secondary" id="btn-dismiss-import">✕</button>
    </div>
  `;
  container.prepend(banner);

  banner.querySelector('#btn-dismiss-import').addEventListener('click', () => banner.remove());
  banner.querySelector('#btn-import-json').addEventListener('click', () => pickAndImportFiles('json', banner));
  banner.querySelector('#btn-import-csv').addEventListener('click', () => pickAndImportFiles('csv', banner));
}

function pickAndImportFiles(type, bannerEl) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = type === 'json' ? '.json' : '.csv';
  input.multiple = true;

  input.addEventListener('change', async () => {
    const files = Array.from(input.files);
    let imported = 0;
    for (const file of files) {
      const text = await file.text();
      try {
        if (type === 'json') {
          const data = JSON.parse(text);
          await addCliente(mapClienteJSON(data));
          imported++;
        } else {
          const rows = parseCSV(text);
          for (const row of rows) {
            const mapped = mapProspectoCSV(row);
            if (mapped.negocio_nombre) { await addCliente(mapped); imported++; }
          }
        }
      } catch (err) { showToast(`Error en ${file.name}: ${err.message}`, 'error'); }
    }
    if (imported > 0) {
      showToast(`${imported} registros importados`, 'success');
      if (bannerEl) bannerEl.remove();
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  });
  input.click();
}

export { parseCSV, mapProspectoCSV, mapClienteJSON, showImportBanner };
