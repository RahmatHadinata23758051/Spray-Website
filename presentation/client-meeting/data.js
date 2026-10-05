// Data definitions for Spraybot Client Meeting Presentation

const presentationPages = [
    { id: 'overview', title: 'Gambaran', num: '01' },
    { id: 'system-map', title: 'Alur Sistem', num: '02' },
    { id: 'system-context', title: 'Konteks Sistem', num: '03' },
    { id: 'architecture', title: 'Arsitektur', num: '04' },
    { id: 'decisions', title: 'Hal yang Perlu Disepakati', num: '05' }
];

const decisionTopics = [
    {
        topic: "Definisi satu Batch / satu pengujian",
        current: "Satu Batch merepresentasikan satu proses pengujian untuk satu produk/sampel.",
        confirm: "Jika produk/sampel yang sama diuji ulang, apakah dibuat Batch baru atau dicatat sebagai pengujian ulang pada Batch yang sama?"
    },
    {
        topic: "Proses pengujian ulang",
        current: "Alur utama saat ini berakhir pada hasil yang difinalisasi.",
        confirm: "Jika hasil perlu diuji ulang, bagaimana riwayat pengujian sebelumnya harus dicatat?"
    },
    {
        topic: "Prosedur kalibrasi",
        current: "Sistem mendukung kalibrasi pengukuran kamera menggunakan referensi fisik.",
        confirm: "Seberapa sering kalibrasi perlu dilakukan di lapangan: per hari, per shift, per perubahan setup, atau sesuai kebutuhan?"
    },
    {
        topic: "Penyimpanan gambar",
        current: "Hasil akhir mencatat tangkapan utama dan tangkapan pendukung yang dipilih.",
        confirm: "Apakah seluruh gambar pengujian perlu disimpan? Jika iya, berapa lama dan di mana?"
    },
    {
        topic: "Kriteria hasil / lulus-gagal",
        current: "Sistem menghasilkan parameter pengukuran spray.",
        confirm: "Apakah hasil perlu diberi status lulus/gagal berdasarkan batas toleransi tertentu untuk setiap produk?"
    },
    {
        topic: "Hak finalisasi hasil",
        current: "Saat ini operator melakukan review dan finalisasi hasil.",
        confirm: "Apakah finalisasi cukup dilakukan operator atau memerlukan persetujuan pihak lain?"
    },
    {
        topic: "Format laporan PDF",
        current: "Ekspor CSV sudah tersedia. Laporan PDF sedang dirancang.",
        confirm: "Format, isi, identitas dokumen, dan kebutuhan persetujuan apa yang harus diterapkan pada laporan PDF?"
    },
    {
        topic: "Integrasi sistem Paragon",
        current: "Spraybot saat ini dirancang dapat berjalan sebagai sistem pengujian mandiri.",
        confirm: "Apakah Spraybot perlu bertukar data dengan sistem internal Paragon?"
    },
    {
        topic: "Penempatan sistem",
        current: "Tersedia beberapa skenario: lokal, hybrid, atau terpusat.",
        confirm: "Skenario mana yang paling sesuai dengan infrastruktur dan kebutuhan operasional Paragon?"
    }
];

