import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardApi } from '../lib/api';

const BRANCHES = ['Maheshwaram', 'Chevella', 'KLKW', 'Nagarkurnool'];

const ACCESS = {
  admin: ['dashboard','receipts','deposits','expenses','cashflow','bank','stock','customers','feedback','bookings','employees','attendance','security'],
  branch_manager: ['dashboard','receipts','deposits','expenses','stock','customers','feedback','bookings','attendance'],
  stock_manager: ['dashboard','stock'],
};

const NAV = [
  { group: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard' }] },
  { group: 'Finance', items: [
    { id: 'receipts', label: 'Receipts' },
    { id: 'deposits', label: 'Deposits' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'cashflow', label: 'Cash flow' },
    { id: 'bank', label: 'Bank statement' },
  ]},
  { group: 'Operations', items: [
    { id: 'stock', label: 'Stock' },
    { id: 'customers', label: 'Customers' },
    { id: 'feedback', label: 'Feedback calls' },
    { id: 'bookings', label: 'Bookings' },
  ]},
  { group: 'People', items: [
    { id: 'employees', label: 'Employees' },
    { id: 'attendance', label: 'Attendance' },
  ]},
  { group: 'System', items: [
    { id: 'security', label: 'Security audit' },
  ]},
];

function fmt(n) { return (n || 0).toLocaleString('en-IN'); }

export default function Dashboard() {
  const { user, role, branch, logout } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const allowed = ACCESS[role] || [];

  useEffect(() => {
    if (page === 'dashboard') loadStats();
  }, [page]);

  async function loadStats() {
    try {
      const data = await dashboardApi.stats();
      setStats(data);
    } catch (err) {
      setError('Failed to load dashboard: ' + err.message);
    }
  }

  function nav(id) {
    if (!allowed.includes(id)) return;
    setPage(id);
  }

  const roleLabel = { admin: 'Admin', branch_manager: 'Branch manager', stock_manager: 'Stock manager' }[role] || role;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#f0efec' }}>

      {/* SIDEBAR */}
      <div style={{ width: 195, minWidth: 195, flexShrink: 0, background: '#f7f7f5', borderRight: '1px solid #e3e2dc', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #e3e2dc' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1915' }}>BizManager</div>
          <div style={{ fontSize: 11, color: '#a8a79f', marginTop: 2 }}>{roleLabel}</div>
        </div>

        {NAV.map(({ group, items }) => (
          <div key={group}>
            <div style={{ padding: '6px 16px 2px', fontSize: 10, fontWeight: 600, color: '#a8a79f', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>
              {group}
            </div>
            {items.map(({ id, label }) => {
              const locked = !allowed.includes(id);
              const active = page === id;
              return (
                <div key={id} onClick={() => nav(id)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 16px', fontSize: 12,
                  color: active ? '#1a1915' : locked ? '#ccc' : '#706f6b',
                  cursor: locked ? 'not-allowed' : 'pointer',
                  borderLeft: `2px solid ${active ? '#534AB7' : 'transparent'}`,
                  background: active ? '#fff' : 'transparent',
                  fontWeight: active ? 500 : 400,
                  userSelect: 'none',
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: active ? '#534AB7' : '#d0cfc8' }} />
                  {label}
                </div>
              );
            })}
          </div>
        ))}

        {/* User info + logout */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid #e3e2dc', marginTop: 'auto' }}>
          <div style={{ fontSize: 11, color: '#706f6b', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </div>
          {branch && <div style={{ fontSize: 10, color: '#a8a79f', marginBottom: 8 }}>{branch}</div>}
          <button onClick={logout} style={{
            width: '100%', padding: '5px 8px', fontSize: 11, background: '#FCEBEB',
            color: '#A32D2D', border: '1px solid #F09595', borderRadius: 6, cursor: 'pointer',
          }}>
            Sign out
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'auto' }}>
        {/* TOPBAR */}
        <div style={{
          background: '#fff', borderBottom: '1px solid #e3e2dc', padding: '10px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 5,
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1915', margin: 0, textTransform: 'capitalize' }}>
            {page.replace(/-/g, ' ')}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: '#EEEDFE', color: '#3C3489', fontWeight: 500 }}>
              {roleLabel}
            </span>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#3C3489' }}>
              {(user?.email || 'A')[0].toUpperCase()}
            </div>
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div style={{ padding: 16 }}>
          {error && (
            <div style={{ background: '#FCEBEB', border: '1px solid #F09595', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#A32D2D' }}>
              {error}
            </div>
          )}

          {page === 'dashboard' && (
            <div>
              {stats ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10, marginBottom: 14 }}>
                    {[
                      { label: 'Total sales', value: '₹' + fmt(stats.totalSales), color: '#1a1915' },
                      { label: 'Collected', value: '₹' + fmt(stats.totalCollected), color: '#27500A' },
                      { label: 'Balance due', value: '₹' + fmt(stats.totalBalance), color: '#A32D2D' },
                      { label: 'Expenses', value: '₹' + fmt(stats.totalExpenses), color: '#633806' },
                    ].map(s => (
                      <div key={s.label} style={{ background: '#fff', border: '1px solid #e3e2dc', borderRadius: 8, padding: 13 }}>
                        <div style={{ fontSize: 21, fontWeight: 600, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 10, color: '#706f6b', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ background: '#fff', border: '1px solid #e3e2dc', borderRadius: 8, padding: 15 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 11 }}>Customer status</div>
                      <div style={{ display: 'flex', gap: 9 }}>
                        {[
                          { label: 'Pending', value: stats.pendingCustomers, color: '#633806' },
                          { label: 'Delivered', value: stats.deliveredCustomers, color: '#27500A' },
                          { label: 'Total', value: stats.totalCustomers, color: '#1a1915' },
                        ].map(s => (
                          <div key={s.label} style={{ flex: 1, background: '#f7f7f5', border: '1px solid #e3e2dc', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 600, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: 10, color: '#706f6b', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #e3e2dc', borderRadius: 8, padding: 15 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Quick info</div>
                      <div style={{ fontSize: 12, color: '#706f6b', lineHeight: 2 }}>
                        <div>Logged in as: <strong style={{ color: '#1a1915' }}>{user?.email}</strong></div>
                        <div>Role: <strong style={{ color: '#534AB7' }}>{roleLabel}</strong></div>
                        {branch && <div>Branch: <strong style={{ color: '#1a1915' }}>{branch}</strong></div>}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: 40, color: '#706f6b' }}>Loading dashboard...</div>
              )}
            </div>
          )}

          {page !== 'dashboard' && (
            <div style={{ background: '#fff', border: '1px solid #e3e2dc', borderRadius: 8, padding: 40, textAlign: 'center', color: '#706f6b' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1915', marginBottom: 8, textTransform: 'capitalize' }}>
                {page.replace(/-/g, ' ')}
              </div>
              <div style={{ fontSize: 13 }}>
                This section connects to the live Firebase backend.<br />
                All data is real-time and persisted in Firestore.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
