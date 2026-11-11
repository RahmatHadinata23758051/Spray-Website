#!/usr/bin/env python3
"""
Create Microsoft Word progress report for Spraybot project.
"""

from docx import Document
from docx.shared import Inches, Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.style import WD_STYLE_TYPE
from docx.oxml.ns import qn
from pathlib import Path
import os

# Configuration
SCREENSHOT_DIR = Path("docs/progress-checkpoint/assets")
OUTPUT_PATH = Path("docs/progress-checkpoint/Laporan_Kemajuan_Spraybot.docx")

# Screenshot definitions with captions and descriptions
SCREENSHOTS = [
    ("login_page.png", "Gambar 1. Halaman Login", 
     "Halaman autentikasi masuk ke sistem Spraybot. Menggunakan kredensial operator lokal (operator@local.test / spraybot123). Login berbasis sesi dengan cookie HttpOnly untuk keamanan."),
    
    ("dashboard.png", "Gambar 2. Dasbor Utama",
     "Dasbor ringkasan sistem menampilkan status Kode Pengujian, Sampel, TestRun, dan aktivitas terbaru. Navigasi sidebar kiri memberikan akses cepat ke semua modul utama."),
    
    ("kode_pengujian_list_full.png", "Gambar 3. Daftar Kode Pengujian",
     "Daftar Kode Pengujian (KP) dengan kolom: ID, Produk, Resep Default, Periode Uji, Operator, Status, dan aksi. Mendukung pencarian, filter status, dan paginasi. Menggantikan konsep 'Batch' lama."),
    
    ("form_kode_pengujian.png", "Gambar 4. Form Buat Kode Pengujian Baru",
     "Form pembuatan KP baru dengan pemilihan Produk, Resep Default, Lot Produk, Periode Uji, Kondisi Simpan, Posisi Botol, Catatan, dan Standar Perhitungan. Validasi client-side dan server-side."),
    
    ("kode_pengujian_detail_full.png", "Gambar 5. Detail Kode Pengujian (KP-24-0618)",
     "Halaman detail KP menampilkan hierarki: Info KP → Daftar Sampel → Daftar TestRun per Sampel. Setiap TestRun menunjukkan status (PENDING/CAPTURING/ANALYZING/REVIEW_REQUIRED/FINALIZED), resep, setpoint, dan aksi Mulai Pengujian / Analisis / Hasil."),
    
    ("kode_pengujian_with_samples.png", "Gambar 6. Detail KP dengan Sampel",
     "Detail KP setelah penambahan sampel (SMP-001). Menunjukkan struktur hierarki KP → Sample → TestRun. Sampel memiliki kode, posisi, kondisi simpan, dan status terpisah."),
    
    ("testrun_capture.png", "Gambar 7. TestRun Capture (Pengambilan Data)",
     "Halaman capture per TestRun. Mendukung mode Simulasi (fixture deterministik) dan Real (kamera side hardware). Fitur: preview kamera, pengaturan durasi, baseline pre-spray, video recording, save policy (Review/Auto), dan actions Simpan/Ulangi/Buang."),
    
    ("batch_list.png", "Gambar 8. Daftar Batch (Legacy)",
     "Halaman Batch lama yang masih dipertahankan untuk kompatibilitas mundur. Redirect otomatis dari route legacy (/new-test, /capture, /analysis, /result) ke /batches."),
    
    ("batch_new.png", "Gambar 9. Form Batch Baru (Legacy)",
     "Form pembuatan batch lama. Akan di-deprecate sepenuhnya setelah migrasi KP selesai."),
    
    ("reports.png", "Gambar 10. Halaman Laporan",
     "Halaman laporan dengan filter tanggal, KP, produk, dan status. Mendukung ekspor CSV hasil final (FinalAnalysisReport) dengan kolom: KP, Sample, TestRun, Produk, Resep, Setpoint, Spray Length, Spray Angle, Vertical Spread, Direction Offset, Spread Position, Status Sinkronisasi, Waktu Finalisasi."),
    
    ("products.png", "Gambar 11. Master Data Produk",
     "Manajemen master data produk: Kode Produk, Nama, Deskripsi, Spesifikasi. Digunakan sebagai referensi saat membuat KP."),
    
    ("calibration.png", "Gambar 12. Kalibrasi Kamera",
     "Halaman kalibrasi untuk kamera Side dan Front. Pengaturan jarak referensi, anchor points, dan orientasi nozzle. Data kalibrasi digunakan untuk konversi piksel ke milimeter pada analisis."),
    
    ("users.png", "Gambar 13. Manajemen Pengguna",
     "Daftar pengguna sistem dengan peran (Operator, Admin, Viewer). Autentikasi berbasis sesi lokal tanpa dependency eksternal."),
    
    ("settings.png", "Gambar 14. Pengaturan Sistem",
     "Pengaturan workstation lokal: mode capture (review/auto), path penyimpanan aset, konfigurasi sinkronisasi server (VITE_API_BASE_URL), dan preferensi UI."),
]

