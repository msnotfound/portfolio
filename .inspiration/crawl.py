import asyncio
import json
import os
import re
import shutil
import sys
from pathlib import Path
from urllib.parse import urlparse

from playwright.async_api import async_playwright

OUT_ROOT = Path(__file__).parent / "captures"

SITES_BATCH_1 = [
    "https://bruno-simon.com/",
    "https://dennissnellenberg.com/",
    "https://rauno.me/",
    "https://cuberto.com/",
    "https://www.dragonfly.xyz/",
    "https://prashil.is-a.dev/",
]
SITES_BATCH_2 = [
    "https://gsap.com/showcase/",
    "https://www.awwwards.com/websites/gsap/",
    "https://muz.li/blog/top-100-most-creative-and-unique-portfolio-websites-of-2025/",
]

ASSET_TYPES = {"image", "font", "media"}
MAX_ASSET_BYTES = 15 * 1024 * 1024
MAX_TOTAL_BYTES = 150 * 1024 * 1024
PER_SITE_TIMEOUT = 150
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/125.0 Safari/537.36")
COOKIE_LABELS = ["Accept All", "Accept all", "I agree", "Accept", "Got it", "I Accept"]


def slug(url: str) -> str:
    p = urlparse(url)
    s = (p.netloc + p.path).strip("/").replace("/", "_")
    s = re.sub(r"[^a-zA-Z0-9_.-]", "_", s)
    return s or "site"


