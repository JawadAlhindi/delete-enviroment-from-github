// RECOMMENDED: Disconnect HEROKU from Github before doing this (though not strictly necessary, I think).
//See https://stackoverflow.com/a/61272173/6569950 for more info.

// PARAMETERS - UPDATE THESE VALUES
const TOKEN = ""; // MUST BE `repo_deployments` authorized
const REPO = ""; // Repository name
const USER_OR_ORG = ""; // GitHub username or organization name

// CONFIGURATION VALIDATION
console.log('Configuration:');
console.log('- Repository:', `${USER_OR_ORG}/${REPO}`);
console.log('- Token (first 10 chars):', TOKEN.substring(0, 10) + '...');
console.log('- API Endpoint:', `https://api.github.com/repos/${USER_OR_ORG}/${REPO}/deployments`);

// GLOBAL VARS
const URL = `https://api.github.com/repos/${USER_OR_ORG}/${REPO}/deployments`;
const AUTH_HEADER = `token ${TOKEN}`;

// UTILITY FUNCTIONS
const getAllDeployments = () =>
  fetch(`${URL}`, { headers: { authorization: AUTH_HEADER } })
    .then((response) => {
      console.log('API Response Status:', response.status);
      console.log('API Response Headers:', response.headers);
      
      if (!response.ok) {
        return response.json().then(errorData => {
          console.error('API Error Response:', errorData);
          throw new Error(`GitHub API Error ${response.status}: ${errorData.message || 'Unknown error'}`);
        });
      }
      
      return response.json();
    });

const makeDeploymentInactive = (id) =>
  fetch(`${URL}/${id}/statuses`, {
    method: "POST",
    body: JSON.stringify({ state: "inactive" }),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/vnd.github.ant-man-preview+json",
      authorization: AUTH_HEADER,
    },
  }).then(() => id);

const deleteDeployment = (id) =>
  fetch(`${URL}/${id}`, {
    method: "DELETE",
    headers: { authorization: AUTH_HEADER },
  }).then(() => id);

// MAIN - Interactive deployment selector
let allDeployments = [];
let selectedDeployments = [];

// Function to display deployments list
const displayDeployments = (deployments) => {
  const appDiv = document.getElementById("app");
  appDiv.innerHTML = `
    <div class="header-section">
      <h1>🚀 GitHub Deployment Cleanup</h1>
      <p class="subtitle">Found ${deployments.length} deployments. Select which ones to delete:</p>
    </div>
    
    <div class="controls-section">
      <div class="button-group">
        <button id="delete-selected" class="btn btn-danger" onclick="deleteSelectedDeployments()" disabled>
          🗑️ Delete Selected (0)
        </button>
        <button id="select-all" class="btn btn-secondary" onclick="selectAllDeployments()">
          ☑️ Select All
        </button>
        <button id="deselect-all" class="btn btn-secondary" onclick="deselectAllDeployments()">
          ☐ Deselect All
        </button>
      </div>
    </div>
    
    <div id="deployments-list" class="deployments-container"></div>
    <div id="results" class="results-section"></div>
  `;

  const deploymentsList = document.getElementById("deployments-list");
  deployments.forEach((deployment, index) => {
    const deploymentDiv = document.createElement("div");
    deploymentDiv.className = "deployment-card";
    
    // Get deployment name/task if available
    const deploymentName = deployment.task || deployment.description || `Deployment #${deployment.id}`;
    const shortRef = deployment.ref ? deployment.ref.substring(0, 8) : 'N/A';
    const createdDate = new Date(deployment.created_at);
    const timeAgo = getTimeAgo(createdDate);
    
    deploymentDiv.innerHTML = `
      <div class="deployment-header">
        <label class="deployment-checkbox">
          <input type="checkbox" id="deployment-${deployment.id}" 
                 onchange="toggleDeployment(${deployment.id}, ${index})">
          <span class="checkmark"></span>
        </label>
        <div class="deployment-title">
          <h3>${deploymentName}</h3>
          <span class="deployment-id">ID: ${deployment.id}</span>
        </div>
        <div class="deployment-status">
          <span class="status-badge ${deployment.statuses_url ? 'active' : 'inactive'}">
            ${deployment.statuses_url ? '🟢 Active' : '🔴 Inactive'}
          </span>
        </div>
      </div>
      
      <div class="deployment-details">
        <div class="detail-row">
          <div class="detail-item">
            <span class="detail-label">🌍 Environment:</span>
            <span class="detail-value environment-${deployment.environment?.toLowerCase() || 'unknown'}">
              ${deployment.environment || 'N/A'}
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-label">🔀 Git Ref:</span>
            <span class="detail-value ref-code">${shortRef}</span>
          </div>
        </div>
        
        <div class="detail-row">
          <div class="detail-item">
            <span class="detail-label">📅 Created:</span>
            <span class="detail-value">${createdDate.toLocaleString()}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">⏰ Time Ago:</span>
            <span class="detail-value">${timeAgo}</span>
          </div>
        </div>
        
        <div class="detail-row">
          <div class="detail-item">
            <span class="detail-label">👤 Creator:</span>
            <span class="detail-value">${deployment.creator?.login || 'Unknown'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">🏷️ SHA:</span>
            <span class="detail-value sha-code">${deployment.sha?.substring(0, 8) || 'N/A'}</span>
          </div>
        </div>
        
        ${deployment.description ? `
          <div class="detail-row full-width">
            <span class="detail-label">📝 Description:</span>
            <span class="detail-value">${deployment.description}</span>
          </div>
        ` : ''}
      </div>
    `;
    deploymentsList.appendChild(deploymentDiv);
  });
};

