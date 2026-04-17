import { describe, it, expect } from 'vitest';
import { calcUrgency, getUrgencyClass, getPendingActions } from '../js/urgency.js';

describe('calcUrgency', () => {
  it('returns "critical" when >5 days in prototipo_enviado', () => {
    const cliente = { estado: 'prototipo_enviado', updated_at: new Date(Date.now() - 6 * 86400000).toISOString() };
    expect(calcUrgency(cliente)).toBe('critical');
  });
  it('returns "urgent" when >3 days in prototipo_enviado', () => {
    const cliente = { estado: 'prototipo_enviado', updated_at: new Date(Date.now() - 4 * 86400000).toISOString() };
    expect(calcUrgency(cliente)).toBe('urgent');
  });
  it('returns "normal" for active client within time', () => {
    const cliente = { estado: 'en_desarrollo', updated_at: new Date(Date.now() - 1 * 86400000).toISOString(), pago_recibido: 49500, pago_total: 99000 };
    expect(calcUrgency(cliente)).toBe('normal');
  });
  it('returns "pending" for uncontacted prospect', () => {
    const cliente = { estado: 'prospecto', updated_at: new Date().toISOString() };
    expect(calcUrgency(cliente)).toBe('pending');
  });
  it('returns "urgent" when payment overdue (contrato_firmado, 0 paid)', () => {
    const cliente = { estado: 'contrato_firmado', updated_at: new Date(Date.now() - 4 * 86400000).toISOString(), pago_recibido: 0, pago_total: 99000 };
    expect(calcUrgency(cliente)).toBe('urgent');
  });
});

describe('getUrgencyClass', () => {
  it('maps urgency levels to CSS classes', () => {
    expect(getUrgencyClass('critical')).toBe('urgency-critical');
    expect(getUrgencyClass('urgent')).toBe('urgency-urgent');
    expect(getUrgencyClass('normal')).toBe('urgency-normal');
    expect(getUrgencyClass('pending')).toBe('urgency-pending');
  });
});

describe('getPendingActions', () => {
  it('returns action text for critical client', () => {
    const cliente = { negocio_nombre: 'Brillantina', estado: 'prototipo_enviado', updated_at: new Date(Date.now() - 6 * 86400000).toISOString() };
    const action = getPendingActions(cliente);
    expect(action).toContain('Brillantina');
    expect(action).toContain('6');
  });
  it('returns payment reminder for unpaid contrato_firmado', () => {
    const cliente = { negocio_nombre: 'Test', estado: 'contrato_firmado', updated_at: new Date(Date.now() - 2 * 86400000).toISOString(), pago_recibido: 0, pago_total: 99000 };
    const action = getPendingActions(cliente);
    expect(action.toLowerCase()).toContain('pago');
  });
});
