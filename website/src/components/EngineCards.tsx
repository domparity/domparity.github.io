import React from 'react';
import Link from '@docusaurus/Link';
import results from '../data/results.json';
import idl from '../data/idl-summary.json';
import { STATUS, type Status } from './status';
import { Bar } from './coverage/Chip';
import { MaintainerNote } from './EngineName';
import { coverageScope, type ScopeId } from './scope';

const ORDER: Status[] = ['supported', 'partial', 'stub', 'missing'];

// One card per engine: featured API statuses and existence coverage, in one
// scope (a spec group, or every spec); "Test DOM core" by default.
export default function EngineCards({ featured = true, scope = 'core' }: { featured?: boolean; scope?: ScopeId }) {
  const r = results as unknown as { engines: { key: string; engine: string; version: string }[]; apis: { id: string }[]; results: Record<string, Record<string, { status: Status }>> };
  const { totals: t, noun } = coverageScope(scope);
  return (
    <div className="cards">
      {idl.engines.map((e, i) => {
        const fe = r.engines.find((x) => x.engine === e.engine);
        const counts = Object.fromEntries(ORDER.map((s) => [s, 0])) as Record<Status, number>;
        if (fe) for (const api of r.apis) counts[r.results[api.id][fe.key].status]++;
        const total = r.apis.length;
        return (
          <section className="card-dp" key={e.key} aria-label={`${e.engine} ${e.version}`}>
            <h3>{e.engine}</h3>
            <span className="card-dp__version">
              version {e.version}
              <MaintainerNote engine={e.engine} inline />
            </span>
            {featured && fe ? (
              <>
                <div className="card-dp__big">
                  {counts.supported}
                  <small>/ {total}</small>
                </div>
                <p className="card-dp__label">featured APIs fully supported</p>
                <div className="stack" role="img" aria-label={ORDER.map((s) => `${counts[s]} ${STATUS[s].label.toLowerCase()}`).join(', ')}>
                  {ORDER.map((s) => (counts[s] ? <span key={s} className={`s-${s}`} style={{ width: `${(100 * counts[s]) / total}%` }} /> : null))}
                </div>
                <ul className="stack-legend" aria-hidden="true">
                  {ORDER.map((s) => (
                    <li key={s}>
                      <i className={`s-${s}`} style={{ background: `var(--st-${s}-solid)` }} />
                      {counts[s]} {STATUS[s].label.toLowerCase()}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <div className="card-dp__row">
              <div className="card-dp__row-head">
                <span>Members present</span>
                <strong>
                  {t.membersPresent[i].toLocaleString('en')} / {t.members.toLocaleString('en')}
                </strong>
              </div>
              <Bar value={t.membersPresent[i]} total={t.members} label={`${e.engine}, ${noun} members`} />
              <p className="scope-dp">of {t.members.toLocaleString('en')} {noun} members</p>
              <div className="card-dp__row-head" style={{ marginTop: '0.6rem' }}>
                <span>Interfaces present</span>
                <strong>
                  {t.interfacesPresent[i]} / {t.interfaces}
                </strong>
              </div>
              <Bar value={t.interfacesPresent[i]} total={t.interfaces} label={`${e.engine}, ${noun} interfaces`} />
              <p className="scope-dp">of {t.interfaces.toLocaleString('en')} {noun} interfaces</p>
              {t.nodeGlobals[i] ? (
                <p className="card-dp__label" style={{ marginBottom: 0 }}>
                  {t.nodeGlobals[i]} of them {t.nodeGlobals[i] === 1 ? 'is' : 'are'} Node.js's own global{t.nodeGlobals[i] === 1 ? '' : 's'}.
                </p>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
