"""
Spraybot Plume Segmentation Inference Engine
Model: Ultralytics YOLOv8s-seg (fine-tuned on spray_plume)
"""

import sys
import os
import json
import base64
import argparse
from pathlib import Path
import numpy as np
import cv2

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False


DEFAULT_MODEL_PATH = Path(__file__).parent / "spraybot_seg_video_finetuned.pt"


def load_model(model_path: str = None):
    if not YOLO_AVAILABLE:
        raise RuntimeError("Package 'ultralytics' tidak terinstall di environment Python.")
    
    path = Path(model_path) if model_path else DEFAULT_MODEL_PATH
    if not path.exists():
        # Fallback to model.pt if exists
        alt_path = Path(__file__).parent / "model.pt"
        if alt_path.exists():
            path = alt_path
        else:
            raise FileNotFoundError(f"File model tidak ditemukan di: {path}")
    
    return YOLO(str(path))


def process_image_yolo(model, img_bgr, conf: float = 0.15, imgsz: int = 1024):
    """
    Run YOLOv8-seg inference on a BGR image.
    Returns:
        plume_detected (bool)
        confidence (float)
        plume_area_px (int)
        bbox (list: [x1, y1, x2, y2] or None)
        mask_gray (np.ndarray uint8 0/255)
        overlay_bgr (np.ndarray uint8)
    """
    h, w = img_bgr.shape[:2]
    results = model.predict(source=img_bgr, imgsz=imgsz, conf=conf, verbose=False)
    res = results[0]

    has_masks = res.masks is not None and len(res.masks) > 0

    if has_masks:
        # Union all detected plume masks
        combined_mask = np.zeros((h, w), dtype=np.uint8)
        for m in res.masks.data.cpu().numpy():
            m_resized = cv2.resize(m, (w, h), interpolation=cv2.INTER_NEAREST)
            combined_mask = np.maximum(combined_mask, (m_resized * 255).astype(np.uint8))

        boxes = res.boxes.xyxy.cpu().numpy()
        confs = res.boxes.conf.cpu().numpy()
        best_conf = float(np.max(confs))

        x1 = int(np.min(boxes[:, 0]))
        y1 = int(np.min(boxes[:, 1]))
        x2 = int(np.max(boxes[:, 2]))
        y2 = int(np.max(boxes[:, 3]))

        # Create overlay: cyan tint #06b6d4 (BGR: 212, 182, 6)
        overlay_bgr = img_bgr.copy()
        mask_bool = combined_mask > 128
        plume_area = int(np.sum(mask_bool))

        if plume_area > 0:
            cyan_color = np.array([212, 182, 6], dtype=np.uint8)
            cyan_layer = np.full_like(img_bgr, cyan_color)
            blended = cv2.addWeighted(img_bgr, 0.55, cyan_layer, 0.45, 0)
            overlay_bgr[mask_bool] = blended[mask_bool]

            # Bounding box
            cv2.rectangle(overlay_bgr, (x1, y1), (x2, y2), (238, 211, 34), 2)

        return True, best_conf, plume_area, [x1, y1, x2, y2], combined_mask, overlay_bgr

    else:
        # No plume detected
        empty_mask = np.zeros((h, w), dtype=np.uint8)
        return False, 0.0, 0, None, empty_mask, img_bgr.copy()


def encode_image_base64(img_bgr, format_ext=".jpg", quality=90):
    if format_ext == ".png":
        _, buf = cv2.imencode(".png", img_bgr)
        mime = "image/png"
    else:
        _, buf = cv2.imencode(".jpg", img_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
        mime = "image/jpeg"
    b64 = base64.b64encode(buf).decode("utf-8")
    return f"data:{mime};base64,{b64}"


def run_batch_dir(input_dir: str, output_dir: str, model_path: str = None, conf: float = 0.15):
    model = load_model(model_path)
    in_path = Path(input_dir)
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    extensions = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    image_files = sorted([f for f in in_path.iterdir() if f.suffix.lower() in extensions])

    results_meta = []
    print(f"[Model Runner] Memproses {len(image_files)} citra...")

    for idx, img_file in enumerate(image_files):
        img = cv2.imread(str(img_file))
        if img is None:
            continue

        plume_detected, confidence, plume_area, bbox, mask_gray, overlay_bgr = process_image_yolo(
            model, img, conf=conf
        )

        mask_name = f"mask_{idx:04d}.png"
        overlay_name = f"overlay_{idx:04d}.jpg"

        cv2.imwrite(str(out_path / mask_name), mask_gray)
        cv2.imwrite(str(out_path / overlay_name), overlay_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 90])

        results_meta.append({
            "frameIndex": idx,
            "sourceFile": img_file.name,
            "plumeDetected": plume_detected,
            "confidence": round(confidence, 4),
            "plumeAreaPx": plume_area,
            "bbox": bbox,
            "maskFile": mask_name,
            "overlayFile": overlay_name,
        })

    with open(out_path / "results.json", "w", encoding="utf-8") as f:
        json.dump(results_meta, f, indent=2)

    print(f"[Model Runner] Selesai. Hasil disimpan di: {out_path}")


