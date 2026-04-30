import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NotifyProvider } from '../components/ui';
import DashboardHome from '../components/Dashboard';
import Receipts from '../components/Receipts';
import Customers from '../components/Customers';
import { Expenses, Deposits, Stock } from '../components/Finance';
import { FeedbackCalls, Bookings, Employees, Attendance, CashFlow, BankStatement, SecurityAudit } from '../components/Sections';

const ACCESS = {
  admin: ['dashboard','receipts','deposits','expenses','cashflow','bank','stock','customers','feedback','bookings','employees','attendance','security'],
  branch_manager: ['dashboard','receipts','deposits','expenses','stock','customers','feedback','bookings','attendance'],
  stock_manager: ['dashboard','stock'],
};

const NAV = [
  { group: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard' }] },
  { group: 'Finance', items: [{ id: 'receipts', label: 'Receipts' },{ id: 'deposits', label: 'Deposits' },{ id: 'expenses', label: 'Expenses' },{ id: 'cashflow', label: 'Cash flow' },{ id: 'bank', label: 'Bank statement' }]},
  { group: 'Operations', items: [{ id: 'stock', label: 'Stock' },{ id: 'customers', label: 'Customers' },{ id: 'feedback', label: 'Feedback calls' },{ id: 'bookings', label: 'Bookings' }]},
  { group: 'People', items: [{ id: 'employees', label: 'Employees' },{ id: 'attendance', label: 'Attendance' }]},
  { group: 'System', items: [{ id: 'security', label: 'Security audit' }]},
];

const SECTIONS = { dashboard: DashboardHome, receipts: Receipts, deposits: Deposits, expenses: Expenses, cashflow: CashFlow, bank: BankStatement, stock: Stock, customers: Customers, feedback: FeedbackCalls, bookings: Bookings, employees: Employees, attendance: Attendance, security: SecurityAudit };
const TITLES = { dashboard: 'Dashboard', receipts: 'Receipts', deposits: 'Deposits', expenses: 'Expenses', cashflow: 'Cash flow', bank: 'Bank statement', stock: 'Stock', customers: 'Customers', feedback: 'Feedback calls', bookings: 'Bookings', employees: 'Employees', attendance: 'Attendance', security: 'Security audit' };

export default function AppShell() {
  const { user, role, branch, logout } = useAuth();
  const [page, setPage] = useState('dashboard');
  const allowed = ACCESS[role] || [];
  const roleLabel = { admin: 'Admin', branch_manager: 'Branch manager', stock_manager: 'Stock manager' }[role] || role;
  const ActiveSection = SECTIONS[page] || DashboardHome;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#f0efec', overflow: 'hidden' }}>
      <NotifyProvider />
      <div style={{ width: 195, minWidth: 195, flexShrink: 0, background: '#f7f7f5', borderRight: '1px solid #e3e2dc', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #e3e2dc' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1915' }}>BizManager</div>
          <div style={{ fontSize: 11, color: '#a8a79f', marginTop: 2 }}>{roleLabel}</div>
        </div>
        {NAV.map(({ group, items }) => (
          <div key={group}>
            <div style={{ padding: '6px 16px 2px', fontSize: 10, fontWeight: 600, color: '#a8a79f', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{group}</div>
            {items.map(({ id, label }) => {
              const locked = !allowed.includes(id), active = page === id;
              return <div key={id} onClick={() => !locked && setPage(id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', fontSize: 12, color: active ? '#1a1915' : locked ? '#ccc' : '#706f6b', cursor: locked ? 'not-allowed' : 'pointer', borderLeft: `2px solid ${active ? '#534AB7' : 'transparent'}`, background: active ? '#fff' : 'transparent', fontWeight: active ? 500 : 400, userSelect: 'none' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: active ? '#534AB7' : '#d0cfc8' }} />{label}
              </div>;
            })}
          </div>
        ))}
        <div style={{ padding: '10px 12px', borderTop: '1px solid #e3e2dc', marginTop: 'auto' }}>
          <div style={{ fontSize: 11, color: '#706f6b', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          {branch && <div style={{ fontSize: 10, color: '#a8a79f', marginBottom: 8 }}>{branch}</div>}
          <button onClick={logout} style={{ width: '100%', padding: '5px 8px', fontSize: 11, background: '#FCEBEB', color: '#A32D2D', border: '1px solid #F09595', borderRadius: 6, cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'auto' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #e3e2dc', padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1915', margin: 0 }}>{TITLES[page]}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: '#EEEDFE', color: '#3C3489', fontWeight: 500 }}>{roleLabel}</span>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#3C3489' }}>{(user?.email || 'A')[0].toUpperCase()}</div>
          </div>
        </div>
        <div style={{ padding: 16 }}><ActiveSection /></div>
      </div>
    </div>
  );
}
