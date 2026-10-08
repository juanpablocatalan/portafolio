/**
 * JUAN PABLO — CENTRO DE CONTROL DE PROYECTOS (ADMIN CMS)
 * Gestor autónomo e independiente de proyectos del portafolio.
 */

// Clave para almacenamiento en LocalStorage
const STORAGE_KEY = 'jp_portfolio_projects_data_v4';

// Catálogo base inicial con los 10 proyectos existentes en el orden definido
const DEFAULT_PROJECTS = [
  {
    id: "1",
    num: "01",
    title: "Dialektografía",
    category: "Editorial",
    categoryFull: "Editorial y tipografía",
    year: "2026",
    cover: "assets/proyecto2/portada.jpg",
    url: "projects/dialektografia.html",
    description: "Exploración tipográfica y diseño editorial de catálogo experimental de publicaciones.",
    tags: ["Editorial", "Typography", "Print", "Layout"],
    visible: true,
    order: 1
  },
  {
    id: "2",
    num: "02",
    title: "Catalán y Cía.",
    category: "Branding",
    categoryFull: "Branding + Diseño Web",
    year: "2026",
    cover: "assets/projects/project-05.jpg",
    url: "projects/cycia.html",
    description: "Dirección de arte, experiencia digital interactiva y narrativa visual para estudio de diseño.",
    tags: ["Digital", "Direction", "Web"],
    visible: true,
    order: 2
  },
  {
    id: "3",
    num: "03",
    title: "fronteo",
    category: "Editorial",
    categoryFull: "Edición y Diseño",
    year: "2026",
    cover: "assets/projects/project-01.jpg?v=3",
    url: "projects/fronteo.html",
    description: "Sistema de identidad visual integral, dirección creativa y diseño editorial de marca contemporánea.",
    tags: ["Branding", "Identity", "Direction", "3D"],
    visible: true,
    order: 3
  },
  {
    id: "4",
    num: "04",
    title: "Sutil Wines",
    category: "Packaging",
    categoryFull: "Branding + Packaging",
    year: "2025",
    cover: "assets/Sutil/Imagen_AI.jpg",
    url: "projects/sutil.html",
    description: "Identidad visual y diseño de etiquetas de alta gama para viña vitivinícola internacional.",
    tags: ["Packaging", "Wine", "Identity", "Print"],
    visible: true,
    order: 4
  },
  {
    id: "5",
    num: "05",
    title: "MALPORTE",
    category: "Moda",
    categoryFull: "Moda y Dirección de Arte",
    year: "2024",
    cover: "assets/MALPORTE/DSCF0022.8.jpg",
    url: "projects/malporte.html",
    description: "Propuesta de moda y vestuario experimental, dirección de arte e identidad visual contemporánea.",
    tags: ["Fashion", "Moda", "Editorial", "Direction"],
    visible: true,
    order: 5
  },
  {
    id: "6",
    num: "06",
    title: "Piezas gráficas",
    category: "Social Content",
    categoryFull: "Social & Digital Content",
    year: "2023",
    cover: "assets/projects/project-12.jpg",
    url: "projects/contenido.html",
    description: "Sistemas gráficos para redes sociales, micro-animaciones y contenido editorial digital.",
    tags: ["Social", "Digital", "Animation"],
    visible: true,
    order: 6
  },
];

// Rutas de imágenes disponibles en assets/ para selector rápido
const PRESET_ASSETS = [
  "assets/projects/project-01.jpg",
  "assets/proyecto2/portada.jpg",
  "assets/projects/project-03.jpg",
  "assets/projects/project-04.jpg",
  "assets/projects/project-05.jpg",
  "assets/projects/project-06.jpg",
  "assets/projects/project-07.jpg",
  "assets/projects/project-08.jpg",
  "assets/projects/project-09.jpg",
  "assets/projects/project-10.jpg",
  "assets/projects/project-11.jpg",
  "assets/projects/project-12.jpg",
  "assets/fronteo.JPG"
];

// Estado de la aplicación
let appState = {
  projects: [],
  currentView: 'table', // 'table' | 'grid'
  filterStatus: 'all',  // 'all' | 'visible' | 'hidden'
  searchQuery: '',
  activeModal: null,
  editingProjectId: null
};