// Helper function to calculate time ago
const getTimeAgo = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
};

// Function to toggle deployment selection
window.toggleDeployment = (id, index) => {
  const checkbox = document.getElementById(`deployment-${id}`);
  if (checkbox.checked) {
    if (!selectedDeployments.includes(id)) {
      selectedDeployments.push(id);
    }
  } else {
    selectedDeployments = selectedDeployments.filter(deploymentId => deploymentId !== id);
  }
  
  const deleteButton = document.getElementById("delete-selected");
  deleteButton.disabled = selectedDeployments.length === 0;
  deleteButton.textContent = `Delete Selected (${selectedDeployments.length})`;
};

// Function to select all deployments
window.selectAllDeployments = () => {
  allDeployments.forEach((deployment, index) => {
    const checkbox = document.getElementById(`deployment-${deployment.id}`);
    checkbox.checked = true;
    if (!selectedDeployments.includes(deployment.id)) {
      selectedDeployments.push(deployment.id);
    }
  });
  
  const deleteButton = document.getElementById("delete-selected");
  deleteButton.disabled = false;
  deleteButton.textContent = `Delete Selected (${selectedDeployments.length})`;
};

// Function to deselect all deployments
window.deselectAllDeployments = () => {
  allDeployments.forEach((deployment) => {
    const checkbox = document.getElementById(`deployment-${deployment.id}`);
    checkbox.checked = false;
  });
  selectedDeployments = [];
  
  const deleteButton = document.getElementById("delete-selected");
  deleteButton.disabled = true;
  deleteButton.textContent = `Delete Selected (0)`;
};

// Function to delete selected deployments
window.deleteSelectedDeployments = () => {
  if (selectedDeployments.length === 0) {
    alert("Please select at least one deployment to delete.");
    return;
  }
  
  if (!confirm(`Are you sure you want to delete ${selectedDeployments.length} deployment(s)? This action cannot be undone.`)) {
    return;
  }
  
  const deleteButton = document.getElementById("delete-selected");
  deleteButton.disabled = true;
  deleteButton.textContent = "Deleting...";
  
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "<p>Deleting selected deployments...</p>";
  
  // Process deletions
  Promise.all(selectedDeployments.map((id) => 
    makeDeploymentInactive(id)
      .then(() => deleteDeployment(id))
      .then(() => ({ id, status: 'success' }))
      .catch((error) => ({ id, status: 'error', error: error.message }))
  ))
  .then((results) => {
    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'error');
    
    resultsDiv.innerHTML = `
      <h2>Deletion Results</h2>
      <p><strong>Successfully deleted:</strong> ${successful.length}</p>
      <p><strong>Failed:</strong> ${failed.length}</p>
      ${failed.length > 0 ? `<p><strong>Errors:</strong> ${failed.map(f => f.error).join(', ')}</p>` : ''}
      <p><strong>Deleted IDs:</strong> ${successful.map(r => r.id).join(', ')}</p>
    `;
    
    // Reset the interface
    deleteButton.disabled = false;
    deleteButton.textContent = "Delete Selected (0)";
    selectedDeployments = [];
    allDeployments.forEach((deployment) => {
      const checkbox = document.getElementById(`deployment-${deployment.id}`);
      checkbox.checked = false;
    });
  })
  .catch((error) => {
    resultsDiv.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    deleteButton.disabled = false;
    deleteButton.textContent = "Delete Selected (0)";
  });
};

