import { describe, it, expect } from 'vitest';
import { parseCSV, mapProspectoCSV, mapClienteJSON } from '../js/import.js';

describe('parseCSV', () => {
  it('parses CSV text into array of objects', () => {
    const csv = `Negocio,Rubro,Telefono,Estado
Café Aroma,gastronomía,261-555-1111,pendiente
Bar Luna,bar,261-555-2222,prototipo_enviado`;
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].Negocio).toBe('Café Aroma');
    expect(rows[1].Telefono).toBe('261-555-2222');
  });

  it('handles quoted fields with commas', () => {
    const csv = `Negocio,Rubro
"Café, Bar y Resto",gastronomía`;
    const rows = parseCSV(csv);
    expect(rows[0].Negocio).toBe('Café, Bar y Resto');
  });
});

describe('mapProspectoCSV', () => {
  it('maps CSV row to cliente fields', () => {
    const row = { Negocio: 'Test Shop', Rubro: 'comercio', Telefono: '261-555-0000', Estado: 'pendiente' };
    const mapped = mapProspectoCSV(row);
    expect(mapped.negocio_nombre).toBe('Test Shop');
    expect(mapped.rubro).toBe('comercio');
    expect(mapped.telefono).toBe('261-555-0000');
    expect(mapped.estado).toBe('prospecto');
  });

  it('maps prototipo_enviado estado correctly', () => {
    const row = { Negocio: 'X', Estado: 'prototipo_enviado' };
    expect(mapProspectoCSV(row).estado).toBe('prototipo_enviado');
  });
});

describe('mapClienteJSON', () => {
  it('maps datos-cliente.json format', () => {
    const data = { nombre_contacto: 'Juan', telefono: '261-555-0001', negocio_nombre: 'Tienda', sector: 'comercio', plan: 'starter', fecha_inicio: '2026-04-01' };
    const mapped = mapClienteJSON(data);
    expect(mapped.rubro).toBe('comercio');
    expect(mapped.plan).toBe('starter');
    expect(mapped.nombre_contacto).toBe('Juan');
  });
});
