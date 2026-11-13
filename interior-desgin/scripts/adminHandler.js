import {
  getProjects,
  upsertProject,
  deleteProjectById,
  resetToDefaultProjects,
} from "./projectStore.js";
import { initCustomCursor } from "./interior.js";

const AUTH_PASS_KEY = "maison_aria_admin_pass";
const AUTH_RECOVERY_KEY = "maison_aria_recovery_key";
const SESSION_UNLOCK_KEY = "maison_aria_admin_unlocked";

const DEFAULT_PASS = "aria2026";
const DEFAULT_RECOVERY = "MAISON-ARIA-RECOVERY";

function getStoredPassword() {
  return localStorage.getItem(AUTH_PASS_KEY) || DEFAULT_PASS;
}

function getStoredRecoveryKey() {
  return localStorage.getItem(AUTH_RECOVERY_KEY) || DEFAULT_RECOVERY;
}

function initPasswordEyeToggles() {
  document.querySelectorAll(".eye-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      btn.classList.toggle("is-showing", isPassword);
    });
  });
}

function compressImageFile(file, maxWidth = 1100, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function initAuthController(onUnlock) {
  const authView = document.getElementById("admin-auth-view");
  const dashView = document.getElementById("admin-dashboard-view");
  const logoutBtn = document.getElementById("admin-logout-btn");

  const loginForm = document.getElementById("admin-login-form");
  const forgotForm = document.getElementById("admin-forgot-form");
  const authHeading = document.getElementById("auth-heading");
  const authSubtext = document.getElementById("auth-subtext");

  const loginPassInput = document.getElementById("admin-login-pass");
  const loginError = document.getElementById("login-error-msg");

  const btnOpenForgot = document.getElementById("btn-open-forgot");
  const btnBackLogin = document.getElementById("btn-back-login");
  const forgotStatus = document.getElementById("forgot-status-msg");

  const showDashboard = () => {
    authView.classList.add("hidden");
    dashView.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    onUnlock();
  };

  const showLogin = () => {
    dashView.classList.add("hidden");
    authView.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
  };

  if (sessionStorage.getItem(SESSION_UNLOCK_KEY) === "1") {
    showDashboard();
  }

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const entered = loginPassInput.value.trim();
    if (entered === getStoredPassword()) {
      loginError.classList.add("hidden");
      sessionStorage.setItem(SESSION_UNLOCK_KEY, "1");
      loginPassInput.value = "";
      showDashboard();
    } else {
      loginError.textContent =
        "Incorrect password. Click 'Forgot Password?' below if you need to reset it.";
      loginError.classList.remove("hidden");
    }
  });

  btnOpenForgot.addEventListener("click", () => {
    loginForm.classList.add("hidden");
    forgotForm.classList.remove("hidden");
    authHeading.innerHTML = "Reset <em>Password</em>";
    authSubtext.textContent =
      "Verify your Studio Recovery Key to set a brand-new admin password.";
  });

  btnBackLogin.addEventListener("click", () => {
    forgotForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
    authHeading.innerHTML = "Admin <em>Sign In</em>";
    authSubtext.textContent =
      "Enter your studio admin password to add, edit, or delete architectural showcase projects.";
  });

  forgotForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const keyInput = document.getElementById("recovery-key-input").value.trim();
    const newPass = document.getElementById("forgot-new-pass").value.trim();
    const confirmPass = document
      .getElementById("forgot-confirm-pass")
      .value.trim();

    if (keyInput !== getStoredRecoveryKey()) {
      forgotStatus.textContent = "Invalid Studio Recovery Key.";
      forgotStatus.className = "admin-alert error";
      return;
    }

    if (newPass !== confirmPass) {
      forgotStatus.textContent = "New password and confirmation do not match.";
      forgotStatus.className = "admin-alert error";
      return;
    }

    localStorage.setItem(AUTH_PASS_KEY, newPass);
    forgotStatus.textContent =
      "Password reset successfully! You can now sign in with your new password.";
    forgotStatus.className = "admin-alert";
    forgotForm.reset();

    setTimeout(() => {
      btnBackLogin.click();
    }, 1100);
  });

  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_UNLOCK_KEY);
    showLogin();
  });

  const changeForm = document.getElementById("admin-change-pass-form");
  const changeMsg = document.getElementById("change-pass-msg");
  changeForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const current = document.getElementById("change-current-pass").value.trim();
    const nextPass = document.getElementById("change-new-pass").value.trim();
    const nextRecovery = document
      .getElementById("change-recovery-key")
      .value.trim();

    if (current !== getStoredPassword()) {
      changeMsg.textContent = "Current password is incorrect.";
      changeMsg.className = "admin-alert error";
      return;
    }

    localStorage.setItem(AUTH_PASS_KEY, nextPass);
    if (nextRecovery) {
      localStorage.setItem(AUTH_RECOVERY_KEY, nextRecovery);
    }

    changeMsg.textContent = "Admin credentials updated successfully!";
    changeMsg.className = "admin-alert";
    changeForm.reset();
  });
}

