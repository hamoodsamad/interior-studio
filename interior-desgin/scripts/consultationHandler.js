import { initCustomCursor } from "./interior.js";

function prefillFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const projectName = params.get("project");
  const scope = params.get("scope");
  const budget = params.get("budget");

  const scopeEl = document.getElementById("client-scope");
  const budgetEl = document.getElementById("client-budget");
  const notesEl = document.getElementById("client-notes");

  if (scope && scopeEl) {
    const match = Array.from(scopeEl.options).find(
      (opt) => opt.value === scope,
    );
    if (match) scopeEl.value = scope;
  }

  if (budget && budgetEl) {
    const match = Array.from(budgetEl.options).find(
      (opt) => opt.value === budget,
    );
    if (match) budgetEl.value = budget;
  }

  if (projectName && notesEl && !notesEl.value) {
    notesEl.value = `Interested in a similar aesthetic and spatial flow to "${projectName}".`;
  }
}

function initConsultationForm() {
  const form = document.getElementById("master-consultation-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const bookingRecord = {
      bookingId: `MA-2026-${randomCode}`,
      name: document.getElementById("client-name").value.trim(),
      email: document.getElementById("client-email").value.trim(),
      phone: document.getElementById("client-phone").value.trim(),
      scope: document.getElementById("client-scope").value,
      area: document.getElementById("client-area").value.trim(),
      budget: document.getElementById("client-budget").value,
      location: document.getElementById("client-city").value.trim(),
      notes: document.getElementById("client-notes").value.trim(),
      submittedAt: new Date().toISOString(),
    };

    sessionStorage.setItem(
      "aria_active_booking",
      JSON.stringify(bookingRecord),
    );

    const existingHistory = JSON.parse(
      localStorage.getItem("aria_bookings_history") || "[]",
    );
    existingHistory.unshift(bookingRecord);
    localStorage.setItem(
      "aria_bookings_history",
      JSON.stringify(existingHistory),
    );

    window.location.href = "index-booking-success.html";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initCustomCursor();
  prefillFromQuery();
  initConsultationForm();
});
