import React from 'react';
import { MemberChip } from './Chip';
import { MEMBER_KIND } from '../status';

type Engine = { key: string; engine: string; version: string | null };
export type Member = [string, string, string];

const anchor = (name: string) => `m-${name.replace(/[^A-Za-z0-9_-]/g, '_')}`;

// One row per member, one column per engine.
export default function MemberTable({ members, engines, anchors = false, caption }: { members: Member[]; engines: Engine[]; anchors?: boolean; caption: string }) {
  return (
    <div className="dp-scroll">
      <table className="grid-dp">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Member</th>
            {engines.map((e) => (
              <th scope="col" key={e.key}>
                {e.engine}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {members.map(([name, kind, codes]) => (
            <tr key={`${kind}:${name}`} id={anchors ? anchor(name) : undefined}>
              <th scope="row">
                <code>{name.startsWith('@@') ? `[Symbol.${name.slice(2)}]` : name}</code>
                <span className="kind">{MEMBER_KIND[kind] ?? kind}</span>
              </th>
              {engines.map((e, i) => (
                <td key={e.key}>
                  <MemberChip code={codes[i]} engine={e.engine} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
