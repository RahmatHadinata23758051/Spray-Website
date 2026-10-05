// Interactive System Map Page Component
// Reused from presentation/spraybot-system-map/

let mapConnections = []; 
let activeBranch = null; 
let selectedNodeData = null;
let mapAnimFrameId = null;
let mapTransitionEndTime = 0;
let mapResizeObserver = null;
let mapPanelOpen = false;

function renderSystemMapPage(container) {
    container.innerHTML = `
        <div class="system-map-page">
            <div class="system-map-toolbar">
                <div class="toolbar-left">
                    <span class="map-subtitle">Klik cabang untuk melihat detail.</span>
                </div>
                <div class="toolbar-actions">
                    <button class="btn-sub" id="btn-map-reset">Tutup Semua Cabang</button>
                    <button class="btn-sub" id="btn-map-expand-all">Buka Semua Cabang</button>
                </div>
            </div>

            <div class="system-map-workspace">
                <div id="canvas-container">
                    <div id="map-world">
                        <svg id="svg-layer"></svg>
                        <div class="col left" id="col-left"></div>
                        <div class="col center" id="col-center"></div>
                        <div class="col right" id="col-right"></div>
                    </div>
                </div>

                <!-- Slide-out Node Detail Panel -->
                <aside id="map-node-panel" class="map-node-panel">
                    <div class="panel-header">
                        <h3 id="map-panel-title">Detail Alur</h3>
                        <button class="btn-close" id="btn-close-map-panel" title="Tutup">✕</button>
                    </div>
                    <div class="panel-body">
                        <p class="note-summary" id="map-panel-summary"></p>
                        <ul class="note-bullets" id="map-panel-bullets"></ul>
                        
                        <div class="note-input-section">
                            <label>Catatan Topik Ini</label>
                            <textarea id="map-node-textarea" placeholder="Tulis catatan penting terkait topik ini..."></textarea>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    `;

    initSystemMap();
}

function initSystemMap() {
    mapConnections = [];
    activeBranch = null;
    selectedNodeData = null;

    if (typeof mapData !== 'undefined') {
        enrichMapData(mapData, 'root');
        renderMapNodes();
        setupMapEvents();

        setTimeout(() => {
            triggerMapLayoutRecalc();
        }, 80);

        const canvas = document.getElementById('canvas-container');
        if (canvas) {
            if (mapResizeObserver) mapResizeObserver.disconnect();
            mapResizeObserver = new ResizeObserver(() => triggerMapLayoutRecalc());
            mapResizeObserver.observe(canvas);
        }
    }
}

function enrichMapData(node, rootBranchId) {
    node.rootBranchId = rootBranchId;
    if (node.children) node.children.forEach(c => enrichMapData(c, rootBranchId));
    if (node.childrenLeft) node.childrenLeft.forEach(c => enrichMapData(c, c.id));
    if (node.childrenRight) node.childrenRight.forEach(c => enrichMapData(c, c.id));
}

function renderMapNodes() {
    const colLeft = document.getElementById('col-left');
    const colCenter = document.getElementById('col-center');
    const colRight = document.getElementById('col-right');

    if (!colLeft || !colCenter || !colRight) return;

    colLeft.innerHTML = '';
    colCenter.innerHTML = '';
    colRight.innerHTML = '';

    const svgLayer = document.getElementById('svg-layer');
    if (svgLayer) svgLayer.innerHTML = '';

    // Root
    const rootNode = createMapNode(mapData, 'root');
    colCenter.appendChild(rootNode);

    // Left
    mapData.childrenLeft.forEach(data => colLeft.appendChild(createMapBranch(data, 'left')));
    
    // Right
    mapData.childrenRight.forEach(data => colRight.appendChild(createMapBranch(data, 'right')));
}

function createMapNode(data, type) {
    const el = document.createElement('div');
    el.className = `node ${type}-node`;
    el.id = `node-${data.id}`;
    el.innerHTML = data.label.replace('\n', '<br>');
    
    // Catatan button inside main/root node
    if (type === 'root' || type === 'main') {
        const btn = document.createElement('button');
        btn.className = 'btn-catatan';
        btn.textContent = 'Detail';
        btn.onclick = (e) => {
            e.stopPropagation();
            openMapNodePanel(data);
        };
        el.appendChild(btn);
    }

    el.onclick = () => {
        if (type === 'main') {
            toggleMapBranch(data.id);
            if (mapPanelOpen) openMapNodePanel(data);
        } else if (type === 'root') {
            activeBranch = null;
            [...mapData.childrenLeft, ...mapData.childrenRight].forEach(m => setMapBranchExpanded(m.id, false));
            updateMapVisualFocus();
            triggerMapLayoutRecalc();
            if (mapPanelOpen) openMapNodePanel(data);
        } else if (type === 'leaf') {
            openMapNodePanel(data);
        }
    };
    return el;
}

