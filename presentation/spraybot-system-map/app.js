let connections = []; 
let activeBranch = null; 
let presentationMode = false;
let currentStep = 0;
let panelOpen = false;
let selectedNodeData = null;
let animFrameId = null;
let transitionEndTime = 0;

function init() {
    enrichData(mapData, 'root');
    renderMap();
    setupEvents();
    
    // Initial layout
    setTimeout(() => {
        triggerLayoutRecalc();
    }, 100);

    const resizeObserver = new ResizeObserver(() => triggerLayoutRecalc());
    resizeObserver.observe(document.getElementById('canvas-container'));
}

function enrichData(node, rootBranchId) {
    node.rootBranchId = rootBranchId;
    if (node.children) node.children.forEach(c => enrichData(c, rootBranchId));
    if (node.childrenLeft) node.childrenLeft.forEach(c => enrichData(c, c.id));
    if (node.childrenRight) node.childrenRight.forEach(c => enrichData(c, c.id));
}

function renderMap() {
    const colLeft = document.getElementById('col-left');
    const colCenter = document.getElementById('col-center');
    const colRight = document.getElementById('col-right');

    // Root
    const rootNode = createNode(mapData, 'root');
    colCenter.appendChild(rootNode);

    // Left
    mapData.childrenLeft.forEach(data => colLeft.appendChild(createBranch(data, 'left')));
    
    // Right
    mapData.childrenRight.forEach(data => colRight.appendChild(createBranch(data, 'right')));
}

function createNode(data, type) {
    const el = document.createElement('div');
    el.className = `node ${type}-node`;
    el.id = `node-${data.id}`;
    el.innerHTML = data.label.replace('\n', '<br>');
    
    // "Catatan" action inside main/root node
    if (type === 'root' || type === 'main') {
        const btn = document.createElement('button');
        btn.className = 'btn-catatan';
        btn.textContent = 'Catatan';
        btn.onclick = (e) => {
            e.stopPropagation();
            openNotePanel(data);
        };
        el.appendChild(btn);
    }

    el.onclick = () => {
        if (type === 'main') {
            toggleBranch(data.id);
            // Optionally auto-select it for notes if panel is open
            if (panelOpen) openNotePanel(data);
        } else if (type === 'root') {
            activeBranch = null;
            [...mapData.childrenLeft, ...mapData.childrenRight].forEach(m => setBranchExpanded(m.id, false));
            updateVisualFocus();
            triggerLayoutRecalc();
            if (panelOpen) openNotePanel(data);
        } else if (type === 'leaf') {
            openNotePanel(data);
        }
    };
    return el;
}

function createBranch(data, side) {
    const wrapper = document.createElement('div');
    wrapper.className = 'branch-wrapper';
    wrapper.id = `branch-${data.id}`;

    const mainNode = createNode(data, 'main');
    wrapper.appendChild(mainNode);

    const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathEl.setAttribute('class', 'connector main-connector');
    pathEl.id = `path-root-${data.id}`;
    document.getElementById('svg-layer').appendChild(pathEl);
    connections.push({ from: 'node-root', to: `node-${data.id}`, pathEl, side });

    if (data.children && data.children.length > 0) {
        const childContainer = document.createElement('div');
        childContainer.className = 'children-container';
        childContainer.id = `children-${data.id}`;

        const inner = document.createElement('div');
        inner.className = 'children-inner';

        data.children.forEach(child => {
            const childNode = createNode(child, 'leaf');
            inner.appendChild(childNode);

            const cPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            cPath.setAttribute('class', `connector child-connector branch-${data.id}`);
            cPath.id = `path-${data.id}-${child.id}`;
            document.getElementById('svg-layer').appendChild(cPath);
            connections.push({ from: `node-${data.id}`, to: `node-${child.id}`, pathEl: cPath, side, parentBranchId: data.id });
        });

        childContainer.appendChild(inner);
        wrapper.appendChild(childContainer);
    }

    return wrapper;
}

function toggleBranch(branchId) {
    if (presentationMode) return; // Prevent manual branch toggling during presentation steps
    
    if (activeBranch === branchId) {
        setBranchExpanded(branchId, false);
        activeBranch = null;
    } else {
        if (activeBranch) setBranchExpanded(activeBranch, false);
        setBranchExpanded(branchId, true);
        activeBranch = branchId;
    }
    
    updateVisualFocus();
    triggerLayoutRecalc();
}

function setBranchExpanded(branchId, isExpanded) {
    const container = document.getElementById(`children-${branchId}`);
    if (container) {
        if (isExpanded) container.classList.add('expanded');
        else container.classList.remove('expanded');
    }
}

