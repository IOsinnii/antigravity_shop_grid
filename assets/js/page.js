// Shared bootstrap for subpages (video / lecture text / info pages).
// Applies the theme and font chosen on the main page and, when the body
// declares data-page="video" or data-page="lecture", renders that lecture
// from the data.js global using the ?id=<order> query parameter.

'use strict';

const PAGE_THEMES = ['theme-yantra', 'theme-forest', 'theme-sage', 'theme-obsidian'];

function applyStoredAppearance() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && PAGE_THEMES.includes(savedTheme)) {
        document.body.classList.add(savedTheme);
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.add(prefersDark ? 'theme-obsidian' : 'theme-yantra');
    }

    const savedFont = localStorage.getItem('font');
    document.body.classList.add(savedFont === 'font-verdana' ? 'font-verdana' : 'font-arial');
}

function getLectureFromQuery() {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id || typeof lectures === 'undefined') return null;
    return lectures.find(l => String(l.order) === String(id)) || null;
}

function extractYouTubeId(url) {
    if (!url) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&#?]*)/,
        /(?:youtube\.com\/v\/)([^&#?]*)/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) return match[1];
    }
    return null;
}

// Render plain text (paragraphs separated by newlines) into a container
// using textContent per paragraph — no HTML injection from data.
function renderTextParagraphs(container, text) {
    container.innerHTML = '';
    text.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const p = document.createElement('p');
        p.textContent = trimmed;
        container.appendChild(p);
    });
}

function pageShowError(message) {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
    const error = document.getElementById('page-error');
    if (error) {
        error.textContent = message;
        error.style.display = 'block';
    }
}

// ---------- Video page ----------

function initVideoPage() {
    const lecture = getLectureFromQuery();
    if (!lecture) {
        pageShowError('Лекция не найдена. Вернитесь в каталог и выберите запись.');
        return;
    }

    document.title = `${lecture.title} — Сергей Бугаев`;
    document.getElementById('loading').style.display = 'none';
    document.getElementById('video-container').style.display = 'block';

    document.getElementById('video-title').textContent = lecture.title;
    document.getElementById('video-order').textContent = `№${lecture.order}`;
    document.getElementById('video-date').textContent = lecture.date_standard || lecture.date || '—';
    document.getElementById('video-duration').textContent = lecture.duration || '—';
    renderTextParagraphs(document.getElementById('video-description'), lecture.description || '');

    const youtubeId = extractYouTubeId(lecture.download_url);
    const frame = document.getElementById('video-player');
    if (youtubeId) {
        frame.src = `https://www.youtube.com/embed/${youtubeId}?rel=0`;
        frame.title = lecture.title;
    } else {
        frame.closest('.page-card').style.display = 'none';
    }

    const external = document.getElementById('video-external');
    if (lecture.download_url && lecture.download_url !== '#') {
        external.href = lecture.download_url;
    } else {
        external.style.display = 'none';
    }

    const readLink = document.getElementById('video-read-link');
    if (typeof lectureTextOrders !== 'undefined' && lectureTextOrders.includes(lecture.order)) {
        readLink.href = `lecture.html?id=${lecture.order}`;
    } else {
        readLink.style.display = 'none';
    }
}

// ---------- Lecture text page ----------

async function initLecturePage() {
    const lecture = getLectureFromQuery();
    if (!lecture) {
        pageShowError('Лекция не найдена. Вернитесь в каталог и выберите запись.');
        return;
    }

    document.title = `${lecture.title} — Сергей Бугаев`;
    document.getElementById('loading').style.display = 'none';
    document.getElementById('lecture-container').style.display = 'block';

    document.getElementById('lecture-title').textContent = lecture.title;
    const meta = [`Лекция №${lecture.order}`];
    if (lecture.date_standard || lecture.date) meta.push(`записана ${lecture.date_standard || lecture.date}`);
    if (lecture.duration) meta.push(lecture.duration);
    document.getElementById('lecture-meta').textContent = meta.join(' · ');

    const watchLink = document.getElementById('lecture-watch-link');
    watchLink.href = `video.html?id=${lecture.order}`;

    const text = await loadLectureText(lecture.order);
    const textCard = document.getElementById('lecture-text-card');
    const banner = document.getElementById('text-unavailable');
    if (text) {
        renderTextParagraphs(document.getElementById('lecture-text'), text);
        textCard.style.display = 'block';
    } else {
        banner.style.display = 'block';
    }
}

// JSON preferred; markdown (frontmatter + body) as fallback.
// Returns plain text or null. Requires HTTP — over file:// fetch fails and
// the page degrades to the "text unavailable" banner.
async function loadLectureText(order) {
    try {
        const jsonResponse = await fetch(`../data/texts/lecture_${order}.json`);
        if (jsonResponse.ok) {
            const data = await jsonResponse.json();
            if (data.text && data.text.length > 100) return data.text;
        }
    } catch (e) { /* fall through to markdown */ }

    try {
        const mdResponse = await fetch(`../data/texts/lecture_${order}.md`);
        if (mdResponse.ok) {
            const raw = await mdResponse.text();
            // Strip YAML frontmatter (--- ... ---) if present, keep the body
            const parts = raw.split('---');
            const body = parts.length >= 3 ? parts.slice(2).join('---') : raw;
            if (body.trim().length > 100) return body.trim();
        }
    } catch (e) { /* no text available */ }

    return null;
}

// ---------- Boot ----------

document.addEventListener('DOMContentLoaded', () => {
    applyStoredAppearance();
    const page = document.body.dataset.page;
    if (page === 'video') initVideoPage();
    if (page === 'lecture') initLecturePage();
});
