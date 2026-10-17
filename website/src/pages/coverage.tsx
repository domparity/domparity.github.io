import React, { useMemo, useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import idl from '../data/idl-summary.json';
import EngineCards from '../components/EngineCards';
import CoverageSearch from '../components/coverage/CoverageSearch';
import { Bar } from '../components/coverage/Chip';
import { IDL_INTERFACE } from '../components/status';

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
                {e.engine}
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

export default function Coverage() {
  const [query, setQuery] = useState('');
  const [showNone, setShowNone] = useState(false);
  const { some, none } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const specs = idl.specs.filter((s) => !q || s.title.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
    const any = (s: Spec) => s.membersPresent.some((v) => v > 0) || s.interfacesPresent.some((v) => v > 0);
    return { some: specs.filter(any), none: specs.filter((s) => !any(s)) };
  }, [query]);
  const t = idl.totals;

  return (
    <Layout title="Coverage" description="Every Web IDL interface and member exposed on Window, and whether happy-dom, jsdom, linkedom and warpdom define it.">
      <header className="hero-dp">
        <div className="hero-dp__inner">
          <span className="hero-dp__eyebrow">Coverage · existence pass</span>
          <h1>
            Every web API, <em>checked for existence</em>
          </h1>
          <p>
            {t.interfaces.toLocaleString('en')} interfaces and {t.members.toLocaleString('en')} members from {t.specs} specs: everything
            the Web IDL says a browser window exposes, looked up in each engine.
          </p>
        </div>
      </header>
      <main className="dp-page">
        <p className="dp-note">
          <strong>Existence is not behavior.</strong> “Present” means the name is defined where Web IDL puts it; the member can
          still do nothing or the wrong thing. The <Link to="/">featured checks</Link> test what the standards say for the APIs
          tests use most. Web IDL lists everything browsers expose, WebGL, WebGPU and WebRTC included, which no test DOM aims for.
        </p>
        <EngineCards featured={false} />

        <section className="dp-section">
          <h2>Search</h2>
          <CoverageSearch />
        </section>

        <section className="dp-section">
          <h2>By spec</h2>
          <p className="meta">
            Share of each spec's members present per engine. Members count in the spec that defines them (a partial interface
            in CSSOM View counts for CSSOM View).
          </p>
          <div className="filters" role="search">
            <label>
              <span>Filter specs</span>
              <input type="search" value={query} placeholder="e.g. DOM, HTML, CSS" onChange={(e) => setQuery(e.target.value)} />
            </label>
          </div>
          <details className="group" open>
            <summary>
              <span className="group__title">Present in at least one engine</span>
              <span className="group__meta">{some.length} specs</span>
            </summary>
            <div className="group__body">
              <SpecTable specs={some} caption="Specs present in at least one engine" />
            </div>
          </details>
          <details className="group" onToggle={(e) => setShowNone((e.currentTarget as HTMLDetailsElement).open)}>
            <summary>
              <span className="group__title">Not present in any engine</span>
              <span className="group__meta">{none.length} specs</span>
            </summary>
            <div className="group__body">
              {showNone ? <SpecTable specs={none} caption="Specs no engine defines anything of" /> : null}
            </div>
          </details>
        </section>

        <section className="dp-section">
          <h2>How it is measured</h2>
          <ul>
            <li>
              Web IDL from <a href="https://www.npmjs.com/package/@webref/idl">@webref/idl</a> {idl.webref.version}, spec titles from{' '}
              <a href="https://www.npmjs.com/package/browser-specs">browser-specs</a> {idl.browserSpecs.version}. Interfaces and
              namespaces exposed on Window, with partial interfaces and mixins.
            </li>
            <li>
              Interface statuses:{' '}
              {Object.values(IDL_INTERFACE)
                .filter((s) => s.status !== 'unknown')
                .map((s) => `${s.label} (${s.meaning})`)
                .join(' ')}
            </li>
            <li>
              Members are looked up on the interface prototype (covering its prototype chain), on the interface object for
              constants and static members, on the window for Window's own members; members inherited only from{' '}
              <code>Object.prototype</code> do not count. Each engine runs in its own process; probed {idl.date.slice(0, 10)} on
              Node.js {idl.node}.
            </li>
            <li>
              Data: <Link to="pathname:///data/idl.json">idl.json</Link> (CC BY 4.0). See also <Link to="/about">About and method</Link>.
            </li>
          </ul>
        </section>
      </main>
    </Layout>
  );
}