// Function to verify repository access
const verifyRepositoryAccess = () => {
  const repoUrl = `https://api.github.com/repos/${USER_OR_ORG}/${REPO}`;
  return fetch(repoUrl, { headers: { authorization: AUTH_HEADER } })
    .then(response => {
      if (!response.ok) {
        return response.json().then(errorData => {
          throw new Error(`Repository Access Error ${response.status}: ${errorData.message || 'Repository not found or no access'}`);
        });
      }
      return response.json();
    });
};

// Load deployments and display them
const initializeApp = () => {
  const appDiv = document.getElementById("app");
  appDiv.innerHTML = `
    <h1>GitHub Deployment Cleanup</h1>
    <p>Verifying repository access...</p>
    <p><strong>Repository:</strong> ${USER_OR_ORG}/${REPO}</p>
    <p><strong>API Endpoint:</strong> ${URL}</p>
  `;

  // First verify repository access
  verifyRepositoryAccess()
    .then((repoInfo) => {
      console.log('Repository Info:', repoInfo);
      appDiv.innerHTML = `
        <h1>GitHub Deployment Cleanup</h1>
        <p>✅ Repository access verified: <strong>${repoInfo.full_name}</strong></p>
        <p>Fetching deployments...</p>
      `;
      
      // Now fetch deployments
      return getAllDeployments();
    })
    .catch((error) => {
      console.error("Error:", error);
      appDiv.innerHTML = `
        <h1>❌ Error</h1>
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 10px 0;">
          <h3>Failed to access repository or deployments</h3>
          <p><strong>Error:</strong> ${error.message}</p>
          <p><strong>Repository:</strong> ${USER_OR_ORG}/${REPO}</p>
          <p><strong>Possible causes:</strong></p>
          <ul>
            <li>Repository doesn't exist or is private</li>
            <li>Token doesn't have access to this repository</li>
            <li>Token doesn't have 'repo_deployments' permission</li>
            <li>Repository exists but has no deployments</li>
          </ul>
          <p><strong>Solutions:</strong></p>
          <ul>
            <li>Check if the repository name and organization are correct</li>
            <li>Verify your GitHub token has the right permissions</li>
            <li>Make sure the repository has deployments to clean up</li>
          </ul>
        </div>
      `;
    })
  .then((res) => {
      if (res && Array.isArray(res)) {
    console.log(`${res.length} deployments found`);
        allDeployments = res;
        displayDeployments(res);
      } else {
        throw new Error("Invalid response from GitHub API");
      }
    });
};

// Token verification function
const checkToken = () => {
  const appDiv = document.getElementById("app");
  appDiv.innerHTML = `
    <h1>🔍 GitHub Token Verification</h1>
    <p>Checking your GitHub token...</p>
    <div id="token-results"></div>
  `;
  
  const resultsDiv = document.getElementById("token-results");
  
  // Check token by getting user info
  fetch('https://api.github.com/user', { 
    headers: { authorization: AUTH_HEADER } 
  })
  .then(response => {
    console.log('Token check response status:', response.status);
    
    if (!response.ok) {
      return response.json().then(errorData => {
        throw new Error(`Token Error ${response.status}: ${errorData.message}`);
      });
    }
    return response.json();
  })
  .then(userInfo => {
    console.log('User info:', userInfo);
    
    // Check token scopes
    return fetch('https://api.github.com/user', { 
      headers: { 
        authorization: AUTH_HEADER,
        'Accept': 'application/vnd.github.v3+json'
      } 
    }).then(response => {
      const scopes = response.headers.get('X-OAuth-Scopes') || 'Unknown';
      return { userInfo, scopes };
    });
  })
  .then(({ userInfo, scopes }) => {
    resultsDiv.innerHTML = `
      <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 10px 0;">
        <h3>✅ Token is Valid!</h3>
        <p><strong>Authenticated as:</strong> ${userInfo.login} (${userInfo.name || 'No name set'})</p>
        <p><strong>User ID:</strong> ${userInfo.id}</p>
        <p><strong>Token Scopes:</strong> ${scopes}</p>
        <p><strong>Public Repos:</strong> ${userInfo.public_repos}</p>
        <p><strong>Private Repos:</strong> ${userInfo.owned_private_repos || 'Unknown'}</p>
      </div>
    `;
    
    // Now check repository access
    return checkRepositoryAccess();
  })
  .catch(error => {
    console.error('Token check failed:', error);
    resultsDiv.innerHTML = `
      <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 10px 0;">
        <h3>❌ Token Verification Failed</h3>
        <p><strong>Error:</strong> ${error.message}</p>
        <p><strong>Possible causes:</strong></p>
        <ul>
          <li>Token is invalid or expired</li>
          <li>Token doesn't have required permissions</li>
          <li>Network connectivity issues</li>
        </ul>
        <p><strong>Solutions:</strong></p>
        <ul>
          <li>Generate a new token at <a href="https://github.com/settings/tokens" target="_blank">GitHub Settings</a></li>
          <li>Make sure token has 'repo' and 'repo_deployments' scopes</li>
          <li>Check if token is still active</li>
        </ul>
      </div>
`;
  });
};

