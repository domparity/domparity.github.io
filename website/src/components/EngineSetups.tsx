import React from 'react';
import data from '../data/results.json';

export default function EngineSetups() {
  return (
    <table>
      <thead>
        <tr>
          <th scope="col">Engine</th>
          <th scope="col">Version</th>
          <th scope="col">Window created with</th>
        </tr>
      </thead>
      <tbody>
        {data.engines.map((e) => (
          <tr key={e.key}>
            <td>{e.engine}</td>
            <td>{e.version}</td>
            <td>
              <code>{e.setup}</code>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