function createMapBranch(data, side) {
    const wrapper = document.createElement('div');
    wrapper.className = 'branch-wrapper';
    wrapper.id = `branch-${data.id}`;

    const mainNode = createMapNode(data, 'main');
    wrapper.appendChild(mainNode);

    const svgLayer = document.getElementById('svg-layer');
    const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathEl.setAttribute('class', 'connector main-connector');
    pathEl.id = `path-root-${data.id}`;
    if (svgLayer) svgLayer.appendChild(pathEl);
    mapConnections.push({ from: 'node-root', to: `node-${data.id}`, pathEl, side });

    if (data.children && data.children.length > 0) {
        const childContainer = document.createElement('div');
        childContainer.className = 'children-container';
        childContainer.id = `children-${data.id}`;

        const inner = document.createElement('div');
        inner.className = 'children-inner';

        data.children.forEach(child => {
            const childNode = createMapNode(child, 'leaf');
            inner.appendChild(childNode);

            const cPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            cPath.setAttribute('class', `connector child-connector branch-${data.id}`);
            cPath.id = `path-${data.id}-${child.id}`;
            if (svgLayer) svgLayer.appendChild(cPath);
            mapConnections.push({ from: `node-${data.id}`, to: `node-${child.id}`, pathEl: cPath, side, parentBranchId: data.id });
        });

        childContainer.appendChild(inner);
        wrapper.appendChild(childContainer);
    }

    return wrapper;
}

function toggleMapBranch(branchId) {
    if (activeBranch === branchId) {
        setMapBranchExpanded(branchId, false);
        activeBranch = null;
    } else {
        if (activeBranch) setMapBranchExpanded(activeBranch, false);
        setMapBranchExpanded(branchId, true);
        activeBranch = branchId;
    }
    
    updateMapVisualFocus();
    triggerMapLayoutRecalc();
}

function setMapBranchExpanded(branchId, isExpanded) {
    const container = document.getElementById(`children-${branchId}`);
    if (container) {
        if (isExpanded) container.classList.add('expanded');
        else container.classList.remove('expanded');
    }
}

function updateMapVisualFocus() {
    const allMain = [...mapData.childrenLeft, ...mapData.childrenRight];
    
    allMain.forEach(b => {
        const wrapper = document.getElementById(`branch-${b.id}`);
        const pathRoot = document.getElementById(`path-root-${b.id}`);
        const node = document.getElementById(`node-${b.id}`);
        if (!wrapper) return;
        
        let shouldDim = false;
        let shouldActivate = false;

        if (activeBranch) {
            if (b.id === activeBranch) {
                shouldActivate = true;
            } else {
                shouldDim = true;
            }
        }

        if (shouldDim) {
            wrapper.classList.add('dimmed');
            if (pathRoot) pathRoot.classList.add('dimmed');
            if (node) node.classList.remove('active');
        } else {
            wrapper.classList.remove('dimmed');
            if (pathRoot) pathRoot.classList.remove('dimmed');
            if (shouldActivate) {
                if (node) node.classList.add('active');
            } else {
                if (node) node.classList.remove('active');
            }
        }

        if (b.children) {
            b.children.forEach(c => {
                const cPath = document.getElementById(`path-${b.id}-${c.id}`);
                const cNode = document.getElementById(`node-${c.id}`);
                if (cPath) {
                    if (shouldDim) cPath.classList.add('dimmed');
                    else cPath.classList.remove('dimmed');
                    
                    if (shouldActivate && selectedNodeData && selectedNodeData.id === c.id) {
                        cPath.classList.add('active');
                        if (cNode) cNode.classList.add('active');
                    } else {
                        cPath.classList.remove('active');
                        if (cNode) cNode.classList.remove('active');
                    }
                }
            });
        }
    });

    const rootNode = document.getElementById('node-root');
    if (rootNode) {
        if (selectedNodeData && selectedNodeData.id === 'root') rootNode.classList.add('active');
        else rootNode.classList.remove('active');
    }
}

