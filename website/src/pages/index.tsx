import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import ResultsTable from '../components/ResultsTable';
import StatusLegend from '../components/StatusLegend';
import data from '../data/results.json';

export default function Home() {
  return (
    <Layout title="Web platform APIs in test DOMs" description="Which web platform APIs work, and how, in jsdom, happy-dom, linkedom and warpdom.">
      <main className="container margin-vert--lg">
        <h1>Web platform APIs in test DOMs</h1>
        <p className="lead">
          Which APIs work, and how, in the DOM implementations JavaScript unit tests run on. Every engine is probed the same
          way: small checks of what the web standards say a browser does. <Link to="/about">How it works</Link>.
        </p>
        <p className="meta">
          Probed {data.date.slice(0, 10)} on Node.js {data.node}:{' '}
          {data.engines.map((e, i) => (
            <span key={e.key}>
              {i ? ', ' : ''}
              {e.engine} <strong>{e.version}</strong>
            </span>
          ))}
          . Data: <Link to="pathname:///data/results.json">results.json</Link> (CC BY 4.0).
        </p>
        <StatusLegend />
        <ResultsTable />
      </main>
    </Layout>
  );
}
