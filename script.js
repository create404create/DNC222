// API Endpoints
const tcpaApi = "https://api.uspeoplesearch.net/tcpa/v1?x=";
const personApi = "https://api.uspeoplesearch.net/person/v3?x=";
const premiumLookupApi = "https://premium_lookup-1-h4761841.deta.app/person?x=";
const reportApi = "https://api.uspeoplesearch.net/tcpa/report?x=";

async function lookupNumber() {
  const phone = document.getElementById("phoneNumber").value.trim();
  const resultContainer = document.querySelector(".result-container");
  
  if (!phone) {
    showError("Please enter a phone number");
    return;
  }
  
  if (!/^\d{10}$/.test(phone)) {
    showError("Please enter a valid 10-digit USA number");
    return;
  }

  // Show loading state
  resultContainer.innerHTML = `
    <div class="loader">
      <i class="fas fa-spinner fa-spin"></i> 
      <div>Searching across 4 databases...</div>
      <div class="loader-progress"></div>
    </div>
  `;
  
  try {
    // Make all API calls in parallel
    const [tcpaData, personData, premiumData] = await Promise.all([
      fetchData(tcpaApi + phone),
      fetchData(personApi + phone),
      fetchData(premiumLookupApi + phone)
    ]);
    
    // Update UI with all data
    updateTCPAResults(tcpaData);
    updatePersonResults(personData);
    updatePremiumResults(premiumData);
    
    resultContainer.style.display = "block";
  } catch (error) {
    console.error("Error:", error);
    showError("Error fetching data. Please try again.");
  }
}

async function fetchData(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API Error: ${url}`);
  return await response.json();
}

function updateTCPAResults(data) {
  document.getElementById("result-phone").textContent = formatPhoneNumber(data.phone || 'N/A');
  document.getElementById("result-state").textContent = data.state || 'N/A';
  document.getElementById("result-dnc-national").textContent = data.ndnc || 'N/A';
  document.getElementById("result-dnc-state").textContent = data.sdnc || 'N/A';
  document.getElementById("result-litigator").textContent = data.type || 'N/A';
  document.getElementById("result-blacklist").textContent = data.listed || 'N/A';
  
  // Add status colors
  setStatusColor("result-dnc-national", data.ndnc);
  setStatusColor("result-dnc-state", data.sdnc);
  setStatusColor("result-litigator", data.type);
  setStatusColor("result-blacklist", data.listed);
}

function updatePersonResults(data) {
  if (!data || !data.owners) return;
  
  // Update primary owner info
  const primaryOwner = data.owners[0];
  if (primaryOwner) {
    document.getElementById("owner-name").textContent = primaryOwner.name || 'N/A';
    document.getElementById("owner-age").textContent = `Age: ${primaryOwner.age || '-'}`;
    document.getElementById("owner-dob").textContent = `DOB: ${primaryOwner.dob || '-'}`;
    
    // Update address history
    const addressHistory = document.getElementById("address-history");
    addressHistory.innerHTML = '';
    
    if (primaryOwner.currentAddress) {
      addressHistory.innerHTML += createAddressCard("LIVES AT", primaryOwner.currentAddress);
    }
    
    if (primaryOwner.previousAddresses) {
      primaryOwner.previousAddresses.forEach(addr => {
        addressHistory.innerHTML += createAddressCard("LIVED AT", addr);
      });
    }
  }
  
  // Update related persons
  if (data.relatedPersons) {
    const relatedPersons = document.getElementById("related-persons");
    relatedPersons.innerHTML = data.relatedPersons
      .map(person => `<span class="related-person">${person}</span>`)
      .join(' : ');
  }
}

function updatePremiumResults(data) {
  // This can be used to enhance the data from the premium API
  // Add any additional premium data fields here
}

function createAddressCard(label, address) {
  const parts = address.split(', ');
  return `
    <div class="address-card">
      <div class="address-label">${label}</div>
      <div class="address-details">
        <div class="address-street">${parts[0] || ''}</div>
        <div class="address-city">${parts.slice(1).join(', ') || ''}</div>
      </div>
    </div>
  `;
}

function setStatusColor(elementId, value) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const cleanValues = ['clean', 'no', 'false'];
  if (cleanValues.includes(value?.toLowerCase())) {
    element.classList.add('status-clean');
  } else if (value) {
    element.classList.add('status-listed');
  }
}

function formatPhoneNumber(phone) {
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
}

function showError(message) {
  const resultContainer = document.querySelector(".result-container");
  resultContainer.innerHTML = `<div class="error"><i class="fas fa-exclamation-circle"></i> ${message}</div>`;
  resultContainer.style.display = "block";
}

// Auto-format phone number input
document.getElementById("phoneNumber").addEventListener("input", function(e) {
  this.value = this.value.replace(/\D/g, '');
});
