import React from 'react';
import { IDL_INTERFACE, IDL_MEMBER } from '../status';

// A status chip for the existence pass: color + symbol + text.
export function InterfaceChip({ code, engine }: { code: string; engine?: string }) {
  const s = IDL_INTERFACE[code] ?? IDL_INTERFACE['?'];
  return (
    <span className={`status status--sm status--${s.status}`} title={`${engine ? `${engine}: ` : ''}${s.meaning}`}>
      <span aria-hidden="true">{s.symbol}</span>
      {engine ? <span className="sr-only">{engine}: </span> : null}
      {s.label}
    </span>
  );
}

export function MemberChip({ code, engine }: { code: string; engine?: string }) {
  const s = IDL_MEMBER[code] ?? IDL_MEMBER['?'];
  return (
    <span className={`status status--sm status--${s.status}`} title={s.meaning}>
      <span aria-hidden="true">{s.symbol}</span>
      {engine ? <span className="sr-only">{engine}: </span> : null}
      {s.label}
    </span>
  );
}

// "n of total" as a bar with the percentage as text.
export function Bar({ value, total, label }: { value: number; total: number; label?: string }) {
  const pct = total ? (100 * value) / total : 0;
  const text = total ? `${pct < 1 && value > 0 ? '<1' : Math.round(pct)}%` : '–';
  return (
    <span className="bar" title={`${label ? `${label}: ` : ''}${value} of ${total}`}>
      <span className="bar__track" aria-hidden="true">
        <span className="bar__fill" style={{ width: `${pct}%`, display: 'block' }} />
      </span>
      <span className="bar__text">
        {text}
        <span className="sr-only"> ({value} of {total})</span>
      </span>
    </span>
  );
}