function updateVisualFocus() {
    const allMain = [...mapData.childrenLeft, ...mapData.childrenRight];
    
    allMain.forEach(b => {
        const wrapper = document.getElementById(`branch-${b.id}`);
        const pathRoot = document.getElementById(`path-root-${b.id}`);
        const node = document.getElementById(`node-${b.id}`);
        if (!wrapper) return;
        
        let shouldDim = false;
        let shouldActivate = false;

        if (presentationMode) {
            const focusedId = presentationSteps[currentStep].focus[0];
            if (focusedId === 'root') {
                shouldDim = false;
            } else if (focusedId === b.id) {
                shouldDim = false;
                shouldActivate = true;
            } else {
                shouldDim = true;
            }
        } else {
            if (activeBranch) {
                if (b.id === activeBranch) {
                    shouldActivate = true;
                } else {
                    shouldDim = true;
                }
            }
        }

        if (shouldDim) {
            wrapper.classList.add('dimmed');
            pathRoot.classList.add('dimmed');
            node.classList.remove('active');
        } else {
            wrapper.classList.remove('dimmed');
            pathRoot.classList.remove('dimmed');
            if (shouldActivate) node.classList.add('active');
            else node.classList.remove('active');
        }

        // Active path logic for children inside the branch
        if (b.children) {
            b.children.forEach(c => {
                const cPath = document.getElementById(`path-${b.id}-${c.id}`);
                const cNode = document.getElementById(`node-${c.id}`);
                if(cPath) {
                    if (shouldDim) cPath.classList.add('dimmed');
                    else cPath.classList.remove('dimmed');
                    
                    if (shouldActivate && selectedNodeData && selectedNodeData.id === c.id) {
                        cPath.classList.add('active');
                        cNode.classList.add('active');
                    } else {
                        cPath.classList.remove('active');
                        if(cNode) cNode.classList.remove('active');
                    }
                }
            });
        }
    });

    // Root active
    const rootNode = document.getElementById('node-root');
    if (selectedNodeData && selectedNodeData.id === 'root') rootNode.classList.add('active');
    else rootNode.classList.remove('active');
}

function getLocalCenter(el, mapWorld) {
    let top = 0, left = 0;
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    let curr = el;
    while (curr && curr !== mapWorld) {
        top += curr.offsetTop;
        left += curr.offsetLeft;
        curr = curr.offsetParent;
    }
    return { y: top + height / 2, left, right: left + width };
}

function updateConnectors() {
    const mapWorld = document.getElementById('map-world');
    const svgLayer = document.getElementById('svg-layer');
    svgLayer.setAttribute('width', mapWorld.offsetWidth);
    svgLayer.setAttribute('height', mapWorld.offsetHeight);

    connections.forEach(conn => {
        const fromEl = document.getElementById(conn.from);
        const toEl = document.getElementById(conn.to);
        
        if (!fromEl || !toEl || toEl.offsetHeight === 0) {
            conn.pathEl.style.opacity = '0';
            return;
        }
        conn.pathEl.style.opacity = '1';

        const fLoc = getLocalCenter(fromEl, mapWorld);
        const tLoc = getLocalCenter(toEl, mapWorld);

        const fY = fLoc.y;
        const tY = tLoc.y;
        let fX, tX;
        
        if (conn.side === 'left') {
            fX = fLoc.left - 2; 
            tX = tLoc.right + 2;
        } else {
            fX = fLoc.right + 2;
            tX = tLoc.left - 2;
        }

        const cpDist = Math.max(Math.abs(tX - fX) * 0.45, 25);
        const cp1X = conn.side === 'left' ? fX - cpDist : fX + cpDist;
        const cp2X = conn.side === 'left' ? tX + cpDist : tX - cpDist;

        conn.pathEl.setAttribute('d', `M ${fX} ${fY} C ${cp1X} ${fY}, ${cp2X} ${tY}, ${tX} ${tY}`);
    });
}

function fitToView() {
    const container = document.getElementById('canvas-container');
    const mapWorld = document.getElementById('map-world');
    
    const availableW = container.offsetWidth - 128; // 64px safe margin
    const availableH = container.offsetHeight - 96; // 48px safe margin

    const mW = mapWorld.offsetWidth;
    const mH = mapWorld.offsetHeight;

    if (mW === 0 || mH === 0) return;

    let scale = Math.min(availableW / mW, availableH / mH);
    scale = Math.max(0.7, Math.min(1.05, scale)); 

    mapWorld.style.transform = `scale(${scale})`;
}

function triggerLayoutRecalc() {
    transitionEndTime = performance.now() + 450;
    if (!animFrameId) {
        const loop = () => {
            updateConnectors();
            fitToView();
            if (performance.now() < transitionEndTime) {
                animFrameId = requestAnimationFrame(loop);
            } else {
                animFrameId = null;
                updateConnectors();
                fitToView();
            }
        };
        loop();
    }
}

