import React, { useMemo, useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { Bar, InterfaceChip } from './Chip';
import MemberTable, { type Member } from './MemberTable';

type Engine = { key: string; engine: string; version: string | null };
type Iface = {
  name: string;
  definedHere: boolean;
  definedIn: string | null;
  definedInTitle: string | null;
  kind: string;
  status: string | null;
  members: Member[];
  membersPresent: number[];
};
type Page = {
  engines: Engine[];
  date: string;
  spec: { id: string; title: string; url: string | null };
  totals: { interfaces: number; members: number; interfacesPresent: number[]; membersPresent: number[] };
  interfaces: Iface[];
};

function Group({ iface, engines, open, onToggle }: { iface: Iface; engines: Engine[]; open: boolean; onToggle: (open: boolean) => void }) {
  const n = iface.members.length;
  return (
    <details className="group" open={open} onToggle={(e) => onToggle((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>
        <span className="group__title">{iface.name}</span>
        <span className="group__meta">
          {iface.kind !== 'interface' ? `${iface.kind}, ` : ''}
          {n} member{n === 1 ? '' : 's'}
          {iface.definedHere ? '' : ` added to ${iface.name} (defined in ${iface.definedInTitle ?? iface.definedIn})`}
        </span>
        <span className="group__chips">
          {engines.map((e, i) =>
            iface.status ? (
              <InterfaceChip key={e.key} code={iface.status[i]} engine={e.engine} />
            ) : (
              <span key={e.key} className="status status--sm status--unknown" title={`${e.engine}: members present`}>
                <span className="sr-only">{e.engine}: </span>
                {iface.membersPresent[i]}/{n}
              </span>
            ),
          )}
        </span>
      </summary>
      {open ? (
        <div className="group__body">
          <MemberTable members={iface.members} engines={engines} caption={`Members of ${iface.name} in this spec, per engine`} />
          <p style={{ margin: '0.6rem 1rem' }}>
            <Link to={`/coverage/interface/${iface.name}`}>All of {iface.name}, every spec →</Link>
          </p>
        </div>
      ) : null}
    </details>
  );
}

export default function SpecPage({ page }: { page: Page }) {
  const { spec, engines, totals } = page;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return page.interfaces;
    return page.interfaces.filter((i) => i.name.toLowerCase().includes(q) || i.members.some((m) => m[0].toLowerCase().includes(q)));
  }, [query, page.interfaces]);
  const setAll = (value: boolean) => setOpen(Object.fromEntries(shown.map((i) => [i.name, value])));

  return (
    <Layout title={`${spec.title}: coverage`} description={`Which ${spec.title} interfaces and members exist in happy-dom, jsdom, linkedom and warpdom.`}>
      <main className="dp-page">
        <p className="dp-crumbs">
          <Link to="/coverage">Coverage</Link> / {spec.id}
        </p>
        <h1>{spec.title}</h1>
        <p className="meta">
          {spec.url ? (
            <>
              Specification: <a href={spec.url}>{spec.url.replace(/^https?:\/\//, '')}</a>.{' '}
            </>
          ) : null}
          {totals.interfaces} interface{totals.interfaces === 1 ? '' : 's'} defined here, {totals.members} members exposed on Window (Web IDL).
        </p>
        <p className="dp-note">
          Existence only: “present” means the name is defined where Web IDL puts it, not that it behaves as the standard says.
          The <Link to="/">featured checks</Link> test behavior.
        </p>

        <div className="panel">
          <div className="dp-scroll">
            <table className="grid-dp">
              <caption className="sr-only">Share present per engine</caption>
              <thead>
                <tr>
                  <th scope="col">Engine</th>
                  <th scope="col">Members present</th>
                  <th scope="col">Interfaces present</th>
                </tr>
              </thead>
              <tbody>
                {engines.map((e, i) => (
                  <tr key={e.key}>
                    <th scope="row">
                      {e.engine} <span className="results__version">{e.version}</span>
                    </th>
                    <td>
                      <Bar value={totals.membersPresent[i]} total={totals.members} label={e.engine} />
                    </td>
                    <td className="num">
                      {totals.interfaces ? `${totals.interfacesPresent[i]} of ${totals.interfaces}` : '–'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="filters" role="search">
          <label>
            <span>Filter interfaces and members</span>
            <input type="search" value={query} placeholder="e.g. Element, scroll" onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>
        <div className="toolbar">
          <span className="filters__count" aria-live="polite">
            {shown.length} of {page.interfaces.length} interfaces
          </span>
          <button type="button" onClick={() => setAll(true)}>Expand all</button>
          <button type="button" onClick={() => setAll(false)}>Collapse all</button>
        </div>
        {shown.map((iface) => (
          <Group
            key={iface.name}
            iface={iface}
            engines={engines}
            open={!!open[iface.name]}
            onToggle={(v) => setOpen((o) => (o[iface.name] === v ? o : { ...o, [iface.name]: v }))}
          />
        ))}
        <p className="meta" style={{ marginTop: '1.5rem' }}>
          Probed {page.date.slice(0, 10)}. Data: <Link to="pathname:///data/idl.json">idl.json</Link> (CC BY 4.0).
        </p>
      </main>
    </Layout>
  );
}
