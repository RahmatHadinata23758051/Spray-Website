// Shell Application Logic

let currentPageId = '';
let shellNotesOpen = false;

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
    shellNotesOpen = !shellNotesOpen;
    const panel = document.getElementById('shell-note-panel');
    const btn = document.getElementById('btn-toggle-notes');
    if (shellNotesOpen) {
        panel.classList.add('open');
        btn.classList.add('active');
    } else {
        panel.classList.remove('open');
        btn.classList.remove('active');
    }
}

function updateShellNotes(pageId) {
    const textarea = document.getElementById('shell-note-textarea');
    if (textarea) {
        const key = `spraybot_client_meeting_note_${pageId.replace('-', '_')}`;
        textarea.value = localStorage.getItem(key) || '';
        textarea.oninput = (e) => localStorage.setItem(key, e.target.value);
    }
}

function setupShellEvents() {
    document.getElementById('btn-prev')?.addEventListener('click', goPrev);
    document.getElementById('btn-next')?.addEventListener('click', goNext);
    document.getElementById('btn-toggle-notes')?.addEventListener('click', toggleShellNotes);
    document.getElementById('btn-close-notes')?.addEventListener('click', () => {
        shellNotesOpen = false;
        document.getElementById('shell-note-panel').classList.remove('open');
        document.getElementById('btn-toggle-notes').classList.remove('active');
    });

    document.addEventListener('keydown', (e) => {
        // Do not intercept if typing in textarea
        if (e.target.tagName.toLowerCase() === 'textarea') return;

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
