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
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).replace(/,/g, '');
  document.getElementById("current-time").textContent = timeStr;
}
setInterval(updateTime, 1000);
updateTime();

async function lookupNumber() {
  const phone = document.getElementById("phoneNumber").value.trim();
  const resultContainer = document.getElementById("result-container");
  
  if (!phone) {
    showResult("Please enter a phone number", "error");
    return;
  }
  
  if (!/^\d{10}$/.test(phone)) {
    showResult("Please enter a valid 10-digit USA number", "error");
    return;
  }

  showResult(`
    <div class="loader-content">
      <i class="fas fa-spinner fa-spin"></i>
      <div>Searching across premium databases...</div>
      <div class="loader-bar"></div>
    </div>
  `, "loading");

  try {
    // Try premium API first
    let data = await fetchWithRetry(`${APIs.premium}${phone}`);
    
    if (!data || data.error) {
      // Fallback to standard APIs
      const [tcpaData, personData] = await Promise.all([
        fetchWithRetry(`${APIs.tcpa}${phone}`),
        fetchWithRetry(`${APIs.person}${phone}`)
      ]);
      data = { ...tcpaData, ...personData };
    }

    displayResults(data);
  } catch (error) {
    console.error("Lookup error:", error);
    showResult(`
      <div class="error-content">
        <i class="fas fa-exclamation-triangle"></i>
        <div>
          <h3>Error fetching data</h3>
          <p>Please try again later</p>
          ${error.message ? `<p class="error-detail">${error.message}</p>` : ''}
        </div>
      </div>
    `, "error");
  }
}

async function fetchWithRetry(url, retries = 2) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API responded with ${response.status}`);
    return await response.json();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithRetry(url, retries - 1);
    }
    throw error;
  }
}

function displayResults(data) {
  let html = `
    <div class="result-section">
      <h2><i class="fas fa-shield-alt"></i> Compliance Status</h2>
      <div class="status-grid">
        ${createStatusItem("Phone", formatPhoneNumber(data.phone))}
        ${createStatusItem("State", data.state)}
        ${createStatusItem("DNC National", data.ndnc, true)}
        ${createStatusItem("DNC State", data.sdnc, true)}
        ${createStatusItem("Litigator", data.type, true)}
        ${createStatusItem("Blacklist", data.listed, true)}
      </div>
    </div>
  `;

  if (data.owners?.length > 0) {
    const owner = data.owners[0];
    html += `
      <div class="result-section">
        <h2><i class="fas fa-user-tie"></i> Owner Information</h2>
        <div class="owner-card">
          <div class="owner-header">
            <h3>${owner.name || 'Unknown'}</h3>
            ${owner.age ? `<span class="owner-age">Age: ${owner.age}</span>` : ''}
            ${owner.dob ? `<span class="owner-dob">DOB: ${owner.dob}</span>` : ''}
          </div>
          
          <div class="address-history">
            ${owner.currentAddress ? createAddressCard("LIVES AT", owner.currentAddress) : ''}
            ${owner.previousAddresses?.map(addr => createAddressCard("LIVED AT", addr)).join('')}
          </div>
        </div>
      </div>
    `;
  }

  if (data.relatedPersons?.length > 0) {
    html += `
      <div class="result-section">
        <h2><i class="fas fa-users"></i> Related Persons</h2>
        <div class="related-persons">
          ${data.relatedPersons.map(p => `<span class="related-person">${p}</span>`).join(' : ')}
        </div>
      </div>
    `;
  }

  showResult(html, "success");
}

function createStatusItem(label, value, isStatus = false) {
  if (!value) value = 'N/A';
  const statusClass = isStatus ? (value.toLowerCase().includes('clean') ? 'status-clean' : 'status-listed') : '';
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

function showResult(content, type) {
  const resultContainer = document.getElementById("result-container");
  resultContainer.innerHTML = content;
  resultContainer.className = `result-container ${type}`;
  resultContainer.style.display = "block";
}

// Input formatting
document.getElementById("phoneNumber").addEventListener("input", function(e) {
  this.value = this.value.replace(/\D/g, '');
});
