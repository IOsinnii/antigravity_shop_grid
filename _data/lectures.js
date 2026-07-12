// Data adapter: canonical database -> template-ready lecture objects.
// Single source of truth stays data/lectures_full_metadata.json.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function youtubeId(url) {
    const m = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/.exec(url || '');
    return m ? m[1] : null;
}

// HH:MM:SS -> ISO 8601 duration (PT1H9M8S) for schema.org
function isoDuration(hms) {
    if (!hms) return null;
    const [h, m, s] = hms.split(':').map(Number);
    return `PT${h ? h + 'H' : ''}${m ? m + 'M' : ''}${s ? s + 'S' : ''}` || null;
}

// DD/MM/YYYY -> YYYY-MM-DD for schema.org uploadDate
function isoDate(ds) {
    if (!ds) return null;
    const [d, m, y] = ds.split('/');
    return `${y}-${m}-${d}`;
}

module.exports = () => {
    const lectures = JSON.parse(
        fs.readFileSync(path.join(ROOT, 'data', 'lectures_full_metadata.json'), 'utf-8'));

    // Which orders have texts, and of which kind (mirrors texts-index.js logic)
    const texts = {};
    for (const f of fs.readdirSync(path.join(ROOT, 'data', 'texts'))) {
        let m = /^lecture_(\d+)\.(?:json|md)$/.exec(f);
        if (m) { texts[+m[1]] = 'curated'; continue; }
        m = /^transcript_(\d+)\.json$/.exec(f);
        if (m && texts[+m[1]] !== 'curated') texts[+m[1]] = 'auto';
    }

    const sorted = [...lectures].sort((a, b) => a.order - b.order);
    return sorted.map((lec, i) => ({
        ...lec,
        youtubeId: youtubeId(lec.download_url),
        isoDuration: isoDuration(lec.duration),
        isoDate: isoDate(lec.date_standard),
        textKind: texts[lec.order] || null,
        descriptionShort: (lec.description || '').split('\n')[0].slice(0, 300),
        paragraphs: (lec.description || '').split('\n').map(p => p.trim()).filter(Boolean),
        prev: i > 0 ? { order: sorted[i - 1].order, title: sorted[i - 1].title } : null,
        next: i < sorted.length - 1 ? { order: sorted[i + 1].order, title: sorted[i + 1].title } : null,
    }));
};