function getMapLocalCenter(el, mapWorld) {
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

function updateMapConnectors() {
    const mapWorld = document.getElementById('map-world');
    const svgLayer = document.getElementById('svg-layer');
    if (!mapWorld || !svgLayer) return;

    svgLayer.setAttribute('width', mapWorld.offsetWidth);
    svgLayer.setAttribute('height', mapWorld.offsetHeight);

    mapConnections.forEach(conn => {
        const fromEl = document.getElementById(conn.from);
        const toEl = document.getElementById(conn.to);
        
        if (!fromEl || !toEl || toEl.offsetHeight === 0) {
            conn.pathEl.style.opacity = '0';
            return;
        }
        conn.pathEl.style.opacity = '1';

        const fLoc = getMapLocalCenter(fromEl, mapWorld);
        const tLoc = getMapLocalCenter(toEl, mapWorld);

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

function fitMapToView() {
    const container = document.getElementById('canvas-container');
    const mapWorld = document.getElementById('map-world');
    if (!container || !mapWorld) return;
    
    const availableW = container.offsetWidth - 80;
    const availableH = container.offsetHeight - 60;

    const mW = mapWorld.offsetWidth;
    const mH = mapWorld.offsetHeight;

    if (mW === 0 || mH === 0) return;

    let scale = Math.min(availableW / mW, availableH / mH);
    scale = Math.max(0.65, Math.min(1.05, scale)); 

    mapWorld.style.transform = `scale(${scale})`;
}

function triggerMapLayoutRecalc() {
    mapTransitionEndTime = performance.now() + 450;
    if (!mapAnimFrameId) {
        const loop = () => {
            updateMapConnectors();
            fitMapToView();
            if (performance.now() < mapTransitionEndTime) {
                mapAnimFrameId = requestAnimationFrame(loop);
            } else {
                mapAnimFrameId = null;
                updateMapConnectors();
                fitMapToView();
            }
        };
        loop();
    }
}

function openMapNodePanel(data) {
    selectedNodeData = data;
    const titleEl = document.getElementById('map-panel-title');
    if (titleEl) titleEl.textContent = data.noteTitle || data.label.replace('\n', ' ');
    
    const summary = document.getElementById('map-panel-summary');
    if (summary) {
        if (data.noteSummary) {
            summary.style.display = 'block';
            summary.textContent = data.noteSummary;
        } else {
            summary.style.display = 'none';
        }
    }
    
    const ul = document.getElementById('map-panel-bullets');
    if (ul) {
        ul.innerHTML = '';
        if (data.noteBullets && data.noteBullets.length > 0) {
            data.noteBullets.forEach(b => {
                const li = document.createElement('li');
                li.textContent = b;
                ul.appendChild(li);
            });
        }
    }

    const textarea = document.getElementById('map-node-textarea');
    if (textarea) {
        textarea.value = localStorage.getItem(`spraybot_note_${data.id}`) || '';
        textarea.oninput = (e) => localStorage.setItem(`spraybot_note_${data.id}`, e.target.value);
    }

    const panel = document.getElementById('map-node-panel');
    if (panel && !mapPanelOpen) {
        mapPanelOpen = true;
        panel.classList.add('open');
    }
    
    updateMapVisualFocus();
    triggerMapLayoutRecalc();
}

function closeMapNodePanel() {
    const panel = document.getElementById('map-node-panel');
    if (panel && mapPanelOpen) {
        mapPanelOpen = false;
        panel.classList.remove('open');
        selectedNodeData = null;
        updateMapVisualFocus();
        triggerMapLayoutRecalc();
    }
}

function setupMapEvents() {
    const btnClose = document.getElementById('btn-close-map-panel');
    if (btnClose) btnClose.onclick = closeMapNodePanel;
    
    const btnReset = document.getElementById('btn-map-reset');
    if (btnReset) {
        btnReset.onclick = () => {
            activeBranch = null;
            [...mapData.childrenLeft, ...mapData.childrenRight].forEach(m => setMapBranchExpanded(m.id, false));
            updateMapVisualFocus();
            triggerMapLayoutRecalc();
        };
    }

    const btnExpand = document.getElementById('btn-map-expand-all');
    if (btnExpand) {
        btnExpand.onclick = () => {
            activeBranch = null;
            [...mapData.childrenLeft, ...mapData.childrenRight].forEach(m => setMapBranchExpanded(m.id, true));
            updateMapVisualFocus();
            triggerMapLayoutRecalc();
        };
    }
}
