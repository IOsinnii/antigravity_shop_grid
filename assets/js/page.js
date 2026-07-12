// Shared bootstrap for subpages (video / lecture text / info pages).
// Applies the theme and font chosen on the main page and, when the body
// declares data-page="video" or data-page="lecture", renders that lecture
// from the data.js global using the ?id=<order> query parameter.

'use strict';

const PAGE_THEMES = ['theme-yantra', 'theme-paper', 'theme-sage', 'theme-graphite', 'theme-forest', 'theme-obsidian'];
const PAGE_FONT_SCALES = [0.9, 1, 1.15, 1.3]; // must match FONT_SCALES in app.js

function applyStoredAppearance() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && PAGE_THEMES.includes(savedTheme)) {
        document.body.classList.add(savedTheme);
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.add(prefersDark ? 'theme-graphite' : 'theme-yantra');
    }

    const savedFont = localStorage.getItem('font');
    document.body.classList.add(savedFont === 'font-verdana' ? 'font-verdana' : 'font-arial');

    const savedScale = parseInt(localStorage.getItem('fontScale'), 10);
    if (Number.isInteger(savedScale) && PAGE_FONT_SCALES[savedScale] !== undefined) {
        document.documentElement.style.fontSize = (PAGE_FONT_SCALES[savedScale] * 100) + '%';
    }
}

function getLectureFromQuery() {
    if (typeof lectures === 'undefined') {
        // data.js failed to load — a different failure than a wrong id
        pageShowError('Не удалось загрузить базу лекций. Обновите страницу.');
        return null;
    }
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return null;
    return lectures.find(l => String(l.order) === String(id)) || null;
}

// Fill the prev/next navigation links (chronological, i.e. by order).
// pageName is 'video' or 'lecture' so each page links to its own kind.
function renderPrevNext(lecture, pageName) {
    const nav = document.getElementById('lecture-nav');
    if (!nav || typeof lectures === 'undefined') return;
    const sorted = [...lectures].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(l => l.order === lecture.order);
    const prev = idx > 0 ? sorted[idx - 1] : null;
    const next = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;

    const prevEl = document.getElementById('nav-prev');
    const nextEl = document.getElementById('nav-next');
    if (prev) {
        prevEl.href = `${pageName}.html?id=${prev.order}`;
        prevEl.querySelector('.nav-title').textContent = prev.title;
    } else {
        prevEl.style.visibility = 'hidden';
    }
    if (next) {
        nextEl.href = `${pageName}.html?id=${next.order}`;
        nextEl.querySelector('.nav-title').textContent = next.title;
    } else {
        nextEl.style.visibility = 'hidden';
    }
    nav.style.display = 'flex';
}

function pageHasAnyText(order) {
    return (typeof lectureTextOrders !== 'undefined' && lectureTextOrders.includes(order)) ||
        (typeof lectureTranscriptOrders !== 'undefined' && lectureTranscriptOrders.includes(order));
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
        if (typeof lectures !== 'undefined') {
            pageShowError('Лекция не найдена. Вернитесь в каталог и выберите запись.');
        }
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
    if (pageHasAnyText(lecture.order)) {
        readLink.href = `lecture.html?id=${lecture.order}`;
    } else {
        readLink.style.display = 'none';
    }

    // Audio card appears only when the database carries an audio_url for this
    // lecture (Phase 2 pipeline fills these in; absent field = no audio yet)
    if (lecture.audio_url) {
        document.getElementById('audio-player').src = lecture.audio_url;
        const dl = document.getElementById('audio-download');
        dl.href = lecture.audio_url;
        document.getElementById('audio-card').style.display = 'block';
    }

    renderPrevNext(lecture, 'video');
}

// ---------- Lecture text page ----------

async function initLecturePage() {
    const lecture = getLectureFromQuery();
    if (!lecture) {
        if (typeof lectures !== 'undefined') {
            pageShowError('Лекция не найдена. Вернитесь в каталог и выберите запись.');
        }
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

    const result = await loadLectureText(lecture.order);
    const textCard = document.getElementById('lecture-text-card');
    const banner = document.getElementById('text-unavailable');
    if (result) {
        if (result.kind === 'auto') {
            // Honest labeling: machine transcript, curated text pending
            const note = document.getElementById('transcript-note');
            if (note) note.style.display = 'block';
        }
        renderTextParagraphs(document.getElementById('lecture-text'), result.text);
        textCard.style.display = 'block';
    } else {
        banner.style.display = 'block';
    }

    renderPrevNext(lecture, 'lecture');
}

// Text sources in priority order: curated JSON, auto transcript JSON,
// curated markdown (frontmatter + body). Returns {text, kind} or null.
// Requires HTTP — over file:// fetch fails and the page degrades to the
// "text unavailable" banner.
async function loadLectureText(order) {
    try {
        const jsonResponse = await fetch(`../data/texts/lecture_${order}.json`);
        if (jsonResponse.ok) {
            const data = await jsonResponse.json();
            if (data.text && data.text.length > 100) return { text: data.text, kind: 'curated' };
        }
    } catch (e) { /* fall through */ }

    try {
        const trResponse = await fetch(`../data/texts/transcript_${order}.json`);
        if (trResponse.ok) {
            const data = await trResponse.json();
            if (data.text && data.text.length > 100) return { text: data.text, kind: 'auto' };
        }
    } catch (e) { /* fall through */ }

    try {
        const mdResponse = await fetch(`../data/texts/lecture_${order}.md`);
        if (mdResponse.ok) {
            const raw = await mdResponse.text();
            // Strip YAML frontmatter (--- ... ---) if present, keep the body
            const parts = raw.split('---');
            const body = parts.length >= 3 ? parts.slice(2).join('---') : raw;
            if (body.trim().length > 100) return { text: body.trim(), kind: 'curated' };
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
