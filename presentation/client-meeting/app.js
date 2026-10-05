// Shell Application Logic

let currentPageId = '';
let shellNotesOpen = false;
const noteStorageKey = 'spraybot_client_meeting_notes';
let presenterNotes = JSON.parse(localStorage.getItem(noteStorageKey) || '{}');

function savePresenterNotes() {
    localStorage.setItem(noteStorageKey, JSON.stringify(presenterNotes));
}

function showDecisionDetail(index) {
    const item = decisionTopics[index];
    if (!item) return;
    selectedDecisionIndex = index;
    const detail = document.getElementById('topic-detail');
    detail.hidden = false;
    document.getElementById('topic-detail-title').textContent = `${String(index + 1).padStart(2, '0')} · ${item.topic}`;
    document.getElementById('topic-detail-current').textContent = item.current;
    document.getElementById('topic-detail-question').textContent = item.confirm;
    document.querySelectorAll('.decision-row').forEach((row, rowIndex) => row.classList.toggle('selected', rowIndex === index));
    updateShellNotes('decisions', `decision-${index + 1}`);
    openShellNotes();
}

function openShellNotes() {
    shellNotesOpen = true;
    document.getElementById('shell-note-panel')?.classList.add('open');
    document.getElementById('btn-toggle-notes')?.classList.add('active');
}
function initApp() {
    window.addEventListener('hashchange', handleRouteChange);
    
    // Check initial route
    if (!window.location.hash || window.location.hash === '#/') {
        window.location.hash = '#/overview';
    } else {
        handleRouteChange();
    }

    setupShellEvents();
}

function handleRouteChange() {
    const hash = window.location.hash.replace('#/', '');
    const pageIndex = presentationPages.findIndex(p => p.id === hash);
    
    if (pageIndex === -1) {
        window.location.hash = '#/overview';
        return;
    }

    shellNotesOpen = false;
    document.getElementById('shell-note-panel')?.classList.remove('open');
    document.getElementById('btn-toggle-notes')?.classList.remove('active');
    const topicDetail = document.getElementById('topic-detail');
    if (topicDetail) topicDetail.hidden = true;
    document.querySelectorAll('.decision-row.selected').forEach(row => row.classList.remove('selected'));
    selectedDecisionIndex = null;
    const page = presentationPages[pageIndex];
    currentPageId = page.id;
    renderShell(page, pageIndex);
    loadPageContent(page.id);
    updateShellNotes(page.id);
}

function renderShell(page, pageIndex) {
    // Update navigation active states
    document.querySelectorAll('#shell-nav .nav-link').forEach(link => {
        if (link.getAttribute('data-route') === page.id) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Update bottom footer
    const presStep = document.getElementById('pres-step');
    if (presStep) {
        presStep.textContent = `${page.num} / ${presentationPages.length.toString().padStart(2, '0')} — ${page.title}`;
    }

    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    
    if (btnPrev) btnPrev.disabled = pageIndex === 0;
    if (btnNext) btnNext.disabled = pageIndex === presentationPages.length - 1;
}

function loadPageContent(pageId) {
    const container = document.getElementById('page-container');
    container.style.opacity = 0;
    container.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
        container.innerHTML = ''; // clear

        if (pageId === 'overview') renderOverviewPage(container);
        else if (pageId === 'system-map') renderSystemMapPage(container);
        else if (pageId === 'system-context') renderSystemContextPage(container);
        else if (pageId === 'architecture') renderArchitecturePage(container);
        else if (pageId === 'decisions') renderDecisionsPage(container);

        // Sub-page specific initialization
        if (pageId === 'system-map' && typeof triggerMapLayoutRecalc === 'function') {
            triggerMapLayoutRecalc();
        }

        // Slight delay for animation
        setTimeout(() => {
            container.style.opacity = 1;
            container.style.transform = 'translateY(0)';
        }, 50);
    }, 150);
}

function goPrev() {
    const pageIndex = presentationPages.findIndex(p => p.id === currentPageId);
    if (pageIndex > 0) {
        window.location.hash = '#/' + presentationPages[pageIndex - 1].id;
    }
}

function goNext() {
    const pageIndex = presentationPages.findIndex(p => p.id === currentPageId);
    if (pageIndex < presentationPages.length - 1) {
        window.location.hash = '#/' + presentationPages[pageIndex + 1].id;
    }
}

function toggleShellNotes() {
    if (shellNotesOpen) {
        shellNotesOpen = false;
        document.getElementById('shell-note-panel')?.classList.remove('open');
        document.getElementById('btn-toggle-notes')?.classList.remove('active');
        return;
    }
    openShellNotes();
}

function updateShellNotes(pageId, noteId = null) {
    const textarea = document.getElementById('shell-note-textarea');
    const label = document.querySelector('.notes-label');
    if (!textarea) return;

    const key = noteId ? `${pageId}:${noteId}` : pageId;
    if (label) {
        if (noteId?.startsWith('decision-')) label.textContent = `Catatan topik ${noteId.slice('decision-'.length)}`;
        else if (noteId?.startsWith('step-')) {
            const stepNames = ['Persiapan', 'Pengambilan Data', 'Analisis', 'Hasil', 'Laporan'];
            const stepIndex = Number(noteId.slice('step-'.length)) - 1;
            label.textContent = `Catatan alur ${stepIndex + 1} · ${stepNames[stepIndex] || ''}`;
        } else label.textContent = 'Catatan presenter';
    }
    textarea.value = presenterNotes[key] || '';
    textarea.oninput = () => {
        presenterNotes[key] = textarea.value;
        savePresenterNotes();
    };
}

function setupShellEvents() {
    document.getElementById('btn-prev')?.addEventListener('click', goPrev);
    document.getElementById('btn-next')?.addEventListener('click', goNext);
    document.getElementById('btn-toggle-notes')?.addEventListener('click', toggleShellNotes);
    document.getElementById('btn-close-notes')?.addEventListener('click', () => {
        shellNotesOpen = false;
        document.getElementById('shell-note-panel')?.classList.remove('open');
        document.getElementById('btn-toggle-notes')?.classList.remove('active');
    });
    document.getElementById('page-container')?.addEventListener('click', (event) => {
        const row = event.target.closest('.decision-row[data-decision-index]');
        if (row && currentPageId === 'decisions') showDecisionDetail(Number(row.dataset.decisionIndex));

        const step = event.target.closest('.flow-step[data-overview-note]');
        if (step && currentPageId === 'overview') {
            document.querySelectorAll('.flow-step').forEach(node => node.classList.toggle('selected', node === step));
            updateShellNotes('overview', step.dataset.overviewNote);
            openShellNotes();
        }
    });
    document.getElementById('page-container')?.addEventListener('keydown', (event) => {
        const row = event.target.closest('.decision-row[data-decision-index]');
        if (row && currentPageId === 'decisions' && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            showDecisionDetail(Number(row.dataset.decisionIndex));
        }
        const step = event.target.closest('.flow-step[data-overview-note]');
        if (step && currentPageId === 'overview' && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            step.click();
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName?.toLowerCase() === 'textarea') return;
        if (e.key === 'ArrowRight' || e.key === ' ') {
            e.preventDefault();
            goNext();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            goPrev();
        }
    });
}
window.addEventListener('DOMContentLoaded', initApp);
