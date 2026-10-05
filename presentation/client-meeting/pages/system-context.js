// System Context Page Component
function renderSystemContextPage(container) {
    container.innerHTML = `
        <div class="context-content">
            <div class="page-header">
                <h2>Konteks Sistem</h2>
                <p>Hubungan Spraybot dengan pengguna, perangkat pengujian, dan sistem di luar batasnya</p>
            </div>

            <div class="context-diagram">
                <svg class="context-connectors" aria-hidden="true">
                    <defs>
                        <marker id="context-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                            <path d="M0,0 L8,4 L0,8 Z" fill="#94A3B8"></path>
                        </marker>
                        <marker id="context-arrow-blue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                            <path d="M0,0 L8,4 L0,8 Z" fill="#1D8FFF"></path>
                        </marker>
                    </defs>
                    <path class="context-line" data-connection="operator"></path>
                    <path class="context-line" data-connection="side-camera"></path>
                    <path class="context-line" data-connection="front-camera"></path>
                    <path class="context-line" data-connection="actuator"></path>
                    <path class="context-line context-line-dashed" data-connection="paragon"></path>
                </svg>

                <div class="context-entity entity-operator" id="context-operator">
                    <div class="context-entity-kind">Pengguna</div>
                    <h3>Operator</h3>
                    <p>Menjalankan dan meninjau pengujian</p>
                </div>

                <div class="context-entity entity-side-camera" id="context-side-camera">
                    <div class="context-entity-kind">Perangkat Pengujian</div>
                    <h3>Kamera Samping</h3>
                    <p>Mengirim gambar profil spray</p>
                </div>

                <div class="context-entity entity-front-camera" id="context-front-camera">
                    <div class="context-entity-kind">Perangkat Pengujian</div>
                    <h3>Kamera Depan</h3>
                    <p>Mengirim gambar pola spray</p>
                </div>

                <section class="context-system" id="context-system">
                    <div class="context-system-label">SISTEM UTAMA</div>
                    <h3>SPRAYBOT</h3>
                    <p>Sistem Pengujian dan Analisis Spray</p>
                    <div class="context-responsibilities">
                        <div>Persiapan Pengujian</div>
                        <div>Pengambilan Data</div>
                        <div>Analisis &amp; Review</div>
                        <div>Hasil &amp; Laporan</div>
                    </div>
                </section>

                <div class="context-entity entity-actuator" id="context-actuator">
                    <div class="context-entity-kind">Perangkat Pengujian</div>
                    <h3>Mesin Uji / Aktuator</h3>
                    <p>Menjalankan parameter pengujian</p>
                </div>

                <div class="context-entity entity-paragon" id="context-paragon">
                    <div class="context-entity-kind">Sistem Eksternal</div>
                    <h3>Sistem Paragon</h3>
                    <span class="context-status">Perlu dikonfirmasi</span>
                    <p>Pertukaran data pengujian</p>
                </div>

                <div class="context-connection-label label-operator">Menjalankan &amp; meninjau</div>
                <div class="context-connection-label label-side-camera">Mengirim gambar</div>
                <div class="context-connection-label label-front-camera">Mengirim gambar</div>
                <div class="context-connection-label label-actuator">Parameter pengujian</div>
                <div class="context-connection-label label-paragon">Pertukaran data · perlu dikonfirmasi</div>
            </div>
        </div>
    `;

    requestAnimationFrame(() => updateContextConnectors());
    window.addEventListener('resize', updateContextConnectors);
}

function updateContextConnectors() {
    const diagram = document.querySelector('.context-diagram');
    const system = document.getElementById('context-system');
    if (!diagram || !system) return;

    const diagramRect = diagram.getBoundingClientRect();
    const systemRect = system.getBoundingClientRect();
    const svg = diagram.querySelector('.context-connectors');
    if (!svg) return;

    svg.setAttribute('viewBox', `0 0 ${diagram.clientWidth} ${diagram.clientHeight}`);
    svg.setAttribute('width', diagram.clientWidth);
    svg.setAttribute('height', diagram.clientHeight);

    const center = (element, side) => {
        const rect = element.getBoundingClientRect();
        const y = rect.top - diagramRect.top + rect.height / 2;
        if (side === 'right') return { x: rect.right - diagramRect.left, y };
        if (side === 'left') return { x: rect.left - diagramRect.left, y };
        return { x: rect.left - diagramRect.left + rect.width / 2, y };
    };

    const systemLeft = systemRect.left - diagramRect.left;
    const systemRight = systemRect.right - diagramRect.left;
    const systemTop = systemRect.top - diagramRect.top;
    const systemBottom = systemRect.bottom - diagramRect.top;
    const systemMidY = systemTop + systemRect.height / 2;

    const configs = {
        operator: {
            from: center(document.getElementById('context-operator'), 'right'),
            to: { x: systemLeft, y: systemTop + systemRect.height * 0.28 },
            marker: 'context-arrow'
        },
        'side-camera': {
            from: center(document.getElementById('context-side-camera'), 'right'),
            to: { x: systemLeft, y: systemTop + systemRect.height * 0.46 },
            marker: 'context-arrow'
        },
        'front-camera': {
            from: center(document.getElementById('context-front-camera'), 'right'),
            to: { x: systemLeft, y: systemTop + systemRect.height * 0.64 },
            marker: 'context-arrow'
        },
        actuator: {
            from: { x: systemRight, y: systemMidY },
            to: center(document.getElementById('context-actuator'), 'left'),
            marker: 'context-arrow-blue'
        },
        paragon: {
            from: { x: systemRight, y: systemBottom - systemRect.height * 0.2 },
            to: center(document.getElementById('context-paragon'), 'left'),
            marker: 'context-arrow'
        }
    };

    Object.entries(configs).forEach(([name, config]) => {
        const path = diagram.querySelector(`[data-connection="${name}"]`);
        const label = diagram.querySelector(`.label-${name}`);
        if (!path) return;
        const distance = Math.abs(config.to.x - config.from.x);
        const control = Math.max(30, distance * 0.42);
        path.setAttribute('d', `M ${config.from.x} ${config.from.y} C ${config.from.x + control} ${config.from.y}, ${config.to.x - control} ${config.to.y}, ${config.to.x} ${config.to.y}`);
        path.setAttribute('marker-end', `url(#${config.marker})`);

        if (label) {
            const laneWidth = Math.abs(config.to.x - config.from.x);
            const preferredWidth = name === 'paragon' ? 202 : name === 'operator' ? 144 : name === 'actuator' ? 126 : 110;
            const labelWidth = Math.max(84, Math.min(preferredWidth, laneWidth - 24));
            label.style.width = `${labelWidth}px`;
            label.style.maxWidth = `${labelWidth}px`;
            label.style.whiteSpace = 'normal';
            label.style.textAlign = 'center';
            const measuredWidth = label.offsetWidth;
            const labelHeight = label.offsetHeight;
            const midpointX = (config.from.x + config.to.x) / 2;
            const midpointY = (config.from.y + config.to.y) / 2;
            const labelLeft = midpointX - measuredWidth / 2;
            const labelTop = midpointY - labelHeight / 2;
            label.style.left = `${Math.max(4, Math.min(diagram.clientWidth - measuredWidth - 4, labelLeft))}px`;
            label.style.top = `${Math.max(4, Math.min(diagram.clientHeight - labelHeight - 4, labelTop))}px`;
            label.style.right = 'auto';
        }
    });
}
