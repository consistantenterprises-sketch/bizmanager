export const BRANCHES = ['Maheshwaram', 'Chevella', 'KLKW', 'Nagarkurnool'];
export const BANKS = ['TEW', 'STEW', 'Canara', 'ICICI Agro'];
export const EXPENSE_TYPES = ['Food', 'Petrol', 'Rent', 'Groceries', 'OT', 'Salary', 'Others'];

export const BRANCH_PREFIX = {
  Maheshwaram: 'MHR',
  Chevella: 'CHEV',
  KLKW: 'KLKW',
  Nagarkurnool: 'NGR',
};

export const TROLLEY_BOM = [
  { model: 'Dex', qty: 2 },
  { model: 'Kaman Kattal', qty: 2 },
  { model: 'Hubs', qty: 2 },
  { model: '12/5 Jack', qty: 1 },
  { model: 'Bearings 16 Size', qty: 2 },
  { model: 'Bearings 13 Size', qty: 2 },
  { model: 'Bed Set', qty: 1 },
  { model: 'Oggalu', qty: 4 },
  { model: 'Bed Bolts', qty: 24 },
  { model: 'Wheel Bolts', qty: 16 },
  { model: 'Check Nuts', qty: 2 },
  { model: 'Oil Seal', qty: 2 },
  { model: '6mm Bottom Sheet', qty: 1 },
  { model: '3mm Bottom Sheet', qty: 2 },
  { model: '6x3 Channel', qty: 1 },
  { model: '5x2 Channel', qty: 2 },
  { model: '4x2 VSP', qty: 5 },
  { model: '4x2 Rolling', qty: 2 },
  { model: '3x1.5 Channel', qty: 4 },
  { model: '40x6 Angle', qty: 3 },
  { model: '35/5 Angle', qty: 2 },
  { model: '20mm Round', qty: 2 },
];

export const DEFAULT_MODELS = [
  'Model A', 'Model B', 'Solar Panel 5KW', 'Inverter 3KVA', 'Model C', 'Trolley',
  'Dex', 'Kaman Kattal', 'Hubs', '12/5 Jack',
  'Bearings 16 Size', 'Bearings 13 Size', 'Bed Set', 'Oggalu',
  'Bed Bolts', 'Wheel Bolts', 'Check Nuts', 'Oil Seal',
  '6mm Bottom Sheet', '3mm Bottom Sheet', '6x3 Channel', '5x2 Channel',
  '4x2 VSP', '4x2 Rolling', '3x1.5 Channel', '40x6 Angle', '35/5 Angle', '20mm Round',
];

export function fmt(n) {
  return (n || 0).toLocaleString('en-IN');
}

export function today() {
  return new Date().toISOString().split('T')[0];
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

export function addMonths(dateStr, m) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + m);
  return d.toISOString().split('T')[0];
}

export function daysDiff(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

export function isTrolley(modelName) {
  return modelName && modelName.toLowerCase().includes('trolley');
}

export function getNextBillNo(receipts, branch) {
  const prefix = BRANCH_PREFIX[branch] || 'GEN';
  const existing = receipts.filter(r => r.billNo && r.billNo.startsWith(prefix + '-') && !r.isPayment);
  if (!existing.length) return prefix + '-001';
  const nums = existing.map(r => parseInt(r.billNo.split('-').pop()) || 0);
  const next = Math.max(...nums) + 1;
  return prefix + '-' + String(next).padStart(3, '0');
}