// --------------------------------------------------------------------------
// INICIALIZACIÓN
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  loadProjects();
  initEventListeners();
  renderApp();
});

/**
 * Carga los proyectos desde LocalStorage o inicia con el catálogo por defecto
 */
function loadProjects() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      appState.projects = JSON.parse(stored);
      // Asegurar ordenamiento
      appState.projects.sort((a, b) => a.order - b.order);
      return;
    } catch (e) {
      console.error("Error al parsear LocalStorage, usando catálogo por defecto", e);
    }
  }
  appState.projects = JSON.parse(JSON.stringify(DEFAULT_PROJECTS));
  saveProjects(false);
}

/**
 * Guarda los proyectos en LocalStorage
 */
function saveProjects(notify = true, message = "Cambios guardados correctamente") {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.projects));
  if (notify) {
    showToast(message, 'success');
  }
}

/**
 * Asigna escuchadores de eventos globales
 */
function initEventListeners() {
  // Buscador
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      appState.searchQuery = e.target.value.toLowerCase().trim();
      renderProjectsList();
    });
  }

  // Filtros de estado (Pills)
  const filterPills = document.querySelectorAll('.pill-btn');
  filterPills.forEach(btn => {
    btn.addEventListener('click', () => {
      filterPills.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.filterStatus = btn.getAttribute('data-filter');
      renderProjectsList();
    });
  });

  // Conmutador de Vistas (Tabla / Cuadrícula)
  const viewBtns = document.querySelectorAll('.view-btn');
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      viewBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.currentView = btn.getAttribute('data-view');
      renderProjectsList();
    });
  });

  // Cerrar modales con tecla Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });

  // Cerrar modales haciendo click fuera del diálogo
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeAllModals();
      }
    });
  });

  // Importar JSON
  const jsonFileInput = document.getElementById('import-json-input');
  if (jsonFileInput) {
    jsonFileInput.addEventListener('change', handleImportJSON);
  }
}

/**
 * Renderiza la interfaz completa (estadísticas, proyectos y controles)
 */
function renderApp() {
  updateStats();
  renderProjectsList();
}

/**
 * Actualiza los contadores de estadísticas
 */
function updateStats() {
  const total = appState.projects.length;
  const visible = appState.projects.filter(p => p.visible).length;
  const hidden = total - visible;
  const categories = new Set(appState.projects.map(p => p.category)).size;

  const totalEl = document.getElementById('stat-total');
  const visibleEl = document.getElementById('stat-visible');
  const hiddenEl = document.getElementById('stat-hidden');
  const catEl = document.getElementById('stat-categories');

  if (totalEl) totalEl.textContent = total;
  if (visibleEl) visibleEl.textContent = visible;
  if (hiddenEl) hiddenEl.textContent = hidden;
  if (catEl) catEl.textContent = categories;
}

/**
 * Filtra los proyectos según búsqueda y pestaña de estado
 */
function getFilteredProjects() {
  return appState.projects.filter(p => {
    // Filtro de estado
    if (appState.filterStatus === 'visible' && !p.visible) return false;
    if (appState.filterStatus === 'hidden' && p.visible) return false;

    // Filtro de búsqueda
    if (appState.searchQuery) {
      const q = appState.searchQuery;
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchCat = (p.category || '').toLowerCase().includes(q) || (p.categoryFull || '').toLowerCase().includes(q);
      const matchYear = (p.year || '').toString().includes(q);
      const matchNum = (p.num || '').includes(q);
      const matchTags = (p.tags || []).some(t => t.toLowerCase().includes(q));
      return matchTitle || matchCat || matchYear || matchNum || matchTags;
    }

    return true;
  });
}

/**
 * Renderiza la lista de proyectos en la vista activa (Tabla o Grid)
 */