// ----------------------------------------------------
// NOTE PANEL
// ----------------------------------------------------
function openNotePanel(data) {
    selectedNodeData = data;
    document.getElementById('panel-title').textContent = data.noteTitle || data.label.replace('\n', ' ');
    
    const summary = document.getElementById('panel-summary');
    if (data.noteSummary) {
        summary.style.display = 'block';
        summary.textContent = data.noteSummary;
    } else {
        summary.style.display = 'none';
    }
    
    const ul = document.getElementById('panel-bullets');
    ul.innerHTML = '';
    if (data.noteBullets && data.noteBullets.length > 0) {
        data.noteBullets.forEach(b => {
            const li = document.createElement('li');
            li.textContent = b;
            ul.appendChild(li);
        });
    }

    const textarea = document.getElementById('note-textarea');
    textarea.value = localStorage.getItem(`spraybot_note_${data.id}`) || '';
    textarea.oninput = (e) => localStorage.setItem(`spraybot_note_${data.id}`, e.target.value);

    if (!panelOpen) {
        panelOpen = true;
        document.getElementById('note-panel').classList.add('open');
    }
    
    updateVisualFocus();
    triggerLayoutRecalc();
}

function closeNotePanel() {
    if (panelOpen) {
        panelOpen = false;
        document.getElementById('note-panel').classList.remove('open');
        selectedNodeData = null;
        updateVisualFocus();
        triggerLayoutRecalc();
    }
}

function toggleNotesGlobal() {
    if (panelOpen) {
        closeNotePanel();
    } else {
        // Open with root if nothing selected
        if (!selectedNodeData) selectedNodeData = mapData;
        openNotePanel(selectedNodeData);
    }
}

// ----------------------------------------------------
// PRESENTATION
// ----------------------------------------------------
function startPresentation() {
    presentationMode = true;
    currentStep = 0;
    document.getElementById('top-bar').style.display = 'none';
    document.getElementById('presentation-bar').classList.add('active');
    
    // Close panel by default when starting presentation
    closeNotePanel();
    applyPresentationStep();
}

function endPresentation() {
    presentationMode = false;
    document.getElementById('top-bar').style.display = 'flex';
    document.getElementById('presentation-bar').classList.remove('active');
    
    activeBranch = null;
    [...mapData.childrenLeft, ...mapData.childrenRight].forEach(m => setBranchExpanded(m.id, false));
    
    updateVisualFocus();
    triggerLayoutRecalc();
}

function applyPresentationStep() {
    const step = presentationSteps[currentStep];
    const targetId = step.focus[0];
    
    document.getElementById('pres-title').textContent = step.title;
    document.getElementById('pres-step').textContent = `${currentStep + 1} / ${presentationSteps.length}`;
    document.getElementById('btn-pres-prev').disabled = currentStep === 0;
    document.getElementById('btn-pres-next').disabled = currentStep === presentationSteps.length - 1;

    if (targetId === 'root') {
        activeBranch = null;
        [...mapData.childrenLeft, ...mapData.childrenRight].forEach(m => setBranchExpanded(m.id, false));
    } else {
        activeBranch = targetId;
        [...mapData.childrenLeft, ...mapData.childrenRight].forEach(m => {
            setBranchExpanded(m.id, m.id === targetId);
        });
    }

    updateVisualFocus();
    triggerLayoutRecalc();
}

// ----------------------------------------------------
// EVENTS
// ----------------------------------------------------
function setupEvents() {
    document.getElementById('btn-close-panel').onclick = closeNotePanel;
    document.getElementById('btn-toggle-notes').onclick = toggleNotesGlobal;
    
    document.getElementById('btn-reset').onclick = () => {
        if(presentationMode) return;
        activeBranch = null;
        [...mapData.childrenLeft, ...mapData.childrenRight].forEach(m => setBranchExpanded(m.id, false));
        closeNotePanel();
    };

    document.getElementById('btn-expand-all').onclick = () => {
        if(presentationMode) return;
        activeBranch = null; // No single active branch if all expanded
        [...mapData.childrenLeft, ...mapData.childrenRight].forEach(m => setBranchExpanded(m.id, true));
        updateVisualFocus();
        triggerLayoutRecalc();
    };

    document.getElementById('btn-present').onclick = startPresentation;
    document.getElementById('btn-pres-close').onclick = endPresentation;

    document.getElementById('btn-pres-prev').onclick = () => {
        if (currentStep > 0) { currentStep--; applyPresentationStep(); }
    };
    document.getElementById('btn-pres-next').onclick = () => {
        if (currentStep < presentationSteps.length - 1) { currentStep++; applyPresentationStep(); }
    };

    window.addEventListener('keydown', (e) => {
        if (!presentationMode) return;
        if (e.key === 'ArrowRight' || e.key === ' ') {
            e.preventDefault();
            if (currentStep < presentationSteps.length - 1) { currentStep++; applyPresentationStep(); }
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (currentStep > 0) { currentStep--; applyPresentationStep(); }
        }
        if (e.key === 'Escape') {
            endPresentation();
        }
    });
}

window.onload = init;