import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import ResultsTable from '../components/ResultsTable';
import StatusLegend from '../components/StatusLegend';
import EngineCards from '../components/EngineCards';
import data from '../data/results.json';
import site from '../data/site.json';

export default function Home() {
  return (
    <Layout title="Which web APIs work in your test DOM?" description="Which web platform APIs work, and how, in warpdom, happy-dom, jsdom and linkedom.">
      <header className="hero-dp">
        <div className="hero-dp__inner">
          <span className="hero-dp__eyebrow">DOMParity</span>
          <h1>
            Which web APIs work in <em>your test DOM?</em>
          </h1>
          <p>
            Unit tests run on a DOM written in JavaScript, not a browser. DOMParity probes four of them the same way, against
            what the web standards say.
          </p>
          <ul className="engine-pills" aria-label="Engines compared">
            {data.engines.map((e) => (
              <li key={e.key}>
                {e.engine}
                <span>{e.version}</span>
              </li>
            ))}
          </ul>
          <p className="hero-dp__updated">
            Data updated {site.dataUpdated} · <Link to="/changes">What changed</Link>
          </p>
          <div className="hero-dp__actions">
            <a className="btn-dp btn-dp--primary" href="#featured">
              Featured checks
            </a>
            <Link className="btn-dp btn-dp--ghost" to="/coverage">
              Full API coverage
            </Link>
            <Link className="btn-dp btn-dp--ghost" to="/about">
              Method
            </Link>
          </div>
        </div>
      </header>
      <main className="dp-page">
        <section className="dp-section" style={{ marginTop: '2rem' }}>
          <h2>Engines at a glance</h2>
          <p className="meta">
            Featured: {data.apis.length} APIs tests use a lot, each with behavior checks. Web IDL: does every interface and member
            of the Test DOM core group exist at all (existence is not behavior); other groups and all web APIs are on the{' '}
            <Link to="/coverage">Coverage</Link> page.
          </p>
          <EngineCards />
        </section>
        <section className="dp-section" id="featured">
          <h2>Featured checks</h2>
          <p className="meta">
            Probed {data.date.slice(0, 10)} on Node.js {data.node}. Data: <Link to="pathname:///data/results.json">results.json</Link> (CC
            BY 4.0).
          </p>
          <StatusLegend />
          <ResultsTable />
        </section>
      </main>
    </Layout>
  );
}
