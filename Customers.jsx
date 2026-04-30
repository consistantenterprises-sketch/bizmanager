import { useState, useEffect } from 'react';
import { customersApi, receiptsApi, stockApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { fmt, today, BRANCHES, isTrolley, TROLLEY_BOM } from '../lib/utils';
import { notify, Btn, Badge, Modal, Field, Input, Select, Grid2, ModalActions, Stats, FilterBar, FInput, FSelect, FSep, Table, TR, TD, SectionHeader, Loading, exportCSV } from './ui';

export default function Customers() {
  const { role, branch } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showView, setShowView] = useState(null);
  const [showEdit, setShowEdit] = useState(null);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusF, setStatusF] = useState('all');
  const [branchF, setBranchF] = useState('all');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [c, r] = await Promise.all([customersApi.list(), receiptsApi.list()]);
      setCustomers(c); setReceipts(r);
    } catch (e) { notify('Error: ' + e.message); }
    finally { setLoading(false); }
  }

  const filtered = customers.filter(c => {
    if (role === 'branch_manager' && c.branch !== branch) return false;
    if (branchF !== 'all' && c.branch !== branchF) return false;
    if (statusF !== 'all' && c.status !== statusF) return false;
    if (fromDate && c.date < fromDate) return false;
    if (toDate && c.date > toDate) return false;
    if (search && !c.name?.toLowerCase().includes(search.toLowerCase()) && !c.billNo?.toLowerCase().includes(search.toLowerCase()) && !c.phone?.includes(search)) return false;
    return true;
  });

  async function deliver(c) {
    try {
      await customersApi.update(c.id, { status: 'Delivered', deliveredDate: today() });
      // Deduct stock
      const rec = receipts.find(r => (r.custId === c.id || r.billNo === c.billNo) && !r.isPayment);
      const modelsToDeduct = rec?.models?.length ? rec.models : (c.model ? [{ model: c.model, qty: 1 }] : []);
      for (const m of modelsToDeduct) {
        if (isTrolley(m.model)) {
          for (const part of TROLLEY_BOM) {
            await stockApi.addEntry({ date: today(), invoice: 'DEL-' + c.billNo, model: part.model, type: 'Stock out', qty: part.qty * (m.qty || 1), branch: c.branch });
          }
        } else if (m.model && m.model !== 'Others') {
          await stockApi.addEntry({ date: today(), invoice: 'DEL-' + c.billNo, model: m.model, type: 'Stock out', qty: m.qty || 1, branch: c.branch });
        }
      }
      notify('Delivered! Stock updated.');
      load();
    } catch (e) { notify('Error: ' + e.message); }
  }

  if (loading) return <Loading />;

  return (
    <div>
      <SectionHeader
        left={<span style={{ fontSize: 12, color: '#706f6b' }}>Auto-updated from receipts · View shows full payment history</span>}
        right={<Btn onClick={() => exportCSV('customers', [
          ['Date', 'Bill no', 'Name', 'Phone', 'Village', 'Model', 'Sold', 'Paid', 'Balance', 'Status', 'Branch'],
          ...filtered.map(c => [c.date, c.billNo, c.name, c.phone, c.village, c.model, c.soldPrice, c.totalPaid, (c.soldPrice || 0) - (c.totalPaid || 0), c.status, c.branch])
        ])}>Export CSV</Btn>}
      />
      <Stats items={[
        { label: 'Customers', value: filtered.length },
        { label: 'Total sold', value: '₹' + fmt(filtered.reduce((s, c) => s + (c.soldPrice || 0), 0)) },
        { label: 'Collected', value: '₹' + fmt(filtered.reduce((s, c) => s + (c.totalPaid || 0), 0)), color: '#27500A' },
        { label: 'Balance due', value: '₹' + fmt(filtered.reduce((s, c) => s + ((c.soldPrice || 0) - (c.totalPaid || 0)), 0)), color: '#A32D2D' },
      ]} />
      <FilterBar>
        <FInput value={search} onChange={setSearch} placeholder="Search name / bill / phone..." />
        <FInput type="date" value={fromDate} onChange={setFromDate} />
        <FSep />
        <FInput type="date" value={toDate} onChange={setToDate} />
        <FSelect value={statusF} onChange={setStatusF} options={[{ value: 'all', label: 'All statuses' }, 'Pending', 'Delivered']} />
        {role === 'admin' && <FSelect value={branchF} onChange={setBranchF} options={[{ value: 'all', label: 'All branches' }, ...BRANCHES.map(b => ({ value: b, label: b }))]} />}
      </FilterBar>
      <Table
        cols={['#', 'Date', 'Bill no', 'Name', 'Phone', 'Model', 'Sold', 'Paid', 'Balance', 'Status', 'Branch', 'Actions']}
        rows={filtered.map((c, i) => {
          const bal = (c.soldPrice || 0) - (c.totalPaid || 0);
          const pc = receipts.filter(r => r.custId === c.id || r.billNo === c.billNo).length;
          return (
            <TR key={c.id}>
              <TD style={{ color: '#a8a79f' }}>{i + 1}</TD>
              <TD>{c.date}</TD>
              <TD style={{ fontWeight: 500 }}>{c.billNo}</TD>
              <TD><div style={{ fontWeight: 500 }}>{c.name}</div><div style={{ fontSize: 10, color: '#a8a79f' }}>{c.village}, {c.mandal || ''}</div></TD>
              <TD>{c.phone}</TD>
              <TD style={{ fontSize: 11 }}>{c.model}</TD>
              <TD>₹{fmt(c.soldPrice)}</TD>
              <TD style={{ color: '#27500A', fontWeight: 500 }}>₹{fmt(c.totalPaid)}</TD>
              <TD style={{ color: bal > 0 ? '#A32D2D' : '#27500A', fontWeight: 500 }}>₹{fmt(bal)}</TD>
              <TD><Badge label={c.status} /></TD>
              <TD style={{ fontSize: 11 }}>{c.branch}</TD>
              <TD>
                <div style={{ display: 'flex', gap: 3 }}>
                  <Btn variant="i" style={{ fontSize: 10, padding: '2px 7px' }} onClick={() => setShowView({ cust: c, receipts: receipts.filter(r => r.custId === c.id || r.billNo === c.billNo) })}>
                    View {pc > 0 && <span style={{ background: '#534AB7', color: '#fff', borderRadius: 8, padding: '0 4px', marginLeft: 2, fontSize: 9 }}>{pc}</span>}
                  </Btn>
                  {c.status !== 'Delivered' && (role === 'admin' || role === 'branch_manager') && <Btn variant="s" style={{ fontSize: 10, padding: '2px 7px' }} onClick={() => deliver(c)}>Deliver</Btn>}
                  {role === 'admin' && <>
                    <Btn style={{ fontSize: 10, padding: '2px 7px' }} onClick={() => setShowEdit(c)}>Edit</Btn>
                    <Btn variant="d" style={{ fontSize: 10, padding: '2px 7px' }} onClick={async () => { await customersApi.remove(c.id); load(); notify('Deleted.'); }}>Del</Btn>
                  </>}
                </div>
              </TD>
            </TR>
          );
        })}
      />
      {showView && <CustomerViewModal data={showView} onClose={() => setShowView(null)} />}
      {showEdit && <EditCustomerModal customer={showEdit} onClose={() => setShowEdit(null)} onSaved={() => { setShowEdit(null); load(); }} />}
    </div>
  );
}

