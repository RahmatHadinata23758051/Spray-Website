const mapData = {
    id: "root",
    label: "SPRAYBOT\nPengujian dan Analisis Spray",
    type: "root",
    noteTitle: "Sistem Pengujian Spray",
    noteSummary: "Platform terintegrasi untuk pengujian spray secara visual.",
    noteBullets: [
        "Menggunakan dua kamera sinkron.",
        "Menangkap profil dan pola sebaran spray.",
        "Membantu operator dalam kontrol kualitas."
    ],
    childrenLeft: [
        {
            id: "persiapan",
            label: "Persiapan",
            type: "main",
            noteTitle: "Persiapan",
            noteSummary: "Apa yang disiapkan sebelum pengujian dimulai.",
            noteBullets: [
                "Produk harus sudah terdaftar di sistem.",
                "Sistem menyesuaikan parameter secara otomatis.",
                "Setiap pengujian dikelompokkan ke dalam satu Batch."
            ],
            children: [
                { id: "p-1", label: "Pilih produk" },
                { id: "p-2", label: "Tentukan pengujian" },
                { id: "p-3", label: "Buat batch" },
                { id: "p-4", label: "Siapkan pengujian" }
            ]
        },
        {
            id: "pengambilan",
            label: "Pengambilan Data",
            type: "main",
            noteTitle: "Pengambilan Data",
            noteSummary: "Data spray diambil dari dua sudut pandang pada waktu yang sama.",
            noteBullets: [
                "Kamera samping melihat profil spray.",
                "Kamera depan melihat pola sebaran.",
                "Data tersimpan pada pengujian yang sama."
            ],
            children: [
                { id: "d-1", label: "Kamera samping" },
                { id: "d-2", label: "Kamera depan" },
                { id: "d-3", label: "Diambil bersamaan" },
                { id: "d-4", label: "Disimpan dalam batch" }
            ]
        },
        {
            id: "analisis",
            label: "Analisis",
            type: "main",
            noteTitle: "Analisis",
            noteSummary: "Data hasil tangkapan dianalisis untuk mendapatkan parameter spray secara instan.",
            noteBullets: [
                "Sistem mendeteksi batas spray otomatis.",
                "Operator berhak mengoreksi garis ukur bila diperlukan.",
                "Operator menentukan frame tangkapan utama."
            ],
            children: [
                { id: "a-1", label: "Sistem membaca hasil spray" },
                { id: "a-2", label: "Hasil awal ditampilkan" },
                { id: "a-3", label: "Operator meninjau hasil" },
                { id: "a-4", label: "Koreksi bila diperlukan" },
                { id: "a-5", label: "Tentukan tangkapan utama" }
            ]
        }
    ],
    childrenRight: [
        {
            id: "hasil",
            label: "Hasil",
            type: "main",
            noteTitle: "Hasil",
            noteSummary: "Hasil akhir pengujian per batch yang telah disahkan.",
            noteBullets: [
                "Seluruh data metrik dikunci dan diabadikan.",
                "Menampilkan gambar visual yang terpilih.",
                "Bukti riwayat pengujian dapat ditelusuri."
            ],
            children: [
                { id: "h-1", label: "Hasil akhir pengujian" },
                { id: "h-2", label: "Visual spray terpilih" },
                { id: "h-3", label: "Ringkasan pengukuran" },
                { id: "h-4", label: "Riwayat dapat ditelusuri" }
            ]
        },
        {
            id: "laporan",
            label: "Laporan",
            type: "main",
            noteTitle: "Laporan",
            noteSummary: "Laporan final dari seluruh batch yang telah selesai diproses.",
            noteBullets: [
                "Tabel riwayat pengujian yang berhasil difinalisasi.",
                "Dapat dilihat kembali kapan saja.",
                "Ekspor ke CSV untuk analisa spreadsheet."
            ],
            children: [
                { id: "l-1", label: "Riwayat pengujian selesai" },
                { id: "l-2", label: "Buka hasil" },
                { id: "l-3", label: "Ekspor CSV" }
            ]
        },
        {
            id: "kesepakatan",
            label: "Yang Perlu Disepakati",
            type: "main",
            noteTitle: "Yang Perlu Disepakati",
            noteSummary: "Hal-hal penting yang perlu keputusan Klien sebelum implementasi fisik sepenuhnya.",
            noteBullets: [
                "Mekanisme perangkat keras di lapangan.",
                "Standar dan titik patokan kalibrasi pixel.",
                "Format baku pelaporan (termasuk dokumen PDF)."
            ],
            children: [
                { id: "k-1", label: "Alur pengujian di lapangan" },
                { id: "k-2", label: "Aturan kalibrasi" },
                { id: "k-3", label: "Penyimpanan gambar" },
                { id: "k-4", label: "Kriteria hasil pengujian" },
                { id: "k-5", label: "Format laporan PDF" },
                { id: "k-6", label: "Penempatan sistem" }
            ]
        }
    ]
};

const presentationSteps = [
    { title: "Gambaran Sistem", focus: ["root"] },
    { title: "Persiapan", focus: ["persiapan"] },
    { title: "Pengambilan Data", focus: ["pengambilan"] },
    { title: "Analisis", focus: ["analisis"] },
    { title: "Hasil", focus: ["hasil"] },
    { title: "Laporan", focus: ["laporan"] },
    { title: "Yang Perlu Disepakati", focus: ["kesepakatan"] }
];