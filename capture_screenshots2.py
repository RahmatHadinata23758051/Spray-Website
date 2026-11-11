#!/usr/bin/env python3
"""
Playwright script to capture screenshots of TestRun pages (Capture, Analysis, Result).
"""

import os
import time
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5173"
SCREENSHOT_DIR = Path("docs/progress-checkpoint/assets")
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)


def login(page):
    """Login to the application."""
    print("Logging in...")
    page.goto(f"{BASE_URL}/login", wait_until="networkidle")
    page.fill('input[type="email"]', "operator@local.test")
    page.fill('input[type="password"]', "spraybot123")
    page.click('button[type="submit"]')
    page.wait_for_url(f"{BASE_URL}/dashboard", timeout=10000)
    print("Login successful")


def safe_wait(page, selector, timeout=10000):
    """Safe wait for selector."""
    try:
        page.wait_for_selector(selector, timeout=timeout)
        return True
    except:
        return False


def safe_click(page, selector, timeout=5000):
    """Safe click with force if needed."""
    try:
        page.click(selector, timeout=timeout, force=True)
        return True
    except:
        return False


def capture_testrun_pages(page):
    """Navigate through KP -> Sample -> TestRun -> Capture/Analysis/Result."""
    screenshots = []
    
    # First, navigate to Kode Pengujian list
    print("Navigating to Kode Pengujian...")
    page.goto(f"{BASE_URL}/kode-pengujian", wait_until="networkidle")
    safe_wait(page, "text=Kode Pengujian", 10000)
    time.sleep(1)
    
    # Capture the KP list page
    kp_list_path = SCREENSHOT_DIR / "kode_pengujian_list_full.png"
    page.screenshot(path=str(kp_list_path), full_page=True)
    screenshots.append(("Kode Pengujian List", kp_list_path))
    print(f"Saved: {kp_list_path}")
    
    # Try to find any KP link
    kp_links = page.query_selector_all('a[href^="/kode-pengujian/"]')
    kp_id = None
    
    for link in kp_links:
        href = link.get_attribute("href")
        if href and "/new" not in href and "/samples" not in href:
            # This is a KP detail link
            match = re.search(r'/kode-pengujian/([^/]+)', href)
            if match:
                kp_id = match.group(1)
                print(f"Found KP: {kp_id}")
                link.click()
                time.sleep(2)
                break
    
    if not kp_id:
        # Create a new KP
        print("Creating new KP...")
        page.goto(f"{BASE_URL}/kode-pengujian/new", wait_until="networkidle")
        safe_wait(page, "text=Kode Pengujian Baru", 10000)
        
        # Fill form - try to select product and recipe
        try:
            product_selects = page.query_selector_all('select')
            if len(product_selects) > 0:
                product_selects[0].select_option(index=1)
            if len(product_selects) > 1:
                product_selects[1].select_option(index=1)
            
            create_btn = page.query_selector('button:has-text("Buat"), button:has-text("Simpan"), button[type="submit"]')
            if create_btn:
                create_btn.click()
                time.sleep(2)
                url = page.url
                match = re.search(r'/kode-pengujian/([^/]+)', url)
                if match:
                    kp_id = match.group(1)
        except Exception as e:
            print(f"Could not create KP: {e}")
    
    # If we have a KP ID, try to work with it
    if kp_id:
        print(f"Working with KP: {kp_id}")
        page.goto(f"{BASE_URL}/kode-pengujian/{kp_id}", wait_until="networkidle")
        time.sleep(2)
        
        kp_detail_path = SCREENSHOT_DIR / "kode_pengujian_detail_full.png"
        page.screenshot(path=str(kp_detail_path), full_page=True)
        screenshots.append(("Kode Pengujian Detail", kp_detail_path))
        print(f"Saved: {kp_detail_path}")
        
        # Try to add a sample
        add_sample = page.query_selector('button:has-text("Tambah"), button:has-text("Add"), button:has-text("Sampel")')
        if add_sample:
            print("Adding sample...")
            add_sample.click()
            time.sleep(1)
            
            # Try to fill sample form in modal
            sample_inputs = page.query_selector_all('input')
            for inp in sample_inputs:
                placeholder = inp.get_attribute("placeholder") or ""
                name = inp.get_attribute("name") or ""
                if "kode" in placeholder.lower() or "code" in placeholder.lower() or "kode" in name.lower():
                    inp.fill("SMP-001")
                    break
            
            # Use force click to avoid interception
            safe_click(page, 'button:has-text("Simpan"), button:has-text("Save"), button:has-text("Tambah")')
            time.sleep(1)
        
        # Reload detail
        page.goto(f"{BASE_URL}/kode-pengujian/{kp_id}", wait_until="networkidle")
        time.sleep(1)
        
        kp_with_samples = SCREENSHOT_DIR / "kode_pengujian_with_samples.png"
        page.screenshot(path=str(kp_with_samples), full_page=True)
        screenshots.append(("Kode Pengujian with Samples", kp_with_samples))
        print(f"Saved: {kp_with_samples}")
        
        # Look for TestRun capture link/button
        run_capture_links = page.query_selector_all('a[href*="/capture"]')
        if not run_capture_links:
            run_capture_links = page.query_selector_all('button:has-text("Mulai"), button:has-text("Capture"), button:has-text("Pengujian")')
        
        if run_capture_links:
            print("Navigating to TestRun Capture...")
            run_capture_links[0].click()
            time.sleep(3)
            
            capture_path = SCREENSHOT_DIR / "testrun_capture.png"
            page.screenshot(path=str(capture_path), full_page=True)
            screenshots.append(("TestRun Capture", capture_path))
            print(f"Saved: {capture_path}")
            
            # Try to find analysis link
            analysis_links = page.query_selector_all('a[href*="/analysis"], button:has-text("Analisis")')
            if analysis_links:
                print("Navigating to TestRun Analysis...")
                analysis_links[0].click()
                time.sleep(3)
                analysis_path = SCREENSHOT_DIR / "testrun_analysis.png"
                page.screenshot(path=str(analysis_path), full_page=True)
                screenshots.append(("TestRun Analysis", analysis_path))
                print(f"Saved: {analysis_path}")
            
            # Try to find result link
            result_links = page.query_selector_all('a[href*="/result"], button:has-text("Hasil"), button:has-text("Result")')
            if result_links:
                print("Navigating to TestRun Result...")
                result_links[0].click()
                time.sleep(3)
                result_path = SCREENSHOT_DIR / "testrun_result.png"
                page.screenshot(path=str(result_path), full_page=True)
                screenshots.append(("TestRun Result", result_path))
                print(f"Saved: {result_path}")
        else:
            print("No TestRun capture link found - capturing current state")
            capture_path = SCREENSHOT_DIR / "testrun_capture_placeholder.png"
            page.screenshot(path=str(capture_path), full_page=True)
            screenshots.append(("TestRun Capture (placeholder - no runs yet)", capture_path))
            print(f"Saved: {capture_path}")
    
    # Also capture Batch legacy pages for comparison
    for route, name in [("/batches", "batch_list"), ("/batches/new", "batch_new")]:
        page.goto(f"{BASE_URL}{route}", wait_until="networkidle")
        time.sleep(1)
        path = SCREENSHOT_DIR / f"{name}.png"
        page.screenshot(path=str(path), full_page=True)
        screenshots.append((name.replace("_", " ").title(), path))
        print(f"Saved: {path}")
    
    return screenshots


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()
        
        login(page)
        time.sleep(1)
        
        screenshots = capture_testrun_pages(page)
        
        browser.close()
        
        print("\n=== TestRun screenshots captured ===")
        for desc, path in screenshots:
            print(f"  {desc}: {path}")


if __name__ == "__main__":
    main()