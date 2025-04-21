// API Endpoints
const APIs = {
  tcpa: "https://api.uspeoplesearch.net/tcpa/v1?x=",
  person: "https://api.uspeoplesearch.net/person/v3?x=",
  premium: "https://premium_lookup-1-h4761841.deta.app/person?x=",
  report: "https://api.uspeoplesearch.net/tcpa/report?x="
};

// Update current time
function updateTime() {
  const now = new Date();
  const timeStr = now.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  document.getElementById("current-time").textContent = timeStr;
}
setInterval(updateTime, 1000);
updateTime();

async function lookupNumber() {
  const phone = document.getElementById("phoneNumber").value.trim();
  const resultContainer = document.getElementById("result-container");
  
  // Clear previous results
  resultContainer.innerHTML = '';
  resultContainer.style.display = 'none';
  
  if (!phone) {
    showError("Please enter a phone number");
    return;
  }
  
  if (!/^\d{10}$/.test(phone)) {
    showError("Please enter a valid 10-digit USA number");
    return;
  }

  showLoading();

  try {
    // Try premium API first
    let data = await fetchData(`${APIs.premium}${phone}`);
    
    // If premium fails, fallback to standard APIs
    if (!data || data.error) {
      const [tcpaData, personData] = await Promise.all([
        fetchData(`${APIs.tcpa}${phone}`),
        fetchData(`${APIs.person}${phone}`)
      ]);
      data = { ...tcpaData, ...personData };
    }

    // If we still have no data
    if (!data || Object.keys(data).length === 0) {
      throw new Error("No data available for this number");
    }

    displayResults(data);
  } catch (error) {
    console.error("Lookup error:", error);
    showError(error.message || "Error fetching data. Please try again later.");
  }
}

async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch from ${url}:`, error);
    return null;
  }
}

function displayResults(data) {
  let html = `
    <div class="result-section">
      <h2><i class="fas fa-shield-alt"></i> Compliance Status</h2>
      <div class="status-grid">
        ${createStatusItem("Phone", formatPhoneNumber(data.phone || 'N/A'))}
        ${createStatusItem("State", data.state || 'N/A')}
        ${createStatusItem("DNC National", data.ndnc || 'N/A', true)}
        ${createStatusItem("DNC State", data.sdnc || 'N/A', true)}
        ${createStatusItem("Litigator", data.type || 'N/A', true)}
        ${createStatusItem("Blacklist", data.listed || 'N/A', true)}
      </div>
    </div>
  `;

  // Owner Information
  if (data.owner || data.owners?.[0]) {
    const owner = data.owner || data.owners[0];
    html += `
      <div class="result-section">
        <h2><i class="fas fa-user-tie"></i> Owner Information</h2>
        <div class="owner-card">
          <div class="owner-header">
            <h3>${owner.name || 'Unknown'}</h3>
            ${owner.age ? `<span class="owner-meta">Age: ${owner.age}</span>` : ''}
            ${owner.dob ? `<span class="owner-meta">DOB: ${owner.dob}</span>` : ''}
          </div>
          
          ${owner.address ? createAddressCard("Current Address", owner.address) : ''}
          ${owner.addresses?.map(addr => createAddressCard("Previous Address", addr)).join('') || ''}
        </div>
      </div>
    `;
  }

  // Related Persons
  if (data.relatedPersons?.length > 0 || data.related?.length > 0) {
    const related = data.relatedPersons || data.related;
    html += `
      <div class="result-section">
        <h2><i class="fas fa-users"></i> Related Persons</h2>
        <div class="related-persons">
          ${related.map(p => `<span class="related-person">${p}</span>`).join(' : ')}
        </div>
      </div>
    `;
  }

  showResult(html);
}

function createStatusItem(label, value, isStatus = false) {
  const statusClass = isStatus ? (value.toString().toLowerCase().includes('clean') ? 'status-clean' : 'status-listed') : '';
  return `
    <div class="status-item">
      <span class="status-label">${label}:</span>
      <span class="status-value ${statusClass}">${value}</span>
    </div>
  `;
}

function createAddressCard(label, address) {
  return `
    <div class="address-card">
      <div class="address-label">${label}</div>
      <div class="address-details">${address}</div>
    </div>
  `;
}

function formatPhoneNumber(phone) {
  return phone?.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3') || 'N/A';
}

function showLoading() {
  const resultContainer = document.getElementById("result-container");
  resultContainer.innerHTML = `
    <div class="loading-state">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Searching premium databases...</p>
      <div class="progress-bar"></div>
    </div>
  `;
  resultContainer.style.display = "block";
}

function showResult(content) {
  const resultContainer = document.getElementById("result-container");
  resultContainer.innerHTML = content;
  resultContainer.style.display = "block";
}

function showError(message) {
  const resultContainer = document.getElementById("result-container");
  resultContainer.innerHTML = `
    <div class="error-state">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>Error fetching data</h3>
      <p>${message}</p>
      <button onclick="document.getElementById('phoneNumber').focus()">
        <i class="fas fa-redo"></i> Try Again
      </button>
    </div>
  `;
  resultContainer.style.display = "block";
}

// Input formatting
document.getElementById("phoneNumber").addEventListener("input", function(e) {
  this.value = this.value.replace(/\D/g, '');
});

// Focus input on page load
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById("phoneNumber").focus();
});
