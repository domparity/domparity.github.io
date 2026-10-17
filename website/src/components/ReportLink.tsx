import React from 'react';

// "Report a wrong result" link to a prefilled GitHub issue.
export default function ReportLink({ href, engine }: { href: string; engine?: string }) {
  return (
    <a className="report-link" href={href} target="_blank" rel="noopener noreferrer">
      <span aria-hidden="true">⚑ </span>
      Report a wrong result{engine ? ` for ${engine}` : ''}
    </a>
  );
}
