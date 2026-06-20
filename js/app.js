const API_URL = "https://budget-tracker-api-7o3a.onrender.com";
const token = localStorage.getItem("token");

// Redirect to login if no token is present
if (!token) {
  window.location.href = "login.html";
}

document.getElementById("user-email").textContent = `Welcome, ${localStorage.getItem("email") || "User"}`;

let spendingChart;

// Fetch and display dashboard data
async function loadDashboard() {
  const res = await fetch(`${API_URL}/transactions`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  
  if (res.status === 401) {
    logout();
    return;
  }

  const transactions = await res.json();
  renderSummary(transactions);
  renderTransactions(transactions);
  renderChart(transactions);
}

function renderSummary(transactions) {
  let income = 0;
  let expenses = 0;

  transactions.forEach(t => {
    if (t.amount > 0) {
      income += t.amount;
    } else {
      expenses += Math.abs(t.amount);
    }
  });

  const balance = income - expenses;

  document.getElementById("total-income").textContent = `$${income.toFixed(2)}`;
  document.getElementById("total-expenses").textContent = `$${expenses.toFixed(2)}`;
  document.getElementById("balance").textContent = `$${balance.toFixed(2)}`;
}

function renderTransactions(transactions) {
  const list = document.getElementById("transactions-list");
  if (!list) return;
  list.innerHTML = "";

  transactions.forEach(t => {
    const li = document.createElement("li");
    li.className = "transaction-item";
    li.innerHTML = `
      <span>${t.description} (${t.category}) - ${t.date}</span>
      <span class="${t.amount > 0 ? 'text-income' : 'text-expense'}">
        ${t.amount > 0 ? '+' : ''}$${t.amount.toFixed(2)}
      </span>
      <button onclick="deleteTransaction(${t.id})">Delete</button>
    `;
    list.appendChild(li);
  });
}

// Add transaction
document.getElementById("add-btn").addEventListener("click", async () => {
  const description = document.getElementById("description").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);
  const category = document.getElementById("category").value;
  const date = document.getElementById("date").value;

  if (!description || isNaN(amount) || !date) {
    alert("Please fill out all fields correctly.");
    return;
  }

  const res = await fetch(`${API_URL}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ description, amount, category, date })
  });

  if (res.ok) {
    // Clear inputs
    document.getElementById("description").value = "";
    document.getElementById("amount").value = "";
    document.getElementById("date").value = "";
    loadDashboard();
  }
});

// Delete transaction
async function deleteTransaction(id) {
  const res = await fetch(`${API_URL}/transactions/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });

  if (res.ok) {
    loadDashboard();
  }
}

// Render Chart.js
function renderChart(transactions) {
  const ctx = document.getElementById("spending-chart").getContext("2d");
  
  const categoryTotals = {};
  transactions.forEach(t => {
    if (t.amount < 0) { // Only graph expenses
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.amount);
    }
  });

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);

  if (spendingChart) {
    spendingChart.destroy();
  }

  spendingChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: ["#ff6384", "#36a2eb", "#cc65fe", "#ffce56", "#4bc0c0", "#a365ff"]
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function logout() {
  localStorage.clear();
  window.location.href = "login.html";
}

// Initial Run
loadDashboard();