import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { InterfaceChip, MemberChip } from './Chip';

type Row = [string, string, string, string]; // interface, member ('' for the interface), spec id, codes
const MAX = 60;

// The line under the search box: an error, loading, the match count or a hint.
function searchStatus(error: string | null, loading: boolean, results: { total: number } | null): string {
  if (error) return `Could not load the index: ${error}`;
  if (loading) return 'Loading the index…';
  if (!results) return 'Type at least two characters.';
  const matches = `${results.total} match${results.total === 1 ? '' : 'es'}`;
  return results.total > MAX ? `${matches}, showing the first ${MAX}` : matches;
}

// Search across every interface and member. The index (static/data/idl-search.json)
// is fetched on first use, so the page itself stays small.
export default function CoverageSearch() {
  const url = useBaseUrl('/data/idl-search.json');
  const [data, setData] = useState<{ engines: string[]; rows: Row[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const loading = useRef(false);

  const load = () => {
    if (loading.current) return;
    loading.current = true;
    fetch(url)
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(String(e)));
  };
  useEffect(() => {
    if (query) load();
  }, [query]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!data || q.length < 2) return null;
    const exact: Row[] = [];
    const prefix: Row[] = [];
    const rest: Row[] = [];
    for (const row of data.rows) {
      const full = (row[1] ? `${row[0]}.${row[1]}` : row[0]).toLowerCase();
      const last = (row[1] || row[0]).toLowerCase();
      if (!full.includes(q)) continue;
      if (last === q || full === q) exact.push(row);
      else if (last.startsWith(q)) prefix.push(row);
      else rest.push(row);
    }
    const all = [...exact, ...prefix, ...rest];
    return { total: all.length, rows: all.slice(0, MAX) };
  }, [data, query]);

  return (
    <div>
      <div className="filters" role="search">
        <label>
          <span>Search all interfaces and members</span>
          <input
            type="search"
            value={query}
            placeholder="e.g. scrollIntoView, Element.closest, ResizeObserver"
            onFocus={load}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <p className="filters__count" aria-live="polite">
        {searchStatus(error, query !== '' && !data, results)}
      </p>
      {results && results.rows.length ? (
        <div className="panel">
          <ul className="search-results">
            {results.rows.map(([iface, member, spec, codes]) => {
              const to = `/coverage/interface/${iface}${member ? `#m-${member.replace(/[^A-Za-z0-9_-]/g, '_')}` : ''}`;
              return (
                <li key={`${iface}.${member}.${spec}`}>
                  <Link to={to}>
                    <code>{member ? `${iface}.${member}` : iface}</code>
                  </Link>
                  <span className="spec">{spec}</span>
                  <span className="chips">
                    {data!.engines.map((e, i) =>
                      member ? (
                        <MemberChip key={e} code={codes[i]} engine={e} />
                      ) : (
                        <InterfaceChip key={e} code={codes[i]} engine={e} />
                      ),
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {results && data ? (
        <p className="meta" style={{ marginTop: '0.4rem' }}>
          Chips are in engine order: {data.engines.join(', ')}.
        </p>
      ) : null}
    </div>
  );
}
