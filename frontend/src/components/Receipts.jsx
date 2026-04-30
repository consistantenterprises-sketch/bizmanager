import{useState,useEffect}from'react';
import{receiptsApi,customersApi}from'../lib/api';
import{useAuth}from'../context/AuthContext';
import{fmt,today,getNextBillNo,BRANCHES,isTrolley}from'../lib/utils';
import{notify,Btn,Badge,Modal,Field,Input,Select,Grid2,ModalActions,Stats,FilterBar,FInput,FSelect,FSep,Table,TR,TD,SectionHeader,Loading,exportCSV}from'./ui';
export default function Receipts(){
  const{role,branch}=useAuth();
  const[receipts,setReceipts]=useState([]);
  const[customers,setCustomers]=useState([]);
  const[loading,setLoading]=useState(true);
  const[showAdd,setShowAdd]=useState(false);
  const[showView,setShowView]=useState(null);
  const[showEdit,setShowEdit]=useState(null);
  const[search,setSearch]=useState('');
  const[fromDate,setFromDate]=useState('');
  const[toDate,setToDate]=useState('');
  const[branchF,setBranchF]=useState('all');
  useEffect(()=>{load();},[]);
  async function load(){
    try{const[r,c]=await Promise.all([receiptsApi.list(),customersApi.list()]);setReceipts(r);setCustomers(c);}
    catch(e){notify('Error: '+e.message);}finally{setLoading(false);}
  }
  const filtered=receipts.filter(r=>{
    if(role==='branch_manager'&&r.branch!==branch)return false;
    if(branchF!=='all'&&r.branch!==branchF)return false;
    if(fromDate&&r.date<fromDate)return false;
    if(toDate&&r.date>toDate)return false;
    if(search&&!r.name?.toLowerCase().includes(search.toLowerCase())&&!r.billNo?.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });
  const origBills=filtered.filter(r=>!r.isPayment);
  const payRows=filtered.filter(r=>r.isPayment);
  if(loading)return <Loading/>;
  return <div>
    <SectionHeader
      left={<span style={{fontSize:12,color:'#706f6b'}}>Bank transfers auto-reflect in bank statement</span>}
      right={<>
        <Btn onClick={()=>exportCSV('receipts',[['Date','Bill no','Name','Model','Sold','Paid','Balance','Mode','Bank','UTR','Branch'],...filtered.map(r=>[r.date,r.billNo,r.name,r.model,r.soldPrice,r.amtPaid,r.balance,r.mode,r.bank,r.utr,r.branch])])}>Export CSV</Btn>
        <Btn variant="p" onClick={()=>setShowAdd(true)}>+ Add receipt</Btn>
      </>}
    />
    <Stats items={[
      {label:'Bills',value:origBills.length},
      {label:'Total sold',value:'₹'+fmt(origBills.reduce((s,r)=>s+(r.soldPrice||0),0))},
      {label:'Collected',value:'₹'+fmt(origBills.reduce((s,r)=>s+(r.amtPaid||0),0)+payRows.reduce((s,r)=>s+(r.amtPaid||0),0)),color:'#27500A'},
      {label:'Balance',value:'₹'+fmt(origBills.reduce((s,r)=>s+(r.balance||0),0)),color:'#A32D2D'},
    ]}/>
    <FilterBar>
      <FInput value={search} onChange={setSearch} placeholder="Search bill / name..."/>
      <FInput type="date" value={fromDate} onChange={setFromDate}/>
      <FSep/>
      <FInput type="date" value={toDate} onChange={setToDate}/>
      {role==='admin'&&<FSelect value={branchF} onChange={setBranchF} options={[{value:'all',label:'All branches'},...BRANCHES.map(b=>({value:b,label:b}))]}/>}
    </FilterBar>
    <Table
      cols={['#','Date','Bill no','Name','Village/Mandal','Model','Sold','Paid','Balance','Mode','Branch','Actions']}
      rows={filtered.map((r,i)=>(
        <TR key={r.id}>
          <TD style={{color:'#a8a79f'}}>{i+1}</TD>
          <TD>{r.date}</TD>
          <TD style={{fontWeight:500}}>{r.billNo}</TD>
          <TD>{r.name}</TD>
          <TD style={{fontSize:11,color:'#706f6b'}}>{r.village||'—'}, {r.mandal||'—'}</TD>
          <TD style={{fontSize:11}}>{r.model}</TD>
          <TD>₹{fmt(r.soldPrice)}</TD>
          <TD style={{color:'#27500A',fontWeight:500}}>₹{fmt(r.amtPaid)}</TD>
          <TD style={{color:r.balance>0?'#A32D2D':'#27500A',fontWeight:500}}>₹{fmt(r.balance)}</TD>
          <TD><Badge label={r.mode==='Cash'?'Cash':'Bank transfer'}/></TD>
          <TD style={{fontSize:11}}>{r.branch}</TD>
          <TD><div style={{display:'flex',gap:3}}>
            <Btn variant="i" style={{fontSize:10,padding:'2px 7px'}} onClick={()=>setShowView(r)}>View</Btn>
            {role==='admin'&&<><Btn style={{fontSize:10,padding:'2px 7px'}} onClick={()=>setShowEdit(r)}>Edit</Btn><Btn variant="d" style={{fontSize:10,padding:'2px 7px'}} onClick={async()=>{await receiptsApi.remove(r.id);load();notify('Deleted.');}}>Del</Btn></>}
          </div></TD>
        </TR>
      ))}
    />
    {showAdd&&<AddReceiptModal onClose={()=>setShowAdd(false)} onSaved={()=>{setShowAdd(false);load();}} receipts={receipts} customers={customers} role={role} branch={branch}/>}
    {showView&&<ViewReceiptModal receipt={showView} onClose={()=>setShowView(null)}/>}
    {showEdit&&<EditReceiptModal receipt={showEdit} onClose={()=>setShowEdit(null)} onSaved={()=>{setShowEdit(null);load();}}/>}
  </div>;
}
function AddReceiptModal({onClose,onSaved,receipts,customers,role,branch}){
  const[mode,setMode]=useState('new');
  const[custSearch,setCustSearch]=useState('');
  const[suggestions,setSuggestions]=useState([]);
  const[selCust,setSelCust]=useState(null);
  const[selReceiptId,setSelReceiptId]=useState('');
  const[date,setDate]=useState(today());
  const[billNo,setBillNo]=useState(getNextBillNo(receipts,branch||'Maheshwaram'));
  const[name,setName]=useState('');
  const[phone,setPhone]=useState('');
  const[village,setVillage]=useState('');
  const[mandal,setMandal]=useState('');
  const[custBranch,setCustBranch]=useState(branch||'Maheshwaram');
  const[modelRows,setModelRows]=useState([{model:'Model A',qty:1,price:''}]);
  const[paid,setPaid]=useState('');
  const[payMode,setPayMode]=useState('');
  const[bank,setBank]=useState('');
  const[utr,setUtr]=useState('');
  const[exDate,setExDate]=useState(today());
  const[exAmount,setExAmount]=useState('');
  const[exMode,setExMode]=useState('');
  const[exBank,setExBank]=useState('');
  const[exUtr,setExUtr]=useState('');
  const[saving,setSaving]=useState(false);
  function onCustSearch(q){setCustSearch(q);if(!q){setSuggestions([]);return;}const seen=new Set();setSuggestions(customers.filter(c=>{if(seen.has(c.id))return false;if(c.name?.toLowerCase().includes(q.toLowerCase())||c.phone?.includes(q)){seen.add(c.id);return true;}return false;}).slice(0,6));}
  function selectCust(c){setSelCust(c);setMode('existing');setCustSearch(c.name+' ('+c.phone+')');setSuggestions([]);const cr=receipts.filter(r=>(r.custId===c.id||r.billNo===c.billNo)&&!r.isPayment);if(cr.length)setSelReceiptId(cr[0].id);}
  function clearCust(){setSelCust(null);setMode('new');setCustSearch('');setSuggestions([]);}
  const grand=modelRows.reduce((s,r)=>s+(parseFloat(r.qty)||0)*(parseFloat(r.price)||0),0);
  const balance=grand-(parseFloat(paid)||0);
  const selReceipt=receipts.find(r=>r.id===selReceiptId);
  async function save(){
    setSaving(true);
    try{
      if(mode==='existing'){
        if(!exAmount||parseFloat(exAmount)<=0){notify('Enter amount to pay');setSaving(false);return;}
        if(!exMode){notify('Select payment mode');setSaving(false);return;}
        if(role==='branch_manager'&&exDate<today()){notify('Branch managers cannot backdate receipts');setSaving(false);return;}
        if(parseFloat(exAmount)>(selReceipt?.balance||0)){notify('Payment exceeds balance');setSaving(false);return;}
        const newPaid=(selReceipt.amtPaid||0)+parseFloat(exAmount);
        const newBal=Math.max(0,(selReceipt.balance||0)-parseFloat(exAmount));
        await receiptsApi.update(selReceiptId,{amtPaid:newPaid,balance:newBal});
        const cust=customers.find(c=>c.id===selCust.id);
        if(cust)await customersApi.update(cust.id,{totalPaid:(cust.totalPaid||0)+parseFloat(exAmount)});
        await receiptsApi.create({date:exDate,billNo:selReceipt.billNo,custId:selCust.id,name:selCust.name,village:selCust.village,mandal:selCust.mandal,model:selReceipt.model,models:selReceipt.models,soldPrice:selReceipt.soldPrice,amtPaid:parseFloat(exAmount),balance:newBal,mode:exMode,bank:exMode==='Bank transfer'?exBank:'',utr:exMode==='Bank transfer'?exUtr:'',branch:selCust.branch,isPayment:true});
        notify('Payment recorded for '+selCust.name);
      }else{
        if(!date||!billNo||!name||!phone){notify('Fill all required fields');setSaving(false);return;}
        if(modelRows.some(r=>!r.price)){notify('Enter price for all models');setSaving(false);return;}
        if(!payMode){notify('Select payment mode');setSaving(false);return;}
        if(role==='branch_manager'&&date<today()){notify('Branch managers cannot backdate receipts');setSaving(false);return;}
        const modelSummary=modelRows.map(r=>r.model+(r.qty>1?' x'+r.qty:'')).join(', ');
        const custId=Date.now().toString();
        await customersApi.create({id:custId,date,billNo,name,phone,village,mandal,model:modelSummary,soldPrice:grand,totalPaid:parseFloat(paid)||0,branch:custBranch,status:'Pending',deliveredDate:null,models:modelRows});
        await receiptsApi.create({date,billNo,custId,name,village,mandal,model:modelSummary,models:modelRows,soldPrice:grand,amtPaid:parseFloat(paid)||0,balance,mode:payMode,bank:payMode==='Bank transfer'?bank:'',utr:payMode==='Bank transfer'?utr:'',branch:custBranch,isPayment:false});
        notify('Receipt saved! Bill: '+billNo);
      }
      onSaved();
    }catch(e){notify('Error: '+e.message);}finally{setSaving(false);}
  }
  return <Modal open title={mode==='existing'?'Record payment':'Add receipt'} onClose={onClose} width={480}>
    <Field label="Search existing customer (leave blank for new)">
      <div style={{position:'relative'}}>
        <Input value={custSearch} onChange={e=>onCustSearch(e.target.value)} placeholder="Type name or phone..."/>
        {suggestions.length>0&&<div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',border:'1px solid #d0cfc8',borderRadius:7,zIndex:100,maxHeight:160,overflowY:'auto',marginTop:2,boxShadow:'0 4px 16px rgba(0,0,0,.1)'}}>
          {suggestions.map(c=>{const bal=(c.soldPrice||0)-(c.totalPaid||0);return<div key={c.id} onMouseDown={()=>selectCust(c)} style={{padding:'8px 10px',cursor:'pointer',borderBottom:'1px solid #f0efec'}}><div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontWeight:600,fontSize:12}}>{c.name}</span><span style={{fontSize:11,color:bal>0?'#A32D2D':'#27500A',fontWeight:600}}>{bal>0?'₹'+fmt(bal)+' due':'Fully paid'}</span></div><div style={{fontSize:10,color:'#706f6b'}}>{c.phone} · {c.billNo} · {c.branch}</div></div>;})}
        </div>}
      </div>
    </Field>
    {mode==='existing'&&selCust&&<>
      <div style={{background:'#EEEDFE',borderRadius:8,padding:'9px 12px',marginBottom:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><div style={{fontWeight:600,fontSize:12,color:'#3C3489'}}>✓ Existing customer</div><div style={{fontSize:11,color:'#706f6b'}}>{selCust.phone} · {selCust.branch}</div></div>
        <Btn style={{fontSize:10,padding:'2px 7px'}} onClick={clearCust}>Clear</Btn>
      </div>
      {selReceipt&&<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
        {[{label:'Sold price',value:'₹'+fmt(selReceipt.soldPrice),bg:'#F0EFFD',color:'#534AB7'},{label:'Already paid',value:'₹'+fmt(selReceipt.amtPaid),bg:'#EAF3DE',color:'#27500A'},{label:'Balance due',value:'₹'+fmt(selReceipt.balance),bg:'#FCEBEB',color:'#A32D2D'}].map(s=><div key={s.label} style={{background:s.bg,borderRadius:7,padding:10,textAlign:'center'}}><div style={{fontSize:15,fontWeight:700,color:s.color}}>{s.value}</div><div style={{fontSize:10,color:s.color,opacity:.7,textTransform:'uppercase',marginTop:2}}>{s.label}</div></div>)}
      </div>}
      <Field label="Date of payment"><Input type="date" value={exDate} onChange={e=>setExDate(e.target.value)}/></Field>
      <Field label="Amount paying now (₹)">
        <Input type="number" value={exAmount} onChange={e=>setExAmount(e.target.value)} placeholder="0"/>
        {exAmount&&selReceipt&&<div style={{fontSize:11,color:'#706f6b',marginTop:4}}>Remaining: <strong style={{color:(selReceipt.balance-parseFloat(exAmount))<=0?'#27500A':'#A32D2D'}}>₹{fmt(Math.max(0,selReceipt.balance-parseFloat(exAmount)))}</strong></div>}
      </Field>
      <Field label="Payment mode"><Select value={exMode} onChange={e=>setExMode(e.target.value)} options={[{value:'',label:'Select mode'},'Cash','Bank transfer']}/></Field>
      {exMode==='Bank transfer'&&<><Field label="Bank"><Select value={exBank} onChange={e=>setExBank(e.target.value)} options={[{value:'',label:'Select bank'},'Canara','TEW','STEW','Agros']}/></Field><Field label="UTR ID"><Input value={exUtr} onChange={e=>setExUtr(e.target.value)} placeholder="UTR reference"/></Field></>}
    </>}
    {mode==='new'&&<>
      <Grid2><Field label="Date"><Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field><Field label="Bill no (auto)"><Input value={billNo} readonly/></Field></Grid2>
      <Grid2><Field label="Name"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Customer name"/></Field><Field label="Phone"><Input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone number"/></Field></Grid2>
      <Grid2><Field label="Village"><Input value={village} onChange={e=>setVillage(e.target.value)}/></Field><Field label="Mandal"><Input value={mandal} onChange={e=>setMandal(e.target.value)}/></Field></Grid2>
      <Field label="Branch">{role==='admin'?<Select value={custBranch} onChange={e=>setCustBranch(e.target.value)} options={BRANCHES}/>:<Input value={custBranch} readonly/>}</Field>
      <Field label={<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>Models <Btn variant="s" style={{fontSize:10,padding:'2px 7px'}} onClick={()=>setModelRows([...modelRows,{model:'Model A',qty:1,price:''}])}>+ Add model</Btn></div>}>
        {modelRows.map((row,i)=><div key={i} style={{display:'grid',gridTemplateColumns:'1fr 60px 100px 26px',gap:6,alignItems:'center',marginBottom:6,padding:'7px 9px',background:'#f7f7f5',borderRadius:7,border:'1px solid #e3e2dc'}}>
          <Input value={row.model} onChange={e=>{const r=[...modelRows];r[i].model=e.target.value;setModelRows(r);}} placeholder="Model name"/>
          <Input type="number" value={row.qty} onChange={e=>{const r=[...modelRows];r[i].qty=e.target.value;setModelRows(r);}} style={{textAlign:'center'}}/>
          <Input type="number" value={row.price} onChange={e=>{const r=[...modelRows];r[i].price=e.target.value;setModelRows(r);}} placeholder="Price ₹" style={{textAlign:'right'}}/>
          <div onClick={()=>{if(modelRows.length>1)setModelRows(modelRows.filter((_,j)=>j!==i));}} style={{background:'#FCEBEB',color:'#A32D2D',border:'1px solid #F09595',borderRadius:5,cursor:'pointer',width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>✕</div>
        </div>)}
      </Field>
      <div style={{background:'#f7f7f5',borderRadius:8,padding:'10px 13px',marginBottom:10}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:6}}><span style={{color:'#706f6b'}}>Grand total</span><span style={{fontWeight:700,fontSize:14}}>₹{fmt(grand)}</span></div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:6,alignItems:'center'}}><span style={{color:'#706f6b'}}>Amount paid (₹)</span><input type="number" value={paid} onChange={e=>setPaid(e.target.value)} placeholder="0" style={{width:130,padding:'4px 8px',fontSize:12,border:'1px solid #d0cfc8',borderRadius:6,textAlign:'right'}}/></div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,borderTop:'1px solid #e3e2dc',paddingTop:6}}><span style={{fontWeight:500,color:'#706f6b'}}>Balance</span><span style={{fontWeight:700,fontSize:14,color:balance>0?'#A32D2D':'#27500A'}}>₹{fmt(balance)}</span></div>
      </div>
      <Field label="Payment mode"><Select value={payMode} onChange={e=>setPayMode(e.target.value)} options={[{value:'',label:'Select mode'},'Cash','Bank transfer']}/></Field>
      {payMode==='Bank transfer'&&<><Field label="Bank"><Select value={bank} onChange={e=>setBank(e.target.value)} options={[{value:'',label:'Select bank'},'Canara','TEW','STEW','Agros']}/></Field><Field label="UTR ID"><Input value={utr} onChange={e=>setUtr(e.target.value)} placeholder="UTR reference"/></Field></>}
    </>}
    <ModalActions onCancel={onClose} onSave={save} loading={saving} saveLabel={mode==='existing'?'Record payment':'Save receipt'}/>
  </Modal>;
}
function ViewReceiptModal({receipt:r,onClose}){
  return <Modal open title="Receipt details" onClose={onClose} width={460}>
    {[['Date',r.date],['Bill number',r.billNo],['Customer',r.name],['Village / Mandal',(r.village||'—')+', '+(r.mandal||'—')],['Branch',r.branch]].map(([l,v])=><div key={l} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #f0efec',fontSize:12}}><span style={{color:'#706f6b'}}>{l}</span><span style={{fontWeight:500}}>{v}</span></div>)}
    {r.models?.length>0&&<div style={{margin:'10px 0',border:'1px solid #e3e2dc',borderRadius:8,overflow:'hidden'}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 50px 80px 80px',background:'#f7f7f5',padding:'6px 10px',fontSize:10,fontWeight:600,color:'#706f6b',textTransform:'uppercase'}}><span>Model</span><span style={{textAlign:'center'}}>Qty</span><span style={{textAlign:'right'}}>Price</span><span style={{textAlign:'right'}}>Total</span></div>
      {r.models.map((m,i)=><div key={i} style={{display:'grid',gridTemplateColumns:'1fr 50px 80px 80px',padding:'7px 10px',borderTop:'1px solid #e3e2dc',fontSize:12}}><span>{m.model}</span><span style={{textAlign:'center',color:'#706f6b'}}>{m.qty}</span><span style={{textAlign:'right',color:'#706f6b'}}>₹{fmt(m.price)}</span><span style={{textAlign:'right',fontWeight:600}}>₹{fmt(m.rowTotal)}</span></div>)}
    </div>}
    {[['Grand total','₹'+fmt(r.soldPrice)],['Amount paid','₹'+fmt(r.amtPaid)],['Balance','₹'+fmt(r.balance)],['Payment mode',r.mode||'—'],...(r.bank?[['Bank',r.bank]]:[]),...(r.utr?[['UTR ID',r.utr]]:[])].map(([l,v])=><div key={l} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #f0efec',fontSize:12}}><span style={{color:'#706f6b'}}>{l}</span><span style={{fontWeight:500}}>{v}</span></div>)}
    <div style={{display:'flex',justifyContent:'flex-end',marginTop:14}}><Btn onClick={onClose}>Close</Btn></div>
  </Modal>;
}
function EditReceiptModal({receipt,onClose,onSaved}){
  const[date,setDate]=useState(receipt.date||'');
  const[sold,setSold]=useState(receipt.soldPrice||'');
  const[paid,setPaid]=useState(receipt.amtPaid||'');
  const[mode,setMode]=useState(receipt.mode||'');
  const[saving,setSaving]=useState(false);
  const bal=(parseFloat(sold)||0)-(parseFloat(paid)||0);
  async function save(){setSaving(true);try{await receiptsApi.update(receipt.id,{date,soldPrice:parseFloat(sold),amtPaid:parseFloat(paid),balance:bal,mode});notify('Updated!');onSaved();}catch(e){notify('Error: '+e.message);}finally{setSaving(false);}}
  return <Modal open title="Edit receipt" onClose={onClose}>
    <Field label="Date"><Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field>
    <Grid2><Field label="Sold price"><Input type="number" value={sold} onChange={e=>setSold(e.target.value)}/></Field><Field label="Amount paid"><Input type="number" value={paid} onChange={e=>setPaid(e.target.value)}/></Field></Grid2>
    <Field label="Balance"><Input value={'₹'+fmt(bal)} readonly/></Field>
    <Field label="Mode"><Select value={mode} onChange={e=>setMode(e.target.value)} options={['Cash','Bank transfer']}/></Field>
    <ModalActions onCancel={onClose} onSave={save} loading={saving}/>
  </Modal>;
}
