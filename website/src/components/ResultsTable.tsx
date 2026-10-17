import React, { useMemo, useState } from 'react';
import Link from '@docusaurus/Link';
import StatusBadge from './StatusBadge';
import EngineName from './EngineName';
import { STATUS, type Status } from './status';
import data from '../data/results.json';

type Result = { status: Status; passed: string[]; failed: { id: string }[]; sameAsNode?: boolean };
const results = data.results as unknown as Record<string, Record<string, Result>>;

export default function ResultsTable() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'' | Status>('');
  const [differ, setDiffer] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...data.apis].sort((a, b) => a.title.localeCompare(b.title)).filter((api) => {
      const statuses = data.engines.map((e) => results[api.id][e.key].status);
      if (q && !`${api.title} ${api.id} ${api.summary}`.toLowerCase().includes(q)) return false;
      if (status && !statuses.includes(status)) return false;
      if (differ && new Set(statuses).size < 2) return false;
      return true;
    });
  }, [query, status, differ]);

  return (
    <div>
      <div className="filters" role="search">
        <label>
          <span>Filter APIs</span>
          <input type="search" value={query} placeholder="e.g. dialog, observer, css" onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label>
          <span>With a status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as '' | Status)}>
            <option value="">any</option>
            {(Object.keys(STATUS) as Status[]).map((s) => (
              <option key={s} value={s}>{STATUS[s].label}</option>
            ))}
          </select>
        </label>
        <label className="filters__check">
          <input type="checkbox" checked={differ} onChange={(e) => setDiffer(e.target.checked)} />
          <span>Only where engines differ</span>
        </label>
      </div>
      <p className="filters__count" aria-live="polite">
        {rows.length} of {data.apis.length} APIs
      </p>
      <div className="panel">
      <div className="dp-scroll">
        <table className="results">
          <caption className="sr-only">Status of each API in each engine</caption>
          <thead>
            <tr>
              <th scope="col">API</th>
              {data.engines.map((e) => (
                <th scope="col" key={e.key}>
                  <EngineName engine={e.engine} version={e.version} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((api) => (
              <tr key={api.id}>
                <th scope="row">
                  <Link to={`/apis/${api.id}`}>{api.title}</Link>
                </th>
                {data.engines.map((e) => {
                  const r = results[api.id][e.key];
                  const total = api.checks.length;
                  const detail = r.status === 'partial' ? `${r.passed.length}/${total}` : undefined;
                  return (
                    <td key={e.key}>
                      <StatusBadge status={r.status} detail={detail} />
                      {r.sameAsNode ? <span className="results__node" title="The window's value is Node.js's own global.">Node.js global</span> : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}