# Technical progress content
TECHNICAL_PROGRESS = {
    "Arsitektur & Domain": [
        "Migrasi arsitektur dari Batch → Kode Pengujian (KP) → Sample → TestRun",
        "Domain layer terpisah (@spray-paragon/domain) dengan type safety penuh",
        "Contracts layer (@spray-paragon/contracts) dengan Zod schema untuk validasi transport",
        "Application layer (@spray-paragon/web) dengan ports & adapters pattern",
        "API layer (@spray-paragon/api) dengan Fastify + PostgreSQL + Drizzle ORM",
    ],
    "Capture & Persistence": [
        "Capture per TestRun (bukan per Batch) dengan identitas sendiri",
        "Save Policy: Review Mode (default, butuh konfirmasi Simpan) vs Auto Mode",
        "Video recording (WebM/MP4) + frame extraction dengan asset ID deterministik",
        "Baseline pre-spray selection (initial window / manual range)",
        "IndexedDB untuk asset storage lokal, PostgreSQL untuk metadata",
        "Unsaved data guard: beforeunload protection + navigation confirmation modal",
    ],
    "Analysis & Correction": [
        "Analysis workspace terpisah untuk Side-only real capture",
        "View modes: Original / Mask / Overlay (Mask & Overlay menunggu CV integration)",
        "Primary + Supporting capture selection (max 10, 1 primary + 9 supporting)",
        "Correction model: sideCorrections (operator) terpisah dari sideAutomaticAnalysis (CV pipeline)",
        "Color coding: Biru = otomatis, Oranye = koreksi sedang, Kuning = diterima",
        "Timeline frame dengan indikator baseline, elapsed time, frame index",
    ],
    "Finalization & Result": [
        "canFinalizeTestRun() dengan validasi ketat: real capture butuh CV evidence",
        "FinalAnalysisReport immutable setelah finalisasi (analysisSource: 'simulation' | 'real')",
        "CSV export dengan traceability penuh (KP → Sample → TestRun → Capture Moment)",
        "Simulation finalization: deterministic fixture, dual-camera (Side + Front)",
        "Real finalization: DIBLOKIR sampai CV pipeline terintegrasi (explisit blocker)",
    ],
    "Hybrid Local-Server & Sync": [
        "Local-first: semua operasi offline-capable, IndexedDB + localStorage",
        "PostgreSQL persistence untuk KP, Sample, TestRun, FinalResult, MediaReference",
        "Optimistic concurrency: integer version column pada kode_pengujian",
        "Cascade-delete audit: ON DELETE RESTRICT pada FK kritis (sample_id, test_run_id)",
        "Sync status badges: Lokal / Menunggu Sinkronisasi / Tersinkron / Gagal Sinkronisasi",
        "HTTP sync roundtrip dengan konflik resolution (last-write-wins + version check)",
        "Auth enforced pada semua endpoint API (session cookie HttpOnly)",
    ],
    "CV Contract Foundation (P7A)": [
        "SideAnalysisRequest v1: multi-frame, baseline, orientation, calibration nullable",
        "SideAnalysisResponse v1: method-agnostic, geometry, measurements, segmentation (assetId), quality (qcStatus), calibrationUsed",
        "SideAnalysisEngine port: analyze() + isAvailable(), error codes terstruktur",
        "sideAutomaticAnalysis field di AnalysisDraft (pisah dari sideCorrections)",
        "Staleness detection: assetId mismatch setelah recapture",
        "No silent defaults, no Base64, versioned contracts",
    ],
}

