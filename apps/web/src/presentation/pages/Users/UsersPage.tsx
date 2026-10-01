import React from 'react';
import { Panel } from '../../components/ui/Panel';
import { Table } from '../../components/ui/Table';
import { Status } from '../../components/ui/Status';

export function UsersPage() {
  return (
    <Panel title="Users">
      <Table>
        <thead className="bg-subtle">
          <tr>
            {['Name', 'Email', 'Role', 'Status'].map(h => <th className="px-3 py-2 text-left" key={h}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-3 py-2">Nadia Putri</td>
            <td className="px-3 py-2">operator@local.test</td>
            <td className="px-3 py-2">Operator</td>
            <td className="px-3 py-2"><Status tone="success">Enabled</Status></td>
          </tr>
          <tr>
            <td className="px-3 py-2">R&amp;D Analyst</td>
            <td className="px-3 py-2">analyst@local.test</td>
            <td className="px-3 py-2">Analyst</td>
            <td className="px-3 py-2"><Status tone="success">Enabled</Status></td>
          </tr>
        </tbody>
      </Table>
    </Panel>
  );
}
