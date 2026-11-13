import { initCustomCursor } from "./interior.js";

async function loadActiveProjects() {
  try {
    const store = await import("./projectStore.js");
    return store.getProjects();
  } catch (err) {
    try {
      const raw = localStorage.getItem("maison_aria_projects_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    const mod = await import("./projectsData.js");
    return mod.projectsData;
  }
}

async function renderProjectDetail() {
  const mount = document.getElementById("project-detail-mount");
  if (!mount) return;

  const projectsData = await loadActiveProjects();
  if (!projectsData || !projectsData.length) return;

  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("id") || projectsData[0].id;
  const angleParam = Math.max(0, Number(params.get("angle") || 0));

  const project =
    projectsData.find((item) => item.id === projectId) || projectsData[0];

  const rawAngles =
    project.angles && project.angles.length
      ? project.angles
      : [{ label: "01 // Overview", image: project.heroImage }];

  const startIdx = Math.min(angleParam, rawAngles.length - 1);

  const orderedAngles = [
    rawAngles[startIdx],
    ...rawAngles.filter((_, idx) => idx !== startIdx),
  ];

  const rawLayers = project.deepLayers || [];
  const orderedLayers =
    rawLayers.length === rawAngles.length
      ? [rawLayers[startIdx], ...rawLayers.filter((_, idx) => idx !== startIdx)]
      : orderedAngles.map((ang, idx) => ({
          kicker: ang.label || `VIEW 0${idx + 1}`,
          title: idx === 0 ? project.title : `Interior Perspective 0${idx + 1}`,
          desc: project.description,
        }));

  const bookingUrl = `index-consultation-booking.html?project=${encodeURIComponent(
    project.title,
  )}&scope=${encodeURIComponent(
    project.scopeValue || project.category,
  )}&budget=${encodeURIComponent(project.budgetOption || "Rs 8.0M - 15.0M")}`;

  const imagesHtml = orderedAngles
    .map(
      (ang, idx) => `
      <img
        class="detail-scroll-img ${idx === 0 ? "is-active" : ""}"
        src="${ang.image}"
        alt="${project.title} - ${ang.label || `View ${idx + 1}`}"
      />
    `,
    )
    .join("");

  const layerCardsHtml = orderedLayers
    .map(
      (layer, idx) => `
      <div class="detail-layer-card ${idx === 0 ? "is-highlighted" : ""}" data-layer-idx="${idx}">
        <span class="eye mono-tag">${layer.kicker}</span>
        <h4>${layer.title}</h4>
        <p>${layer.desc}</p>
      </div>
    `,
    )
    .join("");

  const featuresHtml = (project.features || [])
    .map((f) => `<li>${f}</li>`)
    .join("");

  mount.innerHTML = `
    <div class="project-split-layout">
      <div class="project-visual-frame detail-sticky-frame">
        <div class="detail-scroll-viewport" id="detail-scroll-viewport">
          ${imagesHtml}
          <span class="detail-scroll-caption mono-tag" id="detail-scroll-caption">
            ${orderedAngles[0]?.label || "01 // Overview"} • SCROLL ↓
          </span>
        </div>
        <div class="detail-scroll-bar-track">
          <div class="detail-scroll-bar-fill" id="detail-scroll-bar-fill"></div>
        </div>
      </div>

      <div class="project-info-column" id="detail-info-column">
        <p class="eye mono-tag">${project.index || "01.00"} // ${project.category}</p>
        <h1>${project.title}</h1>
        <p class="project-tagline">${project.tagline}</p>
        <p class="project-narrative">${project.description}</p>

        <div class="specs-grid-box">
          <div class="spec-cell">
            <span>Location</span>
            <b>${project.location}</b>
          </div>
          <div class="spec-cell">
            <span>Spatial Area</span>
            <b>${project.area}</b>
          </div>
          <div class="spec-cell">
            <span>Estimated Commission</span>
            <b>${project.budget}</b>
          </div>
          <div class="spec-cell">
            <span>Execution Timeline</span>
            <b>${project.timeline}</b>
          </div>
        </div>

        <div class="detail-layer-notes">
          ${layerCardsHtml}
        </div>

        <ul class="design-features-list">
          ${featuresHtml}
        </ul>

        <a href="${bookingUrl}" class="btn f">Commission Similar Space ✦</a>
      </div>
    </div>
  `;

  initDetailScrollAnimation(orderedAngles);
}

function initDetailScrollAnimation(orderedAngles) {
  const infoCol = document.getElementById("detail-info-column");
  const imgs = Array.from(document.querySelectorAll(".detail-scroll-img"));
  const cards = Array.from(document.querySelectorAll(".detail-layer-card"));
  const caption = document.getElementById("detail-scroll-caption");
  const progressFill = document.getElementById("detail-scroll-bar-fill");

  if (!infoCol || imgs.length <= 1) {
    if (progressFill) progressFill.style.width = "100%";
    return;
  }

  let currentIdx = 0;
  let targetProgress = 0;
  let smoothProgress = 0;

  const updateTarget = () => {
    const rect = infoCol.getBoundingClientRect();
    const totalScrollable = Math.max(
      infoCol.offsetHeight - window.innerHeight * 0.65,
      1,
    );
    const scrolled = Math.max(120 - rect.top, 0);
    targetProgress = Math.min(Math.max(scrolled / totalScrollable, 0), 0.9999);
  };

  const renderLoop = () => {
    smoothProgress += (targetProgress - smoothProgress) * 0.12;

    const scaled = smoothProgress * imgs.length;
    const idx = Math.min(Math.floor(scaled), imgs.length - 1);
    const localProgress = scaled - idx;

    if (idx !== currentIdx) {
      currentIdx = idx;
      imgs.forEach((img, i) => img.classList.toggle("is-active", i === idx));
      cards.forEach((c, i) => c.classList.toggle("is-highlighted", i === idx));
      if (caption && orderedAngles[idx]) {
        caption.textContent = `${orderedAngles[idx].label || `View 0${idx + 1}`} • SCROLL ↓`;
      }
    }

    const activeImg = imgs[idx];
    if (activeImg) {
      const zoom = 1 + localProgress * 0.14;
      activeImg.style.transform = `scale(${zoom.toFixed(4)})`;
    }

    if (progressFill) {
      progressFill.style.width = `${Math.round(smoothProgress * 100)}%`;
    }

    requestAnimationFrame(renderLoop);
  };

  window.addEventListener("scroll", updateTarget, { passive: true });
  window.addEventListener("resize", updateTarget);
  updateTarget();
  smoothProgress = targetProgress;
  requestAnimationFrame(renderLoop);
}

document.addEventListener("DOMContentLoaded", () => {
  initCustomCursor();
  renderProjectDetail().catch((err) => console.error(err));
});
