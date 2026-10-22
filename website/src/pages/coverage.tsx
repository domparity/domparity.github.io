import React, { useEffect, useMemo, useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import idl from '../data/idl-summary.json';
import EngineCards from '../components/EngineCards';
import CoverageSearch from '../components/coverage/CoverageSearch';
import { Bar } from '../components/coverage/Chip';
import { IDL_INTERFACE } from '../components/status';
import EngineName from '../components/EngineName';
import { coverageScope, SCOPES, DEFAULT_SCOPE, ALL } from '../components/scope';

type Spec = (typeof idl.specs)[number];

function SpecTable({ specs, caption }: { specs: Spec[]; caption: string }) {
  return (
    <div className="dp-scroll">
      <table className="grid-dp">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Spec</th>
            <th scope="col">Members</th>
            {idl.engines.map((e) => (
              <th scope="col" key={e.key}>
                <EngineName engine={e.engine} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {specs.map((s) => (
            <tr key={s.id}>
              <th scope="row" style={{ minWidth: '12rem' }}>
                <Link to={`/coverage/spec/${s.slug}`}>{s.title}</Link>
              </th>
              <td className="num">{s.members}</td>
              {idl.engines.map((e, i) => (
                <td key={e.key}>
                  <Bar value={s.membersPresent[i]} total={s.members} label={`${e.engine}, ${s.title}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Group tabs: the selected group is kept in the URL hash (#group=media) so a
// view can be linked; "Test DOM core" when there is none.
function useScope(): [string, (id: string) => void] {
  const [scope, setScope] = useState(DEFAULT_SCOPE);
  useEffect(() => {
    const read = () => {
      const m = window.location.hash.match(/^#group=([\w-]+)$/);
      setScope(m && SCOPES.includes(m[1]) ? m[1] : DEFAULT_SCOPE);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  const select = (id: string) => {
    setScope(id);
    window.history.replaceState(null, '', id === DEFAULT_SCOPE ? window.location.pathname : `#group=${id}`);
  };
  return [scope, select];
}

// Arrow keys move between the scope tabs.
const ARROW_STEP = new Map([
  ['ArrowRight', 1],
  ['ArrowLeft', -1],
]);

function ScopeTabs({ scope, onSelect }: { scope: string; onSelect: (id: string) => void }) {
  const onKey = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    const d = ARROW_STEP.get(e.key) ?? 0;
    if (!d) return;
    const next = SCOPES[(i + d + SCOPES.length) % SCOPES.length];
    onSelect(next);
    (e.currentTarget.parentElement?.children[SCOPES.indexOf(next)] as HTMLElement | undefined)?.focus();
  };
  return (
    <div className="tabs-dp" role="tablist" aria-label="Spec group">
      {SCOPES.map((id, i) => {
        const s = coverageScope(id);
        return (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={id === scope}
            aria-controls="scope-panel"
            tabIndex={id === scope ? 0 : -1}
            onClick={() => onSelect(id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {s.title}
            <small>{s.totals.specs} specs</small>
          </button>
        );
      })}
    </div>
  );
}

export default function Coverage() {
  const [query, setQuery] = useState('');
  const [showNone, setShowNone] = useState(false);
  const [scope, setScope] = useScope();
  const current = coverageScope(scope);
  const { some, none } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const specs = idl.specs.filter(
      (s) =>
        (scope === ALL || s.group === scope) &&
        (!q || s.title.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)),
    );
    const any = (s: Spec) => s.membersPresent.some((v) => v > 0) || s.interfacesPresent.some((v) => v > 0);
    return { some: specs.filter(any), none: specs.filter((s) => !any(s)) };
  }, [query, scope]);
  const t = idl.totals;
  const core = coverageScope(DEFAULT_SCOPE).totals;

  return (
    <Layout
      title="Coverage"
      description="Every Web IDL interface and member exposed on Window, and whether warpdom, happy-dom, jsdom and linkedom define it."
    >
      <header className="hero-dp">
        <div className="hero-dp__inner">
          <span className="hero-dp__eyebrow">Coverage · existence pass</span>
          <h1>
            Every web API, <em>checked for existence</em>
          </h1>
          <p>
            {t.interfaces.toLocaleString('en')} interfaces and {t.members.toLocaleString('en')} members from {t.specs}{' '}
            specs: everything the Web IDL says a browser window exposes, looked up in each engine. Shown by default: the{' '}
            {core.specs} specs ({core.members.toLocaleString('en')} members) that matter most for unit tests.
          </p>
        </div>
      </header>
      <main className="dp-page">
        <p className="dp-note">
          <strong>Existence is not behavior.</strong> “Present” means the name is defined where Web IDL puts it; the
          member can still do nothing or the wrong thing. The <Link to="/">featured checks</Link> test what the
          standards say for the APIs tests use most.
        </p>

        <section className="dp-section">
          <h2>By group</h2>
          <p className="meta">
            Web IDL lists everything browsers expose, WebGL, WebGPU and WebRTC included, which no test DOM aims for.
            Each spec is in one group (<Link to="pathname:///data/spec-groups.json">spec-groups.json</Link>, with the
            reason for each group); every percentage below is of the group shown.
          </p>
          <ScopeTabs scope={scope} onSelect={setScope} />
          <div id="scope-panel" role="tabpanel" aria-labelledby={`tab-${current.id}`}>
            <p className="meta">
              <strong>{current.title}:</strong> {current.totals.specs} specs,{' '}
              {current.totals.interfaces.toLocaleString('en')} interfaces, {current.totals.members.toLocaleString('en')}{' '}
              members. {current.reason ?? 'Every spec in the Web IDL of the web platform, all groups together.'}
            </p>
            <EngineCards featured={false} scope={current.id} />

            <h3 style={{ marginTop: '1.75rem' }}>By spec</h3>
            <p className="meta">
              Share of each spec's members present per engine. Members count in the spec that defines them (a partial
              interface in CSSOM View counts for CSSOM View).
            </p>
            <div className="filters" role="search">
              <label>
                <span>Filter specs</span>
                <input
                  type="search"
                  value={query}
                  placeholder="e.g. DOM, HTML, CSS"
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>
            <details className="group" open>
              <summary>
                <span className="group__title">Present in at least one engine</span>
                <span className="group__meta">{some.length} specs</span>
              </summary>
              <div className="group__body">
                <SpecTable specs={some} caption={`${current.title}: specs present in at least one engine`} />
              </div>
            </details>
            <details className="group" onToggle={(e) => setShowNone((e.currentTarget as HTMLDetailsElement).open)}>
              <summary>
                <span className="group__title">Not present in any engine</span>
                <span className="group__meta">{none.length} specs</span>
              </summary>
              <div className="group__body">
                {showNone ? (
                  <SpecTable specs={none} caption={`${current.title}: specs no engine defines anything of`} />
                ) : null}
              </div>
            </details>
          </div>
        </section>

        <section className="dp-section">
          <h2>Search</h2>
          <CoverageSearch />
        </section>

        <section className="dp-section">
          <h2>How it is measured</h2>
          <ul>
            <li>
              Web IDL from <a href="https://www.npmjs.com/package/@webref/idl">@webref/idl</a> {idl.webref.version},
              spec titles from <a href="https://www.npmjs.com/package/browser-specs">browser-specs</a>{' '}
              {idl.browserSpecs.version}. Interfaces and namespaces exposed on Window, with partial interfaces and
              mixins.
            </li>
            <li>
              Interface statuses:{' '}
              {Object.values(IDL_INTERFACE)
                .filter((s) => s.status !== 'unknown')
                .map((s) => `${s.label} (${s.meaning})`)
                .join(' ')}
            </li>
            <li>
              Members are looked up on the interface prototype (covering its prototype chain), on the interface object
              for constants and static members, on the window for Window's own members; members inherited only from{' '}
              <code>Object.prototype</code> do not count. Each engine runs in its own process; probed{' '}
              {idl.date.slice(0, 10)} on Node.js {idl.node}.
            </li>
            <li>
              Data: <Link to="pathname:///data/idl.json">idl.json</Link> and{' '}
              <Link to="pathname:///data/spec-groups.json">spec-groups.json</Link> (CC BY 4.0). See also{' '}
              <Link to="/about">About and method</Link>.
            </li>
          </ul>
        </section>
      </main>
    </Layout>
  );
}
