#!/usr/bin/env python3
"""
Playwright script to capture screenshots of Spraybot application pages.
"""

import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5173"
SCREENSHOT_DIR = Path("docs/progress-checkpoint/assets")
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

# Page definitions: (route, description, wait_for_selector)
PAGES = [
    ("/login", "Login Page", "text=Masuk ke Spraybot"),
    ("/dashboard", "Dashboard", "text=Dasbor"),
    ("/kode-pengujian", "Kode Pengujian List", "text=Kode Pengujian"),
    ("/kode-pengujian/new", "Form Kode Pengujian", "text=Kode Pengujian Baru"),
    ("/batches", "Batch List (Legacy)", "text=Batch"),
    ("/batches/new", "Form Batch (Legacy)", "text=Batch Baru"),
    ("/reports", "Reports", "text=Laporan"),
    ("/products", "Products", "text=Produk"),
    ("/calibration", "Calibration", "text=Kalibrasi"),
    ("/users", "Users", "text=Pengguna"),
    ("/settings", "Settings", "text=Pengaturan"),
]


def capture_screenshot(page, route, description, selector):
    """Navigate to a page and capture screenshot."""
    url = f"{BASE_URL}{route}"
    print(f"Capturing: {description} ({url})")
    
    try:
        page.goto(url, wait_until="networkidle", timeout=30000)
        page.wait_for_selector(selector, timeout=10000)
        time.sleep(1)  # Let animations settle
        
        # Generate filename
        safe_name = description.lower().replace(" ", "_").replace("(", "").replace(")", "").replace("/", "_")
        filename = SCREENSHOT_DIR / f"{safe_name}.png"
        
        page.screenshot(path=str(filename), full_page=True)
        print(f"  Saved: {filename}")
        return filename
    except Exception as e:
        print(f"  ERROR: {e}")
        return None


def login(page):
    """Login to the application."""
    print("Logging in...")
    page.goto(f"{BASE_URL}/login", wait_until="networkidle")
    page.fill('input[type="email"]', "operator@local.test")
    page.fill('input[type="password"]', "spraybot123")
    page.click('button[type="submit"]')
    page.wait_for_url(f"{BASE_URL}/dashboard", timeout=10000)
    print("Login successful")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()
        
        # Login first
        login(page)
        time.sleep(1)
        
        # Capture login page (already at dashboard, go back)
        page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        page.wait_for_selector("text=Masuk ke Spraybot")
        login_path = SCREENSHOT_DIR / "login_page.png"
        page.screenshot(path=str(login_path), full_page=True)
        print(f"Saved: {login_path}")
        
        # Capture all pages
        screenshots = []
        for route, description, selector in PAGES:
            if route == "/login":
                continue  # Already captured
            
            path = capture_screenshot(page, route, description, selector)
            if path:
                screenshots.append((description, path, route))
        
        # Also capture Kode Pengujian detail page if possible
        # Need to navigate to a KP detail first
        try:
            page.goto(f"{BASE_URL}/kode-pengujian", wait_until="networkidle")
            page.wait_for_selector("text=Kode Pengujian", timeout=10000)
            time.sleep(1)
            
            # Try to click on first KP if exists
            kp_links = page.query_selector_all('a[href^="/kode-pengujian/"]')
            if kp_links:
                kp_links[0].click()
                page.wait_for_url("**/kode-pengujian/**", timeout=10000)
                time.sleep(1)
                kp_detail_path = SCREENSHOT_DIR / "kode_pengujian_detail.png"
                page.screenshot(path=str(kp_detail_path), full_page=True)
                screenshots.append(("Kode Pengujian Detail", kp_detail_path, page.url))
                print(f"Saved: {kp_detail_path}")
        except Exception as e:
            print(f"Could not capture KP detail: {e}")
        
        browser.close()
        
        print("\n=== Screenshots captured ===")
        for desc, path, route in screenshots:
            print(f"  {desc}: {path} ({route})")


if __name__ == "__main__":
    main()