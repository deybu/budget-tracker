const API = "https://budget-tracker-api-7o3a.onrender.com";

// Redirect to login if not authenticated
const token = localStorage.getItem("token");
if (!token) {
  window.location.href = "login.html";
}

// Show user email in navbar
const emailEl = document.getElementById("user-email");
if (emailEl) {
  emailEl.textContent = "Welcome, " + localStorage.getItem("email");
}

// Logout
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("email");
  window.location.href = "login.html";
}

let transactions = [];
let spendingChart = null;

const addBtn = document.getElementById("add-btn");
const transactionList = document.getElementById("transaction-list");
const totalIncomeEl = document.getElementById("total-income");
const totalExpensesEl = document.getElementById("total-expenses");
const balanceEl = document.getElementById("balance");

function formatCurrency(amount) {
  return "$" + Math.abs(amount).toFixed(2);
}

function updateSummary() {
  const income = transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = income + expenses;

  totalIncomeEl.textContent = formatCurrency(income);
  totalExpensesEl.textContent = formatCurrency(expenses);
  balanceEl.textContent = "$" + balance.toFixed(2);
}

function renderTransactions() {
  transactionList.innerHTML = "";

  if (transactions.length === 0) {
    transactionList.innerHTML =
      '<li class="empty-state">No transactions yet. Add one above.</li>';
    return;
  }

  transactions.forEach((t) => {
    const li = document.createElement("li");
    const amountClass = t.amount > 0 ? "positive" : "negative";
    const amountSign = t.amount > 0 ? "+" : "-";

    li.innerHTML = `
      <div class="transaction-info">
        <span class="transaction-description">${t.description}</span>
        <span class="transaction-meta">${t.category} · ${t.date}</span>
      </div>
      <div class="transaction-right">
        <span class="transaction-amount ${amountClass}">
          ${amountSign}${formatCurrency(t.amount)}
        </span>
        <button class="delete-btn" onclick="deleteTransaction(${t.id})">✕</button>
      </div>
    `;

    transactionList.appendChild(li);
  });
}

function getExpensesByCategory() {
  const categoryTotals = {};
  transactions
    .filter((t) => t.amount < 0)
    .forEach((t) => {
      if (categoryTotals[t.category]) {
        categoryTotals[t.category] += Math.abs(t.amount);
      } else {
        categoryTotals[t.category] = Math.abs(t.amount);
      }
    });
  return categoryTotals;
}

function updateChart() {
  const data = getExpensesByCategory();
  const labels = Object.keys(data);
  const values = Object.values(data);

  const colors = [
    "#e74c3c", "#3498db", "#2ecc71",
    "#f39c12", "#9b59b6", "#1abc9c", "#e67e22",
  ];

  const ctx = document.getElementById("spending-chart").getContext("2d");

  if (spendingChart) {
    spendingChart.destroy();
  }

  if (labels.length === 0) return;

  spendingChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 2,
        borderColor: "#fff",
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (context) =>
              context.label + ": $" + context.parsed.toFixed(2),
          },
        },
      },
    },
  });
}

// Fetch all transactions from the server
async function loadTransactions() {
  const res = await fetch(API + "/transactions", {
    headers: { Authorization: "Bearer " + token },
  });
  transactions = await res.json();
  renderTransactions();
  updateSummary();
  updateChart();
}

// Add transaction to server
async function addTransaction() {
  const description = document.getElementById("description").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);
  const category = document.getElementById("category").value;
  const date = document.getElementById("date").value;

  if (!description) return alert("Please enter a description.");
  if (isNaN(amount) || amount === 0) return alert("Please enter a valid amount.");
  if (!date) return alert("Please select a date.");

  const res = await fetch(API + "/transactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ description, amount, category, date }),
  });

  const newTransaction = await res.json();
  transactions.push(newTransaction);

  document.getElementById("description").value = "";
  document.getElementById("amount").value = "";
  document.getElementById("date").value = "";

  renderTransactions();
  updateSummary();
  updateChart();
}

// Delete transaction from server
async function deleteTransaction(id) {
  await fetch(API + "/transactions/" + id, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token },
  });

  transactions = transactions.filter((t) => t.id !== id);
  renderTransactions();
  updateSummary();
  updateChart();
}

addBtn.addEventListener("click", addTransaction);
document.getElementById("date").valueAsDate = new Date();

loadTransactions();