COMPLETED_FEATURES = [
    "Autentikasi login/sesi dengan cookie HttpOnly",
    "Dashboard ringkasan sistem",
    "CRUD Kode Pengujian (Create, Read, List, Update status)",
    "CRUD Sampel dalam KP (Create, Read, position auto-increment)",
    "CRUD TestRun dalam Sampel (Create, Read, Recipe snapshot, Setpoint)",
    "Capture TestRun: Simulasi (fixture) + Real (kamera side + video + frame)",
    "Save Policy: Review Mode & Auto Mode dengan guard unsaved data",
    "Baseline pre-spray selection (initial window / manual range)",
    "Analysis Workspace: Original view, Mask/Overlay placeholder, Timeline, Inspector",
    "Primary + Supporting capture moment selection",
    "Correction UX: geometry adjustment dengan color coding",
    "Finalisasi Simulation TestRun (FinalAnalysisReport immutable)",
    "CSV Export hasil final dengan traceability penuh",
    "Hybrid persistence: Local (IndexedDB/localStorage) + Server (PostgreSQL)",
    "HTTP Sync: push KP aggregate, media manifest, conflict resolution",
    "Optimistic concurrency control (version column)",
    "Cascade-delete protection (ON DELETE RESTRICT)",
    "Sync status badges di UI (Lokal/Menunggu/Tersinkron/Gagal)",
    "CV Contract Foundation: Request/Response v1 schemas, SideAnalysisEngine port, domain model separation",
    "Legacy Batch routes redirect ke canonical KP routes",
    "Comprehensive test suite: 413+ tests passing (unit, integration, e2e)",
    "Quality gates: lint, typecheck, build, git diff --check all passing",
]

SIMULATION_WAITING = [
    "Hardware kamera Side/Front: belum terintegrasi penuh (menggunakan getUserMedia browser, mock di test)",
    "Real CV Pipeline (YOLO/plume segmentation/OCR): BELUM TERSEDIA",
    "   - SideAnalysisEngine: hanya UnavailableSideAnalysisEngine (SERVICE_UNAVAILABLE)",
    "   - Fastify /api/analysis/side endpoint: BELUM DIBUAT",
    "   - Python service/process adapter: BELUM DIBUAT",
    "   - Mask storage protocol: BELUM DITENTUKAN",
    "   - Real sample output (JSON + mask PNG): BELUM ADA",
    "Real TestRun Finalization: DIBLOKIR eksplisit di canFinalizeTestRun()",
    "   - Error: 'Real capture finalization blocked: Side CV analysis pipeline not integrated'",
    "   - Perlu genuine automatic analysis evidence (sideAutomaticAnalysis) untuk unblock",
    "PDF Report Resmi: menunggu template/desain dari client",
    "Front Camera Analysis: hardware Front belum ada, analisis Side-only only",
    "Calibration OCR/Physical Reference: masih manual (anchor points UI)",
]

NEXT_STEPS = [
    ("P7B: Real CV Integration", [
        "Menerima spec interface Python service dari CV team (HTTP/CLI, asset storage, auth)",
        "Implement Fastify POST /api/analysis/side dengan validasi kontrak",
        "Implement HttpSideAnalysisEngine adapter (web) + ProcessAdapter/HTTPAdapter",
        "Integrasikan mask asset storage (shared volume / upload endpoint / S3)",
        "Unblock real TestRun finalization di canFinalizeTestRun()",
        "UI: tombol 'Analisis Otomatis', render Mask/Overlay dari asset, tampilkan auto measurements (biru)",
    ]),
    ("P8: Polish & Production Hardening", [
        "PDF Report generator dengan template client (typst / puppeteer / docx)",
        "Performance optimization: chunk splitting, lazy load analysis pages",
        "Accessibility audit (WCAG 2.2 AA): keyboard nav, ARIA, contrast",
        "Load testing sync service dengan concurrent KP",
        "Backup/restore strategy untuk IndexedDB + PostgreSQL",
        "Dockerize API + Web untuk deployment staging",
    ]),
    ("P9: Multi-camera & Advanced Analysis", [
        "Front camera hardware integration (bila tersedia)",
        "Synchronized capture Side + Front (jika hardware mendukung)",
        "Temporal aggregation (stable window mean/median/std-dev)",
        "Supporting capture moments di final report",
        "Advanced QC metrics dari CV pipeline",
    ]),
]

