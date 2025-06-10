/* ───────── CONFIG ───────── */
const AIRTABLE_BASE  = 'appZkhdBlrRVmDHNN';
const AIRTABLE_TABLE = 'Donations';
const AIRTABLE_PAT   = 'patE59Kfz2EDRbuFr.75e50fb7cedd29b797f08cffd485a71794f2d41e3a49ff1e7b594f3b3fa6c663';

const GOAL    = 28_500_000;
const API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`;
const HEADERS = {
  'Authorization': `Bearer ${AIRTABLE_PAT}`,
  'Content-Type': 'application/json'
};

const PASSWORD_HASH = 'd669a4664bf88c434928c08f2cf95b26f642917a6093d98eff710961ecbd1c88';

/* ───────── SHA256 HELPER ───────── */
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ───────── DOM ELEMENTS ───────── */
const progress     = document.getElementById('progress-bar-inner');
const raisedEl     = document.getElementById('raised-amount');
const donorTbody   = document.getElementById('donation-list');
const form         = document.getElementById('donation-form');

/* ───────── AUTH ───────── */
document.getElementById('pwd-input').addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    const pwd = e.target.value;
    const hash = await sha256(pwd);
    if (hash === PASSWORD_HASH) {
      document.getElementById('auth-overlay').style.display = 'none';
      loadDonations();
    } else {
      document.getElementById('pwd-error').textContent = 'Incorrect password.';
    }
  }
});

/* ───────── LOAD DONATIONS ───────── */
async function loadDonations() {
  try {
    const res = await fetch(`${API_URL}?pageSize=100`, { headers: HEADERS });
    const { records = [] } = await res.json();

    const total = records.reduce((sum, r) => sum + (r.fields.Amount || 0), 0);
    const pct   = Math.min(100, (total / GOAL) * 100);
    progress.style.width = pct + '%';
    progress.textContent = (pct < 1 && pct > 0 ? 1 : pct.toFixed(1)) + '%';
    raisedEl.textContent = total.toLocaleString();

    donorTbody.innerHTML = '';
    records.sort((a, b) => new Date(b.fields.Date) - new Date(a.fields.Date))
      .forEach(rec => {
        const f = rec.fields;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${f.Date   || '—'}</td>
          <td>${f.Donor  || '—'}</td>
          <td>${f.Amount?.toLocaleString() ?? '—'}</td>
          <td>
            <button onclick="editDonation('${rec.id}')">✏️</button>
            <button onclick="deleteDonation('${rec.id}')">🗑️</button>
          </td>`;
        donorTbody.appendChild(tr);
      });

  } catch (err) {
    alert('⚠️ Failed to load donations:\n' + err.message);
  }
}

/* ───────── ADD / UPDATE ───────── */
form.addEventListener('submit', async e => {
  e.preventDefault();
  const donor = form.name.value.trim();
  const amount = parseFloat(form.amount.value);
  const date = form.date.value;

  if (!donor || isNaN(amount) || !date) return alert("Please fill all fields.");

  try {
    const body = JSON.stringify({ fields: { Donor: donor, Amount: amount, Date: date } });
    await fetch(API_URL, { method: 'POST', headers: HEADERS, body });
    form.reset();
    loadDonations();
  } catch (err) {
    alert('⚠️ Could not save donation:\n' + err.message);
  }
});

/* ───────── DELETE ───────── */
async function deleteDonation(id) {
  if (!confirm('Delete this donation?')) return;
  try {
    await fetch(`${API_URL}/${id}`, { method: 'DELETE', headers: HEADERS });
    loadDonations();
  } catch (err) {
    alert('⚠️ Failed to delete:\n' + err.message);
  }
}

/* ───────── EDIT (Optional Future Add) ───────── */
function editDonation(id) {
  alert('Edit feature coming soon.');
}

/* ───────── CSV EXPORT ───────── */
function downloadCSV() {
  fetch(`${API_URL}?pageSize=100`, { headers: HEADERS })
    .then(r => r.json())
    .then(({ records = [] }) => {
      const rows = [
        ['Date', 'Donor', 'Amount'],
        ...records.map(r => [r.fields.Date || '', r.fields.Donor || '', r.fields.Amount || 0])
      ];
      const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'donations.csv';
      a.click();
    });
}