def run_stdin_mode(model_path: str = None, conf: float = 0.15):
    """
    Interactive JSON line-by-line protocol over stdin/stdout.
    """
    model = load_model(model_path)
    # Print ready handshake
    sys.stdout.write(json.dumps({"status": "ready", "model": str(DEFAULT_MODEL_PATH.name)}) + "\n")
    sys.stdout.flush()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        if line == "QUIT" or line == "EXIT":
            break

        try:
            req = json.loads(line)
            frame_index = req.get("frameIndex", 0)
            timestamp_ms = req.get("timestampMs", 0)

            # Decode base64 image
            if "imageBase64" in req:
                raw_b64 = req["imageBase64"]
                if "," in raw_b64:
                    raw_b64 = raw_b64.split(",", 1)[1]
                img_bytes = base64.b64decode(raw_b64)
                np_arr = np.frombuffer(img_bytes, np.uint8)
                img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            elif "imagePath" in req:
                img = cv2.imread(req["imagePath"])
            else:
                raise ValueError("Request harus memiliki 'imageBase64' atau 'imagePath'")

            if img is None:
                raise ValueError("Gagal membaca citra")

            plume_detected, confidence, plume_area, bbox, mask_gray, overlay_bgr = process_image_yolo(
                model, img, conf=conf
            )

            mask_b64 = encode_image_base64(mask_gray, format_ext=".png")
            overlay_b64 = encode_image_base64(overlay_bgr, format_ext=".jpg")

            resp = {
                "frameIndex": frame_index,
                "timestampMs": timestamp_ms,
                "plumeDetected": plume_detected,
                "confidence": round(confidence, 4),
                "plumeAreaPx": plume_area,
                "bbox": bbox,
                "maskImageUrl": mask_b64,
                "overlayImageUrl": overlay_b64,
                "status": "success",
            }
            sys.stdout.write(json.dumps(resp) + "\n")
            sys.stdout.flush()

        except Exception as e:
            err_resp = {
                "status": "error",
                "message": str(e),
                "frameIndex": req.get("frameIndex", -1) if 'req' in locals() else -1
            }
            sys.stdout.write(json.dumps(err_resp) + "\n")
            sys.stdout.flush()


def parse_args():
    parser = argparse.ArgumentParser(description="Spraybot Segmentation Model Inference")
    parser.add_argument("--input-dir", type=str, help="Folder berisi frame citra JPG/PNG")
    parser.add_argument("--output-dir", type=str, help="Folder untuk menyimpan citra mask & overlay")
    parser.add_argument("--model-path", type=str, default=str(DEFAULT_MODEL_PATH), help="Path ke file model")
    parser.add_argument("--conf", type=float, default=0.15, help="Confidence threshold (default 0.15)")
    parser.add_argument("--stdin", action="store_true", help="Jalankan mode interaktif stdin/stdout JSON")
    return parser.parse_args()


def main():
    args = parse_args()
    if args.stdin:
        run_stdin_mode(model_path=args.model_path, conf=args.conf)
    elif args.input_dir and args.output_dir:
        run_batch_dir(args.input_dir, args.output_dir, model_path=args.model_path, conf=args.conf)
    else:
        # Default verification
        model = load_model(args.model_path)
        print(f"Model berhasil dimuat dari: {args.model_path}")
        print(f"Classes: {model.names}")


if __name__ == "__main__":
    main()
