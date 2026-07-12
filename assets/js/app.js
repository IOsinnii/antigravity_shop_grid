// State
const appState = {
    view: 'table', // 'table' | 'grid'
    category: 'all',
    search: '',
    theme: 'theme-obsidian',
    font: 'font-arial',
    sort: {
        field: 'date', // 'date' | 'duration'
        order: 'desc'  // 'desc' | 'asc'
    }
};

// DOM Elements
const dom = {
    catalogContainer: document.getElementById('catalog-container'),
    categoryList: document.getElementById('category-list'),
    searchInput: document.getElementById('search-input'),
    searchBox: document.querySelector('.search-box'),
    searchClear: document.getElementById('search-clear'),
    viewBtns: document.querySelectorAll('.view-btn'),
    themeBtns: document.querySelectorAll('.theme-btn'),
    fontBtns: document.querySelectorAll('.font-btn'),
    sortBtns: document.querySelectorAll('.sort-btn'),
    lectureCount: document.getElementById('lecture-count'),
    currentCategoryTitle: document.getElementById('current-category-title')
};

// Render Categories
function renderCategories() {
    // Count lectures per category once
    const counts = {};
    lectures.forEach(lecture => {
        (lecture.categories || []).forEach(id => {
            counts[id] = (counts[id] || 0) + 1;
        });
    });

    const itemHtml = (id, name, count) => `
        <li class="category-item${id === appState.category ? ' active' : ''}"
            data-category="${id}" tabindex="0" role="button">
            <span class="category-name">${name}</span>
            <span class="category-count">${count}</span>
        </li>
    `;

    dom.categoryList.innerHTML =
        itemHtml('all', 'Все лекции', lectures.length) +
        categories.map(cat => itemHtml(cat.id, cat.name, counts[cat.id] || 0)).join('');
}

// Render Catalog
function renderCatalog() {
    // Filter data
    const filteredLectures = lectures.filter(lecture => {
        const matchesCategory = appState.category === 'all' || (lecture.categories && lecture.categories.includes(appState.category));
        const query = appState.search.toLowerCase();
        const matchesSearch = query === '' ||
            (lecture.title || '').toLowerCase().includes(query) ||
            (lecture.description || '').toLowerCase().includes(query);

        return matchesCategory && matchesSearch;
    });

    // Sort
    filteredLectures.sort((a, b) => {
        let valA, valB;

        if (appState.sort.field === 'date') {
            valA = parseDate(a.date_standard).getTime();
            valB = parseDate(b.date_standard).getTime();
        } else { // duration
            valA = parseDuration(a.duration);
            valB = parseDuration(b.duration);
        }

        if (appState.sort.order === 'desc') {
            return valB - valA;
        } else {
            return valA - valB;
        }
    });

    // Update Header
    dom.lectureCount.textContent = formatRecordCount(filteredLectures.length);
    const activeCategoryName = appState.category === 'all'
        ? 'Все лекции'
        : categories.find(c => c.id === appState.category)?.name || 'Категория';
    dom.currentCategoryTitle.textContent = activeCategoryName;

    // Render Items
    if (filteredLectures.length === 0) {
        dom.catalogContainer.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 2rem;">Лекции не найдены</p>';
        return;
    }

    if (appState.view === 'table') {
        renderTableView(filteredLectures);
    } else {
        renderGridView(filteredLectures);
    }
}

function renderTableView(items) {
    const html = items.map(lecture => {
        // Generate Tags
        let tagsHtml = '';
        if (lecture.categories && lecture.categories.length > 0) {
            tagsHtml = '<div class="lecture-tags">';
            lecture.categories.forEach(catId => {
                const cat = categories.find(c => c.id === catId);
                if (cat) {
                    tagsHtml += `<span class="tag">${cat.name}</span>`;
                }
            });
            tagsHtml += '</div>';
        }

        return `
        <div class="lecture-item">
            <div class="lecture-meta">
                <span style="font-weight: 500; color: var(--accent-color)">#${lecture.order}</span>
                <span>${lecture.date_standard || lecture.date}</span>
                <span>${lecture.duration}</span>
            </div>
            <div class="lecture-title">
                <h4>${lecture.title}</h4>
                ${tagsHtml}
                <p class="lecture-desc-hover">${lecture.description}</p>
            </div>
            <div class="lecture-actions">
                <a href="pages/video.html?id=${lecture.order}">
                    <i class="fas fa-play"></i> Смотреть
                </a>
                ${hasLectureText(lecture.order) ? `
                <a href="pages/lecture.html?id=${lecture.order}">
                    <i class="fas fa-book-open"></i> Читать
                </a>` : ''}
            </div>
        </div>
    `}).join('');
    dom.catalogContainer.innerHTML = html;
}

