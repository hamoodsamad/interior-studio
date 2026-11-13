import { projectsData } from "./projectsData.js";

const STORAGE_KEY = "maison_aria_projects_v1";

function normalizeProjectIndexes(list) {
  return list.map((item, i) => ({
    ...item,
    index: `${String(i + 1).padStart(2, "0")}.00`,
  }));
}

export function getProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeProjectIndexes(parsed);
      }
    }
  } catch (err) {
    console.warn("Could not read custom projects:", err);
  }
  return normalizeProjectIndexes(structuredClone(projectsData));
}

export function saveProjects(list) {
  const normalized = normalizeProjectIndexes(list);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function upsertProject(projectObj) {
  const current = getProjects();
  const idx = current.findIndex((p) => p.id === projectObj.id);
  if (idx >= 0) {
    current[idx] = projectObj;
  } else {
    current.push(projectObj);
  }
  return saveProjects(current);
}

export function deleteProjectById(id) {
  const current = getProjects();
  return saveProjects(current.filter((p) => p.id !== id));
}

export function resetToDefaultProjects() {
  localStorage.removeItem(STORAGE_KEY);
  return normalizeProjectIndexes(structuredClone(projectsData));
}
