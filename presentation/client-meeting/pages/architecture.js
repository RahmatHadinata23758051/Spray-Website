// High-Level Architecture Page Component
function renderArchitecturePage(container) {
    container.innerHTML = `
        <div class="arch-content">
            <div class="page-header arch-page-header">
                <h2>Arsitektur Tingkat Tinggi</h2>
                <p>Rancangan komponen sistem dan pilihan penempatan yang masih perlu dikonfirmasi</p>
            </div>

            <section class="architecture-board">
                <div class="section-badge">Rancangan Komponen Sistem</div>
                <div class="architecture-pipeline" aria-label="Alur komponen sistem">
                    <div class="architecture-stage hardware-stage">
                        <div class="stage-number">01</div>
                        <h3>PERANGKAT PENGUJIAN</h3>
                        <p>Kamera Samping<br>Kamera Depan<br>Mesin Uji / Aktuator</p>
                    </div>
                    <div class="architecture-arrow" aria-hidden="true">→</div>
                    <div class="architecture-stage spraybot-stage">
                        <div class="stage-number">02</div>
                        <h3>APLIKASI SPRAYBOT</h3>
                        <p>Antarmuka Pengguna<br>Pengelolaan Pengujian</p>
                    </div>
                    <div class="architecture-arrow" aria-hidden="true">→</div>
                    <div class="architecture-stage analysis-stage">
                        <div class="stage-number">03</div>
                        <h3>ANALISIS SPRAY</h3>
                        <p>Pengolahan hasil tangkapan<br>Pengukuran parameter spray</p>
                    </div>
                    <div class="architecture-arrow" aria-hidden="true">→</div>
                    <div class="architecture-stage storage-stage">
                        <div class="stage-number">04</div>
                        <h3>PENYIMPANAN DATA</h3>
                        <p>Data Batch<br>Gambar terpilih<br>Hasil pengujian</p>
                    </div>
                    <div class="architecture-arrow" aria-hidden="true">→</div>
                    <div class="architecture-stage result-stage">
                        <div class="stage-number">05</div>
                        <h3>HASIL &amp; LAPORAN</h3>
                        <p>Hasil akhir<br>CSV<br><span>PDF — dirancang / perlu dikonfirmasi</span></p>
                    </div>
                </div>
            </section>

            <section class="deployment-board">
                <div class="section-badge unconfirmed">OPSI PENEMPATAN SISTEM — PERLU DIKONFIRMASI</div>
                <div class="deployment-options compact-deployment-options">
                    <div class="deployment-card compact-deployment-card">
                        <div class="dep-header">
                            <span class="dep-title">A. Lokal</span>
                            <span class="dep-status">Perlu dikonfirmasi</span>
                        </div>
                        <p class="dep-detail">Pemrosesan dan penyimpanan dilakukan pada workstation pengujian.</p>
                    </div>
                    <div class="deployment-card compact-deployment-card">
                        <div class="dep-header">
                            <span class="dep-title">B. Hybrid</span>
                            <span class="dep-status">Perlu dikonfirmasi</span>
                        </div>
                        <p class="dep-detail">Pengujian diproses di workstation, sementara data tertentu dapat disinkronkan ke sistem pusat.</p>
                    </div>
                    <div class="deployment-card compact-deployment-card">
                        <div class="dep-header">
                            <span class="dep-title">C. Terpusat</span>
                            <span class="dep-status">Perlu dikonfirmasi</span>
                        </div>
                        <p class="dep-detail">Workstation digunakan untuk pengambilan data, sementara pemrosesan atau penyimpanan utama berada pada server.</p>
                    </div>
                </div>
            </section>
        </div>
    `;
}
