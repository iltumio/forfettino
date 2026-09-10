import test from 'node:test';
import assert from 'node:assert/strict';

import type { Scadenza } from '../../types';
import { FINESTRA_GIORNI_SCADENZE, selezionaScadenzeInEvidenza } from './scadenze';

const OGGI = new Date(2025, 5, 15); // 15 giugno 2025

const mkScadenza = (date: string, extra: Partial<Scadenza> = {}): Scadenza => ({
  id: '1',
  userId: 'u',
  visibleId: 'v',
  annoRiferimento: 2024,
  annoVersamento: 2025,
  date,
  tipo: 'saldo_irpef',
  label: 'Saldo imposta sostitutiva',
  importo: 1000,
  interessi: 0,
  totale: 1000,
  pagato: false,
  ...extra,
});

test('includes unpaid overdue scadenze and unpaid ones within the 30-day window', () => {
  const result = selezionaScadenzeInEvidenza(
    [
      mkScadenza('2025-06-10'), // 5 giorni di ritardo
      mkScadenza('2025-06-15'), // oggi
      mkScadenza('2025-06-20'), // tra 5 giorni
      mkScadenza('2025-07-15'), // ultimo giorno della finestra
      mkScadenza('2025-07-16'), // oltre la finestra
    ],
    OGGI,
  );

  assert.deepEqual(
    result.map(r => [r.stato, r.giorni]),
    [
      ['scaduta', 5],
      ['imminente', 0],
      ['imminente', 5],
      ['imminente', FINESTRA_GIORNI_SCADENZE],
    ],
  );
});

test('excludes paid scadenze and those beyond the window', () => {
  const result = selezionaScadenzeInEvidenza(
    [
      mkScadenza('2025-06-10', { pagato: true }),
      mkScadenza('2025-07-16'),
    ],
    OGGI,
  );

  assert.deepEqual(result, []);
});

test('sorts chronologically with overdue first', () => {
  const result = selezionaScadenzeInEvidenza(
    [
      mkScadenza('2025-06-20', { id: '3' }),
      mkScadenza('2025-05-01', { id: '2' }),
      mkScadenza('2025-04-01', { id: '1' }),
    ],
    OGGI,
  );

  assert.deepEqual(result.map(r => r.scadenza.date), ['2025-04-01', '2025-05-01', '2025-06-20']);
});

test('counts days correctly across a DST boundary', () => {
  // Dal 1° al 31 marzo 2025 passa il cambio ora (30 marzo).
  const result = selezionaScadenzeInEvidenza([mkScadenza('2025-03-31')], new Date(2025, 2, 1));

  assert.deepEqual(result.map(r => r.giorni), [FINESTRA_GIORNI_SCADENZE]);
});
