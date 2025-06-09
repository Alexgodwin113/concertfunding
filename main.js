// ←––– REPLACE THESE 3 VALUES
const AIRTABLE_BASE  = 'appZkhdBlrRVmDHNN';
const AIRTABLE_TABLE = 'Donations';
const AIRTABLE_PAT   = 'patE59Kfz2EDRbuFr.b7872b56513d4222623a312ae8c66becf5583a3c97d49e3a72d77726df60af15';

const GOAL = 28_500_000;
const API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`;
const HEADERS = {
  'Authorization': `Bearer ${AIRTABLE_PAT}`,
  'Content-Type': 'application/json',
};

// 1) Fetch & render
async function loadDonations() {
  const res = await fetch(API_URL + '?pageSize=100', { headers: HEADERS });
  const { records } = await res.json();
  const data = records.map(r => r.fields || {});

  // update totals
  const total = data.reduce((sum, d) => sum + (d.Amount||0), 0);
  const pct   = Math.min(100, Math.round(100 * total / GOAL));
  document.getElementById('progress-bar-inner').style.width = pct + '%';
  document.getElementById('progress-bar-inner').textContent = pct + '%';
  document.getElementById('raised').textContent = 'LKR ' + total.toLocaleString();

  // update table
  const tbody = document.getElementById('donor-list');
  tbody.innerHTML = '';
  data
    .sort((a,b)=> new Date(b.Date) - new Date(a.Date))
    .forEach(d => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${d.Date}</td><td>${d.Donor}</td><td>${d.Amount.toLocaleString()}</td>`;
      tbody.appendChild(tr);
    });
}

// 2) Handle “Add Donation”
document.getElementById('donation-form').addEventListener('submit', async e => {
  e.preventDefault();
  const fields = {
    Donor:  e.target.Donor.value,
    Amount: parseFloat(e.target.Amount.value),
    Date:   e.target.Date.value,
  };
  await fetch(API_URL, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ fields }),
  });
  e.target.reset();
  loadDonations();
});

// 3) Build & download CSV
document.getElementById('export-csv').addEventListener('click', async () => {
  const res = await fetch(API_URL + '?pageSize=100', { headers: HEADERS });
  const { records } = await res.json();
  const data = records.map(r => r.fields);
  const rows = [
    ['Date','Donor','Amount'],
    ...data.map(d => [d.Date, d.Donor, d.Amount])
  ];
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'donations.csv';
  a.click();
});

loadDonations();
