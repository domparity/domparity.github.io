import React from 'react';
import { STATUS, type Status } from './status';

export default function StatusBadge({ status, detail }: { status: Status; detail?: string }) {
  const s = STATUS[status];
  return (
    <span className={`status status--${status}`} title={s.meaning}>
      <span aria-hidden="true">{s.symbol} </span>
      {s.label}
      {detail ? <span className="status__detail"> {detail}</span> : null}
    </span>
  );
}
