import { useState } from 'react'

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"]

const inputStyle = {
  width: '100%', padding: '13px 16px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12, color: '#fff',
  fontSize: 15, fontFamily: 'DM Sans, sans-serif',
  outline: 'none', boxSizing: 'border-box',
}
const labelStyle = {
  fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)',
  letterSpacing: '0.14em', marginBottom: 6, display: 'block',
}

export default function ConnectTab({ staff, onLeadSaved }) {
  const empty = { name:'', store:'', email:'', phone:'', locations:'', states:[], volume:'', infused:'', brands:'', notes:'' }
  const [form, setForm] = useState({ ...empty })
  const [statesOpen, setStatesOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  const toggleState = (st) => setForm(prev => ({
    ...prev,
    states: prev.states.includes(st) ? prev.states.filter(s=>s!==st) : [...prev.states, st]
  }))

  const pick = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const canSubmit = form.name && form.store && form.email && form.phone

  const submit = () => {
    if (!canSubmit) return
    onLeadSaved?.({ ...form, staff: staff.name, timestamp: new Date().toISOString() })
    setSaved(true)
    setTimeout(() => { setSaved(false); setForm({ ...empty }); setStatesOpen(false) }, 2500)
  }

  if (saved) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', textAlign:'center', padding:'40px 32px', background:'#0A0A0A' }}>
      <div style={{ width:80, height:80, borderRadius:'50%', background:'rgba(39,201,106,0.15)', border:'2px solid #27C96A', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, marginBottom:24 }}>✓</div>
      <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:30, fontWeight:900, marginBottom:8 }}>Got it.</h2>
      <p style={{ fontSize:15, color:'rgba(255,255,255,0.4)' }}>{form.store} — we'll follow up within 48 hours.</p>
    </div>
  )

  return (
    <div style={{ background:'#0A0A0A', height:'100%', overflowY:'auto', padding:'20px 16px 40px' }}>
      <p style={labelStyle}>CONNECT</p>
      <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:800, marginBottom:20 }}>Stay in Touch.</h2>

      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {[{key:'name',label:'YOUR NAME *',ph:'Jane Doe'},{key:'store',label:'STORE NAME *',ph:'Cloud 9 Smoke Shop'},{key:'email',label:'EMAIL *',ph:'jane@cloud9.com',type:'email'},{key:'phone',label:'PHONE *',ph:'(555) 123-4567',type:'tel'}].map(f => (
          <div key={f.key}>
            <label style={labelStyle}>{f.label}</label>
            <input type={f.type||'text'} placeholder={f.ph} value={form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})} style={inputStyle} />
          </div>
        ))}

        <div>
          <label style={labelStyle}>NUMBER OF LOCATIONS</label>
          <div style={{display:'flex',gap:8}}>
            {['1','2-5','6-20','20+'].map(o=>(
              <button key={o} onClick={()=>pick('locations',o)} style={{
                flex:1, padding:'11px 6px', borderRadius:10, cursor:'pointer',
                background: form.locations===o?'rgba(232,52,28,0.15)':'rgba(255,255,255,0.05)',
                border:`1px solid ${form.locations===o?'rgba(232,52,28,0.5)':'rgba(255,255,255,0.09)'}`,
                color: form.locations===o?'#E8341C':'rgba(255,255,255,0.4)',
                fontSize:14, fontWeight:700, fontFamily:'DM Sans,sans-serif',
              }}>{o}</button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>STATES YOU OPERATE IN</label>
          <button onClick={()=>setStatesOpen(o=>!o)} style={{...inputStyle, cursor:'pointer', textAlign:'left', color: form.states.length>0?'#fff':'rgba(255,255,255,0.25)'}}>
            {form.states.length > 0 ? form.states.join(', ') : 'Tap to select states ▾'}
          </button>
          {statesOpen && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, padding:12, marginTop:8, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:12, maxHeight:160, overflowY:'auto' }}>
              {US_STATES.map(st => (
                <button key={st} onClick={()=>toggleState(st)} style={{
                  padding:'5px 10px', borderRadius:7, cursor:'pointer',
                  background: form.states.includes(st)?'#E8341C':'transparent',
                  border:`1px solid ${form.states.includes(st)?'#E8341C':'rgba(255,255,255,0.12)'}`,
                  color: form.states.includes(st)?'#fff':'rgba(255,255,255,0.4)',
                  fontSize:11, fontWeight:700,
                }}>{st}</button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label style={labelStyle}>MONTHLY VOLUME ESTIMATE</label>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {['Just starting','50–100','100–500','500+'].map(o=>(
              <button key={o} onClick={()=>pick('volume',o)} style={{
                padding:'10px 14px', borderRadius:10, cursor:'pointer',
                background: form.volume===o?'rgba(232,52,28,0.15)':'rgba(255,255,255,0.05)',
                border:`1px solid ${form.volume===o?'rgba(232,52,28,0.5)':'rgba(255,255,255,0.09)'}`,
                color: form.volume===o?'#E8341C':'rgba(255,255,255,0.4)',
                fontSize:12, fontWeight:700, fontFamily:'DM Sans,sans-serif',
              }}>{o}</button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>INTERESTED IN INFUSED PRODUCTS?</label>
          <div style={{display:'flex',gap:8}}>
            {['Yes','No','Already carry'].map(o=>(
              <button key={o} onClick={()=>pick('infused',o)} style={{
                flex:1, padding:'12px 8px', borderRadius:10, cursor:'pointer',
                background: form.infused===o?'rgba(232,52,28,0.15)':'rgba(255,255,255,0.05)',
                border:`1px solid ${form.infused===o?'rgba(232,52,28,0.5)':'rgba(255,255,255,0.09)'}`,
                color: form.infused===o?'#E8341C':'rgba(255,255,255,0.4)',
                fontSize:12, fontWeight:700,
              }}>{o}</button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>HOT SAUCE BRANDS THEY CARRY</label>
          <input placeholder="e.g. Truff, Cholula, none" value={form.brands} onChange={e=>setForm({...form,brands:e.target.value})} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>STAFF NOTES</label>
          <textarea placeholder="Loves the Buffalo, wants samples first, runs 3 shops in AZ..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={3} style={{...inputStyle, resize:'none'}} />
        </div>

        <button onClick={submit} disabled={!canSubmit} style={{
          width:'100%', padding:18,
          background: canSubmit?'#E8341C':'rgba(255,255,255,0.08)',
          border:'none', borderRadius:14, color:'#fff',
          fontSize:16, fontWeight:800, cursor:canSubmit?'pointer':'not-allowed',
          fontFamily:'Syne,sans-serif', opacity:canSubmit?1:0.4, marginTop:4,
        }}>
          SAVE CONTACT
        </button>
      </div>
    </div>
  )
}