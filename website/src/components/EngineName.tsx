import React from 'react';
import Link from '@docusaurus/Link';
import site from '../data/site.json';

// "maintainer's engine": a small note next to the maintainer's engine, linking
// to the disclosure on the About page. Renders nothing for other engines;
// nothing else about the maintainer's engine is shown differently.
export function MaintainerNote({ engine, inline = false }: { engine: string; inline?: boolean }) {
  if (engine !== site.maintainerEngine) return null;
  return (
    <>
      {inline ? <span aria-hidden="true"> · </span> : null}
      <Link
        className={`maintainer-note${inline ? ' maintainer-note--inline' : ''}`}
        to="/about#maintainer"
        title="DOMParity's maintainer also writes this engine. Same probes and method for every engine."
      >
        maintainer's engine
      </Link>
    </>
  );
}

// An engine's name, as in table headers: name, optional version, and the
// maintainer note where it applies.
export default function EngineName({ engine, version }: { engine: string; version?: string | null }) {
  return (
    <>
      {engine}
      {version ? <span className="results__version">{version}</span> : null}
      <MaintainerNote engine={engine} />
    </>
  );
}
