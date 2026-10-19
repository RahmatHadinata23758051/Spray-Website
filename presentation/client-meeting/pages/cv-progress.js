// Page 6: CV Progress - Computer Vision / ML Progress

function renderCvProgressPage(container) {
    container.innerHTML = `
        <div class="cv-progress-page">
            <header class="page-header">
                <span class="eyebrow">Progress Computer Vision</span>
                <h2>Progress Pengolahan Citra Spray</h2>
                <p>Kalibrasi, preprocessing, segmentasi plume, dan ekstraksi pengukuran awal.</p>
            </header>

            <main class="cv-content">
                <!-- Section 1: OCR & Calibration -->
                <section class="cv-section">
                    <div class="section-header">
                        <span class="section-number">01</span>
                        <h3>OCR & Kalibrasi</h3>
                    </div>
                    <div class="section-body">
                        <figure class="evidence-figure">
                            <img src="assets/images/cv-progress/ocr-calibration.png" alt="OCR dan kalibrasi skala referensi" loading="lazy">
                            <figcaption>Eksplorasi OCR untuk membaca skala referensi pada frame.</figcaption>
                        </figure>
                        <div class="evidence-notes">
                            <ul>
                                <li><strong>Tujuan:</strong> OCR dieksplorasi untuk membaca ruler/skala referensi fisik secara otomatis.</li>
                                <li><strong>Kalibrasi:</strong> Mengubah pengukuran piksel menjadi satuan fisik (mm) melalui referensi yang terbaca.</li>
                                <li><strong>Protractor / sudut referensi:</strong> Deteksi sudut referensi juga dievaluasi sebagai alternatif atau pelengkap.</li>
                                <li><strong>Status:</strong> Masih pipeline kalibrasi eksperimental; belum divalidasi pada data produksi.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <!-- Section 2: Image Preprocessing -->
                <section class="cv-section">
                    <div class="section-header">
                        <span class="section-number">02</span>
                        <h3>Image Preprocessing</h3>
                    </div>
                    <div class="section-body">
                        <figure class="evidence-figure">
                            <img src="assets/images/cv-progress/preprocessing-pipeline.png" alt="Pipeline preprocessing citra" loading="lazy">
                            <figcaption>Pipeline: citra asli → LAB + CLAHE → representasi background/difference → heatmap plume emphasis.</figcaption>
                        </figure>
                        <div class="evidence-notes">
                            <p class="pipeline-purpose"><strong>Tujuan:</strong> Meningkatkan visibilitas plume sebelum segmentasi.</p>
                            <ul>
                                <li><strong>Citra asli</strong> — Frame mentah dari kamera.</li>
                                <li><strong>LAB + CLAHE</strong> — Enhancement kontras lokal di ruang warna LAB untuk menonjolkan detail plume.</li>
                                <li><strong>Background / Difference</strong> — Representasi perbedaan terhadap background untuk mengisolasi perubahan.</li>
                                <li><strong>Heatmap / Plume Emphasis</strong> — Penekanan area plume untuk mempersiapkan segmentasi.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <!-- Section 3: Plume Segmentation & Initial Measurement -->
                <section class="cv-section">
                    <div class="section-header">
                        <span class="section-number">03</span>
                        <h3>Segmentasi Plume & Pengukuran Awal</h3>
                    </div>
                    <div class="section-body">
                        <figure class="evidence-figure">
                            <img src="assets/images/cv-progress/segmentation-measurement.png" alt="Segmentasi plume dan ekstraksi geometri" loading="lazy">
                            <figcaption>Area plume yang terisolasi serta ekstraksi geometri awal.</figcaption>
                        </figure>
                        <div class="evidence-notes">
                            <ul>
                                <li><strong>Segmentasi:</strong> Region plume telah berhasil diisolasi secara eksperimental.</li>
                                <li><strong>Ekstraksi geometri:</strong> Geometri diambil dari region hasil segmentasi.</li>
                                <li><strong>Output awal:</strong> Reach (panjang), width/spread (lebar/sebaran), dan angle (sudut).</li>
                                <li><strong>Konversi satuan:</strong> Kalibrasi digunakan untuk mengubah geometri piksel menjadi pengukuran fisik.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <!-- Section 4: Current Status -->
                <section class="cv-section status-section">
                    <div class="section-header">
                        <span class="section-number">04</span>
                        <h3>Status Saat Ini</h3>
                    </div>
                    <div class="status-grid">
                        <div class="status-block done">
                            <div class="status-label">SUDAH DILAKUKAN</div>
                            <ul class="status-list">
                                <li>Dataset dikelompokkan per sesi pengujian</li>
                                <li>Eksplorasi OCR / kalibrasi</li>
                                <li>Image preprocessing pipeline</li>
                                <li>Segmentasi plume awal</li>
                                <li>Ekstraksi geometri awal</li>
                            </ul>
                        </div>
                        <div class="status-block validating">
                            <div class="status-label">SEDANG DIVALIDASI</div>
                            <ul class="status-list">
                                <li>Konsistensi segmentasi antar sampel</li>
                                <li>Ketahanan kalibrasi (robustness)</li>
                                <li>Akurasi pengukuran</li>
                                <li>Perbandingan terhadap referensi manual / ground-truth</li>
                            </ul>
                        </div>
                        <div class="status-block next">
                            <div class="status-label">NEXT</div>
                            <ul class="status-list">
                                <li>Perkuat anotasi dataset / ground truth</li>
                                <li>Evaluasi CV klasik vs model segmentasi</li>
                                <li>Sambungkan output analisis terstruktur ke workspace Spraybot</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <!-- Section 5: Limitations / Client Data Note -->
                <section class="cv-section limitation-section">
                    <div class="section-header">
                        <span class="section-number">05</span>
                        <h3>Keterbatasan & Catatan Data Klien</h3>
                    </div>
                    <div class="limitation-body">
                        <p class="limitation-lead">Data klien saat ini sudah berguna untuk evaluasi prototipe dan feasibility, <strong>namun belum memadai untuk mengklaim akurasi model tingkat produksi.</strong></p>
                        <div class="limitation-grid">
                            <div class="limitation-item">
                                <span class="limitation-icon">•</span>
                                <span>Ground-truth mask terbatas</span>
                            </div>
                            <div class="limitation-item">
                                <span class="limitation-icon">•</span>
                                <span>Ground-truth pengukuran terbatas</span>
                            </div>
                            <div class="limitation-item">
                                <span class="limitation-icon">•</span>
                                <span>Sequences spray kontinu terbatas</span>
                            </div>
                            <div class="limitation-item">
                                <span class="limitation-icon">•</span>
                                <span>Bukti tampak Front (Front-view) terbatas</span>
                            </div>
                        </div>
                        <p class="limitation-note">Validasi lebih lanjut memerlukan dataset yang lebih besar, teranotasi, dan representatif kondisi operasional nyata.</p>
                    </div>
                </section>
            </main>
        </div>
    `;
}