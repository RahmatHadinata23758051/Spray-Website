// Interactive System Map Page Component
// Reused from presentation/spraybot-system-map/

let mapConnections = []; 
let activeBranch = null; 
let selectedNodeData = null;
let mapAnimFrameId = null;
let mapResizeObserver = null;
let mapPanelOpen = false;
let mapZoomLevel = 1;
const MAP_ZOOM_STEP = 0.1;
const MAP_ZOOM_MIN = 0.7;
const MAP_ZOOM_MAX = 1;

function renderSystemMapPage(container) {
    container.innerHTML = `
        <div class="system-map-page">
            <div class="system-map-toolbar">
                <div class="toolbar-left">
                    <span class="map-subtitle">Klik cabang untuk melihat detail.</span>
                </div>
                <div class="toolbar-actions">
                    <div class="map-zoom-controls" role="group" aria-label="Zoom peta alur">
                        <button class="btn-sub map-zoom-button" id="btn-map-zoom-out" type="button" aria-label="Perkecil peta" title="Perkecil peta">−</button>
                        <span class="map-zoom-readout" id="map-zoom-level" aria-live="polite">100%</span>
                        <button class="btn-sub map-zoom-button" id="btn-map-zoom-in" type="button" aria-label="Perbesar peta" title="Perbesar peta">+</button>
                    </div>
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
    mapPanelOpen = false;
    mapZoomLevel = 1;
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

    // Number branches continuously from left to right
    mapData.childrenLeft.forEach((data, index) => colLeft.appendChild(createMapBranch(data, 'left', index)));
    mapData.childrenRight.forEach((data, index) => {
        const sequenceIndex = mapData.childrenLeft.length + index;
        colRight.appendChild(createMapBranch(data, 'right', sequenceIndex));
    });
}

function createMapNode(data, type, sequenceNumber = null) {
    const el = document.createElement('div');
    el.className = `node ${type}-node`;
    el.id = `node-${data.id}`;
    el.innerHTML = data.label.replace('\n', '<br>');

    if (sequenceNumber) {
        const number = document.createElement('span');
        number.className = 'node-number';
        number.textContent = sequenceNumber;
        number.setAttribute('aria-hidden', 'true');
        el.prepend(number);
    }
    
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
            openMapNodePanel(data);
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

function createMapBranch(data, side, sequenceIndex) {
    const wrapper = document.createElement('div');
    wrapper.className = 'branch-wrapper';
    wrapper.id = `branch-${data.id}`;

    const branchNumber = String(sequenceIndex + 1).padStart(2, '0');
    const mainNode = createMapNode(data, 'main', branchNumber);
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

        data.children.forEach((child, index) => {
            const childNumber = `${branchNumber}.${String(index + 1).padStart(2, '0')}`;
            const childNode = createMapNode(child, 'leaf', childNumber);
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
    const worldRect = mapWorld.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const scaleX = worldRect.width / mapWorld.offsetWidth || 1;
    const scaleY = worldRect.height / mapWorld.offsetHeight || 1;
    return {
        y: (rect.top - worldRect.top + rect.height / 2) / scaleY,
        left: (rect.left - worldRect.left) / scaleX,
        right: (rect.right - worldRect.left) / scaleX
    };
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
        if (!fromEl || !toEl) {
            conn.pathEl.style.opacity = '0';
            return;
        }

        const isChildConnector = Boolean(conn.parentBranchId);
        const children = isChildConnector ? document.getElementById(`children-${conn.parentBranchId}`) : null;
        if (isChildConnector && (!children?.classList.contains('expanded') || toEl.offsetHeight === 0)) {
            conn.pathEl.style.opacity = '0';
            return;
        }
        conn.pathEl.style.opacity = '1';

        const from = getMapLocalCenter(fromEl, mapWorld);
        const to = getMapLocalCenter(toEl, mapWorld);
        let startX;
        let endX;
        let direction;

        if (isChildConnector) {
            // Child nodes sit outside their parent node on each respective side.
            startX = conn.side === 'left' ? from.left : from.right;
            endX = conn.side === 'left' ? to.right : to.left;
            direction = conn.side === 'left' ? -1 : 1;
        } else {
            // Root connectors always flow outward from the central root.
            startX = conn.side === 'left' ? to.right : from.right;
            endX = conn.side === 'left' ? from.left : to.left;
            direction = 1;
        }

        const startY = isChildConnector ? from.y : (conn.side === 'left' ? to.y : from.y);
        const endY = isChildConnector ? to.y : (conn.side === 'left' ? from.y : to.y);
        const distance = Math.abs(endX - startX);
        const controlDistance = Math.min(Math.max(distance * 0.42, 24), 96);
        const control1X = startX + direction * controlDistance;
        const control2X = endX - direction * controlDistance;

        conn.pathEl.setAttribute('d', `M ${startX} ${startY} C ${control1X} ${startY}, ${control2X} ${endY}, ${endX} ${endY}`);
    });
}

function fitMapToView() {
    const container = document.getElementById('canvas-container');
    const mapWorld = document.getElementById('map-world');
    if (!container || !mapWorld) return;

    const hasOpenPanel = document.getElementById('map-node-panel')?.classList.contains('open') ?? false;
    const hasExpandedBranch = [...mapData.childrenLeft, ...mapData.childrenRight].some(branch =>
        document.getElementById(`children-${branch.id}`)?.classList.contains('expanded')
    );
    document.querySelector('.system-map-workspace')?.classList.toggle('has-open-map-panel', hasOpenPanel);
    container.classList.toggle('has-expanded-map', hasExpandedBranch);

    const horizontalPadding = hasExpandedBranch ? 56 : 64;
    const verticalPadding = hasExpandedBranch ? 48 : 64;
    const availableW = Math.max(1, container.clientWidth - horizontalPadding);
    const availableH = Math.max(1, container.clientHeight - verticalPadding);
    const mapWidth = mapWorld.offsetWidth;
    const mapHeight = mapWorld.offsetHeight;
    if (!mapWidth || !mapHeight) return;

    const fitScale = hasExpandedBranch
        ? Math.min(1, availableW / mapWidth)
        : Math.min(1, availableW / mapWidth, availableH / mapHeight);
    const scale = fitScale * mapZoomLevel;
    const scaledWidth = mapWidth * scale;
    const canCenterHorizontally = scaledWidth < availableW;
    mapWorld.style.transform = `scale(${scale})`;
    mapWorld.style.transformOrigin = canCenterHorizontally ? 'center top' : 'left top';

    document.getElementById('btn-map-zoom-out')?.toggleAttribute('disabled', mapZoomLevel <= MAP_ZOOM_MIN);
    document.getElementById('btn-map-zoom-in')?.toggleAttribute('disabled', mapZoomLevel >= MAP_ZOOM_MAX);
    const readout = document.getElementById('map-zoom-level');
    if (readout) readout.textContent = `${Math.round(mapZoomLevel * 100)}%`;
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

    const btnZoomOut = document.getElementById('btn-map-zoom-out');
    if (btnZoomOut) btnZoomOut.onclick = () => {
        mapZoomLevel = Math.max(MAP_ZOOM_MIN, Math.round((mapZoomLevel - MAP_ZOOM_STEP) * 100) / 100);
        triggerMapLayoutRecalc();
    };

    const btnZoomIn = document.getElementById('btn-map-zoom-in');
    if (btnZoomIn) btnZoomIn.onclick = () => {
        mapZoomLevel = Math.min(MAP_ZOOM_MAX, Math.round((mapZoomLevel + MAP_ZOOM_STEP) * 100) / 100);
        triggerMapLayoutRecalc();
    };
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
            requestAnimationFrame(() => {
                const canvas = document.getElementById('canvas-container');
                if (canvas) canvas.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            });
        };
    }
}