function CustomerViewModal({ data: { cust: c, receipts }, onClose }) {
  const bal = (c.soldPrice || 0) - (c.totalPaid || 0);
  const sorted = [...receipts].sort((a, b) => a.date?.localeCompare(b.date));
  let running = c.soldPrice || 0;
  return (
    <Modal open onClose={onClose} width={500}>
      <div style={{ background: 'linear-gradient(135deg,#534AB7,#2D277A)', borderRadius: 10, padding: 20, marginBottom: 16, color: '#fff' }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{c.name}</div>
        <div style={{ fontSize: 12, opacity: .8 }}>{c.phone} · {c.village}, {c.mandal || ''} · {c.branch}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9, marginBottom: 16 }}>
        {[
          { label: 'Sold price', value: '₹' + fmt(c.soldPrice), bg: '#F0EFFD', color: '#534AB7' },
          { label: 'Total paid', value: '₹' + fmt(c.totalPaid), bg: '#EAF3DE', color: '#27500A' },
          { label: bal <= 0 ? 'Fully paid' : 'Balance due', value: '₹' + fmt(bal), bg: bal <= 0 ? '#EAF3DE' : '#FCEBEB', color: bal <= 0 ? '#27500A' : '#A32D2D' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: s.color, opacity: .7, textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #e3e2dc', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
        {[['Bill number', c.billNo], ['Model', c.model], ['Date', c.date], ['Status', c.status], ['Branch', c.branch], ['Delivered on', c.deliveredDate || '—']].map(([l, v]) => (
          <div key={l} style={{ padding: '9px 12px', borderBottom: '1px solid #e3e2dc' }}>
            <div style={{ fontSize: 10, color: '#706f6b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{l}</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
        Payment history <span style={{ fontWeight: 400, color: '#706f6b' }}>{sorted.length} payment{sorted.length !== 1 ? 's' : ''}</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, border: '1px solid #e3e2dc', borderRadius: 8, overflow: 'hidden' }}>
        <thead>
          <tr>{['#', 'Date', 'Amount paid', 'Mode', 'Bank', 'UTR', 'Running balance'].map(h => <th key={h} style={{ padding: '7px 10px', fontSize: 10, fontWeight: 600, color: '#706f6b', background: '#f7f7f5', borderBottom: '1px solid #e3e2dc', textTransform: 'uppercase' }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            running -= r.amtPaid || 0;
            return (
              <tr key={r.id}>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid #f0efec', color: '#a8a79f' }}>{i + 1}</td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid #f0efec' }}>{r.date}</td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid #f0efec', color: '#27500A', fontWeight: 500 }}>₹{fmt(r.amtPaid)}</td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid #f0efec' }}><Badge label={r.mode === 'Cash' ? 'Cash' : 'Bank transfer'} /></td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid #f0efec', fontSize: 11 }}>{r.bank || '—'}</td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid #f0efec', fontSize: 10, fontFamily: 'monospace', color: '#706f6b' }}>{r.utr || '—'}</td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid #f0efec', fontWeight: 500, color: running <= 0 ? '#27500A' : '#A32D2D' }}>₹{fmt(Math.max(0, running))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}><Btn onClick={onClose}>Close</Btn></div>
    </Modal>
  );
}

function EditCustomerModal({ customer: c, onClose, onSaved }) {
  const [name, setName] = useState(c.name || '');
  const [phone, setPhone] = useState(c.phone || '');
  const [village, setVillage] = useState(c.village || '');
  const [mandal, setMandal] = useState(c.mandal || '');
  const [sold, setSold] = useState(c.soldPrice || '');
  const [paid, setPaid] = useState(c.totalPaid || '');
  const [saving, setSaving] = useState(false);
  const bal = (parseFloat(sold) || 0) - (parseFloat(paid) || 0);
  async function save() {
    setSaving(true);
    try {
      await customersApi.update(c.id, { name, phone, village, mandal, soldPrice: parseFloat(sold), totalPaid: parseFloat(paid) });
      notify('Updated!'); onSaved();
    } catch (e) { notify('Error: ' + e.message); }
    finally { setSaving(false); }
  }
  return (
    <Modal open title="Edit customer" onClose={onClose}>
      <Grid2>
        <Field label="Name"><Input value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="Phone"><Input value={phone} onChange={e => setPhone(e.target.value)} /></Field>
      </Grid2>
      <Grid2>
        <Field label="Village"><Input value={village} onChange={e => setVillage(e.target.value)} /></Field>
        <Field label="Mandal"><Input value={mandal} onChange={e => setMandal(e.target.value)} /></Field>
      </Grid2>
      <Grid2>
        <Field label="Sold price"><Input type="number" value={sold} onChange={e => setSold(e.target.value)} /></Field>
        <Field label="Total paid"><Input type="number" value={paid} onChange={e => setPaid(e.target.value)} /></Field>
      </Grid2>
      <Field label="Balance"><Input value={'₹' + fmt(bal)} readonly /></Field>
      <ModalActions onCancel={onClose} onSave={save} loading={saving} />
    </Modal>
  );
}