async def zigzag_move(page, width, height, rows=4, points_per_row=5, pause=0.12):
    y_step = height / rows
    for r in range(rows):
        y = int(y_step * (r + 0.5))
        xs = list(range(40, width - 40, max(1, (width - 80) // points_per_row)))
        if r % 2 == 1:
            xs = xs[::-1]
        for x in xs:
            try:
                await page.mouse.move(x, y, steps=6)
            except Exception:
                pass
            await asyncio.sleep(pause)


async def _capture_site_inner(url: str, batch_label: str) -> dict:
    name = slug(url)
    out_dir = OUT_ROOT / name
    shots_dir = out_dir / "screenshots"
    assets_dir = out_dir / "assets"
    shots_dir.mkdir(parents=True, exist_ok=True)
    assets_dir.mkdir(parents=True, exist_ok=True)

    downloaded = []
    total_bytes_box = {"n": 0}
    seen_urls = set()
    response_tasks = []

    meta = {"url": url, "batch": batch_label, "status": "ok"}

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            record_video_dir=str(out_dir),
            record_video_size={"width": 1440, "height": 900},
            user_agent=UA,
        )
        page = await context.new_page()

        async def on_response(response):
            try:
                req = response.request
                rtype = req.resource_type
                if rtype not in ASSET_TYPES:
                    return
                rurl = response.url
                if rurl in seen_urls or response.status >= 400:
                    return
                body = await response.body()
                if not body or len(body) > MAX_ASSET_BYTES:
                    return
                if total_bytes_box["n"] + len(body) > MAX_TOTAL_BYTES:
                    return
                seen_urls.add(rurl)
                total_bytes_box["n"] += len(body)
                base = os.path.basename(urlparse(rurl).path) or "asset"
                fname = re.sub(r"[^a-zA-Z0-9_.-]", "_", base)[:100]
                fpath = assets_dir / f"{len(downloaded):03d}_{fname}"
                fpath.write_bytes(body)
                downloaded.append({"url": rurl, "type": rtype, "bytes": len(body), "file": fpath.name})
            except Exception:
                pass

        def handle_response(response):
            response_tasks.append(asyncio.create_task(on_response(response)))

        page.on("response", handle_response)

        try:
            await page.goto(url, wait_until="load", timeout=45000)
            await asyncio.sleep(2)

            for label in COOKIE_LABELS:
                try:
                    btn = page.get_by_text(label, exact=False)
                    await btn.first.click(timeout=1200)
                    await asyncio.sleep(0.5)
                    break
                except Exception:
                    continue

            async def safe_shot(path):
                try:
                    await page.screenshot(path=str(path), timeout=12000)
                except Exception as shot_err:
                    print(f"  (screenshot failed for {path.name}: {shot_err})", flush=True)

            await safe_shot(shots_dir / "00_top.png")
            await zigzag_move(page, 1440, 900, rows=4, points_per_row=5, pause=0.1)

            try:
                height = await page.evaluate("document.body.scrollHeight")
            except Exception:
                height = 0
            viewport_h = 900
            steps = max(4, min(10, height // viewport_h)) if height else 4

            for i in range(steps):
                scroll_y = int((height - viewport_h) * (i + 1) / steps) if height > viewport_h else 0
                try:
                    await page.evaluate(f"window.scrollTo({{top: {scroll_y}, behavior: 'smooth'}})")
                except Exception:
                    pass
                await asyncio.sleep(0.8)
                await zigzag_move(page, 1440, 900, rows=4, points_per_row=5, pause=0.1)
                await safe_shot(shots_dir / f"{i + 1:02d}_scroll.png")

            try:
                anims = await page.evaluate(
                    """
                    () => {
                        const els = document.querySelectorAll('*');
                        const out = [];
                        for (const el of els) {
                            const list = el.getAnimations ? el.getAnimations() : [];
                            for (const a of list) {
                                out.push({
                                    tag: el.tagName,
                                    cls: el.className && el.className.toString ? el.className.toString().slice(0, 80) : '',
                                    playState: a.playState,
                                    timing: (a.effect && a.effect.getTiming) ? a.effect.getTiming() : null,
                                });
                            }
                        }
                        return out.slice(0, 300);
                    }
                    """
                )
            except Exception:
                anims = []
            (out_dir / "animations.json").write_text(json.dumps(anims, indent=2))

            await safe_shot(shots_dir / "99_final.png")
            meta["title"] = await page.title()
            meta["scroll_height"] = height
            meta["steps"] = steps

            await asyncio.gather(*response_tasks, return_exceptions=True)
        except Exception as e:
            meta["status"] = "error"
            meta["error"] = str(e)
        finally:
            await context.close()
            try:
                vid_path = await page.video.path()
                if vid_path and os.path.exists(vid_path):
                    shutil.move(vid_path, str(out_dir / "session.webm"))
            except Exception:
                pass
            await browser.close()

    meta["assets_downloaded"] = downloaded
    meta["assets_total_bytes"] = total_bytes_box["n"]
    (out_dir / "meta.json").write_text(json.dumps(meta, indent=2))
    return meta


async def capture_site(url: str, batch_label: str) -> dict:
    try:
        return await asyncio.wait_for(_capture_site_inner(url, batch_label), timeout=PER_SITE_TIMEOUT)
    except asyncio.TimeoutError:
        return {"url": url, "batch": batch_label, "status": "timeout"}
    except Exception as e:
        return {"url": url, "batch": batch_label, "status": "error", "error": str(e)}


async def run_batch(urls, label):
    print(f"=== Starting {label}: {len(urls)} sites ===", flush=True)
    results = await asyncio.gather(*(capture_site(u, label) for u in urls))
    for r in results:
        print(f"[{r.get('status')}] {r.get('url')} -- {r.get('title', r.get('error', ''))}", flush=True)
    return results


async def main():
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    all_results = []
    all_results += await run_batch(SITES_BATCH_1, "batch1")
    all_results += await run_batch(SITES_BATCH_2, "batch2")
    (OUT_ROOT / "_summary.json").write_text(json.dumps(all_results, indent=2, default=str))
    print("=== DONE ===", flush=True)


async def retry(urls):
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    results = await run_batch(urls, "retry")
    print("=== RETRY DONE ===", flush=True)
    return results


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "retry":
        asyncio.run(retry(sys.argv[2:]))
    else:
        asyncio.run(main())
