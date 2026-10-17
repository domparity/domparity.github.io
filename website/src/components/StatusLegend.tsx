import React from 'react';
import StatusBadge from './StatusBadge';
import { STATUS, type Status } from './status';

export default function StatusLegend() {
  return (
    <ul className="legend">
      {(Object.keys(STATUS) as Status[]).map((s) => (
        <li key={s}>
          <StatusBadge status={s} /> {STATUS[s].meaning}
        </li>
      ))}
    </ul>
  );
}
