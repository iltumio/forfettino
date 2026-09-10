import { useMemo } from 'react';
import { CalendarClock } from '../shared/icons';
import { useApp } from '../../context/AppContext';
import { FINESTRA_GIORNI_SCADENZE, selezionaScadenzeInEvidenza, type ScadenzaInEvidenza } from '../../lib/utils/scadenze';
import { formatDateLong } from '../../lib/utils/dateHelpers';
import { Currency } from './Currency';
import type { Scadenza } from '../../types';

const getTipoColor = (tipo: string) => {
  if (tipo.includes('irpef')) return 'var(--accent-orange)';
  return 'var(--accent-primary)';
};

const pluraOGiorni = (giorni: number) => (giorni === 1 ? 'giorno' : 'giorni');

function BadgeScadenza({ riga }: { riga: ScadenzaInEvidenza }) {
  if (riga.stato === 'scaduta') {
    return (
      <span style={{
        background: 'var(--accent-red)',
        color: '#fff',
        fontSize: '0.65rem',
        padding: '2px 6px',
        borderRadius: 4,
        fontWeight: 600,
      }}>
        SCADUTA
      </span>
    );
  }

  const text = riga.giorni === 0 ? 'OGGI' : riga.giorni === 1 ? 'DOMANI' : `TRA ${riga.giorni} ${pluraOGiorni(riga.giorni).toUpperCase()}`;
  return (
    <span style={{
      background: 'var(--accent-orange)',
      color: '#000',
      fontSize: '0.65rem',
      padding: '2px 6px',
      borderRadius: 4,
      fontWeight: 600,
    }}>
      {text}
    </span>
  );
}

interface ScadenzaRowProps {
  riga: ScadenzaInEvidenza;
  onPagato: (scadenza: Scadenza) => void;
}

function ScadenzaRow({ riga, onPagato }: ScadenzaRowProps) {
  const { scadenza, stato, giorni } = riga;
  const scaduta = stato === 'scaduta';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 12px',
      background: scaduta ? 'rgba(239, 68, 68, 0.08)' : 'rgba(251, 191, 36, 0.08)',
      borderRadius: 8,
      marginBottom: 8,
    }}>
      <button
        onClick={() => onPagato(scadenza)}
        aria-label={`Segna come pagato: ${scadenza.label}`}
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '2px solid var(--border)',
          background: 'transparent',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        title="Segna come pagato"
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 500, color: getTipoColor(scadenza.tipo) }}>{scadenza.label}</span>
          <BadgeScadenza riga={riga} />
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
          {formatDateLong(scadenza.date)} · Anno rif. {scadenza.annoRiferimento}
          {scaduta && ` · scaduta da ${giorni} ${pluraOGiorni(giorni)}`}
        </div>
      </div>

      <div style={{
        fontFamily: 'Space Mono, monospace',
        fontWeight: 600,
        color: scaduta ? 'var(--accent-red)' : 'var(--accent-orange)',
        flexShrink: 0,
      }}>
        <Currency amount={scadenza.totale} tabular />
      </div>
    </div>
  );
}

/**
 * Card della dashboard con le scadenze imminenti (un mese avanti)
 * e quelle scadute non ancora pagate.
 */
export function ProssimeScadenze() {
  const { scadenze, updateScadenza, showToast } = useApp();

  const righe = useMemo(
    () => selezionaScadenzeInEvidenza(scadenze, new Date()),
    [scadenze],
  );
  const totaleDaVersare = righe.reduce((sum, r) => sum + r.scadenza.totale, 0);
  const hasScadute = righe.some(r => r.stato === 'scaduta');

  const handlePagato = async (scadenza: Scadenza) => {
    try {
      await updateScadenza({
        ...scadenza,
        pagato: true,
        dataPagamento: new Date().toISOString().split('T')[0],
      });
      showToast('Scadenza contrassegnata come pagata', 'success');
    } catch (error) {
      console.error('Errore aggiornamento scadenza:', error);
      showToast("Errore durante l'aggiornamento della scadenza", 'error');
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 className="card-title">Prossime Scadenze</h2>
          <div className="stat-label">Entro {FINESTRA_GIORNI_SCADENZE} giorni e scadute non pagate</div>
        </div>
        {righe.length > 0 && (
          <div className="stat-value" style={{ color: hasScadute ? 'var(--accent-red)' : 'var(--accent-orange)' }}>
            <Currency amount={totaleDaVersare} />
          </div>
        )}
      </div>

      {righe.length > 0 ? (
        <>
          <div style={{ marginTop: 12, maxHeight: 360, overflowY: 'auto' }}>
            {righe.map(riga => (
              <ScadenzaRow key={riga.scadenza.id} riga={riga} onPagato={handlePagato} />
            ))}
          </div>
          <a
            href="#/scadenze"
            style={{ display: 'inline-block', marginTop: 8, fontSize: '0.85rem', color: 'var(--accent-readable)' }}
          >
            Gestisci scadenze →
          </a>
        </>
      ) : (
        <div className="empty-state" style={{ padding: '32px 20px' }}>
          <CalendarClock size={40} aria-hidden="true" />
          <p>Nessuna scadenza imminente o scaduta da pagare</p>
          <a href="#/scadenze" style={{ color: 'var(--accent-readable)', fontSize: '0.85rem' }}>
            Generale dalla pagina Scadenze
          </a>
        </div>
      )}
    </div>
  );
}
