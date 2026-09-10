import type { Scadenza } from '../../types';
import { parseDateLocal } from './dateHelpers';

/**
 * Finestra di visibilità delle scadenze sulla dashboard: un mese avanti.
 * Allineata ai 30 giorni usati dalla pagina Scadenze per il badge "PROSSIMA".
 */
export const FINESTRA_GIORNI_SCADENZE = 30;

export type StatoScadenza = 'scaduta' | 'imminente';

export interface ScadenzaInEvidenza {
  scadenza: Scadenza;
  stato: StatoScadenza;
  /** Giorni di ritardo (scaduta) o giorni mancanti (imminente, 0 = oggi). */
  giorni: number;
}

const MS_PER_GIORNO = 24 * 60 * 60 * 1000;

const toMidnight = (dateStr: string): Date => {
  const d = parseDateLocal(dateStr);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

/**
 * Seleziona le scadenze non pagate da mostrare sulla dashboard:
 * quelle già scadute e quelle imminenti entro la finestra di un mese,
 * in ordine cronologico (scadute per prime).
 */
export function selezionaScadenzeInEvidenza(
  scadenze: Scadenza[],
  oggi: Date,
  finestraGiorni = FINESTRA_GIORNI_SCADENZE,
): ScadenzaInEvidenza[] {
  const oggiMidnight = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate());
  const limite = new Date(oggiMidnight);
  limite.setDate(limite.getDate() + finestraGiorni);

  return scadenze
    .filter(s => !s.pagato)
    .map(scadenza => {
      const dataMidnight = toMidnight(scadenza.date);
      const giorni = Math.round((dataMidnight.getTime() - oggiMidnight.getTime()) / MS_PER_GIORNO);
      if (giorni < 0) return { scadenza, stato: 'scaduta' as const, giorni: -giorni };
      if (dataMidnight.getTime() <= limite.getTime()) {
        return { scadenza, stato: 'imminente' as const, giorni };
      }
      return null;
    })
    .filter((r): r is ScadenzaInEvidenza => r !== null)
    .sort((a, b) =>
      a.scadenza.date.localeCompare(b.scadenza.date) || a.scadenza.id.localeCompare(b.scadenza.id)
    );
}
