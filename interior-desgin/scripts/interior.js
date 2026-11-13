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

export function initCustomCursor() {
  const cur = document.getElementById("cur");
  if (!cur) return;

  window.addEventListener("mousemove", (e) => {
    cur.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
  });

  document.addEventListener("mouseover", (e) => {
    if (
      e.target.closest(
        "a, button, .chapter-pill, .depth-tab, .sv, #kn, #showcase-image-stage, .other-design-card",
      )
    ) {
      cur.classList.add("h");
    }
  });

  document.addEventListener("mouseout", (e) => {
    if (
      e.target.closest(
        "a, button, .chapter-pill, .depth-tab, .sv, #kn, #showcase-image-stage, .other-design-card",
      )
    ) {
      cur.classList.remove("h");
    }
  });
}

function initPreloader() {
  const preloader = document.getElementById("studio-preloader");
  const fill = document.getElementById("hud-progress-fill");
  const pct = document.getElementById("loader-percent");
  if (!preloader || !fill || !pct) return;

  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 14) + 8;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      setTimeout(() => preloader.classList.add("is-done"), 240);
    }
    fill.style.width = `${progress}%`;
    pct.textContent = `${String(progress).padStart(2, "0")}%`;
  }, 80);
}

async function initDeepScrollShowcase() {
  const section = document.getElementById("deep-showcase-stage");
  if (!section) return;

  const activeProjects = await loadActiveProjects();
  const totalProjects = activeProjects.length;
  if (!totalProjects) return;

  section.style.height = `${Math.max(totalProjects * 165, 320)}vh`;

  const chapterRail = document.getElementById("showcase-chapter-rail");
  const shadowWord = document.getElementById("showcase-shadow-word");
  const chapterEye = document.getElementById("showcase-chapter-eye");
  const projectTitle = document.getElementById("showcase-project-title");
  const imageStage = document.getElementById("showcase-image-stage");

  const layerImgs = [
    document.getElementById("deep-layer-0"),
    document.getElementById("deep-layer-1"),
    document.getElementById("deep-layer-2"),
  ];
  const zoomLabel = document.getElementById("depth-zoom-label");
  const reticle = document.getElementById("deep-reticle");
  const reticleTag = document.getElementById("reticle-tag-label");

  const depthTabs = document.querySelectorAll(".depth-tab");
  const layerKicker = document.getElementById("deep-layer-kicker");
  const detailTitle = document.getElementById("deep-detail-title");
  const detailDesc = document.getElementById("deep-detail-desc");
  const swatchesRow = document.getElementById("deep-swatches-row");
  const materialCode = document.getElementById("deep-material-code");
  const specLocation = document.getElementById("deep-spec-location");
  const specArea = document.getElementById("deep-spec-area");
  const specBudget = document.getElementById("deep-spec-budget");
  const featureCallout = document.getElementById("deep-feature-callout");
  const dossierLink = document.getElementById("deep-dossier-link");
  const bookLink = document.getElementById("deep-book-link");

  const scrollStatus = document.getElementById("deep-scroll-status");
  const masterFill = document.getElementById("deep-master-fill");
  const progressPct = document.getElementById("deep-progress-pct");

  const totalPadded = String(totalProjects).padStart(2, "0");

  if (chapterRail) {
    chapterRail.innerHTML = activeProjects
      .map(
        (proj, idx) => `
        <button type="button" class="chapter-pill ${idx === 0 ? "active" : ""}" data-chapter="${idx}">
          <span class="chapter-pill-fill"></span>
          <span>${String(idx + 1).padStart(2, "0")} ${(proj.shadowWord || proj.title).split(" ")[0]}</span>
        </button>
      `,
      )
      .join("");
  }

  const chapterButtons = chapterRail
    ? Array.from(chapterRail.querySelectorAll(".chapter-pill"))
    : [];

  let activeProjectIdx = -1;
  let activeDepthIdx = -1;
  let liveProgress = 0;

  const getCurrentIndices = (norm) => {
    const scaled = norm * totalProjects;
    const pIdx = Math.min(Math.floor(scaled), totalProjects - 1);
    const localProgress = scaled - pIdx;
    let dIdx = 0;
    if (localProgress >= 0.34 && localProgress < 0.68) dIdx = 1;
    else if (localProgress >= 0.68) dIdx = 2;
    return { pIdx, dIdx, localProgress };
  };

  const getDetailUrl = (proj, dIdx) =>
    `index-project-detail.html?id=${encodeURIComponent(proj.id)}&angle=${dIdx}`;

  const updateDossierLink = (proj, dIdx) => {
    if (!dossierLink || !proj) return;
    if (proj.externalLink) {
      dossierLink.href = proj.externalLink;
      dossierLink.target = "_blank";
      dossierLink.rel = "noopener noreferrer";
    } else {
      dossierLink.href = getDetailUrl(proj, dIdx);
      dossierLink.removeAttribute("target");
    }
  };

  const openCurrentProject = () => {
    const rect = section.getBoundingClientRect();
    const scrollable = Math.max(section.offsetHeight - window.innerHeight, 1);
    const norm = Math.min(Math.max(-rect.top / scrollable, 0), 0.9999);
    const { pIdx, dIdx } = getCurrentIndices(norm);
    const proj = activeProjects[pIdx];
    if (!proj) return;

    if (proj.externalLink) {
      window.open(proj.externalLink, "_blank", "noopener,noreferrer");
    } else {
      window.location.href = getDetailUrl(proj, dIdx);
    }
  };

  if (imageStage) {
    imageStage.style.cursor = "pointer";
    imageStage.title = "Click to open this project";
    imageStage.addEventListener("click", openCurrentProject);
  }

  if (dossierLink) {
    dossierLink.addEventListener("click", (e) => {
      const proj = activeProjects[Math.max(0, activeProjectIdx)];
      if (proj && !proj.externalLink) {
        e.preventDefault();
        openCurrentProject();
      }
    });
  }

  const applyProjectContent = (pIdx) => {
    const proj = activeProjects[pIdx];
    if (!proj) return;

    if (shadowWord) shadowWord.textContent = proj.shadowWord || proj.title;
    if (projectTitle) projectTitle.textContent = proj.title;
    if (specLocation) specLocation.textContent = proj.location;
    if (specArea) specArea.textContent = proj.area;
    if (specBudget) specBudget.textContent = proj.budget;

    if (bookLink) {
      bookLink.href = `index-consultation-booking.html?project=${encodeURIComponent(
        proj.title,
      )}&scope=${encodeURIComponent(
        proj.scopeValue || proj.category,
      )}&budget=${encodeURIComponent(proj.budgetOption || "Rs 8.0M - 15.0M")}`;
    }

    layerImgs.forEach((imgEl, i) => {
      if (!imgEl) return;
      const angle = proj.angles?.[i] || proj.angles?.[proj.angles.length - 1];
      const nextSrc = angle ? angle.image : proj.heroImage;
      if (nextSrc && imgEl.getAttribute("src") !== nextSrc) {
        imgEl.src = nextSrc;
      }
    });

    chapterButtons.forEach((btn, i) =>
      btn.classList.toggle("active", i === pIdx),
    );
  };

  const applyDepthLayerContent = (pIdx, dIdx) => {
    const proj = activeProjects[pIdx];
    if (!proj) return;

    updateDossierLink(proj, dIdx);

    const layer = proj.deepLayers?.[dIdx] || proj.deepLayers?.[0];
    if (!layer) return;

    layerImgs.forEach((imgEl, i) => {
      if (imgEl) imgEl.classList.toggle("is-visible", i === dIdx);
    });

    depthTabs.forEach((tab, i) => tab.classList.toggle("active", i === dIdx));

    if (layerKicker) layerKicker.textContent = layer.kicker;
    if (detailTitle) detailTitle.textContent = layer.title;
    if (detailDesc) detailDesc.textContent = layer.desc;
    if (materialCode) materialCode.textContent = layer.materialCode;
    if (featureCallout) featureCallout.textContent = `✦ ${layer.callout}`;

    if (swatchesRow && layer.swatches) {
      const dots = swatchesRow.querySelectorAll(".swatch-dot");
      dots.forEach((dot, i) => {
        if (layer.swatches[i]) dot.style.background = layer.swatches[i];
      });
    }

    if (reticle && layer.reticle) {
      reticle.style.left = `${layer.reticle.x}%`;
      reticle.style.top = `${layer.reticle.y}%`;
    }
    if (reticleTag && layer.reticle) {
      reticleTag.textContent = layer.reticle.tag;
    }
  };

  const syncFromProgress = (norm) => {
    liveProgress = norm;
    const { pIdx, dIdx, localProgress } = getCurrentIndices(norm);

    if (pIdx !== activeProjectIdx) {
      activeProjectIdx = pIdx;
      activeDepthIdx = -1;
      applyProjectContent(pIdx);
    }

    if (dIdx !== activeDepthIdx) {
      activeDepthIdx = dIdx;
      applyDepthLayerContent(pIdx, dIdx);
    }

    // Natural subtle framing (no oversized zoom)
    const naturalScale = 1 + localProgress * 0.04;
    const activeImg = layerImgs[dIdx];
    if (activeImg) {
      activeImg.style.transform = `scale(${naturalScale.toFixed(4)})`;
    }

    if (shadowWord) {
      shadowWord.style.transform = `translate(calc(-50% + ${(0.5 - localProgress) * 50}px), -50%)`;
    }

    const proj = activeProjects[pIdx];
    const depthLabelNames = ["OVERVIEW", "INSIDE SPACE", "DEEP DETAIL"];
    if (chapterEye && proj) {
      chapterEye.textContent = `${proj.index || `0${pIdx + 1}.00`} / ${totalPadded}.00 // ${depthLabelNames[dIdx]}`;
    }
    if (zoomLabel) {
      zoomLabel.textContent = `VIEW 0${dIdx + 1} // ${depthLabelNames[dIdx]}`;
    }

    chapterButtons.forEach((btn, i) => {
      const fillBar = btn.querySelector(".chapter-pill-fill");
      if (!fillBar) return;
      if (i < pIdx) fillBar.style.width = "100%";
      else if (i === pIdx)
        fillBar.style.width = `${(localProgress * 100).toFixed(1)}%`;
      else fillBar.style.width = "0%";
    });

    const overallPct = Math.round(norm * 100);
    if (masterFill) masterFill.style.width = `${overallPct}%`;
    if (progressPct)
      progressPct.textContent = `${String(overallPct).padStart(2, "0")}%`;
    if (scrollStatus) {
      const currPad = String(pIdx + 1).padStart(2, "0");
      const nextPad = String(pIdx + 2).padStart(2, "0");
      if (dIdx < 2) {
        scrollStatus.textContent = `KEEP SCROLLING TO VIEW PROJECT ${currPad}`;
      } else if (pIdx < totalProjects - 1) {
        scrollStatus.textContent = `NEXT PROJECT ${nextPad} ↓`;
      } else {
        scrollStatus.textContent = `ALL ${totalPadded} PROJECTS VIEWED // CONTINUE DOWN ↓`;
      }
    }
  };

  const scrollToNormalizedProgress = (norm) => {
    syncFromProgress(norm);
    const sectionTop = section.offsetTop;
    const scrollable = Math.max(section.offsetHeight - window.innerHeight, 1);
    window.scrollTo({
      top: sectionTop + norm * scrollable,
      behavior: "smooth",
    });
  };

  chapterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.chapter);
      scrollToNormalizedProgress((idx + 0.04) / totalProjects);
    });
  });

  depthTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const dIdx = Number(tab.dataset.depth);
      const currProj = Math.max(0, activeProjectIdx);
      const localTarget = dIdx === 0 ? 0.08 : dIdx === 1 ? 0.45 : 0.78;
      scrollToNormalizedProgress((currProj + localTarget) / totalProjects);
    });
  });

  const onScroll = () => {
    const rect = section.getBoundingClientRect();
    const scrollable = section.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return;
    const norm = Math.min(Math.max(-rect.top / scrollable, 0), 0.9999);
    syncFromProgress(norm);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
}