function renderProjectsList() {
  const container = document.getElementById('projects-container');
  if (!container) return;

  const filtered = getFilteredProjects();

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 4rem 2rem; background: var(--admin-surface); border: 1px dashed var(--admin-border); border-radius: var(--radius-md);">
        <p style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem;">No se encontraron proyectos</p>
        <p style="color: var(--admin-text-muted); font-size: 0.85rem; margin-bottom: 1.5rem;">No hay proyectos que coincidan con los filtros seleccionados.</p>
        <button class="btn btn-secondary btn-sm" onclick="clearFilters()">Restablecer Filtros</button>
      </div>
    `;
    return;
  }

  if (appState.currentView === 'table') {
    renderTableView(container, filtered);
  } else {
    renderGridView(container, filtered);
  }
}

/**
 * Renderizado de Vista Tabla
 */
function renderTableView(container, projects) {
  let html = `
    <div class="projects-table-container">
      <table class="projects-table">
        <thead>
          <tr>
            <th style="width: 50px; text-align: center;">#</th>
            <th>PROYECTO</th>
            <th>CATEGORÍA</th>
            <th>AÑO</th>
            <th style="width: 170px;">MOSTRAR EN WEB</th>
            <th style="width: 160px; text-align: right;">ACCIONES</th>
          </tr>
        </thead>
        <tbody id="projects-table-body">
  `;

  projects.forEach((p, index) => {
    const isFirst = index === 0;
    const isLast = index === projects.length - 1;
    const isHiddenClass = p.visible ? '' : 'is-hidden-project';

    html += `
      <tr class="${isHiddenClass}" data-id="${p.id}">
        <td style="text-align: center;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 0.35rem;">
            <div class="reorder-btns">
              <button class="reorder-mini-btn" title="Subir orden" onclick="moveProject('${p.id}', -1)" ${isFirst ? 'disabled' : ''}>▲</button>
              <button class="reorder-mini-btn" title="Bajar orden" onclick="moveProject('${p.id}', 1)" ${isLast ? 'disabled' : ''}>▼</button>
            </div>
          </div>
        </td>
        <td>
          <div class="cell-project-meta">
            <img src="${p.cover}" alt="${p.title}" class="project-thumb-small" onerror="this.src='assets/projects/project-01.jpg'">
            <div class="project-title-group">
              <div class="project-title-text">
                <span class="project-num-badge">${p.num || p.id}</span>
                <span>${p.title}</span>
              </div>
              <span class="project-desc-snippet">${p.description || p.categoryFull || ''}</span>
            </div>
          </div>
        </td>
        <td>
          <span class="badge-category">${p.category || 'General'}</span>
        </td>
        <td>
          <span class="badge-year">${p.year || '2026'}</span>
        </td>
        <td>
          <div class="visibility-toggle-wrapper">
            <label class="switch" aria-label="Mostrar ${p.title} en la web">
              <input type="checkbox" ${p.visible ? 'checked' : ''} onchange="toggleProjectVisibility('${p.id}', this.checked)">
              <span class="slider"></span>
            </label>
            <span class="visibility-status-text ${p.visible ? 'status-live' : 'status-hidden'}">
              ${p.visible ? 'Visible' : 'Oculto'}
            </span>
          </div>
        </td>
        <td style="text-align: right;">
          <div class="actions-cell" style="justify-content: flex-end;">
            <button class="btn btn-ghost btn-icon-only" title="Vista Previa en Vivo" onclick="openPreviewModal('${p.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            <button class="btn btn-secondary btn-icon-only" title="Editar Proyecto" onclick="openEditModal('${p.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </button>
            <button class="btn btn-ghost btn-icon-only" title="Duplicar Proyecto" onclick="duplicateProject('${p.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
            <button class="btn btn-danger-ghost btn-icon-only" title="Eliminar" onclick="deleteProject('${p.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}

/**
 * Renderizado de Vista Cuadrícula (Cards)
 */
function renderGridView(container, projects) {
  let html = `<div class="projects-grid">`;

  projects.forEach((p, index) => {
    const isHiddenClass = p.visible ? '' : 'is-hidden-card';
    const isFirst = index === 0;
    const isLast = index === projects.length - 1;

    html += `
      <article class="project-card ${isHiddenClass}" data-id="${p.id}">
        <div class="card-media-wrapper">
          <img src="${p.cover}" alt="${p.title}" class="card-media-img" onerror="this.src='assets/projects/project-01.jpg'">
          <div class="card-top-badges">
            <span class="card-num-pill">${p.num || p.id}</span>
            <span class="card-status-pill ${p.visible ? 'live' : 'draft'}">
              ${p.visible ? '● Visible en Web' : '○ Oculto'}
            </span>
          </div>
        </div>
        <div class="card-body">
          <div class="card-title-row">
            <h3 class="card-title">${p.title}</h3>
            <span class="card-year">${p.year || '2026'}</span>
          </div>
          <p class="card-category">${p.categoryFull || p.category || 'Diseño'}</p>
          <p class="card-desc">${p.description || 'Sin descripción adicional.'}</p>
          
          <div class="card-footer">
            <div class="visibility-toggle-wrapper">
              <label class="switch">
                <input type="checkbox" ${p.visible ? 'checked' : ''} onchange="toggleProjectVisibility('${p.id}', this.checked)">
                <span class="slider"></span>
              </label>
              <span class="visibility-status-text ${p.visible ? 'status-live' : 'status-hidden'}">
                ${p.visible ? 'Visible' : 'Oculto'}
              </span>
            </div>

            <div class="actions-cell">
              <button class="btn btn-ghost btn-sm btn-icon-only" title="Subir" onclick="moveProject('${p.id}', -1)" ${isFirst ? 'disabled' : ''}>▲</button>
              <button class="btn btn-ghost btn-sm btn-icon-only" title="Bajar" onclick="moveProject('${p.id}', 1)" ${isLast ? 'disabled' : ''}>▼</button>
              <button class="btn btn-ghost btn-sm btn-icon-only" title="Vista Previa" onclick="openPreviewModal('${p.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </button>
              <button class="btn btn-secondary btn-sm" onclick="openEditModal('${p.id}')">
                Editar
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}

// --------------------------------------------------------------------------
// ACCIONES DE PROYECTOS (CRUD & VISIBILIDAD)
// --------------------------------------------------------------------------

/**
 * Conmuta el estado de visibilidad del proyecto en la web
 */
function toggleProjectVisibility(projectId, isVisible) {
  const project = appState.projects.find(p => p.id === projectId);
  if (project) {
    project.visible = isVisible;
    saveProjects(true, `"${project.title}" ahora está ${isVisible ? 'VISIBLE' : 'OCULTO'} en la web.`);
    updateStats();
    renderProjectsList();
  }
}

/**
 * Mueve un proyecto arriba o abajo en el orden de visualización
 */
function moveProject(projectId, delta) {
  const index = appState.projects.findIndex(p => p.id === projectId);
  if (index === -1) return;

  const newIndex = index + delta;
  if (newIndex < 0 || newIndex >= appState.projects.length) return;

  // Intercambiar posiciones
  const temp = appState.projects[index];
  appState.projects[index] = appState.projects[newIndex];
  appState.projects[newIndex] = temp;

  // Re-indexar orden
  appState.projects.forEach((p, idx) => {
    p.order = idx + 1;
  });

  saveProjects(true, "Orden de proyectos actualizado.");
  renderProjectsList();
}

/**
 * Duplica un proyecto existente
 */
function duplicateProject(projectId) {
  const project = appState.projects.find(p => p.id === projectId);
  if (!project) return;

  const nextNumInt = appState.projects.length + 1;
  const nextNumStr = nextNumInt < 10 ? `0${nextNumInt}` : `${nextNumInt}`;
  const newId = Date.now().toString();

  const cloned = {
    ...JSON.parse(JSON.stringify(project)),
    id: newId,
    num: nextNumStr,
    title: `${project.title} (Copia)`,
    order: appState.projects.length + 1,
    visible: false // Clonar en borrador
  };

  appState.projects.push(cloned);
  saveProjects(true, `Proyecto clonado como "${cloned.title}" (en modo borrador).`);
  updateStats();
  renderProjectsList();
}

/**
 * Elimina un proyecto
 */
function deleteProject(projectId) {
  const project = appState.projects.find(p => p.id === projectId);
  if (!project) return;

  if (confirm(`¿Estás seguro de que deseas eliminar el proyecto "${project.title}"? Esta acción se puede revertir restableciendo los valores o importando un respaldo.`)) {
    appState.projects = appState.projects.filter(p => p.id !== projectId);
    // Reajustar orden
    appState.projects.forEach((p, idx) => {
      p.order = idx + 1;
    });
    saveProjects(true, `Proyecto "${project.title}" eliminado.`);
    updateStats();
    renderProjectsList();
  }
}

// --------------------------------------------------------------------------
// MODAL: AGREGAR NUEVO PROYECTO
// --------------------------------------------------------------------------
function openAddModal() {
  const nextNumInt = appState.projects.length + 1;
  const nextNumStr = nextNumInt < 10 ? `0${nextNumInt}` : `${nextNumInt}`;

  document.getElementById('add-num').value = nextNumStr;
  document.getElementById('add-title').value = '';
  document.getElementById('add-category').value = 'Brand Identity';
  document.getElementById('add-category-full').value = 'Brand Identity & Direction';
  document.getElementById('add-year').value = new Date().getFullYear().toString();
  document.getElementById('add-cover').value = 'assets/projects/project-01.jpg';
  document.getElementById('add-url').value = `projects/project-${nextNumStr}.html`;
  document.getElementById('add-description').value = '';
  document.getElementById('add-tags').value = 'Design, Art Direction';
  document.getElementById('add-visible').checked = true;

  updateAddImagePreview('assets/projects/project-01.jpg');
  renderPresetStrip('add-preset-strip', 'add-cover', updateAddImagePreview);

  openModal('modal-add');
}

function updateAddImagePreview(url) {
  const img = document.getElementById('add-cover-preview');
  if (img) img.src = url || 'assets/projects/project-01.jpg';
}

function handleAddProjectSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('add-title').value.trim();
  if (!title) {
    alert("Por favor ingresa un título para el proyecto.");
    return;
  }

  const num = document.getElementById('add-num').value.trim() || '01';
  const category = document.getElementById('add-category').value.trim() || 'Design';
  const categoryFull = document.getElementById('add-category-full').value.trim() || category;
  const year = document.getElementById('add-year').value.trim() || '2026';
  const cover = document.getElementById('add-cover').value.trim() || 'assets/projects/project-01.jpg';
  const url = document.getElementById('add-url').value.trim() || `projects/project-${num}.html`;
  const description = document.getElementById('add-description').value.trim();
  const tags = document.getElementById('add-tags').value.split(',').map(t => t.trim()).filter(Boolean);
  const visible = document.getElementById('add-visible').checked;

  const newProject = {
    id: Date.now().toString(),
    num,
    title,
    category,
    categoryFull,
    year,
    cover,
    url,
    description,
    tags,
    visible,
    order: appState.projects.length + 1
  };

  appState.projects.push(newProject);
  saveProjects(true, `Nuevo proyecto "${title}" agregado con éxito.`);
  closeAllModals();
  updateStats();
  renderProjectsList();
}

// --------------------------------------------------------------------------
// MODAL: EDITAR PROYECTO
// --------------------------------------------------------------------------
function openEditModal(projectId) {
  const project = appState.projects.find(p => p.id === projectId);
  if (!project) return;

  document.getElementById('edit-id').value = project.id;
  document.getElementById('edit-num').value = project.num || project.id;
  document.getElementById('edit-title').value = project.title || '';
  document.getElementById('edit-category').value = project.category || '';
  document.getElementById('edit-category-full').value = project.categoryFull || project.category || '';
  document.getElementById('edit-year').value = project.year || '';
  document.getElementById('edit-cover').value = project.cover || '';
  document.getElementById('edit-url').value = project.url || '';
  document.getElementById('edit-description').value = project.description || '';
  document.getElementById('edit-tags').value = (project.tags || []).join(', ');
  document.getElementById('edit-visible').checked = !!project.visible;

  updateEditImagePreview(project.cover);
  renderPresetStrip('edit-preset-strip', 'edit-cover', updateEditImagePreview);

  openModal('modal-edit');
  appState.editingProjectId = projectId; // ← debe ir DESPUÉS de openModal para que closeAllModals no lo borre
}

function updateEditImagePreview(url) {
  const img = document.getElementById('edit-cover-preview');
  if (img) img.src = url || 'assets/projects/project-01.jpg';
}

function handleEditProjectSubmit(e) {
  e.preventDefault();

  const projectId = appState.editingProjectId;
  const project = appState.projects.find(p => p.id === projectId);
  if (!project) return;

  const title = document.getElementById('edit-title').value.trim();
  if (!title) {
    alert("El proyecto debe tener un título.");
    return;
  }

  project.num = document.getElementById('edit-num').value.trim();
  project.title = title;
  project.category = document.getElementById('edit-category').value.trim();
  project.categoryFull = document.getElementById('edit-category-full').value.trim();
  project.year = document.getElementById('edit-year').value.trim();
  project.cover = document.getElementById('edit-cover').value.trim();
  project.url = document.getElementById('edit-url').value.trim();
  project.description = document.getElementById('edit-description').value.trim();
  project.tags = document.getElementById('edit-tags').value.split(',').map(t => t.trim()).filter(Boolean);
  project.visible = document.getElementById('edit-visible').checked;

  saveProjects(true, `Proyecto "${title}" actualizado correctamente.`);
  closeAllModals();
  updateStats();
  renderProjectsList();
}

// --------------------------------------------------------------------------
// MODAL: SIMULADOR DE VISTA PREVIA EN VIVO
// --------------------------------------------------------------------------
function openPreviewModal(projectId) {
  const project = appState.projects.find(p => p.id === projectId);
  if (!project) return;

  document.getElementById('sim-preview-num-title').textContent = `${project.num || project.id} ${project.title}`;
  document.getElementById('sim-preview-cat').textContent = project.categoryFull || project.category || '';
  document.getElementById('sim-preview-img').src = project.cover;
  document.getElementById('sim-item-num').textContent = project.num || project.id;
  document.getElementById('sim-item-title').textContent = project.title;
  document.getElementById('sim-item-cat').textContent = project.category;
  document.getElementById('sim-item-year').textContent = project.year;
  document.getElementById('sim-desc').textContent = project.description || 'Sin descripción adicional.';

  openModal('modal-preview');
}

// --------------------------------------------------------------------------
// GENERADOR Y EXPORTADOR DE CÓDIGO SNIPPET PARA INDEX.HTML
// --------------------------------------------------------------------------
function openCodeSnippetModal() {
  const visibleProjects = appState.projects.filter(p => p.visible);

  // Generar HTML para el preview izquierdo
  let previewsHtml = `<!-- Dynamic Project Preview Cards (Solo proyectos visibles) -->\n<div class="preview-display-wrapper" id="preview-stage">\n`;
  visibleProjects.forEach((p, idx) => {
    previewsHtml += `  <!-- Preview ${p.num} -->\n`;
    previewsHtml += `  <article class="preview-card" id="preview-${idx + 1}" data-project-target="${idx + 1}">\n`;
    previewsHtml += `    <a href="${p.url}" class="preview-media-anchor media-frame" aria-label="Ver ${p.title}">\n`;
    previewsHtml += `      <img src="${p.cover}" alt="${p.title}" class="preview-media-img">\n`;
    previewsHtml += `    </a>\n`;
    previewsHtml += `    <div class="preview-meta-caption">\n`;
    previewsHtml += `      <span class="preview-meta-title">${p.num} ${p.title}</span>\n`;
    previewsHtml += `      <span class="preview-meta-category">${p.categoryFull || p.category}</span>\n`;
    previewsHtml += `    </div>\n`;
    previewsHtml += `  </article>\n\n`;
  });
  previewsHtml += `</div>`;

  // Generar HTML para la lista derecha
  let listHtml = `<!-- Right Column: Project Index List (Solo proyectos visibles) -->\n<ul class="project-index-list" id="project-list">\n`;
  visibleProjects.forEach((p, idx) => {
    listHtml += `  <li class="project-index-item" data-project="${idx + 1}">\n`;
    listHtml += `    <a href="${p.url}" class="project-index-link">\n`;
    listHtml += `      <div class="index-item-left">\n`;
    listHtml += `        <span class="index-item-num">${p.num}</span>\n`;
    listHtml += `        <span class="index-item-title">${p.title}</span>\n`;
    listHtml += `      </div>\n`;
    listHtml += `      <div class="index-item-right">\n`;
    listHtml += `        <span class="index-item-cat">${p.category}</span>\n`;
    listHtml += `        <span class="index-item-year">${p.year}</span>\n`;
    listHtml += `        <span class="index-item-arrow" aria-hidden="true">&rarr;</span>\n`;
    listHtml += `      </div>\n`;
    listHtml += `    </a>\n`;
    listHtml += `  </li>\n\n`;
  });
  listHtml += `</ul>`;

  const fullSnippet = `${previewsHtml}\n\n${listHtml}`;
  document.getElementById('code-snippet-box').textContent = fullSnippet;

  openModal('modal-code');
}

function copySnippetCode() {
  const code = document.getElementById('code-snippet-box').textContent;
  navigator.clipboard.writeText(code).then(() => {
    showToast("Código HTML copiado al portapapeles.", "success");
  }).catch(() => {
    showToast("No se pudo copiar automáticamente.", "danger");
  });
}

// --------------------------------------------------------------------------
// EXPORTAR & IMPORTAR JSON
// --------------------------------------------------------------------------
function exportJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState.projects, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `catalogo-proyectos-jp-${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast("Respaldo JSON descargado con éxito.", "success");
}

function triggerImportJSON() {
  const input = document.getElementById('import-json-input');
  if (input) input.click();
}

function handleImportJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      if (Array.isArray(parsed) && parsed.length > 0) {
        appState.projects = parsed;
        saveProjects(true, `Se importaron ${parsed.length} proyectos con éxito.`);
        updateStats();
        renderProjectsList();
      } else {
        alert("El archivo JSON no contiene una lista válida de proyectos.");
      }
    } catch (err) {
      alert("Error al leer el archivo JSON. Formato inválido.");
    }
  };
  reader.readAsText(file);
  e.target.value = ''; // Reset input
}

/**
 * Restablecer catálogo a los valores por defecto
 */
function resetToDefaults() {
  if (confirm("¿Deseas restaurar la lista original de los 12 proyectos del portafolio? Se sobrescribirán los cambios no exportados.")) {
    appState.projects = JSON.parse(JSON.stringify(DEFAULT_PROJECTS));
    saveProjects(true, "Catálogo restaurado a valores por defecto.");
    updateStats();
    renderProjectsList();
  }
}

// --------------------------------------------------------------------------
// UTILIDADES DE INTERFAZ (Presets de Imágenes, Modales, Toasts)
// --------------------------------------------------------------------------
function renderPresetStrip(stripId, inputTargetId, previewCallback) {
  const strip = document.getElementById(stripId);
  if (!strip) return;

  let html = '';
  PRESET_ASSETS.forEach(imgUrl => {
    html += `
      <button type="button" class="preset-img-btn" onclick="selectPresetImage('${imgUrl}', '${inputTargetId}')">
        <img src="${imgUrl}" alt="Preset" onerror="this.src='assets/projects/project-01.jpg'">
      </button>
    `;
  });
  strip.innerHTML = html;
}

window.selectPresetImage = function(imgUrl, inputTargetId) {
  const input = document.getElementById(inputTargetId);
  if (input) {
    input.value = imgUrl;
    if (inputTargetId === 'add-cover') updateAddImagePreview(imgUrl);
    if (inputTargetId === 'edit-cover') updateEditImagePreview(imgUrl);
  }
};

function clearFilters() {
  appState.searchQuery = '';
  appState.filterStatus = 'all';

  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';

  document.querySelectorAll('.pill-btn').forEach(b => {
    if (b.getAttribute('data-filter') === 'all') b.classList.add('active');
    else b.classList.remove('active');
  });

  renderProjectsList();
}

function openModal(modalId) {
  closeAllModals();
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('is-active');
    appState.activeModal = modalId;
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('is-active'));
  appState.activeModal = null;
  appState.editingProjectId = null;
}

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">
      ${type === 'success' 
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFF00" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
      }
    </div>
    <div>${message}</div>
  `;

  container.appendChild(toast);

  // Animación de entrada
  setTimeout(() => toast.classList.add('is-visible'), 10);

  // Desaparición automática
  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
