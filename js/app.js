const API_URL = "https://budget-tracker-api-7o3a.onrender.com";
const token = localStorage.getItem("token");

// Redirect back to user validation portal if token credential is lost
if (!token) {
  window.location.href = "login.html";
}

// Update login state text label safely
const emailLabel = document.getElementById("user-email");
if (emailLabel) {
  emailLabel.textContent = `Welcome, ${localStorage.getItem("email") || "User"}`;
}

let spendingChart;

// Primary Dashboard Loader Task Loop
async function loadDashboard() {
  try {
    const res = await fetch(`${API_URL}/transactions`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (res.status === 401) {
      window.logout();
      return;
    }

    if (!res.ok) throw new Error("Dashboard records fetch request failed.");

    const transactions = await res.json();
    renderSummary(transactions);
    renderTransactions(transactions);
    renderChart(transactions);
  } catch (err) {
    console.error("Critical rendering pipeline issue:", err);
  }
}

function renderSummary(transactions) {
  let income = 0;
  let expenses = 0;

  transactions.forEach(t => {
    const amt = parseFloat(t.amount);
    if (amt > 0) {
      income += amt;
    } else {
      expenses += Math.abs(amt);
    }
  });

  const balance = income - expenses;

  if (document.getElementById("total-income")) document.getElementById("total-income").textContent = `$${income.toFixed(2)}`;
  if (document.getElementById("total-expenses")) document.getElementById("total-expenses").textContent = `$${expenses.toFixed(2)}`;
  if (document.getElementById("balance")) document.getElementById("balance").textContent = `$${balance.toFixed(2)}`;
}

function renderTransactions(transactions) {
  const list = document.getElementById("transactions-list");
  if (!list) return;
  list.innerHTML = "";

  if (transactions.length === 0) {
    list.innerHTML = '<li class="empty-state">No transaction logs recorded yet.</li>';
    return;
  }

  transactions.forEach(t => {
    const li = document.createElement("li");
    li.className = "transaction-item";
    const amt = parseFloat(t.amount);
    
    li.innerHTML = `
      <span><strong>${t.description}</strong> (${t.category}) - ${t.date}</span>
      <span class="${amt > 0 ? 'text-income' : 'text-expense'}">
        ${amt > 0 ? '+' : ''}$${Math.abs(amt).toFixed(2)}
      </span>
      <button class="delete-btn" onclick="deleteTransaction(${t.id})">Delete</button>
    `;
    list.appendChild(li);
  });
}

function renderChart(transactions) {
  const canvas = document.getElementById("spending-chart");
  if (!canvas) return;

  // Aggregate negative amounts (expenses) by category
  const categoryMap = {};
  transactions.forEach(t => {
    const amt = parseFloat(t.amount);
    if (isNaN(amt)) return;
    if (amt < 0) {
      const cat = t.category || "Other";
      categoryMap[cat] = (categoryMap[cat] || 0) + Math.abs(amt);
    }
  });

  const labels = Object.keys(categoryMap);
  const data = labels.map(l => categoryMap[l]);

  // Destroy previous chart instance if present
  if (spendingChart) {
    try { spendingChart.destroy(); } catch (e) {}
    spendingChart = null;
  }

  // If there's nothing to show, clear the canvas and return
  if (labels.length === 0) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const COLORS = [
    "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
    "#edc949", "#af7aa1", "#ff9da7", "#9c755f", "#bab0ac"
  ];

  const backgroundColor = labels.map((_, i) => COLORS[i % COLORS.length]);

  const ctx = canvas.getContext("2d");
  spendingChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data, backgroundColor }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { enabled: true }
      }
    }
  });
}

// Add transaction submission listener handler logic
const transactionFormButton = document.getElementById("add-btn");
if (transactionFormButton) {
  transactionFormButton.addEventListener("click", async () => {
    const description = document.getElementById("description").value.trim();
    const amount = parseFloat(document.getElementById("amount").value);
    const category = document.getElementById("category").value;
    const date = document.getElementById("date").value;

    if (!description || isNaN(amount) || !date) {
      alert("Validation Error: Please fill in description, numerical amount, and transaction date.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ description, amount, category, date })
      });

      if (res.ok) {
        document.getElementById("description").value = "";
        document.getElementById("amount").value = "";
        document.getElementById("date").value = "";
        loadDashboard();
      } else {
        const errorBody = await res.json().catch(() => ({}));
        alert(`API Error: ${errorBody.error || "The server rejected the entry submission."}`);
      }
    } catch (err) {
      alert("Network Error: Could not successfully communicate with backend server hosting API.");
    }
  });
}

window.deleteTransaction = async function(id) {
  if (!confirm("Are you sure you want to remove this ledger entry permanently?")) return;
  try {
    const res = await fetch(`${API_URL}/transactions/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.ok) {
      loadDashboard();
    } else {
      alert("Failed to drop database record row entry.");
    }
  } catch (err) {
    alert("Connection timeout issue dropping database logging items.");
  }
};

window.logout = function() {
  localStorage.clear();
  window.location.href = "login.html";
};

// Fire initial synchronization trigger routines
loadDashboard();