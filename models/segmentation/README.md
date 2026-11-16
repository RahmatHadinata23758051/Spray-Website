# MODEL SEGMENTASI SPRAYBOT / PARAGON

Folder ini adalah tempat untuk meletakkan file model segmentasi Computer Vision (CV) dan skrip inferensi dari tim model.

---

## 1. Lokasi File Model

Letakkan file model Anda di folder ini:
```text
models/
└── segmentation/
    ├── README.md               (Dokumentasi ini)
    ├── infer.py                (Skrip inferensi Python)
    ├── model.onnx              (Atau model.pt / weights YOLO)
    └── requirements.txt        (Daftar dependensi Python)
```

---

## 2. Format Input & Output Skrip `infer.py`

Skrip `infer.py` dapat menerima input berupa folder citra frame hasil ekstraksi video atau daftar file gambar, lalu menghasilkan mask citra segmentasi.

### Input
- Argumen `--input-dir`: Folder berisi frame gambar (`frame_000.jpg`, `frame_001.jpg`, ...)
- Argumen `--output-dir`: Folder tempat menyimpan mask hasil segmentasi (`mask_000.png`, `mask_001.png`, ...)

### Output Citra Mask
- Format: PNG biner (Grayscale / RGB).
- Nilai pixel:
  - `0` (Hitam): Latar belakang / non-spray.
  - `255` (Putih / Berwarna): Area plume spray semprotan.

---

## 3. Fallback Otomatis di Website
Jika file model belum diletakkan di folder ini, antarmuka website Spraybot secara otomatis menggunakan **CV Plume Segmentation Fallback Engine** (berbasis delta luminansi & ekstraksi kontur semprotan), sehingga alur pemecahan frame dan peninjauan mask di website tetap berjalan 100% lancar tanpa error atau crash.

Ketika model Anda sudah siap dan ditaruh di sini, sistem dapat langsung beralih mengeksekusi model asli Anda.
