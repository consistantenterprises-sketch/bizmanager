import{useState,useEffect}from'react';
import{expensesApi,depositsApi,stockApi}from'../lib/api';
import{useAuth}from'../context/AuthContext';
import{fmt,today,BRANCHES,EXPENSE_TYPES,BANKS}from'../lib/utils';
import{notify,Btn,Badge,Modal,Field,Input,Select,Textarea,Grid2,ModalActions,Stats,FilterBar,FInput,FSelect,FSep,Table,TR,TD,SectionHeader,Loading,exportCSV}from'./ui';
export function Expenses(){
  const{role,branch}=useAuth();
  const[expenses,setExpenses]=useState([]);
  const[loading,setLoading]=useState(true);
  const[showAdd,setShowAdd]=useState(false);
  const[showEdit,setShowEdit]=useState(null);
  const[search,setSearch]=useState('');
  const[fromDate,setFromDate]=useState('');
  const[toDate,setToDate]=useState('');
  const[branchF,setBranchF]=useState('all');
  const[typeF,setTypeF]=useState('all');
  useEffect(()=>{load();},[]);
  async function load(){try{setExpenses(await expensesApi.list());}catch(e){notify('Error: '+e.message);}finally{setLoading(false);}}
  const filtered=expenses.filter(e=>{
    if(role==='branch_manager'&&e.branch!==branch)return false;
    if(branchF!=='all'&&e.branch!==branchF)return false;
    if(typeF!=='all'&&e.type!==typeF)return false;
    if(fromDate&&e.date<fromDate)return false;
    if(toDate&&e.date>toDate)return false;
    if(search&&!e.desc?.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });
  const tC={Food:'#FAEEDA',Petrol:'#E6F1FB',Rent:'#FCEBEB',Groceries:'#EAF3DE',OT:'#EEEDFE',Salary:'#EAF3DE',Others:'#F1EFE8'};
  const tCol={Food:'#633806',Petrol:'#0C447C',Rent:'#A32D2D',Groceries:'#27500A',OT:'#3C3489',Salary:'#27500A',Others:'#5F5E5A'};
  if(loading)return <Loading/>;
  return <div>
    <SectionHeader left={<span style={{fontSize:12,color:'#706f6b'}}>Branch expense tracking</span>} right={<><Btn onClick={()=>exportCSV('expenses',[['Date','Type','Description','Amount','Branch'],...filtered.map(e=>[e.date,e.type,e.desc,e.amount,e.branch])])}>Export CSV</Btn><Btn variant="p" onClick={()=>setShowAdd(true)}>+ Add expense</Btn></>}/>
    <Stats items={[{label:'Entries',value:filtered.length},{label:'Filtered total',value:'₹'+fmt(filtered.reduce((s,e)=>s+(e.amount||0),0)),color:'#A32D2D'},{label:'This month',value:'₹'+fmt(expenses.filter(e=>e.date?.startsWith(new Date().toISOString().slice(0,7))).reduce((s,e)=>s+(e.amount||0),0)),color:'#633806'},{label:'Grand total',value:'₹'+fmt(expenses.reduce((s,e)=>s+(e.amount||0),0))}]}/>
    <FilterBar>
      <FInput value={search} onChange={setSearch} placeholder="Search..."/>
      <FInput type="date" value={fromDate} onChange={setFromDate}/><FSep/>
      <FInput type="date" value={toDate} onChange={setToDate}/>
      {role==='admin'&&<FSelect value={branchF} onChange={setBranchF} options={[{value:'all',label:'All branches'},...BRANCHES.map(b=>({value:b,label:b}))]}/>}
      <FSelect value={typeF} onChange={setTypeF} options={[{value:'all',label:'All types'},...EXPENSE_TYPES.map(t=>({value:t,label:t}))]}/>
    </FilterBar>
    <Table cols={['#','Date','Type','Description','Amount','Branch','Actions']} rows={filtered.map((e,i)=>(
      <TR key={e.id}>
        <TD style={{color:'#a8a79f'}}>{i+1}</TD><TD>{e.date}</TD>
        <TD><span style={{background:tC[e.type]||'#F1EFE8',color:tCol[e.type]||'#5F5E5A',padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:500}}>{e.type}</span></TD>
        <TD style={{fontSize:11,color:'#706f6b'}}>{e.desc}</TD>
        <TD style={{fontWeight:500}}>Rs{fmt(e.amount)}</TD><TD>{e.branch}</TD>
        <TD><div style={{display:'flex',gap:3}}>{role==='admin'?<><Btn style={{fontSize:10,padding:'2px 7px'}} onClick={()=>setShowEdit(e)}>Edit</Btn><Btn variant="d" style={{fontSize:10,padding:'2px 7px'}} onClick={async()=>{await expensesApi.remove(e.id);load();notify('Deleted.');}}>Del</Btn></>:<span style={{fontSize:11,color:'#a8a79f'}}>View only</span>}</div></TD>
      </TR>
    ))}/>
    {showAdd&&<ExpenseModal onClose={()=>setShowAdd(false)} onSaved={()=>{setShowAdd(false);load();}} role={role} branch={branch}/>}
    {showEdit&&<ExpenseModal expense={showEdit} onClose={()=>setShowEdit(null)} onSaved={()=>{setShowEdit(null);load();}} role={role} branch={branch}/>}
  </div>;
}
function ExpenseModal({expense,onClose,onSaved,role,branch}){
  const[date,setDate]=useState(expense?.date||today());
  const[expBranch,setExpBranch]=useState(expense?.branch||branch||'Maheshwaram');
  const[type,setType]=useState(expense?.type||'');
  const[desc,setDesc]=useState(expense?.desc||'');
  const[amount,setAmount]=useState(expense?.amount||'');
  const[saving,setSaving]=useState(false);
  async function save(){if(!date||!type||!desc||!amount){notify('Fill all fields');return;}setSaving(true);try{if(expense)await expensesApi.update(expense.id,{date,branch:expBranch,type,desc,amount:parseFloat(amount)});else await expensesApi.create({date,branch:expBranch,type,desc,amount:parseFloat(amount)});notify('Saved!');onSaved();}catch(e){notify('Error: '+e.message);}finally{setSaving(false);}}
  return <Modal open title={expense?'Edit expense':'Add expense'} onClose={onClose}>
    <Field label="Date"><Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field>
    <Field label="Branch">{role==='admin'?<Select value={expBranch} onChange={e=>setExpBranch(e.target.value)} options={BRANCHES}/>:<Input value={expBranch} readonly/>}</Field>
    <Field label="Type"><Select value={type} onChange={e=>setType(e.target.value)} options={[{value:'',label:'Select type'},...EXPENSE_TYPES]}/></Field>
    <Field label="Description"><Textarea value={desc} onChange={e=>setDesc(e.target.value)}/></Field>
    <Field label="Amount (Rs)"><Input type="number" value={amount} onChange={e=>setAmount(e.target.value)}/></Field>
    <ModalActions onCancel={onClose} onSave={save} loading={saving}/>
  </Modal>;
}
export function Deposits(){
  const{role,branch}=useAuth();
  const[deposits,setDeposits]=useState([]);
  const[loading,setLoading]=useState(true);
  const[showAdd,setShowAdd]=useState(false);
  const[showEdit,setShowEdit]=useState(null);
  const[fromDate,setFromDate]=useState('');
  const[toDate,setToDate]=useState('');
  const[bankF,setBankF]=useState('all');
  const[branchF,setBranchF]=useState('all');
  useEffect(()=>{load();},[]);
  async function load(){try{setDeposits(await depositsApi.list());}catch(e){notify('Error: '+e.message);}finally{setLoading(false);}}
  const filtered=deposits.filter(d=>{
    if(role==='branch_manager'&&d.branch!==branch)return false;
    if(bankF!=='all'&&d.bank!==bankF)return false;
    if(branchF!=='all'&&d.branch!==branchF)return false;
    if(fromDate&&d.date<fromDate)return false;
    if(toDate&&d.date>toDate)return false;
    return true;
  });
  const bC={TEW:'#EEEDFE',STEW:'#E1F5EE',Canara:'#FAEEDA','ICICI Agro':'#E6F1FB'};
  const bCol={TEW:'#3C3489',STEW:'#085041',Canara:'#633806','ICICI Agro':'#0C447C'};
  if(loading)return <Loading/>;
  return <div>
    <SectionHeader left={<span style={{fontSize:12,color:'#706f6b'}}>Bank deposits per branch</span>} right={<Btn variant="p" onClick={()=>setShowAdd(true)}>+ Add deposit</Btn>}/>
    <Stats items={[{label:'Entries',value:filtered.length},{label:'TEW',value:'Rs'+fmt(filtered.filter(d=>d.bank==='TEW').reduce((s,d)=>s+(d.amount||0),0)),color:'#3C3489'},{label:'STEW',value:'Rs'+fmt(filtered.filter(d=>d.bank==='STEW').reduce((s,d)=>s+(d.amount||0),0)),color:'#085041'},{label:'Grand total',value:'Rs'+fmt(filtered.reduce((s,d)=>s+(d.amount||0),0))}]}/>
    <FilterBar>
      <FInput type="date" value={fromDate} onChange={setFromDate}/><FSep/>
      <FInput type="date" value={toDate} onChange={setToDate}/>
      <FSelect value={bankF} onChange={setBankF} options={[{value:'all',label:'All banks'},...BANKS.map(b=>({value:b,label:b}))]}/>
      {role==='admin'&&<FSelect value={branchF} onChange={setBranchF} options={[{value:'all',label:'All branches'},...BRANCHES.map(b=>({value:b,label:b}))]}/>}
    </FilterBar>
    <Table cols={['#','Date','Bank','Branch','Amount','Actions']} rows={filtered.map((d,i)=>(
      <TR key={d.id}>
        <TD style={{color:'#a8a79f'}}>{i+1}</TD><TD>{d.date}</TD>
        <TD><span style={{background:bC[d.bank]||'#F1EFE8',color:bCol[d.bank]||'#5F5E5A',padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:500}}>{d.bank}</span></TD>
        <TD>{d.branch}</TD><TD style={{fontWeight:500}}>Rs{fmt(d.amount)}</TD>
        <TD><div style={{display:'flex',gap:3}}>{role==='admin'?<><Btn style={{fontSize:10,padding:'2px 7px'}} onClick={()=>setShowEdit(d)}>Edit</Btn><Btn variant="d" style={{fontSize:10,padding:'2px 7px'}} onClick={async()=>{await depositsApi.remove(d.id);load();notify('Deleted.');}}>Del</Btn></>:<span style={{fontSize:11,color:'#a8a79f'}}>View only</span>}</div></TD>
      </TR>
    ))}/>
    {showAdd&&<DepositModal onClose={()=>setShowAdd(false)} onSaved={()=>{setShowAdd(false);load();}} role={role} branch={branch}/>}
    {showEdit&&<DepositModal deposit={showEdit} onClose={()=>setShowEdit(null)} onSaved={()=>{setShowEdit(null);load();}} role={role} branch={branch}/>}
  </div>;
}
function DepositModal({deposit,onClose,onSaved,role,branch}){
  const[date,setDate]=useState(deposit?.date||today());
  const[bank,setBank]=useState(deposit?.bank||'');
  const[depBranch,setDepBranch]=useState(deposit?.branch||branch||'Maheshwaram');
  const[amount,setAmount]=useState(deposit?.amount||'');
  const[saving,setSaving]=useState(false);
  async function save(){if(!date||!bank||!amount){notify('Fill all fields');return;}setSaving(true);try{if(deposit)await depositsApi.update(deposit.id,{date,bank,branch:depBranch,amount:parseFloat(amount)});else await depositsApi.create({date,bank,branch:depBranch,amount:parseFloat(amount)});notify('Saved!');onSaved();}catch(e){notify('Error: '+e.message);}finally{setSaving(false);}}
  return <Modal open title={deposit?'Edit deposit':'Add deposit'} onClose={onClose}>
    <Field label="Date"><Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field>
    <Field label="Bank"><Select value={bank} onChange={e=>setBank(e.target.value)} options={[{value:'',label:'Select bank'},...BANKS]}/></Field>
    <Field label="Branch">{role==='admin'?<Select value={depBranch} onChange={e=>setDepBranch(e.target.value)} options={BRANCHES}/>:<Input value={depBranch} readonly/>}</Field>
    <Field label="Amount (Rs)"><Input type="number" value={amount} onChange={e=>setAmount(e.target.value)}/></Field>
    <ModalActions onCancel={onClose} onSave={save} loading={saving}/>
  </Modal>;
}
export function Stock(){
  const{role,branch}=useAuth();
  const[entries,setEntries]=useState([]);
  const[transfers,setTransfers]=useState([]);
  const[models,setModels]=useState([]);
  const[customers,setCustomers]=useState([]);
  const[loading,setLoading]=useState(true);
  const[tab,setTab]=useState('models');
  const[selModel,setSelModel]=useState(null);
  const[recTab,setRecTab]=useState('entries');
  const[showAdd,setShowAdd]=useState(false);
  const[showTransfer,setShowTransfer]=useState(false);
  const[search,setSearch]=useState('');
  const[branchF,setBranchF]=useState('all');
  const[entryFrom,setEntryFrom]=useState('');
  const[entryTo,setEntryTo]=useState('');
  useEffect(()=>{load();},[]);
  async function load(){
    try{
      const{customersApi}=await import('../lib/api');
      const[e,t,m,c]=await Promise.all([stockApi.entries(),stockApi.transfers(),stockApi.models(),customersApi.list()]);
      setEntries(e);setTransfers(t);setModels(m.length?m:['Model A','Model B','Trolley']);setCustomers(c);
    }catch(e){notify('Error: '+e.message);}finally{setLoading(false);}
  }
  function getTotal(model,br){let t=0;entries.forEach(e=>{if(e.model!==model)return;if(e.type==='Stock in'&&e.branch===br)t+=e.qty||0;else if(e.type==='Transfer'&&e.branch===br)t-=e.qty||0;else if(e.type==='Transfer'&&e.transferTo===br)t+=e.qty||0;else if(e.type==='Stock out'&&e.branch===br)t-=e.qty||0;});return Math.max(0,t);}
  const vB=role==='branch_manager'?[branch]:(branchF==='all'?['Maheshwaram','Chevella','KLKW','Nagarkurnool']:[branchF]);
  const fM=models.filter(m=>!search||m.toLowerCase().includes(search.toLowerCase()));
  const canModify=role==='admin'||role==='stock_manager';
  if(loading)return <Loading/>;
  return <div>
    <SectionHeader
      left={<div style={{display:'flex',gap:3,background:'#f7f7f5',padding:3,borderRadius:8}}>
        {['models','transfers'].map(t=><button key={t} onClick={()=>setTab(t)} style={{padding:'4px 13px',fontSize:11,borderRadius:5,cursor:'pointer',color:tab===t?'#1a1915':'#706f6b',border:tab===t?'1px solid #e3e2dc':'none',background:tab===t?'#fff':'none',fontWeight:tab===t?500:400,textTransform:'capitalize'}}>{t}</button>)}
      </div>}
      right={<>{canModify&&<Btn variant="i" onClick={()=>setShowTransfer(true)}>Send to branch</Btn>}{canModify&&<Btn variant="p" onClick={()=>setShowAdd(true)}>+ Add stock</Btn>}<Btn onClick={()=>exportCSV('stock',[['Date','Invoice','Model','Type','Qty','Branch','Transfer to'],...entries.map(e=>[e.date,e.invoice,e.model,e.type,e.qty,e.branch,e.transferTo||''])])}>Export CSV</Btn></>}
    />
    {tab==='models'&&<>
      <FilterBar>
        {role==='admin'&&<FSelect value={branchF} onChange={setBranchF} options={[{value:'all',label:'All branches'},...['Maheshwaram','Chevella','KLKW','Nagarkurnool'].map(b=>({value:b,label:b}))]}/>}
        <FInput value={search} onChange={setSearch} placeholder="Search model..."/>
      </FilterBar>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:10,marginBottom:12}}>
        {fM.map(model=>{
          const gt=vB.reduce((s,b)=>s+getTotal(model,b),0);
          const tc=gt===0?'#A32D2D':gt<5?'#BA7517':'#27500A';
          return <div key={model} onClick={()=>setSelModel(selModel===model?null:model)} style={{background:'#fff',border:`${selModel===model?'2px':'1px'} solid ${selModel===model?'#534AB7':'#e3e2dc'}`,borderRadius:10,padding:13,cursor:'pointer'}}>
            <div style={{fontSize:13,fontWeight:600,marginBottom:3}}>{model}</div>
            <div style={{fontSize:21,fontWeight:700,color:tc,marginBottom:1}}>{gt}</div>
            <div style={{fontSize:10,color:'#706f6b',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:5}}>total units</div>
            {vB.map(b=>{const t=getTotal(model,b);const c=t===0?'#A32D2D':t<5?'#BA7517':'#27500A';return<div key={b} style={{display:'flex',justifyContent:'space-between',fontSize:11,padding:'2px 0',borderTop:'1px solid #f0efec'}}><span style={{color:'#706f6b'}}>{b}</span><span style={{fontWeight:600,color:c}}>{t}</span></div>;})}
            <div style={{marginTop:5,paddingTop:4,borderTop:'1px solid #f0efec',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:10,color:'#706f6b'}}>{customers.filter(c=>c.model===model).length} customers</span>
              {role==='admin'&&<span onClick={async(ev)=>{ev.stopPropagation();if(window.confirm('Delete model: '+model+'?')){await stockApi.deleteModel(model);load();}}} style={{fontSize:9,color:'#A32D2D',cursor:'pointer',padding:'1px 5px',background:'#FCEBEB',borderRadius:4}}>Del</span>}
            </div>
          </div>;
        })}
      </div>
      {selModel&&<div style={{border:'2px solid #534AB7',borderRadius:10,overflow:'hidden',marginTop:12}}>
        <div style={{background:'#EEEDFE',padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#26215C',display:'flex',alignItems:'center',gap:10}}>
            {selModel}
            <div style={{display:'flex',gap:5}}>{vB.map(b=>{const t=getTotal(selModel,b);const c=t===0?'#A32D2D':t<5?'#BA7517':'#27500A';return<span key={b} style={{fontSize:11,background:'#fff',border:'1px solid #d0cfc8',borderRadius:20,padding:'2px 8px',color:c,fontWeight:600}}>{b}: {t}</span>;})}</div>
          </div>
          <button onClick={()=>setSelModel(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:16,color:'#534AB7'}}>X</button>
        </div>
        <div style={{display:'flex',borderBottom:'1px solid #e3e2dc'}}>
          {['entries','customers'].map(t=><button key={t} onClick={()=>setRecTab(t)} style={{padding:'6px 14px',fontSize:11,cursor:'pointer',color:recTab===t?'#534AB7':'#706f6b',border:'none',background:'none',borderBottom:recTab===t?'2px solid #534AB7':'2px solid transparent',fontWeight:recTab===t?600:400,textTransform:'capitalize'}}>{t==='entries'?'Stock entries':'Customer history'}</button>)}
        </div>
        {recTab==='entries'&&<div>
          <div style={{padding:'8px 12px',borderBottom:'1px solid #e3e2dc',display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
            <span style={{fontSize:11,color:'#706f6b'}}>Filter:</span>
            <input type="date" value={entryFrom} onChange={e=>setEntryFrom(e.target.value)} style={{fontSize:11,padding:'3px 6px',border:'1px solid #d0cfc8',borderRadius:6}}/>
            <span style={{fontSize:11,color:'#706f6b'}}>to</span>
            <input type="date" value={entryTo} onChange={e=>setEntryTo(e.target.value)} style={{fontSize:11,padding:'3px 6px',border:'1px solid #d0cfc8',borderRadius:6}}/>
            {(entryFrom||entryTo)&&<button onClick={()=>{setEntryFrom('');setEntryTo('');}} style={{fontSize:10,padding:'2px 7px',border:'1px solid #d0cfc8',borderRadius:5,background:'#fff',cursor:'pointer'}}>Clear</button>}
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,whiteSpace:'nowrap'}}>
              <thead><tr>{['#','Date','Invoice','Type','Qty','Branch','Transfer to'].map(h=><th key={h} style={{padding:'9px 12px',textAlign:'left',fontSize:10,fontWeight:600,color:'#706f6b',background:'#f7f7f5',borderBottom:'1px solid #e3e2dc',textTransform:'uppercase'}}>{h}</th>)}</tr></thead>
              <tbody>{entries.filter(e=>e.model===selModel&&(!entryFrom||e.date>=entryFrom)&&(!entryTo||e.date<=entryTo)).sort((a,b)=>(a.date||'').localeCompare(b.date||'')).map((e,i)=><tr key={e.id||i}><td style={{padding:'8px 12px',borderBottom:'1px solid #f0efec',color:'#a8a79f'}}>{i+1}</td><td style={{padding:'8px 12px',borderBottom:'1px solid #f0efec'}}>{e.date}</td><td style={{padding:'8px 12px',borderBottom:'1px solid #f0efec'}}>{e.invoice}</td><td style={{padding:'8px 12px',borderBottom:'1px solid #f0efec'}}><Badge label={e.type}/></td><td style={{padding:'8px 12px',borderBottom:'1px solid #f0efec',fontWeight:500,color:e.type!=='Stock in'?'#0C447C':'#27500A'}}>{e.type!=='Stock in'?'-':'+'}{e.qty}</td><td style={{padding:'8px 12px',borderBottom:'1px solid #f0efec'}}>{e.branch}</td><td style={{padding:'8px 12px',borderBottom:'1px solid #f0efec',color:'#706f6b'}}>{e.transferTo||'--'}</td></tr>)}</tbody>
            </table>
          </div>
        </div>}
        {recTab==='customers'&&<Table cols={['#','Date','Bill no','Name','Phone','Village','Branch','Status']} rows={customers.filter(c=>c.model===selModel).map((c,i)=><TR key={c.id}><TD style={{color:'#a8a79f'}}>{i+1}</TD><TD>{c.date}</TD><TD style={{fontWeight:500,color:'#534AB7'}}>{c.billNo}</TD><TD style={{fontWeight:500}}>{c.name}</TD><TD style={{fontSize:11}}>{c.phone}</TD><TD style={{fontSize:11,color:'#706f6b'}}>{c.village}</TD><TD style={{fontSize:11}}>{c.branch}</TD><TD><Badge label={c.status}/></TD></TR>)}/>}
      </div>}
    </>}
    {tab==='transfers'&&<Table cols={['#','Date','From','To','Models transferred','Total qty','Actions']} rows={transfers.map((t,i)=>(
      <TR key={t.id}>
        <TD style={{color:'#a8a79f'}}>{i+1}</TD><TD>{t.date}</TD>
        <TD style={{fontWeight:500}}>{t.fromBranch}</TD>
        <TD style={{fontWeight:500,color:'#27500A'}}>{t.toBranch}</TD>
        <TD><div style={{display:'flex',gap:3,flexWrap:'wrap'}}>{t.items?.map((it,j)=><span key={j} style={{background:'#EEEDFE',color:'#3C3489',fontSize:10,padding:'1px 7px',borderRadius:8}}>{it.model}: {it.qty}</span>)}</div></TD>
        <TD style={{fontWeight:500}}>{t.items?.reduce((s,it)=>s+(it.qty||0),0)}</TD>
        <TD>{role==='admin'&&<Btn variant="d" style={{fontSize:10,padding:'2px 7px'}} onClick={async()=>{await stockApi.deleteTransfer(t.id);load();notify('Transfer deleted.');}}>Del</Btn>}</TD>
      </TR>
    ))}/>}
    {showAdd&&<AddStockModal onClose={()=>setShowAdd(false)} onSaved={()=>{setShowAdd(false);load();}} models={models} role={role} branch={branch}/>}
    {showTransfer&&<TransferModal onClose={()=>setShowTransfer(false)} onSaved={()=>{setShowTransfer(false);load();}} models={models} role={role} getTotal={getTotal}/>}
  </div>;
}
function AddStockModal({onClose,onSaved,models,role,branch}){
  const[date,setDate]=useState(today());
  const[invoice,setInvoice]=useState('');
  const[model,setModel]=useState(models[0]||'');
  const[newModel,setNewModel]=useState('');
  const[stBranch,setStBranch]=useState(branch||'Maheshwaram');
  const[qty,setQty]=useState('');
  const[saving,setSaving]=useState(false);
  async function save(){if(!date||!invoice||!model||!qty){notify('Fill all fields');return;}if(role==='stock_manager'&&date<today()){notify('Stock managers cannot backdate entries');return;}setSaving(true);try{if(newModel&&!models.includes(newModel))await stockApi.addModel(newModel);await stockApi.addEntry({date,invoice,model:newModel||model,type:'Stock in',qty:parseInt(qty),branch:stBranch});notify('Stock entry saved!');onSaved();}catch(e){notify('Error: '+e.message);}finally{setSaving(false);}}
  return <Modal open title="Add stock entry" onClose={onClose}>
    <Field label="Date"><Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field>
    <Field label="Invoice number"><Input value={invoice} onChange={e=>setInvoice(e.target.value)} placeholder="INV-2025-001"/></Field>
    <Field label="Model"><Select value={model} onChange={e=>setModel(e.target.value)} options={models}/><div style={{display:'flex',gap:6,marginTop:6}}><Input value={newModel} onChange={e=>setNewModel(e.target.value)} placeholder="Add new model..." style={{flex:1}}/><Btn variant="p" style={{whiteSpace:'nowrap',fontSize:11}} onClick={()=>{if(newModel)setModel(newModel);}}>+ Add</Btn></div></Field>
    <Field label="Branch">{role==='admin'?<Select value={stBranch} onChange={e=>setStBranch(e.target.value)} options={BRANCHES}/>:<Input value={stBranch} readonly/>}</Field>
    <Field label="Quantity"><Input type="number" value={qty} onChange={e=>setQty(e.target.value)} placeholder="0"/></Field>
    <ModalActions onCancel={onClose} onSave={save} loading={saving}/>
  </Modal>;
}
function TransferModal({onClose,onSaved,models,role,getTotal}){
  const[date,setDate]=useState(today());
  const[fromBranch,setFromBranch]=useState('');
  const[toBranch,setToBranch]=useState('');
  const[items,setItems]=useState([{model:models[0]||'',qty:''}]);
  const[saving,setSaving]=useState(false);
  async function save(){if(!date||!fromBranch||!toBranch){notify('Fill date, from and to branch');return;}if(fromBranch===toBranch){notify('From and To cannot be the same');return;}if(role==='stock_manager'&&date<today()){notify('Stock managers cannot backdate transfers');return;}const vI=items.filter(it=>it.qty>0);if(!vI.length){notify('Add at least one model with quantity');return;}for(const it of vI){if(parseInt(it.qty)>getTotal(it.model,fromBranch)){notify('Insufficient stock: '+it.model+' in '+fromBranch);return;}}setSaving(true);try{await stockApi.addTransfer({date,fromBranch,toBranch,items:vI.map(it=>({model:it.model,qty:parseInt(it.qty)}))});notify('Transfer complete!');onSaved();}catch(e){notify('Error: '+e.message);}finally{setSaving(false);}}
  return <Modal open title="Send stock to branch" onClose={onClose} width={440}>
    <Field label="Date"><Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field>
    <Grid2><Field label="From branch"><Select value={fromBranch} onChange={e=>setFromBranch(e.target.value)} options={[{value:'',label:'Select'},...BRANCHES]}/></Field><Field label="To branch"><Select value={toBranch} onChange={e=>setToBranch(e.target.value)} options={[{value:'',label:'Select'},...BRANCHES]}/></Field></Grid2>
    <Field label={<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>Models <Btn variant="s" style={{fontSize:10,padding:'2px 7px'}} onClick={()=>setItems([...items,{model:models[0]||'',qty:''}])}>+ Add model</Btn></div>}>
      {items.map((it,i)=><div key={i} style={{display:'grid',gridTemplateColumns:'1fr 90px 26px',gap:6,alignItems:'center',marginBottom:6,padding:'7px 9px',background:'#f7f7f5',borderRadius:7,border:'1px solid #e3e2dc'}}>
        <Select value={it.model} onChange={e=>{const r=[...items];r[i].model=e.target.value;setItems(r);}} options={models}/>
        <Input type="number" value={it.qty} onChange={e=>{const r=[...items];r[i].qty=e.target.value;setItems(r);}} placeholder="Qty" style={{textAlign:'center'}}/>
        <div onClick={()=>{if(items.length>1)setItems(items.filter((_,j)=>j!==i));}} style={{background:'#FCEBEB',color:'#A32D2D',border:'1px solid #F09595',borderRadius:5,cursor:'pointer',width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>X</div>
      </div>)}
    </Field>
    <ModalActions onCancel={onClose} onSave={save} loading={saving} saveLabel="Confirm transfer"/>
  </Modal>;
}