function initBeforeAfterSlider() {
  const ba = document.getElementById("ba");
  const af = document.getElementById("af");
  const bf = document.getElementById("bf");
  const ln = document.getElementById("ln");
  const kn = document.getElementById("kn");
  const restructureBtn = document.getElementById("ba-restructure-btn");
  const scanBeam = document.getElementById("ba-scan-beam");
  if (!ba || !bf || !ln || !kn) return;

  let currentPct = 82;
  let dragging = false;
  let moved = false;
  let startX = 0;

  const applyPct = (pct) => {
    currentPct = pct;
    bf.style.clipPath = `inset(0% ${100 - pct}% 0% 0%)`;
    ln.style.left = `${pct}%`;
    kn.style.left = `${pct}%`;
    if (restructureBtn) {
      restructureBtn.textContent =
        pct <= 20
          ? "↺ Show Broken Building Again"
          : "✦ Click to Restructure Building";
    }
  };

  const triggerRestructure = () => {
    ba.classList.add("is-animating");
    void ba.offsetWidth;
    if (scanBeam) {
      scanBeam.classList.remove("sweeping");
      void scanBeam.offsetWidth;
      scanBeam.classList.add("sweeping");
    }
    if (af) {
      af.style.transition = "transform 1.15s cubic-bezier(0.22, 1, 0.36, 1)";
      af.style.transform = currentPct > 30 ? "scale(1.03)" : "scale(1)";
      setTimeout(() => {
        af.style.transform = "scale(1)";
      }, 1150);
    }
    applyPct(currentPct > 30 ? 0 : 100);
    setTimeout(() => ba.classList.remove("is-animating"), 1200);
  };

  applyPct(currentPct);
  ba.addEventListener("dragstart", (e) => e.preventDefault());

  ba.addEventListener("pointerdown", (e) => {
    if (e.target.closest("#ba-restructure-btn")) return;
    dragging = true;
    moved = false;
    startX = e.clientX;
    ba.classList.remove("is-animating");
  });

  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    if (Math.abs(e.clientX - startX) > 6) {
      moved = true;
      const rect = ba.getBoundingClientRect();
      const ratio = Math.min(
        Math.max((e.clientX - rect.left) / rect.width, 0),
        1,
      );
      applyPct(ratio * 100);
    }
  });

  window.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;
    if (!moved) triggerRestructure();
  });

  window.addEventListener("pointercancel", () => {
    dragging = false;
  });

  if (restructureBtn) {
    restructureBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      triggerRestructure();
    });
  }
}

function initHeroParallaxAndCounters() {
  const wheel = document.getElementById("hero-wheel-stage");
  if (wheel) {
    window.addEventListener("mousemove", (e) => {
      if (window.innerWidth <= 900) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 14;
      const y = (e.clientY / window.innerHeight - 0.5) * 14;
      wheel.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });
  }

  const counters = document.querySelectorAll(".cn");
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = Number(el.dataset.to || 0);
        const suffix = el.dataset.suffix || "";
        let current = 0;
        const step = Math.max(1, Math.ceil(target / 35));
        const timer = setInterval(() => {
          current += step;
          if (current >= target) {
            current = target;
            clearInterval(timer);
          }
          el.textContent = `${current}${suffix}`;
        }, 28);
        observer.unobserve(el);
      });
    },
    { threshold: 0.4 },
  );

  counters.forEach((c) => observer.observe(c));
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    initCustomCursor();
  } catch (e) {}
  try {
    initPreloader();
  } catch (e) {}
  try {
    initBeforeAfterSlider();
  } catch (e) {}
  try {
    initHeroParallaxAndCounters();
  } catch (e) {}
  initDeepScrollShowcase().catch((e) => console.error(e));
});