function renderGridView(items) {
    const html = items.map(lecture => `
        <div class="lecture-item">
            <img src="${lecture.thumbnail_url}" alt="${lecture.title}" class="lecture-thumbnail" loading="lazy" onerror="this.src='https://via.placeholder.com/320x180?text=No+Image'">
            <div class="lecture-content">
                <div class="lecture-date">${lecture.date_standard || lecture.date} • ${lecture.duration}</div>
                <h4 class="lecture-title">${lecture.title}</h4>
                <p class="lecture-desc">${lecture.description}</p>
                <div class="lecture-actions">
                    <a href="pages/video.html?id=${lecture.order}" class="btn-download">
                        Смотреть
                    </a>
                    ${hasLectureText(lecture.order) ? `
                    <a href="pages/lecture.html?id=${lecture.order}" class="btn-download">
                        Читать
                    </a>` : ''}
                </div>
            </div>
        </div>
    `).join('');
    dom.catalogContainer.innerHTML = html;
}

// Event Listeners
function setupEventListeners() {
    // View Toggles
    dom.viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            appState.view = btn.dataset.view;
            localStorage.setItem('view', appState.view);
            updateViewClasses();
            renderCatalog();
        });
    });

    // Category Selection using Delegation
    const selectCategory = (item) => {
        appState.category = item.dataset.category;
        localStorage.setItem('category', appState.category);

        // Update UI
        document.querySelectorAll('.category-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');

        renderCatalog();
    };

    dom.categoryList.addEventListener('click', (e) => {
        const item = e.target.closest('.category-item');
        if (item) selectCategory(item);
    });

    // Keyboard activation (categories are focusable list items, not native buttons)
    dom.categoryList.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const item = e.target.closest('.category-item');
        if (!item) return;
        e.preventDefault(); // Stop Space from scrolling the sidebar
        selectCategory(item);
    });

    // Search Input (debounced so 194 rows are not re-rendered per keystroke)
    let searchTimer = null;
    dom.searchInput.addEventListener('input', (e) => {
        const value = e.target.value.trim();
        dom.searchBox.classList.toggle('has-query', value !== '');
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            appState.search = value;
            renderCatalog();
        }, 200);
    });

    // Clear Search Button
    dom.searchClear.addEventListener('click', () => {
        clearTimeout(searchTimer);
        dom.searchInput.value = '';
        dom.searchBox.classList.remove('has-query');
        appState.search = '';
        renderCatalog();
        dom.searchInput.focus();
    });

    // Theme Selection
    document.querySelector('.theme-selector').addEventListener('click', (e) => {
        if (e.target.classList.contains('theme-btn')) {
            const newTheme = e.target.dataset.theme;
            applyTheme(newTheme);
        }
    });

    // Font Selection
    document.querySelector('.font-selector').addEventListener('click', (e) => {
        if (e.target.classList.contains('font-btn')) {
            const newFont = e.target.dataset.font;
            applyFont(newFont);
        }
    });
    // Sort Selection
    dom.sortBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const field = btn.dataset.sort;
            toggleSort(field);
        });
    });

    // Sidebar Toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            const isCollapsed = sidebar.classList.contains('collapsed');

            // Update button text
            const span = sidebarToggle.querySelector('span');
            if (span) {
                span.textContent = isCollapsed ? 'развернуть' : 'свернуть';
            }

            // Update title
            sidebarToggle.title = isCollapsed ? 'Развернуть меню' : 'Свернуть меню';
        });
    }
}

function toggleSort(field) {
    if (appState.sort.field === field) {
        // Toggle order if clicking same field
        appState.sort.order = appState.sort.order === 'desc' ? 'asc' : 'desc';
    } else {
        // New field, default to desc (or logic choice)
        appState.sort.field = field;
        appState.sort.order = 'desc';
    }
    localStorage.setItem('sort', JSON.stringify(appState.sort));
    updateSortUI();
    renderCatalog();
}

