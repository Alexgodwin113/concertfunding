/* ───────── CONFIG ───────── */
const AIRTABLE_BASE  = 'appZkhdBlrRVmDHNN';
const AIRTABLE_TABLE = 'Donations';
const AIRTABLE_PAT   = 'patE59Kfz2EDRbuFr.75e50fb7cedd29b797f08cffd485a71794f2d41e3a49ff1e7b594f3b3fa6c663';

const GOAL    = 28_500_000;
const API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`;
const HEADERS = { 'Authorization': `Bearer ${AIRTABLE_PAT}`, 'Content-Type': 'application/json' };

/* simple SHA-256 hash helper for the password gate */
async function sha256(str){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

const PASSWORD_HASH = 'd669a4664bf88c434928c08f2cf95b26f642917a6093d98eff710961ecbd1c88';


/* ───────── UI ELEMENTS ───────── */
const app          = document.getElementById('app');
const progress     = document.getElementById('progress-bar-inner');
const raisedEl     = document.getElementById('raised');
const donorTbody   = document.getElementById('donor-list');
const errorEl      = document.getElementById('error');
const form         = document.getElementById('donation-form');
const cancelEditBtn= document.getElementById('cancel-edit');

/* ───────── AUTH GATE ───────── */
document.getElementById('pwd-btn').addEventListener('click', unlock);
document.getElementById('pwd-input').addEventListener('keydown', e=>e.key==='Enter'&&unlock());

async function unlock(){
  const pwd  = document.getElementById('pwd-input').value;
  const hash = await sha256(pwd);
  if(hash === PASSWORD_HASH){
    document.getElementById('auth-overlay').remove();
    app.hidden = false;
    loadDonations();
  }else{
    document.getElementById('pwd-error').textContent = 'Wrong password';
  }
}

/* ───────── FETCH & RENDER ───────── */
async function loadDonations() {
  errorEl.textContent = '';
  try {
    const res = await fetch(`${API_URL}?pageSize=100`, { headers: HEADERS });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);

    const { records = [] } = await res.json();

    /* totals & progress */
    const total  = records.reduce((sum, r) => sum + (r.fields.Amount || 0), 0);
    const pct    = Math.min(100, (total / GOAL) * 100);
    progress.style.width  = pct + '%';
    progress.textContent  = (pct < 1 && pct > 0 ? 1 : pct.toFixed(1)) + '%';
    raisedEl.textContent  = 'LKR ' + total.toLocaleString();

    /* table */
    donorTbody.innerHTML = '';
    records.sort((a,b)=>new Date(b.fields.Date) - new Date(a.fields.Date))
      .forEach(rec=>{
        const f = rec.fields;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${f.Date   || '—'}</td>
          <td>${f.Donor  || '—'}</td>
          <td>${f.Amount?.toLocaleString() ?? '—'}</td>
          <td>
            <button data-edit="${rec.id}">✏️</button>
            <button data-del="${rec.id}">🗑️</button>
          </td>`;
        donorTbody.appendChild(tr);
      });
  } catch (err) {
    console.error(err);
    errorEl.textContent = '⚠️ ' + err.message;
  }
}

/* ───────── ADD / UPDATE DONATION ───────── */
form.addEventListener('submit', async e => {
  e.preventDefault();
  errorEl.textContent = '';

  const fields = {
    Donor:  e.target.Donor.value.trim(),
    Amount: parseFloat(e.target.Amount.value),
    Date:   e.target.Date.value,
  };
  const recordId = e.target.RecordId.value;

  const method = recordId ? 'PATCH' : 'POST';
  const url    = recordId ? `${API_URL}/${recordId}` : API_URL;
  const body   = recordId ? JSON.stringify({ fields }) : JSON.stringify({ fields });

  try {
    const resp = await fetch(url, { method, headers: HEADERS, body });
    if (!resp.ok) throw new Error(`${resp.status}: ${await resp.text()}`);

    form.reset();
    cancelEditBtn.hidden = true;
    loadDonations();
  } catch (err) {
    console.error(err);
    errorEl.textContent = '⚠️ ' + err.message;
  }
});

/* ───────── EDIT / DELETE BUTTONS (event delegation) ───────── */
donorTbody.addEventListener('click', async e=>{
  const editId = e.target.dataset.edit;
  const delId  = e.target.dataset.del;

  /* delete */
  if(delId){
    if(!confirm('Delete this donation?')) return;
    try{
      const r = await fetch(`${API_URL}/${delId}`, {method:'DELETE', headers:HEADERS});
      if(!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
      loadDonations();
    }catch(err){ errorEl.textContent='⚠️ '+err.message; }
  }

  /* edit */
  if(editId){
    try{
      const r = await fetch(`${API_URL}/${editId}`, {headers:HEADERS});
      if(!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
      const rec = await r.json();
      const f   = rec.fields;

      form.Donor.value  = f.Donor  || '';
      form.Amount.value = f.Amount || '';
      form.Date.value   = f.Date   || '';
      form.RecordId.value = editId;

      cancelEditBtn.hidden = false;
      form.scrollIntoView({behavior:'smooth'});
    }catch(err){ errorEl.textContent='⚠️ '+err.message; }
  }
});

/* cancel editing */
cancelEditBtn.addEventListener('click', ()=>{
  form.reset();
  form.RecordId.value = '';
  cancelEditBtn.hidden = true;
});

/* ───────── CSV EXPORT ───────── */
document.getElementById('export-csv').addEventListener('click', async ()=>{
  errorEl.textContent = '';
  try{
    const res = await fetch(`${API_URL}?pageSize=100`, { headers: HEADERS });
    if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);
    const { records=[] } = await res.json();
    const rows = [
      ['Date','Donor','Amount'],
      ...records.map(r => [r.fields.Date || '', r.fields.Donor || '', r.fields.Amount || 0])
    ];
    const csv  = rows.map(r => r.map(v=>`"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    Object.assign(document.createElement('a'), {
      href:URL.createObjectURL(blob), download:'donations.csv'
    }).click();
  }catch(err){ errorEl.textContent='⚠️ '+err.message; }
});
