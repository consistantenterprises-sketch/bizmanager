import{useState,useEffect}from'react';
import{feedbackApi,bookingsApi,employeesApi,attendanceApi,receiptsApi,expensesApi,depositsApi}from'../lib/api';
import{useAuth}from'../context/AuthContext';
import{fmt,today,addDays,addMonths,daysDiff,BRANCHES,EXPENSE_TYPES,BANKS}from'../lib/utils';
import{notify,Btn,Badge,Modal,Field,Input,Select,Grid2,ModalActions,Stats,FilterBar,FInput,FSelect,FSep,Table,TR,TD,SectionHeader,Loading,Tabs,exportCSV}from'./ui';
export function FeedbackCalls(){
  const{role,branch}=useAuth();
  const[feedbacks,setFeedbacks]=useState([]);
  const[loading,setLoading]=useState(true);
  const[search,setSearch]=useState('');
  const[statusF,setStatusF]=useState('all');
  const[branchF,setBranchF]=useState('all');
  const[showRaise,setShowRaise]=useState(null);
  useEffect(()=>{load();},[]);
  async function load(){
    try{
      const{customersApi}=await import('../lib/api');
      const[f,c]=await Promise.all([feedbackApi.list(),customersApi.list()]);
      const records=[];const td=today();
      c.filter(c=>c.status==='Delivered'&&c.deliveredDate).forEach(cust=>{
        for(let cy=0;cy<=3;cy++){
          const due=cy===0?addDays(cust.deliveredDate,10):addMonths(cust.deliveredDate,cy*4);
          const diff=daysDiff(td,due);if(diff>7)continue;
          const key=`${cust.id}-${cy}`;
          const ex=f.find(x=>x.key===key||x.id===key);
          if(ex?.status==='approved')continue;
          records.push({key,cust,cycle:cy,due,diff,...(ex||{status:'pending',attempts:0,feedback:''})});
        }
      });
      setFeedbacks(records.sort((a,b)=>a.due.localeCompare(b.due)));
    }catch(e){notify('Error: '+e.message);}finally{setLoading(false);}
  }
  const filtered=feedbacks.filter(r=>{
    if(role==='branch_manager'&&r.cust?.branch!==branch)return false;
    if(branchF!=='all'&&r.cust?.branch!==branchF)return false;
    if(statusF!=='all'&&r.status!==statusF)return false;
    if(search&&!r.cust?.name?.toLowerCase().includes(search.toLowerCase())&&!r.cust?.phone?.includes(search))return false;
    return true;
  });
  async function updateFB(key,data){try{await feedbackApi.update(key,data);load();}catch(e){notify('Error: '+e.message);}}
  if(loading)return <Loading/>;
  return <div>
    <SectionHeader left={<div style={{background:'#f7f7f5',borderRadius:8,padding:'9px 13px',fontSize:11,color:'#706f6b'}}>📞 Appears 10 days after delivery · Repeats every 4 months</div>} right={<Btn onClick={()=>exportCSV('feedback',[['Due date','Name','Phone','Model','Delivered','Attempts','Feedback','Status','Branch'],...filtered.map(r=>[r.due,r.cust?.name,r.cust?.phone,r.cust?.model,r.cust?.deliveredDate,r.attempts,r.feedback,r.status,r.cust?.branch])])}>Export CSV</Btn>}/>
    <Stats items={[{label:'Pending',value:filtered.filter(r=>r.status==='pending').length,color:'#633806'},{label:'Overdue',value:filtered.filter(r=>r.status==='pending'&&r.diff<0).length,color:'#A32D2D'},{label:'Booking raised',value:filtered.filter(r=>r.status==='booking').length,color:'#0C447C'},{label:'Closed',value:filtered.filter(r=>r.status==='closed').length}]}/>
    <FilterBar>
      <FInput value={search} onChange={setSearch} placeholder="Search name / phone..."/>
      <FSelect value={statusF} onChange={setStatusF} options={[{value:'all',label:'All statuses'},{value:'pending',label:'Pending'},{value:'booking',label:'Booking raised'},{value:'closed',label:'Closed'}]}/>
      {role==='admin'&&<FSelect value={branchF} onChange={setBranchF} options={[{value:'all',label:'All branches'},...BRANCHES.map(b=>({value:b,label:b}))]}/>}
    </FilterBar>
    <Table cols={['#','Call due','Name','Phone','Model','Delivered','Attempts','Feedback','Status','Actions']} rows={filtered.map((r,i)=>{
      const dl=r.diff<0?<span style={{color:'#A32D2D',fontSize:10,fontWeight:500}}>{Math.abs(r.diff)}d overdue</span>:r.diff===0?<span style={{color:'#633806',fontSize:10}}>Today</span>:<span style={{color:'#27500A',fontSize:10}}>in {r.diff}d</span>;
      return <TR key={r.key}>
        <TD style={{color:'#a8a79f'}}>{i+1}</TD>
        <TD><div style={{fontWeight:500}}>{r.due}</div>{dl}<div style={{fontSize:9,color:'#a8a79f'}}>{r.cycle===0?'Initial (10d)':`Repeat cy.${r.cycle} (${r.cycle*4}mo)`}</div></TD>
        <TD><div style={{fontWeight:500}}>{r.cust?.name}</div><div style={{fontSize:10,color:'#a8a79f'}}>{r.cust?.billNo} · {r.cust?.branch}</div></TD>
        <TD style={{fontWeight:500}}>{r.cust?.phone}</TD>
        <TD style={{fontSize:11}}>{r.cust?.model}</TD>
        <TD style={{fontSize:11,color:'#706f6b'}}>{r.cust?.deliveredDate}</TD>
        <TD><div style={{display:'flex',alignItems:'center',gap:3}}>{[1,2,3].map(n=><span key={n} onClick={()=>r.status==='pending'&&updateFB(r.key,{attempts:r.attempts>=n?n-1:n})} style={{width:20,height:20,borderRadius:'50%',border:`1.5px solid ${r.attempts>=n?'#534AB7':'#d0cfc8'}`,background:r.attempts>=n?'#534AB7':'#f7f7f5',cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:r.attempts>=n?'#fff':'#a8a79f'}}>{n}</span>)}<span style={{fontSize:10,color:'#706f6b'}}>{r.attempts}/3</span></div></TD>
        <TD>{r.status==='pending'?<select value={r.feedback||''} onChange={e=>updateFB(r.key,{feedback:e.target.value})} style={{fontSize:11,padding:'3px 6px',border:'1px solid #d0cfc8',borderRadius:6,background:'#fff'}}><option value="">—</option><option value="satisfied">😊 Satisfied</option><option value="dissatisfied">😞 Dissatisfied</option></select>:r.feedback?<span style={{fontSize:11}}>{r.feedback==='satisfied'?'😊 Satisfied':'😞 Dissatisfied'}</span>:'—'}</TD>
        <TD><Badge label={r.status==='pending'?'Pending':r.status==='booking'?'booking':'closed'}/></TD>
        <TD><div style={{display:'flex',gap:3}}>
          {r.status==='pending'&&<><Btn variant="bk" style={{fontSize:10,padding:'2px 6px'}} onClick={()=>setShowRaise(r)}>Booking</Btn><Btn style={{fontSize:10,padding:'2px 6px'}} onClick={()=>updateFB(r.key,{status:'closed'})}>Close</Btn></>}
          {role==='admin'&&<Btn variant="s" style={{fontSize:10,padding:'2px 6px'}} onClick={()=>updateFB(r.key,{status:'approved'})}>Approve</Btn>}
        </div></TD>
      </TR>;
    })}/>
    {showRaise&&<RaiseBookingModal fb={showRaise} onClose={()=>setShowRaise(null)} onSaved={()=>{setShowRaise(null);load();updateFB(showRaise.key,{status:'booking'});}}/>}
  </div>;
}
function RaiseBookingModal({fb,onClose,onSaved}){
  const[date,setDate]=useState(today());
  const[planDate,setPlanDate]=useState('');
  const[saving,setSaving]=useState(false);
  async function save(){if(!planDate){notify('Select purchase planning date');return;}setSaving(true);try{await bookingsApi.create({date,name:fb.cust.name,phone:fb.cust.phone,village:fb.cust.village,model:fb.cust.model,planDate,branch:fb.cust.branch,status:'pending',fromFeedback:true});notify('Booking raised for '+fb.cust.name);onSaved();}catch(e){notify('Error: '+e.message);}finally{setSaving(false);}}
  return <Modal open title="Raise booking" onClose={onClose}>
    <div style={{background:'#EEEDFE',borderRadius:8,padding:'9px 12px',marginBottom:13,display:'flex',justifyContent:'space-between',fontSize:12,color:'#3C3489'}}><strong>{fb.cust.name}</strong><span>{fb.cust.phone}</span></div>
    <Field label="Booking date"><Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field>
    <Field label="Model"><Input value={fb.cust.model} readonly/></Field>
    <Field label="Village"><Input value={fb.cust.village} readonly/></Field>
    <Field label="Date of purchase planning"><Input type="date" value={planDate} onChange={e=>setPlanDate(e.target.value)}/></Field>
    <Field label="Branch"><Input value={fb.cust.branch} readonly/></Field>
    <ModalActions onCancel={onClose} onSave={save} loading={saving} saveLabel="Confirm booking"/>
  </Modal>;
}
export function Bookings(){
  const{role,branch}=useAuth();
  const[bookings,setBookings]=useState([]);
  const[loading,setLoading]=useState(true);
  const[showAdd,setShowAdd]=useState(false);
  const[showEdit,setShowEdit]=useState(null);
  const[search,setSearch]=useState('');
  const[fromDate,setFromDate]=useState('');
  const[toDate,setToDate]=useState('');
  const[statusF,setStatusF]=useState('all');
  const[branchF,setBranchF]=useState('all');
  useEffect(()=>{load();},[]);
  async function load(){try{setBookings(await bookingsApi.list());}catch(e){notify('Error: '+e.message);}finally{setLoading(false);}}
  const filtered=bookings.filter(b=>{
    if(role==='branch_manager'&&b.branch!==branch)return false;
    if(branchF!=='all'&&b.branch!==branchF)return false;
    if(statusF!=='all'&&b.status!==statusF)return false;
    if(fromDate&&b.date<fromDate)return false;
    if(toDate&&b.date>toDate)return false;
    if(search&&!b.name?.toLowerCase().includes(search.toLowerCase())&&!b.phone?.includes(search))return false;
    return true;
  });
  if(loading)return <Loading/>;
  return <div>
    <SectionHeader left={<span style={{fontSize:12,color:'#706f6b'}}>From feedback calls or added manually</span>} right={<><Btn onClick={()=>exportCSV('bookings',[['Date','Name','Phone','Village','Model','Plan date','Branch','Status'],...filtered.map(b=>[b.date,b.name,b.phone,b.village,b.model,b.planDate,b.branch,b.status])])}>Export CSV</Btn><Btn variant="p" onClick={()=>setShowAdd(true)}>+ Add booking</Btn></>}/>
    <Stats items={[{label:'Total',value:bookings.length},{label:'Pending',value:bookings.filter(b=>b.status==='pending').length,color:'#633806'},{label:'Delivered',value:bookings.filter(b=>b.status==='delivered').length,color:'#27500A'},{label:'From feedback',value:bookings.filter(b=>b.fromFeedback).length,color:'#0C447C'}]}/>
    <FilterBar>
      <FInput value={search} onChange={setSearch} placeholder="Search name / phone..."/>
      <FInput type="date" value={fromDate} onChange={setFromDate}/><FSep/>
      <FInput type="date" value={toDate} onChange={setToDate}/>
      <FSelect value={statusF} onChange={setStatusF} options={[{value:'all',label:'All statuses'},{value:'pending',label:'Pending'},{value:'delivered',label:'Delivered'}]}/>
      {role==='admin'&&<FSelect value={branchF} onChange={setBranchF} options={[{value:'all',label:'All branches'},...BRANCHES.map(b=>({value:b,label:b}))]}/>}
    </FilterBar>
    <Table cols={['#','Date','Name','Phone','Village','Model','Purchase planned','Branch','Status','Actions']} rows={filtered.map((b,i)=>{
      const diff=daysDiff(today(),b.planDate);
      const pl=diff<0?<span style={{color:'#A32D2D',fontSize:10}}>{Math.abs(diff)}d overdue</span>:diff===0?<span style={{color:'#633806',fontSize:10}}>Today</span>:<span style={{color:'#706f6b',fontSize:10}}>in {diff}d</span>;
      return <TR key={b.id}>
        <TD style={{color:'#a8a79f'}}>{i+1}</TD>
        <TD>{b.date}{b.fromFeedback&&<span style={{background:'#EEEDFE',color:'#3C3489',fontSize:9,padding:'1px 5px',borderRadius:8,marginLeft:4}}>via feedback</span>}</TD>
        <TD style={{fontWeight:500}}>{b.name}</TD><TD>{b.phone}</TD>
        <TD style={{fontSize:11,color:'#706f6b'}}>{b.village||'—'}</TD>
        <TD style={{fontSize:11}}>{b.model}</TD>
        <TD>{b.planDate}<br/>{pl}</TD>
        <TD style={{fontSize:11}}>{b.branch}</TD>
        <TD><Badge label={b.status==='delivered'?'Delivered':'Pending'}/></TD>
        <TD><div style={{display:'flex',gap:3}}>
          {b.status!=='delivered'&&<Btn variant="s" style={{fontSize:10,padding:'2px 6px'}} onClick={async()=>{await bookingsApi.update(b.id,{status:'delivered'});load();notify('Delivered!');}}>Delivered</Btn>}
          <Btn style={{fontSize:10,padding:'2px 6px'}} onClick={()=>setShowEdit(b)}>Edit</Btn>
       
          {role==='admin'&&<Btn variant="d" style={{fontSize:10,padding:'2px 6px'}} onClick={async()=>{await bookingsApi.remove(b.id);load();notify('Deleted.');}}>Del</Btn>}
        </div></TD>
      </TR>;
    })}/>
    {showAdd&&<BookingModal onClose={()=>setShowAdd(false)} onSaved={()=>{setShowAdd(false);load();}} branch={branch}/>}
    {showEdit&&<BookingModal booking={showEdit} onClose={()=>setShowEdit(null)} onSaved={()=>{setShowEdit(null);load();}} branch={branch}/>}
  </div>;
}
function BookingModal({booking,onClose,onSaved,branch}){
  const{role}=useAuth();
  const[date,setDate]=useState(booking?.date||today());
  const[name,setName]=useState(booking?.name||'');
  const[phone,setPhone]=useState(booking?.phone||'');
  const[village,setVillage]=useState(booking?.village||'');
  const[model,setModel]=useState(booking?.model||'');
  const[planDate,setPlanDate]=useState(booking?.planDate||'');
  const[bkBranch,setBkBranch]=useState(booking?.branch||branch||'Maheshwaram');
  const[saving,setSaving]=useState(false);
  async function save(){if(!date||!name||!phone||!model||!planDate){notify('Fill all required fields');return;}setSaving(true);try{const data={date,name,phone,village,model,planDate,branch:bkBranch,status:booking?.status||'pending',fromFeedback:booking?.fromFeedback||false};if(booking)await bookingsApi.update(booking.id,data);else await bookingsApi.create(data);notify('Saved!');onSaved();}catch(e){notify('Error: '+e.message);}finally{setSaving(false);}}
  return <Modal open title={booking?'Edit booking':'Add booking'} onClose={onClose}>
    <Field label="Booking date"><Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field>
    <Field label="Customer name"><Input value={name} onChange={e=>setName(e.target.value)}/></Field>
    <Field label="Phone"><Input value={phone} onChange={e=>setPhone(e.target.value)}/></Field>
    <Field label="Village"><Input value={village} onChange={e=>setVillage(e.target.value)}/></Field>
    <Field label="Model"><Input value={model} onChange={e=>setModel(e.target.value)}/></Field>
    <Field label="Date of purchase planning"><Input type="date" value={planDate} onChange={e=>setPlanDate(e.target.value)}/></Field>
    <Field label="Branch">{role==='admin'?<Select value={bkBranch} onChange={e=>setBkBranch(e.target.value)} options={BRANCHES}/>:<Input value={bkBranch} readonly/>}</Field>
    <ModalActions onCancel={onClose} onSave={save} loading={saving}/>
  </Modal>;
}
export function Employees(){
  const{role}=useAuth();
  const[employees,setEmployees]=useState([]);
  const[loading,setLoading]=useState(true);
  const[showAdd,setShowAdd]=useState(false);
  const[showEdit,setShowEdit]=useState(null);
  const[showDevices,setShowDevices]=useState(null);
  const[search,setSearch]=useState('');
  const[branchF,setBranchF]=useState('all');
  const[roleF,setRoleF]=useState('all');
  const[statusF,setStatusF]=useState('all');
  useEffect(()=>{load();},[]);
  async function load(){try{setEmployees(await employeesApi.list());}catch(e){notify('Error: '+e.message);}finally{setLoading(false);}}
  if(role!=='admin')return <div style={{padding:40,textAlign:'center',color:'#706f6b'}}>Admin only</div>;
  const filtered=employees.filter(e=>{if(branchF!=='all'&&e.branch!==branchF)return false;if(roleF!=='all'&&e.role!==roleF)return false;if(statusF!=='all'&&e.status!==statusF)return false;if(search&&!e.name?.toLowerCase().includes(search.toLowerCase())&&!e.email?.toLowerCase().includes(search.toLowerCase()))return false;return true;});
  if(loading)return <Loading/>;
  return <div>
    <SectionHeader left={<span style={{fontSize:12,color:'#706f6b'}}>Employee accounts — admin only</span>} right={<Btn variant="p" onClick={()=>setShowAdd(true)}>+ Add employee</Btn>}/>
    <FilterBar>
      <FInput value={search} onChange={setSearch} placeholder="Search name..."/>
      <FSelect value={branchF} onChange={setBranchF} options={[{value:'all',label:'All branches'},...BRANCHES.map(b=>({value:b,label:b}))]}/>
      <FSelect value={roleF} onChange={setRoleF} options={[{value:'all',label:'All roles'},{value:'branch_manager',label:'Branch manager'},{value:'stock_manager',label:'Stock manager'}]}/>
      <FSelect value={statusF} onChange={setStatusF} options={[{value:'all',label:'All statuses'},{value:'active',label:'Active'},{value:'inactive',label:'Inactive'}]}/>
    </FilterBar>
    <Table cols={['Name','Phone','Branch','Role','Joined','Status','Actions']} rows={filtered.map(e=>(
      <TR key={e.id}>
        <TD><div style={{fontWeight:500}}>{e.name}</div><div style={{fontSize:10,color:'#a8a79f'}}>{e.email}</div></TD>
        <TD>{e.phone}</TD><TD>{e.branch}</TD>
        <TD><Badge label={e.role==='branch_manager'?'Branch manager':'Stock manager'}/></TD>
        <TD style={{fontSize:11}}>{e.joined}</TD>
        <TD><Badge label={e.status==='active'?'active':'inactive'}/></TD>
        <TD><div style={{display:'flex',gap:3}}>
          <Btn style={{fontSize:10,padding:'2px 6px'}} onClick={()=>setShowEdit(e)}>Edit</Btn>
            <Btn variant="bk" style={{fontSize:10,padding:'2px 6px'}} onClick={()=>setShowDevices(e)}>Devices</Btn>
          <Btn variant="w" style={{fontSize:10,padding:'2px 6px'}} onClick={async()=>{await employeesApi.update(e.id,{status:e.status==='active'?'inactive':'active'});load();}}>{e.status==='active'?'Deactivate':'Activate'}</Btn>
          <Btn variant="d" style={{fontSize:10,padding:'2px 6px'}} onClick={async()=>{await employeesApi.deleteUser(e.id);load();notify('Deleted.');}}>Delete</Btn>
        </div></TD>
      </TR>
    ))}/>
    {showAdd&&<EmployeeModal onClose={()=>setShowAdd(false)} onSaved={()=>{setShowAdd(false);load();}}/>}
    {showEdit&&<EmployeeModal employee={showEdit} onClose={()=>setShowEdit(null)} onSaved={()=>{setShowEdit(null);load();}}/>}
    {showDevices&&<DeviceModal employee={showDevices} onClose={()=>setShowDevices(null)}/>}
  </div>;
}
function EmployeeModal({employee,onClose,onSaved}){
  const[name,setName]=useState(employee?.name||'');
  const[email,setEmail]=useState(employee?.email||'');
  const[phone,setPhone]=useState(employee?.phone||'');
  const[empBranch,setEmpBranch]=useState(employee?.branch||'Maheshwaram');
  const[empRole,setEmpRole]=useState(employee?.role||'branch_manager');
  const[password,setPassword]=useState('');
  const[saving,setSaving]=useState(false);
  async function save(){if(!name||!email){notify('Fill required fields');return;}setSaving(true);try{if(employee){await employeesApi.update(employee.id,{name,phone,branch:empBranch,role:empRole});if(empRole!==employee.role||empBranch!==employee.branch)await employeesApi.setRole({uid:employee.id,role:empRole,branch:empBranch});}else{if(!password){notify('Password required');setSaving(false);return;}await employeesApi.createUser({email,password,name,role:empRole,branch:empBranch,phone});}notify('Saved!');onSaved();}catch(e){notify('Error: '+e.message);}finally{setSaving(false);}}
  return <Modal open title={employee?'Edit employee':'Add employee'} onClose={onClose}>
    <Field label="Full name"><Input value={name} onChange={e=>setName(e.target.value)}/></Field>
    {!employee&&<Field label="Email"><Input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></Field>}
    <Field label="Phone"><Input value={phone} onChange={e=>setPhone(e.target.value)}/></Field>
    <Field label="Branch"><Select value={empBranch} onChange={e=>setEmpBranch(e.target.value)} options={BRANCHES}/></Field>
    <Field label="Role"><Select value={empRole} onChange={e=>setEmpRole(e.target.value)} options={[{value:'branch_manager',label:'Branch manager'},{value:'stock_manager',label:'Stock manager'}]}/></Field>
    {!employee&&<Field label="Password"><Input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></Field>}
    <ModalActions onCancel={onClose} onSave={save} loading={saving}/>
  </Modal>;
}
     function DeviceModal({employee,onClose}){
  const[devices,setDevices]=useState(employee.allowedDevices||[]);
  const[newCode,setNewCode]=useState('');
  const[maxDevices,setMaxDevices]=useState(employee.maxDevices||2);
  const[saving,setSaving]=useState(false);
  async function addDevice(){
    if(!newCode){notify('Enter device code');return;}
    setSaving(true);
    try{
      const{api}=await import('../lib/api');
      await api.post('/auth/add-device',{uid:employee.id,deviceCode:newCode.toUpperCase(),maxDevices:parseInt(maxDevices)});
      setDevices([...devices,newCode.toUpperCase()]);
      setNewCode('');
      notify('Device added!');
    }catch(e){notify('Error: '+e.message);}finally{setSaving(false);}
  }
  async function removeDevice(code){
    try{
      const{api}=await import('../lib/api');
      await api.delete('/auth/remove-device',{uid:employee.id,deviceCode:code});
      setDevices(devices.filter(d=>d!==code));
      notify('Device removed!');
    }catch(e){notify('Error: '+e.message);}
  }
  return <Modal open title={'Manage devices — '+employee.name} onClose={onClose} width={420}>
    <div style={{background:'#f7f7f5',borderRadius:8,padding:'10px 13px',marginBottom:12,fontSize:12,color:'#706f6b'}}>
      Employee must share their device code from the blocked screen. Enter it below to grant access.
    </div>
    <Field label="Max devices allowed">
      <select value={maxDevices} onChange={e=>setMaxDevices(e.target.value)} style={{padding:'7px 10px',fontSize:12,border:'1px solid #d0cfc8',borderRadius:7,background:'#fff'}}>
        {[1,2,3,4,5].map(n=><option key={n} value={n}>{n} device{n>1?'s':''}</option>)}
      </select>
    </Field>
    <Field label="Add device code">
      <div style={{display:'flex',gap:6}}>
        <input value={newCode} onChange={e=>setNewCode(e.target.value.toUpperCase())} placeholder="e.g. DEV-4821" style={{flex:1,padding:'7px 10px',fontSize:12,border:'1px solid #d0cfc8',borderRadius:7,background:'#fff',textTransform:'uppercase'}}/>
        <Btn variant="p" onClick={addDevice} disabled={saving}>Add</Btn>
      </div>
    </Field>
    <div style={{marginTop:8}}>
      <div style={{fontSize:11,fontWeight:600,color:'#706f6b',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.04em'}}>Registered devices ({devices.length}/{maxDevices})</div>
      {devices.length===0&&<div style={{fontSize:12,color:'#a8a79f',padding:'10px 0'}}>No devices registered yet</div>}
      {devices.map(d=><div key={d} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',background:'#f7f7f5',borderRadius:7,marginBottom:4,border:'1px solid #e3e2dc'}}>
        <span style={{fontWeight:600,fontSize:13,color:'#534AB7',letterSpacing:2}}>{d}</span>
        <Btn variant="d" style={{fontSize:10,padding:'2px 7px'}} onClick={()=>removeDevice(d)}>Remove</Btn>
      </div>)}
    </div>
    <div style={{display:'flex',justifyContent:'flex-end',marginTop:14}}><Btn onClick={onClose}>Close</Btn></div>
  </Modal>;
}
export function Attendance(){
  const{role,branch}=useAuth();
  const[attData,setAttData]=useState([]);
  const[staff,setStaff]=useState([]);
  const[loading,setLoading]=useState(true);
  const[tab,setTab]=useState('Daily');
  const[branchF,setBranchF]=useState('all');
  const[popup,setPopup]=useState(null);
  const td=new Date();
  const curY=td.getFullYear(),curM=td.getMonth();
  const dim=new Date(curY,curM+1,0).getDate();
  useEffect(()=>{load();},[]);
  async function load(){
    try{
      const{employeesApi:eApi}=await import('../lib/api');
      const[a,emps]=await Promise.all([attendanceApi.list(),eApi.list()]);
      setAttData(a);setStaff(emps.filter(e=>e.status==='active').map(e=>({id:e.id,name:e.name,branch:e.branch})));
    }catch(e){notify('Error: '+e.message);}finally{setLoading(false);}
  }
  async function mark(staffId,date,status,empBranch){try{await attendanceApi.mark({staffId,date,status,branch:empBranch});load();setPopup(null);}catch(e){notify('Error: '+e.message);}}
  const vS=staff.filter(s=>{if(role==='branch_manager'&&s.branch!==branch)return false;if(branchF!=='all'&&s.branch!==branchF)return false;return true;});
  function getAtt(staffId,day){const dateStr=`${curY}-${String(curM+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;const key=`${staffId}_${dateStr}`;return attData.find(a=>a.id===key)?.status||null;}
  const aC={Present:{bg:'#EAF3DE',color:'#27500A'},Absent:{bg:'#FCEBEB',color:'#A32D2D'},Leave:{bg:'#FAEEDA',color:'#633806'},'Half day':{bg:'#E6F1FB',color:'#0C447C'}};
  if(loading)return <Loading/>;
  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
      <Tabs tabs={['Daily','Monthly']} active={tab} onChange={setTab}/>
      <div style={{display:'flex',gap:7,alignItems:'center'}}>
        {role==='admin'&&<FSelect value={branchF} onChange={setBranchF} options={[{value:'all',label:'All branches'},...BRANCHES.map(b=>({value:b,label:b}))]}/>}
      </div>
    </div>
    {tab==='Daily'&&<>
      <div style={{fontSize:12,color:'#706f6b',marginBottom:8}}>Date: <strong>{td.toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</strong></div>
      <div style={{overflowX:'auto',border:'1px solid #e3e2dc',borderRadius:10}}>
        <table style={{borderCollapse:'collapse',fontSize:12}}>
          <thead><tr>
            <th style={{padding:'6px 10px',textAlign:'left',minWidth:110,position:'sticky',left:0,background:'#f7f7f5',borderBottom:'1px solid #e3e2dc',fontSize:10,fontWeight:600,color:'#706f6b',textTransform:'uppercase',zIndex:2}}>Staff</th>
            {Array.from({length:dim},(_,i)=>i+1).map(d=>{const isSun=new Date(curY,curM,d).getDay()===0;const isToday=d===td.getDate();return<th key={d} style={{minWidth:24,padding:'4px 2px',textAlign:'center',fontSize:9,background:isSun?'#F1EFE8':'#f7f7f5',color:isSun?'#888780':'#706f6b',borderBottom:'1px solid #e3e2dc',fontWeight:600}}>{isToday?<span style={{background:'#534AB7',color:'#fff',borderRadius:3,padding:'1px 3px'}}>{d}</span>:d}</th>;})}
            {['P','A','L','H'].map(h=><th key={h} style={{minWidth:24,padding:'4px 3px',textAlign:'center',fontSize:9,background:'#EEEDFE',color:'#3C3489',borderBottom:'1px solid #e3e2dc',fontWeight:600}}>{h}</th>)}
          </tr></thead>
          <tbody>{vS.map(s=>{
            let p=0,a=0,l=0,h=0;
            return <tr key={s.id}>
              <td style={{padding:'5px 10px',position:'sticky',left:0,background:'#fff',fontWeight:500,zIndex:1,borderBottom:'1px solid #f0efec',whiteSpace:'nowrap'}}><div>{s.name.split(' ')[0]}</div><div style={{fontSize:9,color:'#a8a79f'}}>{s.branch}</div></td>
              {Array.from({length:dim},(_,i)=>i+1).map(d=>{
                const isSun=new Date(curY,curM,d).getDay()===0;
                const isFut=new Date(curY,curM,d)>td;
                const isToday=d===td.getDate();
                const dateStr=`${curY}-${String(curM+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const val=getAtt(s.id,d);
                const canEdit=role==='admin'||(role==='branch_manager'&&isToday);
                if(val==='Present')p++;else if(val==='Absent')a++;else if(val==='Leave')l++;else if(val==='Half day')h++;
                const lbl=val==='Present'?'P':val==='Absent'?'A':val==='Leave'?'L':val==='Half day'?'H':'+';
                const bc=val?aC[val]:{bg:'#f7f7f5',color:'#d0cfc8'};
                if(isSun)return<td key={d} style={{padding:'2px',textAlign:'center',borderBottom:'1px solid #f0efec'}}><span style={{width:22,height:22,borderRadius:4,background:'#F1EFE8',color:'#888780',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:9}}>S</span></td>;
                if(isFut)return<td key={d} style={{padding:'2px',textAlign:'center',borderBottom:'1px solid #f0efec'}}><span style={{width:22,height:22,borderRadius:4,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:9,opacity:.2}}>-</span></td>;
                return<td key={d} style={{padding:'2px',textAlign:'center',borderBottom:'1px solid #f0efec'}}>{canEdit?<button onClick={()=>setPopup({staffId:s.id,staffName:s.name,branch:s.branch,dateStr,day:d})} style={{width:22,height:22,borderRadius:4,border:'none',cursor:'pointer',background:bc.bg,color:bc.color,fontSize:9,fontWeight:600}}>{lbl}</button>:<span style={{width:22,height:22,borderRadius:4,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:600,background:bc.bg,color:bc.color}}>{lbl}</span>}</td>;
              })}
              {[p,a,l,h].map((n,i)=>{const colors=[{bg:'#EAF3DE',color:'#27500A'},{bg:'#FCEBEB',color:'#A32D2D'},{bg:'#FAEEDA',color:'#633806'},{bg:'#E6F1FB',color:'#0C447C'}];return<td key={i} style={{padding:'5px 3px',textAlign:'center',background:colors[i].bg,color:colors[i].color,fontWeight:600,borderBottom:'1px solid #f0efec'}}>{n}</td>;})}
            </tr>;
          })}</tbody>
        </table>
      </div>
    </>}
    {tab==='Monthly'&&<div style={{overflowX:'auto',border:'1px solid #e3e2dc',borderRadius:10}}>
      <table style={{borderCollapse:'collapse',fontSize:12,width:'100%'}}>
        <thead><tr>{['Staff','Branch','P','A','L','H'].map(h=><th key={h} style={{padding:'8px 10px',textAlign:'left',fontSize:10,fontWeight:600,color:'#706f6b',background:'#f7f7f5',borderBottom:'1px solid #e3e2dc',textTransform:'uppercase'}}>{h}</th>)}</tr></thead>
        <tbody>{vS.map(s=>{let p=0,a=0,l=0,h=0;for(let d=1;d<=dim;d++){const v=getAtt(s.id,d);if(v==='Present')p++;else if(v==='Absent')a++;else if(v==='Leave')l++;else if(v==='Half day')h++;}return<tr key={s.id}><td style={{padding:'8px 10px',borderBottom:'1px solid #f0efec',fontWeight:500}}>{s.name}</td><td style={{padding:'8px 10px',borderBottom:'1px solid #f0efec',fontSize:11}}>{s.branch}</td>{[p,a,l,h].map((n,i)=>{const colors=[{bg:'#EAF3DE',color:'#27500A'},{bg:'#FCEBEB',color:'#A32D2D'},{bg:'#FAEEDA',color:'#633806'},{bg:'#E6F1FB',color:'#0C447C'}];return<td key={i} style={{padding:'8px 10px',borderBottom:'1px solid #f0efec',background:colors[i].bg,color:colors[i].color,fontWeight:600}}>{n}</td>;})}</tr>;})}
        </tbody>
      </table>
    </div>}
    {popup&&<div style={{position:'fixed',zIndex:200,background:'#fff',border:'1px solid #d0cfc8',borderRadius:10,padding:10,boxShadow:'0 8px 30px rgba(0,0,0,.12)',top:'50%',left:'50%',transform:'translate(-50%,-50%)'}}>
      <div style={{fontSize:11,fontWeight:600,color:'#706f6b',marginBottom:6}}>{popup.staffName} — {popup.dateStr}</div>
      {[['Present','#EAF3DE','#27500A'],['Absent','#FCEBEB','#A32D2D'],['Leave','#FAEEDA','#633806'],['Half day','#E6F1FB','#0C447C']].map(([s,bg,color])=><button key={s} onClick={()=>mark(popup.staffId,popup.dateStr,s,popup.branch)} style={{display:'block',width:'100%',textAlign:'left',padding:'5px 8px',fontSize:11,border:'1px solid #e3e2dc',borderRadius:6,background:bg,color,cursor:'pointer',marginBottom:3,fontWeight:500}}>{s}</button>)}
      <button onClick={()=>mark(popup.staffId,popup.dateStr,null,popup.branch)} style={{display:'block',width:'100%',textAlign:'left',padding:'5px 8px',fontSize:10,border:'1px solid #e3e2dc',borderRadius:6,background:'#fff',color:'#a8a79f',cursor:'pointer'}}>Clear</button>
      <button onClick={()=>setPopup(null)} style={{display:'block',width:'100%',textAlign:'center',padding:'4px',fontSize:10,border:'none',background:'none',color:'#706f6b',cursor:'pointer',marginTop:3}}>Cancel</button>
    </div>}
  </div>;
}
export function CashFlow(){
  const{role}=useAuth();
  const[rows,setRows]=useState([]);
  const[loading,setLoading]=useState(true);
  const[fromDate,setFromDate]=useState('');
  const[toDate,setToDate]=useState('');
  const[branchF,setBranchF]=useState('all');
  useEffect(()=>{load();},[]);
  async function load(){
    try{
      const[receipts,expenses,deposits]=await Promise.all([receiptsApi.list(),expensesApi.list(),depositsApi.list()]);
      const allDates=[...new Set([...receipts.map(r=>r.date),...expenses.map(e=>e.date),...deposits.map(d=>d.date)])].sort();
      const cfRows=[];
      ['Maheshwaram','Chevella','KLKW','Nagarkurnool'].forEach(branch=>{
        let cih=0;
        allDates.forEach(date=>{
          const tc=receipts.filter(r=>r.date===date&&r.branch===branch&&r.mode==='Cash').reduce((s,r)=>s+(r.amtPaid||0),0);
          const te=expenses.filter(e=>e.date===date&&e.branch===branch).reduce((s,e)=>s+(e.amount||0),0);
          const td=deposits.filter(d=>d.date===date&&d.branch===branch).reduce((s,d)=>s+(d.amount||0),0);
          cih=cih+tc-te-td;
          if(tc>0||te>0||td>0)cfRows.push({date,branch,todayCash:tc,todayExp:te,todayDep:td,cashInHand:cih});
        });
      });
      setRows(cfRows);
    }catch(e){notify('Error: '+e.message);}finally{setLoading(false);}
  }
  const filtered=rows.filter(r=>{if(branchF!=='all'&&r.branch!==branchF)return false;if(fromDate&&r.date<fromDate)return false;if(toDate&&r.date>toDate)return false;return true;});
  if(role!=='admin')return <div style={{padding:40,textAlign:'center',color:'#706f6b'}}>Admin only</div>;
  if(loading)return <Loading/>;
  return <div>
    <SectionHeader left={<div style={{background:'#f7f7f5',borderRadius:8,padding:'9px 13px',fontSize:11,color:'#706f6b'}}>ℹ️ Cash in hand = Yesterday cash + Today cash − Expenses − Deposits</div>} right={<Btn onClick={()=>exportCSV('cashflow',[['Date','Branch','Cash','Expenses','Deposits','Cash in hand'],...filtered.map(r=>[r.date,r.branch,r.todayCash,r.todayExp,r.todayDep,r.cashInHand])])}>Export CSV</Btn>}/>
    <Stats items={[{label:'Total cash',value:'₹'+fmt(filtered.reduce((s,r)=>s+r.todayCash,0)),color:'#27500A'},{label:'Total expenses',value:'₹'+fmt(filtered.reduce((s,r)=>s+r.todayExp,0)),color:'#A32D2D'},{label:'Total deposits',value:'₹'+fmt(filtered.reduce((s,r)=>s+r.todayDep,0)),color:'#0C447C'},{label:'Cash in hand',value:'₹'+fmt(filtered.length?filtered[filtered.length-1].cashInHand:0),color:'#27500A'}]}/>
    <FilterBar><FInput type="date" value={fromDate} onChange={setFromDate}/><FSep/><FInput type="date" value={toDate} onChange={setToDate}/><FSelect value={branchF} onChange={setBranchF} options={[{value:'all',label:'All branches'},...BRANCHES.map(b=>({value:b,label:b}))]}/></FilterBar>
    <Table cols={['#','Date','Branch','Today cash','Expenses','Deposits','Cash in hand']} rows={filtered.map((r,i)=>(
      <TR key={i} highlight={r.date===today()}>
        <TD style={{color:'#a8a79f'}}>{i+1}</TD>
        <TD>{r.date}{r.date===today()&&<span style={{background:'#534AB7',color:'#fff',fontSize:9,padding:'0 5px',borderRadius:8,marginLeft:4}}>Today</span>}</TD>
        <TD style={{fontSize:11}}>{r.branch}</TD>
        <TD style={{color:'#27500A',fontWeight:500}}>₹{fmt(r.todayCash)}</TD>
        <TD style={{color:'#A32D2D',fontWeight:500}}>₹{fmt(r.todayExp)}</TD>
        <TD style={{color:'#0C447C',fontWeight:500}}>₹{fmt(r.todayDep)}</TD>
        <TD style={{fontWeight:500,color:r.cashInHand>0?'#27500A':r.cashInHand<0?'#A32D2D':'#706f6b'}}>₹{fmt(r.cashInHand)}</TD>
      </TR>
    ))}/>
  </div>;
}
export function BankStatement(){
  const{role}=useAuth();
  const[entries,setEntries]=useState([]);
  const[loading,setLoading]=useState(true);
  const[activeBranch,setActiveBranch]=useState('all');
  const[fromDate,setFromDate]=useState('');
  const[toDate,setToDate]=useState('');
  const[bankF,setBankF]=useState('all');
  const[srcF,setSrcF]=useState('all');
  useEffect(()=>{load();},[]);
  async function load(){
    try{
      const[receipts,deposits]=await Promise.all([receiptsApi.list(),depositsApi.list()]);
      const de=deposits.map(d=>({date:d.date,bank:d.bank,branch:d.branch,source:'Deposit',reference:'DEP',amount:d.amount}));
      const re=receipts.filter(r=>r.mode==='Bank transfer'&&r.bank&&r.amtPaid>0).map(r=>({date:r.date,bank:r.bank,branch:r.branch,source:'Receipt',reference:r.billNo+(r.utr?' / '+r.utr:''),amount:r.amtPaid}));
      setEntries([...de,...re].sort((a,b)=>a.date?.localeCompare(b.date)));
    }catch(e){notify('Error: '+e.message);}finally{setLoading(false);}
  }
  if(role!=='admin')return <div style={{padding:40,textAlign:'center',color:'#706f6b'}}>Admin only</div>;
  if(loading)return <Loading/>;
  const filtered=entries.filter(e=>{if(activeBranch!=='all'&&e.branch!==activeBranch)return false;if(bankF!=='all'&&e.bank!==bankF)return false;if(srcF!=='all'&&e.source!==(srcF==='deposit'?'Deposit':'Receipt'))return false;if(fromDate&&e.date<fromDate)return false;if(toDate&&e.date>toDate)return false;return true;});
  const bC={TEW:'#EEEDFE',STEW:'#E1F5EE',Canara:'#FAEEDA','ICICI Agro':'#E6F1FB'};
  const bCol={TEW:'#3C3489',STEW:'#085041',Canara:'#633806','ICICI Agro':'#0C447C'};
  let bal=0;
  return <div>
    <SectionHeader left={<span style={{fontSize:12,color:'#706f6b'}}>Deposits + bank transfer receipts — admin only</span>}/>
    <div style={{display:'flex',gap:3,background:'#f7f7f5',padding:3,borderRadius:8,width:'fit-content',marginBottom:11,flexWrap:'wrap'}}>
      {['all',...BRANCHES].map(b=><button key={b} onClick={()=>setActiveBranch(b)} style={{padding:'4px 10px',fontSize:11,borderRadius:5,cursor:'pointer',color:activeBranch===b?'#1a1915':'#706f6b',border:activeBranch===b?'1px solid #e3e2dc':'none',background:activeBranch===b?'#fff':'none',fontWeight:activeBranch===b?500:400}}>{b==='all'?'All':b}</button>)}
    </div>
    <FilterBar>
      <FInput type="date" value={fromDate} onChange={setFromDate}/><FSep/>
      <FInput type="date" value={toDate} onChange={setToDate}/>
      <FSelect value={bankF} onChange={setBankF} options={[{value:'all',label:'All banks'},...BANKS.map(b=>({value:b,label:b}))]}/>
      <FSelect value={srcF} onChange={setSrcF} options={[{value:'all',label:'All sources'},{value:'deposit',label:'Deposits only'},{value:'receipt',label:'Receipts only'}]}/>
    </FilterBar>
    <Stats items={[{label:'Transactions',value:filtered.length},{label:'From deposits',value:'₹'+fmt(filtered.filter(e=>e.source==='Deposit').reduce((s,e)=>s+(e.amount||0),0)),color:'#3C3489'},{label:'From receipts',value:'₹'+fmt(filtered.filter(e=>e.source==='Receipt').reduce((s,e)=>s+(e.amount||0),0)),color:'#633806'},{label:'Total credits',value:'₹'+fmt(filtered.reduce((s,e)=>s+(e.amount||0),0)),color:'#27500A'}]}/>
    <Table cols={['#','Date','Bank','Branch','Source','Reference','Amount','Balance']} rows={filtered.map((e,i)=>{bal+=e.amount||0;return<TR key={i}><TD style={{color:'#a8a79f'}}>{i+1}</TD><TD>{e.date}</TD><TD><span style={{background:bC[e.bank]||'#F1EFE8',color:bCol[e.bank]||'#5F5E5A',padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:500}}>{e.bank}</span></TD><TD>{e.branch}</TD><TD><Badge label={e.source}/></TD><TD style={{fontSize:11,color:'#706f6b'}}>{e.reference}</TD><TD style={{fontWeight:500,color:'#27500A'}}>+₹{fmt(e.amount)}</TD><TD style={{fontWeight:500}}>₹{fmt(bal)}</TD></TR>;})}/>
  </div>;
}
export function SecurityAudit(){
  const{role}=useAuth();
  if(role!=='admin')return <div style={{padding:40,textAlign:'center',color:'#706f6b'}}>Admin only</div>;
  return <div style={{padding:40,textAlign:'center',background:'#fff',border:'1px solid #e3e2dc',borderRadius:8}}><div style={{fontSize:15,fontWeight:600,marginBottom:8}}>Security audit</div><div style={{fontSize:13,color:'#706f6b'}}>Firebase Authentication handles all login security.<br/>View login activity at <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" style={{color:'#534AB7'}}>Firebase Console → Authentication</a></div></div>;
}