function updateSortUI() {
    dom.sortBtns.forEach(btn => {
        const icon = btn.querySelector('i');

        if (btn.dataset.sort === appState.sort.field) {
            btn.classList.add('active');
            // Update icon and data-order attribute
            btn.dataset.order = appState.sort.order;

            // Icon logic: arrow-down for DESC (High to Low / New to Old), arrow-up for ASC
            if (appState.sort.order === 'desc') {
                icon.className = 'fas fa-arrow-down';
            } else {
                icon.className = 'fas fa-arrow-up';
            }
        } else {
            btn.classList.remove('active');
            // Reset icon to neutral or default state if needed, but desc is good default visual
            icon.className = 'fas fa-arrow-down';
        }
    });
}

// Browser chrome color per theme (mobile address bar etc.)
const THEME_COLORS = {
    'theme-yantra': '#ffffff',
    'theme-forest': '#1A1C19',
    'theme-sage': '#F4F7F6',
    'theme-obsidian': '#121212'
};

function applyTheme(themeName) {
    // Remove all theme classes
    document.body.classList.remove('theme-yantra', 'theme-forest', 'theme-sage', 'theme-obsidian', 'light-theme');

    // Add new theme class
    document.body.classList.add(themeName);
    appState.theme = themeName;

    // Keep the browser UI color in sync with the theme
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta && THEME_COLORS[themeName]) {
        themeColorMeta.content = THEME_COLORS[themeName];
    }

    // Save
    localStorage.setItem('theme', themeName);

    // Update UI active state
    dom.themeBtns.forEach(btn => {
        if (btn.dataset.theme === themeName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function applyFont(fontName) {
    // Remove all font classes
    document.body.classList.remove('font-arial', 'font-verdana');

    // Add new font class
    document.body.classList.add(fontName);
    appState.font = fontName;

    // Save
    localStorage.setItem('font', fontName);

    // Update UI active state
    dom.fontBtns.forEach(btn => {
        if (btn.dataset.font === fontName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function init() {
    // Load Theme Preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && THEME_COLORS[savedTheme]) {
        applyTheme(savedTheme);
    } else {
        // Follow the system preference on first visit
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'theme-obsidian' : 'theme-yantra');
    }

    // Load Font Preference
    const savedFont = localStorage.getItem('font');
    if (savedFont) {
        applyFont(savedFont);
    } else {
        applyFont('font-arial'); // Default
    }

    // Restore View / Sort / Category (only accept values that are still valid)
    const savedView = localStorage.getItem('view');
    if (savedView === 'table' || savedView === 'grid') {
        appState.view = savedView;
    }

    try {
        const savedSort = JSON.parse(localStorage.getItem('sort'));
        if (savedSort &&
            ['date', 'duration'].includes(savedSort.field) &&
            ['asc', 'desc'].includes(savedSort.order)) {
            appState.sort = savedSort;
        }
    } catch (e) { /* corrupted value — keep defaults */ }

    const savedCategory = localStorage.getItem('category');
    if (savedCategory === 'all' || categories.some(c => c.id === savedCategory)) {
        appState.category = savedCategory;
    }

    renderCategories();
    updateSortUI();
    renderCatalog();
    setupEventListeners();
    updateViewClasses();
}

function updateViewClasses() {
    // Update container class
    dom.catalogContainer.className = appState.view === 'table' ? 'view-table' : 'view-grid';

    // Update buttons
    dom.viewBtns.forEach(btn => {
        if (btn.dataset.view === appState.view) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Helper: does a full lecture text exist for this order? (index in texts-index.js)
function hasLectureText(order) {
    return typeof lectureTextOrders !== 'undefined' && lectureTextOrders.includes(order);
}

// Helper: Russian pluralization for "запись" (1 запись, 2 записи, 5 записей)
function formatRecordCount(n) {
    const mod100 = n % 100;
    const mod10 = n % 10;
    let word;
    if (mod100 >= 11 && mod100 <= 14) {
        word = 'записей';
    } else if (mod10 === 1) {
        word = 'запись';
    } else if (mod10 >= 2 && mod10 <= 4) {
        word = 'записи';
    } else {
        word = 'записей';
    }
    return `${n} ${word}`;
}

// Helper: Parse DD/MM/YYYY to Date object
function parseDate(dateStr) {
    if (!dateStr) return new Date(0);
    const [day, month, year] = dateStr.split('/');
    return new Date(year, month - 1, day);
}

// Helper: Parse Duration ("HH:MM:SS" or "MM:SS") to seconds
function parseDuration(durationStr) {
    if (!durationStr) return 0;
    const parts = durationStr.split(':').map(Number);
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }
    return 0;
}

// Run
document.addEventListener('DOMContentLoaded', init);