// Check repository access
const checkRepositoryAccess = () => {
  const resultsDiv = document.getElementById("token-results");
  
  resultsDiv.innerHTML += `
    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 10px 0;">
      <h3>🔍 Checking Repository Access...</h3>
      <p>Testing access to: <strong>${USER_OR_ORG}/${REPO}</strong></p>
    </div>
  `;
  
  return verifyRepositoryAccess()
    .then(repoInfo => {
      resultsDiv.innerHTML += `
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 10px 0;">
          <h3>✅ Repository Access Confirmed!</h3>
          <p><strong>Repository:</strong> ${repoInfo.full_name}</p>
          <p><strong>Description:</strong> ${repoInfo.description || 'No description'}</p>
          <p><strong>Private:</strong> ${repoInfo.private ? 'Yes' : 'No'}</p>
          <p><strong>Default Branch:</strong> ${repoInfo.default_branch}</p>
          <p><strong>Created:</strong> ${new Date(repoInfo.created_at).toLocaleString()}</p>
        </div>
      `;
      
      // Now try to get deployments
      return getAllDeployments();
    })
    .then(deployments => {
      resultsDiv.innerHTML += `
        <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 10px 0;">
          <h3>📋 Deployments Found</h3>
          <p><strong>Total Deployments:</strong> ${deployments.length}</p>
          ${deployments.length > 0 ? `
            <p><strong>Ready to proceed with cleanup!</strong></p>
            <button onclick="showDeploymentList()" style="background-color: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
              🚀 Start Deployment Cleanup
            </button>
          ` : `
            <p><strong>No deployments found.</strong> This repository has no deployments to clean up.</p>
          `}
        </div>
      `;
    })
    .catch(error => {
      resultsDiv.innerHTML += `
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 10px 0;">
          <h3>❌ Repository Access Failed</h3>
          <p><strong>Error:</strong> ${error.message}</p>
          <p><strong>Repository:</strong> ${USER_OR_ORG}/${REPO}</p>
          <p><strong>Possible causes:</strong></p>
          <ul>
            <li>Repository doesn't exist</li>
            <li>Repository is private and token doesn't have access</li>
            <li>Wrong repository name or organization</li>
            <li>Token doesn't have 'repo' scope</li>
          </ul>
        </div>
      `;
    });
};

// Function to show deployment list
window.showDeploymentList = () => {
  // Get the deployments that were already fetched
  getAllDeployments()
    .then((deployments) => {
      console.log('Showing deployment list:', deployments);
      allDeployments = deployments;
      displayDeployments(deployments);
    })
    .catch((error) => {
      console.error('Error fetching deployments for display:', error);
    const appDiv = document.getElementById("app");
    appDiv.innerHTML = `
        <h1>❌ Error Loading Deployments</h1>
        <p style="color: red;">Failed to load deployment list: ${error.message}</p>
        <button onclick="checkToken()" style="background-color: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
          🔄 Try Again
        </button>
`;
  });
};

// Initialize with token check
checkToken();