function initProjectManager() {
  const form = document.getElementById("admin-project-form");
  const listMount = document.getElementById("admin-projects-list");
  const countMount = document.getElementById("projects-count");
  const saveMsg = document.getElementById("project-save-msg");
  const editorTitle = document.getElementById("editor-form-title");
  const cancelEditBtn = document.getElementById("btn-cancel-edit");
  const resetDefaultsBtn = document.getElementById("btn-reset-defaults");

  const imgInputs = [
    document.getElementById("proj-img-0"),
    document.getElementById("proj-img-1"),
    document.getElementById("proj-img-2"),
  ];
  const imgPreviews = [
    document.getElementById("preview-img-0"),
    document.getElementById("preview-img-1"),
    document.getElementById("preview-img-2"),
  ];

  const syncPreviews = () => {
    imgInputs.forEach((inp, i) => {
      const preview = imgPreviews[i];
      if (!preview) return;
      const val = inp.value.trim();
      if (val) {
        preview.src = val;
        preview.style.display = "block";
      } else {
        preview.removeAttribute("src");
        preview.style.display = "none";
      }
    });
  };

  syncPreviews();
  imgInputs.forEach((inp) => inp.addEventListener("input", syncPreviews));

  document.querySelectorAll(".hidden-file-input").forEach((fileInput) => {
    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      const idx = Number(fileInput.dataset.imgIndex);
      if (!file) return;
      try {
        const dataUrl = await compressImageFile(file);
        imgInputs[idx].value = dataUrl;
        syncPreviews();
      } catch (err) {
        alert("Could not load selected image file.");
      }
    });
  });

  const resetEditorForm = () => {
    form.reset();
    document.getElementById("proj-id").value = "";
    editorTitle.textContent = "Add New Project";
    cancelEditBtn.classList.add("hidden");
    syncPreviews();
  };

  cancelEditBtn.addEventListener("click", resetEditorForm);

  const renderProjectsList = () => {
    const projects = getProjects();
    if (countMount) countMount.textContent = String(projects.length);

    listMount.innerHTML = projects
      .map(
        (proj) => `
        <div class="admin-proj-item">
          <img class="admin-proj-thumb" src="${proj.heroImage}" alt="${proj.title}" />
          <div class="admin-proj-meta">
            <span class="mono-tag">${proj.index}</span>
            <h4>${proj.title}</h4>
            <small>${proj.location} • ${proj.budget}</small>
          </div>
          <div class="admin-proj-btns">
            <button type="button" class="mini-cms-btn edit-btn" data-id="${proj.id}">Edit</button>
            <button type="button" class="mini-cms-btn danger del-btn" data-id="${proj.id}">Delete</button>
          </div>
        </div>
      `,
      )
      .join("");

    listMount.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const proj = getProjects().find((p) => p.id === btn.dataset.id);
        if (!proj) return;

        document.getElementById("proj-id").value = proj.id;
        document.getElementById("proj-title").value = proj.title;
        document.getElementById("proj-shadow").value = proj.shadowWord;
        document.getElementById("proj-category").value = proj.category;
        document.getElementById("proj-external-link").value =
          proj.externalLink || "";
        document.getElementById("proj-location").value = proj.location;
        document.getElementById("proj-area").value = proj.area;
        document.getElementById("proj-budget").value = proj.budget;
        document.getElementById("proj-timeline").value = proj.timeline;
        document.getElementById("proj-tagline").value = proj.tagline;
        document.getElementById("proj-desc").value = proj.description;

        imgInputs[0].value = proj.angles?.[0]?.image || proj.heroImage || "";
        imgInputs[1].value = proj.angles?.[1]?.image || "";
        imgInputs[2].value = proj.angles?.[2]?.image || "";
        syncPreviews();

        document.getElementById("layer1-title").value =
          proj.deepLayers?.[0]?.title || "";
        document.getElementById("layer1-mat").value =
          proj.deepLayers?.[0]?.materialCode || "";
        document.getElementById("layer2-title").value =
          proj.deepLayers?.[1]?.title || "";
        document.getElementById("layer2-mat").value =
          proj.deepLayers?.[1]?.materialCode || "";
        document.getElementById("layer3-title").value =
          proj.deepLayers?.[2]?.title || "";
        document.getElementById("proj-features").value = (
          proj.features || []
        ).join(", ");

        editorTitle.textContent = `Editing: ${proj.title}`;
        cancelEditBtn.classList.remove("hidden");
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });

    listMount.querySelectorAll(".del-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const all = getProjects();
        if (all.length <= 1) {
          alert("At least 1 showcase project must remain on the website.");
          return;
        }
        if (confirm("Remove this project from the live website showcase?")) {
          deleteProjectById(btn.dataset.id);
          renderProjectsList();
        }
      });
    });
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const title = document.getElementById("proj-title").value.trim();
    const existingId = document.getElementById("proj-id").value.trim();
    const slugId =
      existingId ||
      `${title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")}-${Date.now().toString().slice(-4)}`;

    const img0 = imgInputs[0].value.trim();
    const img1 = imgInputs[1].value.trim() || img0;
    const img2 = imgInputs[2].value.trim() || img1;

    const category = document.getElementById("proj-category").value.trim();
    const budget = document.getElementById("proj-budget").value.trim();
    const tagline = document.getElementById("proj-tagline").value.trim();
    const description = document.getElementById("proj-desc").value.trim();
    const shadowWord = document
      .getElementById("proj-shadow")
      .value.trim()
      .toUpperCase();

    const rawFeatures = document.getElementById("proj-features").value.trim();
    const features = rawFeatures
      ? rawFeatures
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [
          "Bespoke architectural millwork and warm indirect lighting",
          "Curated natural stone and tactile upholstery palette",
          "Turnkey execution with site-engineered acoustic balance",
        ];

    const l1Title =
      document.getElementById("layer1-title").value.trim() || title;
    const l1Mat =
      document.getElementById("layer1-mat").value.trim() ||
      "MAT // ARCHITECTURAL SHELL";
    const l2Title =
      document.getElementById("layer2-title").value.trim() ||
      "Inside Spatial Flow";
    const l2Mat =
      document.getElementById("layer2-mat").value.trim() ||
      "MAT // BESPOKE JOINERY";
    const l3Title =
      document.getElementById("layer3-title").value.trim() ||
      "Deep Material Craft";

    const projectPayload = {
      id: slugId,
      index: "01.00",
      shadowWord,
      title,
      category,
      externalLink: document.getElementById("proj-external-link").value.trim(),
      scopeValue: category,
      location: document.getElementById("proj-location").value.trim(),
      area: document.getElementById("proj-area").value.trim(),
      budget,
      budgetOption: "Rs 8.0M - 15.0M",
      timeline: document.getElementById("proj-timeline").value.trim(),
      tagline,
      description,
      heroImage: img0,
      angles: [
        { label: "01 // Overview", image: img0 },
        { label: "02 // Inside View", image: img1 },
        { label: "03 // Deep Detail", image: img2 },
      ],
      deepLayers: [
        {
          kicker: "LAYER 01 // SPATIAL ENTRANCE",
          title: l1Title,
          desc: tagline,
          materialCode: l1Mat,
          reticle: { x: 46, y: 48, tag: "OVERVIEW" },
          swatches: ["#e2ccb2", "#b5694a", "#2a221b"],
          callout: features[0] || tagline,
        },
        {
          kicker: "LAYER 02 // STEPPING INSIDE",
          title: l2Title,
          desc: description,
          materialCode: l2Mat,
          reticle: { x: 60, y: 42, tag: "INSIDE SPACE" },
          swatches: ["#d4b38b", "#8f6241", "#f4ebdd"],
          callout: features[1] || features[0] || tagline,
        },
        {
          kicker: "LAYER 03 // DEEP MATERIAL STUDY",
          title: l3Title,
          desc: description,
          materialCode: "MAT // FINISHING CRAFT",
          reticle: { x: 40, y: 56, tag: "DEEP DETAIL" },
          swatches: ["#c99e67", "#ebe1d3", "#3a2d22"],
          callout: features[2] || features[0] || tagline,
        },
      ],
      features,
    };

    try {
      upsertProject(projectPayload);
      saveMsg.textContent =
        "Project published! Open the live website to see its scroll zoom animation.";
      saveMsg.className = "admin-alert";
      resetEditorForm();
      renderProjectsList();
    } catch (err) {
      saveMsg.textContent =
        "Storage limit reached. Use lighter images or image URLs.";
      saveMsg.className = "admin-alert error";
    }
  });

  resetDefaultsBtn.addEventListener("click", () => {
    if (
      confirm(
        "Restore original 5 default projects? Any custom added projects will be removed.",
      )
    ) {
      resetToDefaultProjects();
      renderProjectsList();
    }
  });

  return renderProjectsList;
}

document.addEventListener("DOMContentLoaded", () => {
  initCustomCursor();
  initPasswordEyeToggles();
  const refreshList = initProjectManager();
  initAuthController(() => {
    refreshList();
  });
});