def create_document():
    doc = Document()
    
    # Page setup A4
    for section in doc.sections:
        section.page_width = Cm(21.0)
        section.page_height = Cm(29.7)
        section.top_margin = Cm(2.54)
        section.bottom_margin = Cm(2.54)
        section.left_margin = Cm(2.54)
        section.right_margin = Cm(2.54)
    
    # Style configuration
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Calibri'
    font.size = Pt(11)
    font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)  # slate-800
    style.paragraph_format.space_after = Pt(6)
    style.paragraph_format.line_spacing = 1.15
    
    # Heading styles
    for level in range(1, 4):
        heading_style = doc.styles[f'Heading {level}']
        heading_style.font.name = 'Calibri'
        heading_style.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)  # slate-900
        if level == 1:
            heading_style.font.size = Pt(20)
            heading_style.font.bold = True
            heading_style.paragraph_format.space_before = Pt(18)
            heading_style.paragraph_format.space_after = Pt(10)
        elif level == 2:
            heading_style.font.size = Pt(16)
            heading_style.font.bold = True
            heading_style.paragraph_format.space_before = Pt(14)
            heading_style.paragraph_format.space_after = Pt(8)
        elif level == 3:
            heading_style.font.size = Pt(13)
            heading_style.font.bold = True
            heading_style.paragraph_format.space_before = Pt(10)
            heading_style.paragraph_format.space_after = Pt(6)
    
    # ===== TITLE PAGE =====
    for _ in range(6):
        doc.add_paragraph('')
    
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run('LAPORAN KEMAJUAN PROJECT SPRAYBOT')
    run.font.size = Pt(28)
    run.font.bold = True
    run.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    
    doc.add_paragraph('')
    
    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = subtitle.add_run('Sistem Pengujian dan Analisis Spray Botol\nMesin Uji Spray Botol — Software MVP')
    run.font.size = Pt(14)
    run.font.color.rgb = RGBColor(0x47, 0x55, 0x69)  # slate-600
    
    doc.add_paragraph('')
    doc.add_paragraph('')
    
    meta = doc.add_paragraph()
    meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = meta.add_run('Tanggal: 28 Oktober 2026\nVersi: 1.0 (Checkpoint Post-Client Meeting)\nStatus: Internal Review')
    run.font.size = Pt(11)
    run.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)  # slate-500
    
    doc.add_page_break()
    
    # ===== TABLE OF CONTENTS (Manual) =====
    doc.add_heading('Daftar Isi', level=1)
    toc_items = [
        '1. Gambaran Umum',
        '2. Ringkasan Perubahan Setelah Meeting Client',
        '3. Dokumentasi Progress Sistem (Screenshot)',
        '4. Progress Teknis Detail',
        '5. Fitur yang Sudah Selesai',
        '6. Fitur yang Masih Simulasi / Menunggu Integrasi',
        '7. Rencana Selanjutnya',
        '8. Kesimpulan',
    ]
    for item in toc_items:
        p = doc.add_paragraph(item)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.left_indent = Cm(1)
    
    doc.add_page_break()
    
    # ===== 1. GAMBARAN UMUM =====
    doc.add_heading('1. Gambaran Umum', level=1)
    doc.add_paragraph(
        'Project Spraybot (Mesin Uji Spray Botol) mengembangkan software-first MVP untuk antarmuka '
        'operator dan analis dalam menguji kualitas spray botol. Hardware fisik (mesin, kamera, PLC) '
        'belum tersedia, sehingga pengembangan berfokus pada antarmuka pengguna yang kredibel, '
        'deterministik, dan siap menerima integrasi hardware/CV di masa depan.'
    )
    doc.add_paragraph(
        'Arsitektur mengikuti pola three-layer: Presentation (React + Tailwind), Application/Domain '
        '(TypeScript, pure functions, ports), dan Data/Infrastructure (IndexedDB lokal, PostgreSQL server, '
        'HTTP sync). Seluruh domain logic bersifat hardware-agnostic dan tidak mengandung asumsi '
        'tentang implementasi CV spesifik (YOLO, dll).'
    )
    doc.add_paragraph(
        'Checkpoint ini mencatat progress setelah meeting client, dengan highlight pada migrasi arsitektur '
        'dari konsep "Batch" lama ke hierarki "Kode Pengujian → Sample → TestRun", implementasi capture '
        'per TestRun dengan save policy, video+frame persistence, analysis workspace, correction model, '
        'finalisasi immutable, hybrid local-server sync, dan fondasi kontrak CV.'
    )
    
    # ===== 2. RINGKASAN PERUBAHAN SETELAH MEETING CLIENT =====
    doc.add_heading('2. Ringkasan Perubahan Setelah Meeting Client', level=1)
    changes = [
        ('Hierarki Data Baru', 'Batch digantikan oleh Kode Pengujian (KP) yang mengandung multiple Sample, '
         'setiap Sample memiliki multiple TestRun. Setiap TestRun memiliki capture session, analysis draft, '
         'dan final report independen.'),
        ('Capture per TestRun', 'Pengambilan data (capture) sekarang terikat ke TestRun individual, bukan '
         'batch-level. Mendukung mode Simulasi (fixture deterministik) dan Real (kamera side hardware + video recording).'),
        ('Save Policy', 'Dua mode: Review Mode (default, operator harus klik Simpan setelah review) dan '
         'Auto Mode (persist otomatis). Dilengkapi unsaved data guard (beforeunload + navigation confirmation).'),
        ('Video + Frame Persistence', 'Video rekaman (WebM) disimpan dengan asset ID deterministik. '
         'Frame individual diekstrak dan disimpan sebagai blob di IndexedDB, referensi di PostgreSQL via media_references.'),
        ('Analysis Workspace Real', 'Workspace analisis Side-only untuk real capture. View: Original (selalu tersedia), '
         'Mask & Overlay (placeholder menunggu CV pipeline). Timeline frame dengan baseline indicator. '
         'Inspector: pengukuran otomatis (biru), koreksi operator (oranye), accepted (kuning).'),
        ('Correction Model', 'Pemisahan eksplisit: sideAutomaticAnalysis (evidence CV pipeline) vs '
         'sideCorrections (koreksi operator). Staleness detection via assetId mismatch.'),
        ('Finalisasi & Result', 'FinalAnalysisReport immutable (analysisSource: simulation|real). '
         'Simulation: deterministic fixture, dual-camera. Real: DIBLOKIR sampai CV evidence tersedia. '
         'CSV export dengan traceability penuh.'),
        ('Hybrid Local-Server Sync', 'Local-first offline-capable. PostgreSQL persistence dengan optimistic '
         'concurrency (version column). Sync status badges di UI. HTTP sync dengan conflict resolution. '
         'Cascade-delete protection (ON DELETE RESTRICT). Auth enforced pada semua endpoint.'),
        ('CV Contract Foundation (P7A)', 'Versioned transport-neutral contracts (SideAnalysisRequest/Response v1). '
         'SideAnalysisEngine application port. Domain model separation (automatic vs correction). '
         'No silent defaults, no Base64, schema validation di @spray-paragon/contracts.'),
    ]
    for title_text, desc in changes:
        p = doc.add_paragraph()
        run = p.add_run(f'{title_text}: ')
        run.bold = True
        p.add_run(desc)
    
    doc.add_page_break()
    
    # ===== 3. DOKUMENTASI PROGRESS SISTEM (SCREENSHOTS) =====
    doc.add_heading('3. Dokumentasi Progress Sistem', level=1)
    doc.add_paragraph(
        'Berikut screenshot halaman-halaman utama aplikasi Spraybot per 28 Oktober 2026. '
        'Screenshot diambil dari aplikasi yang berjalan di localhost:5173 (Vite dev server).'
    )
    
    figure_num = 1
    for filename, caption, description in SCREENSHOTS:
        filepath = SCREENSHOT_DIR / filename
        if filepath.exists():
            doc.add_heading(f'{caption}', level=2)
            
            # Add image
            try:
                # Calculate width to fit page (max 17cm for A4 with margins)
                doc.add_picture(str(filepath), width=Cm(17))
            except Exception as e:
                p = doc.add_paragraph(f'[Gagal memuat gambar: {e}]')
                p.runs[0].font.color.rgb = RGBColor(0xDC, 0x26, 0x26)
            
            # Caption
            cap = doc.add_paragraph()
            cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = cap.add_run(caption)
            run.font.size = Pt(10)
            run.font.italic = True
            run.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)
            
            # Description
            desc_para = doc.add_paragraph(description)
            desc_para.paragraph_format.space_after = Pt(12)
            desc_para.runs[0].font.size = Pt(10)
            desc_para.runs[0].font.color.rgb = RGBColor(0x47, 0x55, 0x69)
            
            figure_num += 1
        else:
            print(f"Warning: {filepath} not found")
    
    doc.add_page_break()
    
    # ===== 4. PROGRESS TEKNIS DETAIL =====
    doc.add_heading('4. Progress Teknis Detail', level=1)
    
    for category, items in TECHNICAL_PROGRESS.items():
        doc.add_heading(category, level=2)
        for item in items:
            p = doc.add_paragraph(item, style='List Bullet')
            p.paragraph_format.space_after = Pt(2)
    
    doc.add_page_break()
    
    # ===== 5. FITUR YANG SUDAH SELESAI =====
    doc.add_heading('5. Fitur yang Sudah Selesai', level=1)
    doc.add_paragraph(
        'Daftar fitur yang telah diimplementasi, diuji (413+ tests passing), dan lulus quality gates '
        '(lint, typecheck, build, git diff --check).'
    )
    for feature in COMPLETED_FEATURES:
        p = doc.add_paragraph(feature, style='List Bullet')
        p.paragraph_format.space_after = Pt(2)
    
    # ===== 6. FITUR YANG MASIH SIMULASI / MENUNGGU INTEGRASI =====
    doc.add_heading('6. Fitur yang Masih Simulasi / Menunggu Integrasi', level=1)
    doc.add_paragraph(
        'Berikut status jujur dari fitur-fitur yang belum sepenuhnya terintegrasi atau masih menggunakan '
        'fixture/mock data. Ini bukan kegagalan, melainkan keputusan arsitektur eksplisit (software-first MVP).'
    )
    for item in SIMULATION_WAITING:
        p = doc.add_paragraph(item, style='List Bullet')
        p.paragraph_format.space_after = Pt(2)
    
    doc.add_page_break()
    
    # ===== 7. RENCANA SELANJUTNYA =====
    doc.add_heading('7. Rencana Selanjutnya', level=1)
    
    for phase, tasks in NEXT_STEPS:
        doc.add_heading(phase, level=2)
        for task in tasks:
            p = doc.add_paragraph(task, style='List Bullet')
            p.paragraph_format.space_after = Pt(2)
    
    doc.add_page_break()
    
    # ===== 8. KESIMPULAN =====
    doc.add_heading('8. Kesimpulan', level=1)
    doc.add_paragraph(
        'Project Spraybot telah mencapai milestone signifikan pasca-meeting client. Arsitektur telah '
        'dimigrasi sepenuhnya dari konsep Batch lama ke hierarki Kode Pengujian → Sample → TestRun '
        'yang lebih sesuai dengan kebutuhan operasional client. Seluruh alur capture, analysis, correction, '
        'dan finalisasi untuk simulasi sudah berfungsi end-to-end dengan data fixture deterministik.'
    )
    doc.add_paragraph(
        'Infrastruktur hybrid local-server sudah production-ready: PostgreSQL persistence dengan '
        'optimistic concurrency, cascade-delete protection, HTTP sync dengan conflict resolution, '
        'dan auth enforced. Quality gates (lint, typecheck, 413+ tests, build) semua lulus.'
    )
    doc.add_paragraph(
        'Bloker utama saat ini adalah ketersediaan Real CV Pipeline. Kontrak fondasi (P7A) sudah '
        'disiapkan: versioned request/response schemas, application port (SideAnalysisEngine), '
        'domain model separation (automatic vs correction), dan staleness detection. Real TestRun '
        'finalization sengaja diblokir (canFinalizeTestRun return ok=false) sampai genuine CV evidence '
        'tersedia. Ini mencegah false confidence dan memastikan integritas data.'
    )
    doc.add_paragraph(
        'Langkah kritis selanjutnya (P7B) adalah integrasi dengan Python CV service dari tim CV. '
        'Perlu: interface spec (HTTP/CLI), asset storage protocol, method identifier, calibration '
        'handling, QC semantics, dan minimal satu real sample output untuk integration testing. '
        'Setelah P7B selesai, real capture Side-only akan bisa difinalisasi dan sistem siap untuk '
        'pilot production.'
    )
    doc.add_paragraph(
        'PDF report resmi masih menunggu template/desain dari client. CSV export sudah berfungsi '
        'sebagai interim deliverable untuk data exchange.'
    )
    
    # Save
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(OUTPUT_PATH))
    print(f"Document saved to: {OUTPUT_PATH}")
    print(f"Total screenshots embedded: {figure_num - 1}")


if __name__ == "__main__":
    create_document()