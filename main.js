// ───── CONFIG ─────
// Replace these with your real values:
const AIRTABLE_BASE  = 'appZkhdBlrRVmDHNN';    // from https://airtable.com/api
const AIRTABLE_TABLE = 'Donations';            // exact table name
const AIRTABLE_PAT   = 'patE59Kfz2EDRbuFr.75e50fb7cedd29b797f08cffd485a71794f2d41e3a49ff1e7b594f3b3fa6c663';  // your Personal Access Token

const GOAL    = 28_500_000;
const API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`;
const HEADERS = {
  'Authorization': `Bearer ${AIRTABLE_PAT}`,
  'Content-Type':  'application/json'
};

// ───── UI ELEMENTS ─────
const progressInner = document.getElementById('progress-bar-inner');
const raisedEl      = document.getElementById('raised');
const donorTbody    = document.getElementById('donor-list');
const errorEl       = document.getElementById('error');

// ───── FETCH & RENDER ─────
async function loadDonations() {
  errorEl.textContent = '';
  try {
    const res = await fetch(`${API_URL}?pageSize=100`, { headers: HEADERS });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Airtable error ${res.status}: ${text}`);
    }

    const { records = [] } = await res.json();
    const data = records.map(r => r.fields || {});

    console.log('Got records:', data);

    // Totals & Progress (show decimal or at least 1%)
    const total  = data.reduce((sum, d) => sum + (d.Amount || 0), 0);
    const rawPct = (total / GOAL) * 100;
    const displayPct = (rawPct > 0 && rawPct < 1)
      ? 1
      : parseFloat(rawPct.toFixed(1));

    progressInner.style.width     = rawPct + '%';
    progressInner.textContent     = displayPct + '%';
    raisedEl.textContent          = 'LKR ' + total.toLocaleString();

    // Table
    donorTbody.innerHTML = '';
    data
      .sort((a, b) => new Date(b.Date) - new Date(a.Date))
      .forEach(d => {
        const dateStr   = d.Date   || '—';
        const donorStr  = d.Donor  || '—';
        const amountStr = (d.Amount != null)
          ? d.Amount.toLocaleString()
          : '—';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${dateStr}</td>
          <td>${donorStr}</td>
          <td>${amountStr}</td>
        `;
        donorTbody.appendChild(tr);
      });

  } catch (err) {
    console.error(err);
    errorEl.textContent = '⚠️ ' + err.message;
  }
}

// ───── ADD DONATION ─────
document.getElementById('donation-form')
  .addEventListener('submit', async e => {
    e.preventDefault();
    errorEl.textContent = '';

    const fields = {
      Donor:  e.target.Donor.value,
      Amount: parseFloat(e.target.Amount.value),
      Date:   e.target.Date.value,
    };

    try {
      const resp = await fetch(API_URL, {
        method:  'POST',
        headers: HEADERS,
        body:    JSON.stringify({ fields })
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Airtable POST failed ${resp.status}: ${text}`);
      }

      e.target.reset();
      await loadDonations();
    }
    catch (err) {
      console.error(err);
      errorEl.textContent = '⚠️ ' + err.message;
    }
  });

// ───── CSV EXPORT ─────
document.getElementById('export-csv')
  .addEventListener('click', async () => {
    errorEl.textContent = '';
    try {
      const res = await fetch(`${API_URL}?pageSize=100`, { headers: HEADERS });
      if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);

      const { records = [] } = await res.json();
      const data = records.map(r => r.fields || {});

      const rows = [
        ['Date','Donor','Amount'],
        ...data.map(d => [d.Date || '', d.Donor || '', d.Amount || 0])
      ];
      const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'donations.csv';
      a.click();
    }
    catch (err) {
      console.error(err);
      errorEl.textContent = '⚠️ ' + err.message;
    }
  });

// ───── INITIALIZE ─────
loadDonations();
