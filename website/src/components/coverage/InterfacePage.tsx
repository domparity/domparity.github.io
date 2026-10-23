import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { useLocation } from '@docusaurus/router';
import { InterfaceChip, Bar } from './Chip';
import MemberTable, { type Member } from './MemberTable';
import ReportLink from '../ReportLink';
import EngineName from '../EngineName';
import { IDL_INTERFACE } from '../status';

type Engine = { key: string; engine: string; version: string | null };
type Page = {
  engines: Engine[];
  date: string;
  webref: { version: string };
  name: string;
  kind: string;
  spec: { id: string; title: string; url: string | null };
  status: string;
  ctor: Record<string, string> | null;
  chain: { name: string; linked: boolean }[];
  children: string[];
  groups: { spec: { id: string; title: string; url: string | null }; members: Member[] }[];
};

const ISSUES_NEW = 'https://github.com/domparity/domparity.github.io/issues/new';

function reportUrl(page: Page): string {
  const lines = [
    `**Interface:** ${page.name} (${page.spec.title}): https://domparity.github.io/coverage/interface/${page.name}`,
    `**Probed:** ${page.date.slice(0, 10)}, Web IDL from @webref/idl ${page.webref.version}`,
    '',
    '**Shown:**',
    ...page.engines.map(
      (e, i) => `- ${e.engine} ${e.version ?? ''}: ${IDL_INTERFACE[page.status[i]]?.label ?? page.status[i]}`,
    ),
    '',
    '**Member (if it is about one):** ',
    '**Engine and version:** ',
    '**Expected (with a link to the spec):** ',
    '**Observed:** ',
    '',
  ];
  const params = new URLSearchParams({
    title: `Wrong result: ${page.name} (coverage)`,
    body: lines.join('\n'),
    labels: 'accuracy',
  });
  return `${ISSUES_NEW}?${params.toString()}`;
}

export default function InterfacePage({ bucket }: { bucket: Record<string, Page> }) {
  const name = decodeURIComponent(useLocation().pathname.replace(/\/+$/, '').split('/').pop() ?? '');
  const page = bucket[name];
  if (!page) return null;
  const { engines } = page;
  const all = page.groups.flatMap((g) => g.members);
  const present = engines.map((_, i) => all.filter((m) => m[2][i] === '1').length);
  const missing = engines.map((_, i) => all.filter((m) => m[2][i] === '0').map((m) => m[0]));
  const shown = (name: string) => (name.startsWith('@@') ? `[Symbol.${name.slice(2)}]` : name);
  return (
    <Layout
      title={`${page.name}: coverage`}
      description={`Is ${page.name} and each of its members defined in warpdom, happy-dom, jsdom and linkedom?`}
    >
      <main className="dp-page">
        <p className="dp-crumbs">
          <Link to="/coverage">Coverage</Link> /{' '}
          <Link to={`/coverage/spec/${page.spec.id.toLowerCase()}`}>{page.spec.id}</Link> / {page.name}
        </p>
        <h1>
          <code style={{ background: 'none', padding: 0, fontSize: 'inherit' }}>{page.name}</code>
        </h1>
        <p className="meta">
          {page.kind === 'namespace' ? 'Namespace' : page.kind === 'callback' ? 'Callback interface' : 'Interface'}{' '}
          defined in <Link to={`/coverage/spec/${page.spec.id.toLowerCase()}`}>{page.spec.title}</Link>
          {page.spec.url ? (
            <>
              {' '}
              (<a href={page.spec.url}>spec</a>)
            </>
          ) : null}
          .
          {page.chain.length ? (
            <>
              {' '}
              Inherits from{' '}
              {page.chain.map((c, i) => (
                <span key={c.name}>
                  {i ? ' → ' : ''}
                  {c.linked ? <Link to={`/coverage/interface/${c.name}`}>{c.name}</Link> : c.name}
                </span>
              ))}
              ; inherited members are listed on those pages.
            </>
          ) : null}
        </p>

        <div className="panel">
          <div className="dp-scroll">
            <table className="grid-dp">
              <caption className="sr-only">{page.name} per engine</caption>
              <thead>
                <tr>
                  <th scope="col">Engine</th>
                  <th scope="col">{page.kind === 'namespace' ? 'Namespace' : 'Interface'}</th>
                  <th scope="col">Members present</th>
                </tr>
              </thead>
              <tbody>
                {engines.map((e, i) => (
                  <tr key={e.key}>
                    <th scope="row">
                      <EngineName engine={e.engine} version={e.version} />
                    </th>
                    <td>
                      <InterfaceChip code={page.status[i]} />
                      {page.ctor?.[e.key] ? (
                        <span className="results__node">
                          <code>new {page.name}()</code> threw: <code>{page.ctor[e.key]}</code>
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <Bar value={present[i]} total={all.length} label={e.engine} />
                      {page.status[i] === '-' || page.status[i] === '?' ? (
                        <span className="missing-list">
                          {page.status[i] === '-'
                            ? `${page.kind === 'namespace' ? 'Namespace' : 'Interface'} not defined.`
                            : 'Not probed.'}
                        </span>
                      ) : missing[i].length === 0 ? (
                        <span className="missing-list">None missing.</span>
                      ) : (
                        <span className="missing-list">
                          Missing{missing[i].length === all.length ? ' (all)' : ''}:{' '}
                          {missing[i].slice(0, 15).map((m, j) => (
                            <span key={m}>
                              {j ? ', ' : ''}
                              <a href={`#m-${m.replace(/[^A-Za-z0-9_-]/g, '_')}`}>
                                <code>{shown(m)}</code>
                              </a>
                            </span>
                          ))}
                          {missing[i].length > 15 ? ` and ${missing[i].length - 15} more` : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="dp-note">
          An interface can be present while some of its members are missing; the table lists them per engine. Existence
          only: “present” means the name is defined where Web IDL puts it (the prototype, the interface object for
          constants and static members, or the window itself for Window), not that it behaves as the standard says.
        </p>

        {page.groups.map((g) => (
          <details className="group" open key={g.spec.id}>
            <summary>
              <span className="group__title">{g.spec.title}</span>
              <span className="group__meta">
                {g.members.length} member{g.members.length === 1 ? '' : 's'}
                {g.spec.id === page.spec.id ? '' : ' (partial interface or mixin)'}
              </span>
            </summary>
            <div className="group__body">
              <MemberTable
                members={g.members}
                engines={engines}
                anchors
                caption={`${page.name} members from ${g.spec.title}`}
              />
            </div>
          </details>
        ))}
        {page.groups.length === 0 ? <p>No members of its own.</p> : null}

        {page.children.length ? (
          <p className="meta" style={{ marginTop: '1.25rem' }}>
            Inherited by:{' '}
            {page.children.map((c, i) => (
              <span key={c}>
                {i ? ', ' : ''}
                <Link to={`/coverage/interface/${c}`}>{c}</Link>
              </span>
            ))}
          </p>
        ) : null}
        <p style={{ marginTop: '1.5rem' }}>
          <ReportLink href={reportUrl(page)} />
        </p>
      </main>
    </Layout>
  );
}