// System Map Mind Map Data
const mapData = {
    id: "root",
    label: "SPRAYBOT\nPengujian dan Analisis Spray",
    type: "root",
    noteTitle: "Sistem Pengujian Spraybot",
    noteSummary: "Spraybot dirancang untuk membantu operator menjalankan pengujian spray yang terdokumentasi dan konsisten, dari konfigurasi sampel hingga hasil dan laporan.",
    noteBullets: [
        "MVP saat ini berjalan dalam Simulation Mode. Belum ada mesin, aktuator, PLC, atau kamera fisik yang terhubung.",
        "Data capture dan analisis pada prototipe berasal dari fixture yang disiapkan, bukan pengukuran langsung.",
        "Alur utama: persiapan batch, capture, analisis Side dan Front, finalisasi hasil, lalu penelusuran dan ekspor laporan."
    ],
    childrenLeft: [
        {
            id: "persiapan", label: "Persiapan", type: "main", noteTitle: "Persiapan Pengujian",
            noteSummary: "Operator menetapkan identitas sampel dan parameter uji sebelum capture. Data ini menjadi konteks bagi seluruh rekaman dan hasil dalam batch.",
            noteBullets: [
                "Pilih produk atau preset, tetapi tinjau nilai awal sebelum digunakan.",
                "Isi Sample ID, operator, dan catatan kondisi atau tujuan pengujian.",
                "Atur force setpoint dalam N, press duration dalam ms, serta stroke dalam mm. Nilai ini adalah konfigurasi, bukan pembacaan aktual mesin.",
                "Pilih named fixture scenario untuk demonstrasi. Hasil fixture bersifat deterministik dan bukan kondisi mesin nyata.",
                "Tinjau ringkasan, simpan draft, atau mulai pengujian simulasi."
            ],
            children: [
                { id: "p-1", label: "Pilih produk atau preset", noteTitle: "Pilih Produk atau Preset", noteSummary: "Pilih identitas produk atau preset sampel agar konfigurasi dan riwayat pengujian memiliki konteks yang konsisten.", noteBullets: ["Nama produk digunakan untuk mengelompokkan dan mencari hasil.", "Preset dapat memberi nilai awal gaya tekan, durasi, dan stroke.", "Nilai preset adalah saran konfigurasi dan perlu ditinjau operator.", "Produk atau preset yang belum tersedia harus dicatat sebagai kebutuhan konfigurasi."] },
                { id: "p-2", label: "Tentukan identitas dan tujuan uji", noteTitle: "Identitas dan Tujuan Pengujian", noteSummary: "Lengkapi informasi tentang sampel yang diuji, operator, dan tujuan pengujian.", noteBullets: ["Masukkan Sample ID unik sesuai konvensi tim R&D.", "Pilih atau catat operator yang menjalankan workflow.", "Tuliskan tujuan, kondisi sampel, atau penyimpangan yang perlu diketahui reviewer.", "Pastikan metadata tetap terhubung ke hasil dan ekspor."] },
                { id: "p-3", label: "Atur parameter pengujian", noteTitle: "Parameter Pengujian", noteSummary: "Parameter menjelaskan kondisi uji yang direncanakan. Prototipe menyimpannya sebagai konfigurasi dan tidak menggerakkan perangkat fisik.", noteBullets: ["Force setpoint adalah gaya tekan target dalam N.", "Press duration adalah durasi tekan dalam ms.", "Stroke adalah jarak gerak tekan dalam mm.", "Jangan menyebut konfigurasi sebagai pembacaan load cell atau respons aktuator.", "Batas penerimaan produk belum ditetapkan; hindari status lulus atau gagal berbasis ambang yang belum divalidasi."] },
                { id: "p-4", label: "Pilih fixture dan tinjau ringkasan", noteTitle: "Fixture dan Pemeriksaan Sebelum Mulai", noteSummary: "Pilih dataset simulasi bernama lalu pastikan identitas dan parameter uji sudah benar.", noteBullets: ["Skenario yang tersedia mencakup nominal-01, direction-offset-01, pattern-asymmetry-01, dan alignment-review-01.", "Setiap fixture menghasilkan nilai deterministik untuk demonstrasi.", "Periksa produk, Sample ID, operator, force, durasi, stroke, dan catatan.", "Memulai test menjalankan workflow simulasi menuju mock capture dan analisis fixture."] }
            ]
        },
        {
            id: "pengambilan", label: "Pengambilan Data", type: "main", noteTitle: "Pengambilan Data",
            noteSummary: "Tahap ini menggambarkan akuisisi Side dan Front yang terkoordinasi. Implementasi prototipe menggunakan mock capture dari fixture dan tidak tersambung ke kamera fisik.",
            noteBullets: [
                "Capture monitor menunjukkan fase pre-spray, build-up, stable, decay, dan complete sebagai simulasi.",
                "Frame fixture memiliki indeks, timestamp, dan fase untuk menjelaskan urutan waktu.",
                "Side melihat geometri plume; Front melihat pola pada bidang referensi.",
                "Gunakan label Simulation Mode, Fixture capture, atau Mock capture loaded. Jangan tampilkan kamera seolah online.",
                "Trigger dan sinkronisasi perangkat nyata masih menjadi kebutuhan integrasi hardware."
            ],
            children: [
                { id: "d-1", label: "Side Camera: profil spray", noteTitle: "Side Camera: Profil Spray", noteSummary: "Tampak samping digunakan untuk meninjau panjang, sudut, dan arah plume terhadap acuan nozzle.", noteBullets: ["Fixture Side menunjukkan frame asli serta mode mask atau overlay bila tersedia.", "Overlay dapat menunjukkan nozzle origin, batas atas/bawah, centerline, garis sudut, panjang, dan spread vertikal.", "Metrik yang direncanakan: spray length, spray angle, maximum vertical spread, dan direction offset.", "Prototipe belum memiliki video stream atau pengukuran aktual."] },
                { id: "d-2", label: "Front Camera: pola sebaran", noteTitle: "Front Camera: Pola Sebaran", noteSummary: "Tampak depan digunakan untuk mengamati bentuk pola spray dan posisi pusatnya pada bidang referensi.", noteBullets: ["Fixture Front memperlihatkan contour, centroid, dan sumbu pembanding.", "Metrik yang direncanakan: spray area, equivalent diameter, circularity, centroid offset, dan symmetry.", "Interpretasi memerlukan posisi kamera, bidang referensi, ROI, dan kalibrasi yang disepakati.", "Mock mask bukan bukti pengukuran droplet atau densitas absolut."] },
                { id: "d-3", label: "Siklus capture tersinkron", noteTitle: "Siklus Capture Tersinkron", noteSummary: "Urutan frame dari kedua tampak dirancang merujuk pada satu siklus uji dan timeline yang dapat dibandingkan.", noteBullets: ["Fase yang direpresentasikan: pre-spray, build-up, stable, decay, dan complete.", "Timestamp membantu menelusuri urutan frame dan jendela analisis.", "Sinkronisasi pada prototipe hanya demonstrasi berbasis fixture.", "Integrasi harus menentukan trigger, clock, toleransi sinkronisasi, dan respons jika kamera gagal."] },
                { id: "d-4", label: "Hubungkan capture ke batch", noteTitle: "Capture dalam Konteks Batch", noteSummary: "Capture harus terhubung dengan batch dan sampel yang tepat agar konteks pengujian tetap terlacak.", noteBullets: ["Relasikan Batch ID, Sample ID, produk, operator, konfigurasi, dan sumber fixture.", "Simpan indeks frame, timestamp, serta identitas kamera sebagai metadata.", "Tandai sumber sebagai Fixture data atau Mock capture.", "Retensi video, gambar asli, mask, dan overlay masih perlu ditentukan."] }
            ]
        },
        {
            id: "analisis", label: "Analisis", type: "main", noteTitle: "Analisis Side dan Front",
            noteSummary: "Workspace memisahkan pengukuran geometri Side dari pengukuran pola Front. Prototipe menggunakan nilai fixture deterministik dan belum menjalankan computer vision pada kamera nyata.",
            noteBullets: ["Pilih Side atau Front agar inspector menampilkan metrik yang sesuai.", "Tinjau timeline dan stable analysis window; ringkasan utama sebaiknya berasal dari beberapa frame stabil.", "Bandingkan Original, Mask, dan Overlay.", "Koreksi pada workspace mock harus dibedakan dari geometri otomatis dan hasil final yang diterima.", "Confidence atau quality hanya boleh disebut simulasi; threshold penerimaan belum ditetapkan."],
            children: [
                { id: "a-1", label: "Pilih kamera, frame, dan jendela stabil", noteTitle: "Konteks Analisis", noteSummary: "Pastikan kamera dan rentang waktu yang ditinjau sesuai dengan pertanyaan analisis.", noteBullets: ["Side untuk geometri plume; Front untuk area dan simetri.", "Timeline memilih frame, timestamp, dan fase capture.", "Stable window menandai rentang fixture untuk contoh agregasi temporal.", "Frame representatif untuk gambar tidak otomatis menjadi satu-satunya sumber metrik."] },
                { id: "a-2", label: "Tinjau Original, Mask, dan Overlay", noteTitle: "Representasi Gambar", noteSummary: "Mode tampilan menjelaskan hubungan antara frame sumber, mask, dan geometri ukur.", noteBullets: ["Original menampilkan frame fixture tanpa overlay.", "Mask menampilkan area segmentasi pada fixture.", "Overlay menggabungkan frame dan garis ukur.", "Mask fixture bukan bukti model CV telah berjalan."] },
                { id: "a-3", label: "Tinjau metrik Side dan Front", noteTitle: "Metrik Khusus Kamera", noteSummary: "Setiap kamera memiliki tujuan dan metrik yang berbeda.", noteBullets: ["Side: spray length (mm), spray angle (derajat), vertical spread (mm), dan direction offset (derajat).", "Front: spray area (mm²), equivalent diameter (mm), circularity, centroid offset X/Y (mm), dan horizontal/vertical symmetry.", "Nilai fixture tidak menyatakan batas penerimaan produk.", "Satuan harus konsisten dengan nilai tersimpan dan formatter."] },
                { id: "a-4", label: "Koreksi dan tinjau perubahan", noteTitle: "Koreksi Pengukuran", noteSummary: "Jika koreksi digunakan, operator perlu memahami geometri awal dan hasil akhir yang diterima.", noteBullets: ["Bedakan AUTO geometry, WORKING correction, dan ACCEPTED geometry.", "Tampilkan nilai sebelum dan sesudah koreksi.", "Audit trail nyata perlu mencatat siapa, kapan, dan apa yang berubah.", "Koreksi fixture bukan koreksi hasil kamera aktual."] },
                { id: "a-5", label: "Pilih frame representatif", noteTitle: "Frame Representatif", noteSummary: "Frame terpilih memberi konteks visual tanpa menggantikan agregasi metrik pada jendela stabil.", noteBullets: ["Pilih frame yang mewakili stable window.", "Simpan indeks frame dan timestamp fixture.", "Jika ada beberapa capture moment, bedakan primary dan supporting.", "Metrik temporal dihitung dari beberapa frame stabil, bukan pilihan visual semata."] }
            ]
        }
    ],
    childrenRight: [
        {
            id: "hasil", label: "Hasil", type: "main", noteTitle: "Finalisasi Hasil",
            noteSummary: "Halaman hasil menyajikan satu ringkasan kanonis bagi batch yang difinalisasi, lengkap dengan metadata, metrik kamera, gambar, dan sumber data.",
            noteBullets: ["Finalisasi dimaksudkan untuk menghasilkan snapshot stabil dari hasil yang telah ditinjau.", "Tampilkan batch, sampel, operator, konfigurasi, dan sumber fixture.", "Pisahkan ringkasan Side, Front, dan temporal.", "Jangan menetapkan pass/fail tanpa kriteria penerimaan tervalidasi.", "Aturan revisi, persetujuan, dan audit perubahan sistem nyata masih perlu ditentukan."],
            children: [
                { id: "h-1", label: "Finalisasi satu snapshot hasil", noteTitle: "Snapshot Hasil Final", noteSummary: "Hasil final menjadi referensi stabil dan tidak mengikuti perubahan draft analisis.", noteBullets: ["Snapshot mengikat identitas, parameter, metrik, jendela analisis, dan catatan.", "FINALIZED menunjukkan status workflow, bukan otomatis berarti produk lulus.", "Perubahan setelah finalisasi memerlukan aturan revisi atau versi.", "Prototipe tetap memakai fixture dan penyimpanan mock/lokal."] },
                { id: "h-2", label: "Sertakan gambar representatif", noteTitle: "Gambar Representatif", noteSummary: "Gambar memberi konteks visual dan perlu menunjukkan asal serta kamera-nya.", noteBullets: ["Sertakan Side dan Front jika tersedia.", "Labeli mode gambar Original atau Overlay.", "Hubungkan gambar dengan indeks frame, timestamp, kamera, dan capture moment.", "Kualitas, retensi, resolusi ekspor, dan akses citra asli perlu disepakati."] },
                { id: "h-3", label: "Ringkas metrik dan stabilitas", noteTitle: "Ringkasan Metrik", noteSummary: "Tampilkan angka utama per kamera beserta variasi pada stable window.", noteBullets: ["Side: panjang, sudut, spread vertikal maksimum, dan offset arah.", "Front: area, diameter ekuivalen, circularity, centroid offset, dan symmetry.", "Temporal: rentang stable window, mean, dan standard deviation yang didukung fixture.", "Sertakan satuan dan hindari interpretasi baik/buruk tanpa batas tervalidasi."] },
                { id: "h-4", label: "Telusuri riwayat dan sumber data", noteTitle: "Traceability Hasil", noteSummary: "Hasil perlu dapat ditelusuri kembali ke batch, konfigurasi, operator, fixture, dan capture.", noteBullets: ["Tampilkan Batch ID dan Sample ID.", "Catat waktu pengujian, operator, produk, dan parameter.", "Tandai fixture/simulasi sampai data hardware tersedia.", "Versioning dan audit trail penuh adalah kebutuhan integrasi."] }
            ]
        },
        {
            id: "laporan", label: "Laporan", type: "main", noteTitle: "Riwayat dan Laporan",
            noteSummary: "Laporan membantu menemukan hasil final, membukanya kembali, dan mengekspor data tabular. CSV mock tersedia; format formal lain dapat dirancang kemudian.",
            noteBullets: ["Riwayat disajikan sebagai tabel yang dapat dicari.", "Pencarian/filter dapat mencakup ID, produk, sampel, operator, status, dan tanggal.", "Ekspor CSV menggunakan kolom dan satuan konsisten.", "Data fixture pada ekspor harus tetap ditandai simulasi.", "PDF bukan klaim kemampuan wajib prototipe saat ini."],
            children: [
                { id: "l-1", label: "Cari batch yang telah difinalisasi", noteTitle: "Riwayat Batch Final", noteSummary: "Riwayat membantu menemukan hasil berdasarkan identitas dan statusnya.", noteBullets: ["Kolom umum: Batch ID, tanggal, produk, Sample ID, operator, status, dan tindakan.", "Cari berdasarkan identitas yang mudah diingat.", "Filter status membedakan draft dan batch final.", "Sediakan petunjuk jika belum ada hasil final."] },
                { id: "l-2", label: "Buka dan verifikasi hasil", noteTitle: "Membuka Hasil Tersimpan", noteSummary: "Buka halaman hasil kanonis untuk memeriksa metadata, parameter, metrik, gambar, dan catatan.", noteBullets: ["Pastikan baris yang dipilih mengarah ke batch yang sama.", "Hasil final bersifat baca-saja bila workflow menetapkannya.", "Periksa penanda simulasi sebelum membagikan hasil.", "Jika hasil tidak ditemukan atau belum final, jelaskan statusnya."] },
                { id: "l-3", label: "Ekspor data CSV", noteTitle: "Ekspor CSV", noteSummary: "CSV menyediakan data tabular untuk spreadsheet dan analisis lanjutan.", noteBullets: ["Gunakan header stabil untuk metadata, konfigurasi, metrik Side/Front, dan temporal.", "Cantumkan satuan agar angka tetap bermakna.", "Escape delimiter dan teks catatan dengan benar.", "Sertakan penanda fixture/simulasi."] }
            ]
        },
        {
            id: "kesepakatan", label: "Yang Perlu Disepakati", type: "main", noteTitle: "Keputusan Sebelum Integrasi Nyata",
            noteSummary: "Keputusan lintas fungsi diperlukan sebelum prosedur lapangan, perangkat fisik, kalibrasi, kriteria hasil, dan pelaporan dapat ditetapkan.",
            noteBullets: ["Pisahkan keputusan yang disetujui dari asumsi atau usulan.", "Tentukan penanggung jawab dan bukti validasi untuk keputusan yang memengaruhi hasil.", "Jangan mengaktifkan threshold atau prosedur otomatis sebelum divalidasi.", "Catat kebutuhan untuk tim software, hardware, dan R&D."],
            children: [
                { id: "k-1", label: "Prosedur operasional di lapangan", noteTitle: "Prosedur Pengujian Lapangan", noteSummary: "Sepakati urutan kerja aktual dari persiapan sampel sampai hasil selesai.", noteBullets: ["Tentukan tanggung jawab persiapan, pemuatan botol, mulai test, dan persetujuan hasil.", "Tentukan prosedur pembatalan, kegagalan capture, dan pengujian ulang.", "Sepakati arti satu batch dan cara identifikasi beberapa unit.", "Validasi keselamatan operator dan interlock mesin di luar UI demo."] },
                { id: "k-2", label: "Kalibrasi dan referensi ukur", noteTitle: "Kalibrasi Kamera dan Skala", noteSummary: "Sepakati transformasi koordinat pixel menjadi ukuran fisik serta pemantauan validitas kalibrasi.", noteBullets: ["Pilih target kalibrasi dan prosedurnya.", "Tetapkan ROI, nozzle origin, pusat Front, perspektif, dan distorsi lensa.", "Definisikan unit, presisi, toleransi, masa berlaku, dan kalibrasi ulang.", "Pixel-to-mm prototipe adalah konfigurasi mock, bukan kalibrasi alat."] },
                { id: "k-3", label: "Penyimpanan dan retensi capture", noteTitle: "Penyimpanan Data dan Gambar", noteSummary: "Tentukan data yang disimpan, durasi retensi, dan cara mengambil data asli.", noteBullets: ["Tentukan penyimpanan video, frame, mask, dan overlay.", "Sepakati lokasi, penamaan, backup, akses, retensi, dan penghapusan.", "Hubungkan aset ke batch, kamera, timestamp, dan konfigurasi.", "Tentukan respons saat storage penuh atau file rusak."] },
                { id: "k-4", label: "Metrik dan kriteria penerimaan", noteTitle: "Definisi Metrik dan Batas Keputusan", noteSummary: "Metrik dan kriteria penerimaan berbeda; keduanya memerlukan validasi domain sebelum status lulus/gagal digunakan.", noteBullets: ["Sepakati definisi, unit, agregasi, serta penanganan frame tidak valid.", "Validasi repeatability, variasi, sensitivitas pencahayaan, dan ketidakpastian.", "Tetapkan threshold berdasarkan kebutuhan dan bukti pengujian.", "Tentukan kebutuhan review manusia dan kewenangan persetujuan."] },
                { id: "k-5", label: "Format laporan dan ekspor", noteTitle: "Format Laporan Resmi", noteSummary: "Sepakati keluaran untuk arsip, komunikasi internal, dan proses mutu.", noteBullets: ["Tentukan kebutuhan CSV, PDF, spreadsheet, atau dokumen bertanda tangan.", "Sepakati metadata, gambar, metrik, satuan, catatan, dan revisi.", "Tentukan bahasa, format tanggal, desimal, dan delimiter.", "Tandai keluaran demo sebagai simulasi sampai data nyata tervalidasi."] },
                { id: "k-6", label: "Integrasi perangkat dan penempatan", noteTitle: "Perangkat, Lingkungan, dan Integrasi", noteSummary: "Arsitektur fisik dan lingkungan operasi memengaruhi koneksi, sinkronisasi, keselamatan, dan deployment.", noteBullets: ["Konfirmasi tipe, lensa, posisi, pencahayaan, dan interface kamera.", "Tentukan controller/PLC, aktuator, load cell, protokol, dan sumber timestamp.", "Rancang kondisi aman saat komunikasi hilang, emergency stop, sensor anomali, atau daya terputus.", "Sepakati workstation/server, jaringan, autentikasi, backup, pembaruan, dan dukungan."] }
            ]
        }
    ]
};
