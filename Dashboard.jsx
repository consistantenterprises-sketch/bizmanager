import { useState, useEffect } from 'react';
import { dashboardApi } from '../lib/api';
import { Stats, Loading } from './ui';
import { fmt } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { role, branch } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi.stats()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (error) return <div style={{ color: '#A32D2D', padding: 20 }}>{error}</div>;

  return (
    <div>
      <Stats items={[
        { label: role === 'branch_manager' ? branch + ' sales' : 'Total sales', value: '₹' + fmt(stats?.totalSales), color: '#1a1915' },
        { label: 'Collected', value: '₹' + fmt(stats?.totalCollected), color: '#27500A' },
        { label: 'Balance due', value: '₹' + fmt(stats?.totalBalance), color: '#A32D2D' },
        { label: 'Expenses', value: '₹' + fmt(stats?.totalExpenses), color: '#633806' },
      ]} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: '#fff', border: '1px solid #e3e2dc', borderRadius: 8, padding: 15 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 11 }}>
            Customer status {role === 'branch_manager' ? `— ${branch}` : ''}
          </div>
          <Stats items={[
            { label: 'Pending', value: stats?.pendingCustomers || 0, color: '#633806' },
            { label: 'Delivered', value: stats?.deliveredCustomers || 0, color: '#27500A' },
            { label: 'Total', value: stats?.totalCustomers || 0 },
          ]} />
        </div>
        <div style={{ background: '#fff', border: '1px solid #e3e2dc', borderRadius: 8, padding: 15 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Quick info</div>
          <div style={{ fontSize: 12, color: '#706f6b', lineHeight: 2 }}>
            <div>Role: <strong style={{ color: '#534AB7' }}>{role}</strong></div>
            {branch && <div>Branch: <strong style={{ color: '#1a1915' }}>{branch}</strong></div>}
            <div>Customers: <strong>{stats?.totalCustomers || 0}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
