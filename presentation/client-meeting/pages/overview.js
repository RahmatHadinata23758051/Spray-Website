// Overview Page Component
function renderOverviewPage(container) {
    container.innerHTML = `
        <div class="overview-content">
            <div class="overview-hero">
                <span class="eyebrow">SPRAYBOT</span>
                <h1 class="overview-title">Sistem Pengujian dan Analisis Spray</h1>
                <p class="overview-tagline">"Dari persiapan pengujian hingga hasil dan laporan dalam satu alur."</p>
            </div>

            <div class="overview-flow">
                <div class="flow-step" data-overview-note="step-1" tabindex="0" role="button" aria-label="Buka catatan Persiapan">
                    <div class="step-num">01</div>
                    <div class="step-card">
                        <h3>Persiapan</h3>
                        <p>Pemilihan produk dan parameter uji yang siap dieksekusi</p>
                    </div>
                </div>
                <div class="flow-arrow" aria-hidden="true">→</div>
                <div class="flow-step" data-overview-note="step-2" tabindex="0" role="button" aria-label="Buka catatan Pengambilan Data">
                    <div class="step-num">02</div>
                    <div class="step-card">
                        <h3>Pengambilan Data</h3>
                        <p>Perekaman visual spray dari kamera samping dan kamera depan</p>
                    </div>
                </div>
                <div class="flow-arrow" aria-hidden="true">→</div>
                <div class="flow-step" data-overview-note="step-3" tabindex="0" role="button" aria-label="Buka catatan Analisis">
                    <div class="step-num">03</div>
                    <div class="step-card">
                        <h3>Analisis</h3>
                        <p>Pengukuran pola sebaran, sudut semprotan, dan geometri spray</p>
                    </div>
                </div>
                <div class="flow-arrow" aria-hidden="true">→</div>
                <div class="flow-step" data-overview-note="step-4" tabindex="0" role="button" aria-label="Buka catatan Hasil">
                    <div class="step-num">04</div>
                    <div class="step-card">
                        <h3>Hasil</h3>
                        <p>Validasi dan penguncian metrik final pengujian per batch</p>
                    </div>
                </div>
                <div class="flow-arrow" aria-hidden="true">→</div>
                <div class="flow-step" data-overview-note="step-5" tabindex="0" role="button" aria-label="Buka catatan Laporan">
                    <div class="step-num">05</div>
                    <div class="step-card">
                        <h3>Laporan</h3>
                        <p>Dokumentasi riwayat uji terpusat dan ekspor data pengujian</p>
                    </div>
                </div>
            </div>

            
        </div>
    `;
}
