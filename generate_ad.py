#!/usr/bin/env python3
"""
AI Video Ad Generator — Arrae Clear Protein+

What runs where:
  Claude API      → generates the spoken ad script
  Higgsfield      → everything else:
                      • uploads person photo as a custom avatar
                      • uploads product photo as a product entity
                      • native TTS + lipsync via generate_audio=true
                      • 9:16 vertical ad video (Marketing Studio)

No ElevenLabs or OpenAI TTS needed — Higgsfield handles audio natively.

Usage:
  python generate_ad.py <person_photo> <product_photo>

  Example:
    python generate_ad.py person.jpg product.jpg

Env vars required:
  ANTHROPIC_API_KEY   — for ad script generation

One-time setup:
  pip install anthropic
  higgsfield auth login
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path


# ── Globals ────────────────────────────────────────────────────────────────────

_HF_BIN: str = ""   # resolved in check_dependencies()


# ── Higgsfield CLI helpers ─────────────────────────────────────────────────────

def _hf_json(*args: str) -> object:
    """Run higgsfield ... --json and return parsed JSON. Raises on non-zero exit."""
    cmd = [_HF_BIN] + list(args) + ["--json"]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(
            f"`higgsfield {' '.join(args[:3])}` failed:\n"
            f"{r.stderr.strip() or r.stdout.strip()}"
        )
    return json.loads(r.stdout)


def _hf_plain(*args: str) -> str:
    """Run higgsfield ... (no --json flag) and return raw stdout. Raises on failure."""
    cmd = [_HF_BIN] + list(args)
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(
            f"`higgsfield {' '.join(args[:3])}` failed:\n"
            f"{r.stderr.strip() or r.stdout.strip()}"
        )
    return r.stdout.strip()


def _one(data: object) -> dict:
    """Unwrap a single-item list response to a dict."""
    if isinstance(data, list):
        return data[0]
    return data  # type: ignore[return-value]


def _upload(file_path: str) -> str:
    """Upload a local file and return its upload UUID."""
    data = _one(_hf_json("upload", "create", file_path))
    uid = data.get("id") or data.get("upload_id")
    if not uid:
        raise RuntimeError(f"Upload returned no ID: {data}")
    return uid


# ── Step 0: Pre-flight ─────────────────────────────────────────────────────────

def check_dependencies() -> None:
    global _HF_BIN

    # Locate higgsfield binary
    _HF_BIN = (
        shutil.which("higgsfield")
        or shutil.which(str(Path.home() / ".local/bin/higgsfield"))
        or ""
    )
    if not _HF_BIN:
        sys.exit(
            "ERROR: higgsfield CLI not found.\n"
            "Install: curl -fsSL "
            "https://raw.githubusercontent.com/higgsfield-ai/cli/main/install.sh | sh"
        )

    # Check auth
    r = subprocess.run([_HF_BIN, "account", "status"], capture_output=True, text=True)
    if r.returncode != 0 or any(
        p in (r.stdout + r.stderr) for p in ("Not authenticated", "Session expired")
    ):
        sys.exit("ERROR: Not authenticated with Higgsfield.\nRun: higgsfield auth login")

    if not os.getenv("ANTHROPIC_API_KEY"):
        sys.exit("ERROR: ANTHROPIC_API_KEY is not set.")

    print(f"  ✓ higgsfield CLI:  {_HF_BIN}")
    print("  ✓ ANTHROPIC_API_KEY set")


# ── Step 1: Script generation (Claude) ────────────────────────────────────────

def generate_script() -> str:
    """Call Claude to write a natural 15-20 second ad script."""
    try:
        import anthropic
    except ImportError:
        sys.exit("ERROR: Run  pip install anthropic")

    client = anthropic.Anthropic()
    msg = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=300,
        messages=[
            {
                "role": "user",
                "content": (
                    "Write a 15-20 second spoken script for an Instagram Reels / TikTok video ad.\n\n"
                    "Product: Arrae Clear Protein+\n"
                    "Key facts:\n"
                    "  • 15g grass-fed protein\n"
                    "  • Zero sugar\n"
                    "  • Electrolyte blend\n"
                    "  • Goes completely clear when mixed with water\n"
                    "  • Raspberry Yuzu flavor\n\n"
                    "Tone: Casual, first-person, like a friend genuinely recommending something they use. "
                    "Not salesy. Opener can be 'okay hear me out' or 'I found this thing' style.\n\n"
                    "Hard constraints:\n"
                    "  • 50-65 words total (natural speaking pace = 15-20 seconds)\n"
                    "  • First person only\n"
                    "  • No stage directions, no parentheticals, no scene descriptions\n"
                    "  • Return ONLY the spoken words — nothing else in your response"
                ),
            }
        ],
    )
    return msg.content[0].text.strip()


# ── Step 2: Avatar — reuse or create ──────────────────────────────────────────

def get_or_create_avatar(person_photo: str) -> tuple[str, str]:
    """
    Return (avatar_id, avatar_type).

    Checks existing custom avatars for a name matching the photo's filename stem.
    Creates a new one from the person photo if none match.
    """
    stem = Path(person_photo).stem.lower()

    data = _hf_json("marketing-studio", "avatars", "list")
    items: list = data.get("items", data) if isinstance(data, dict) else data

    for a in items:
        if a.get("type") == "custom" and a.get("name", "").lower() == stem:
            print(f"  Reusing existing avatar '{a['name']}' ({a['id']})")
            return a["id"], "custom"

    # Upload photo and create a new custom avatar
    print(f"  Uploading person photo → avatar...")
    upload_id = _upload(person_photo)

    avatar_name = Path(person_photo).stem  # use filename as the avatar name
    result = _one(_hf_json(
        "marketing-studio", "avatars", "create",
        "--name", avatar_name,
        "--image", upload_id,
    ))
    avatar_id = result.get("id")
    if not avatar_id:
        raise RuntimeError(f"Avatar creation returned no ID: {result}")

    print(f"  Avatar '{avatar_name}' created ({avatar_id})")
    return avatar_id, "custom"


# ── Step 3: Product entity ─────────────────────────────────────────────────────

def create_product(product_photo: str) -> str:
    """Upload the product photo, create a Marketing Studio product, return UUID."""
    print("  Uploading product photo...")
    upload_id = _upload(product_photo)

    print("  Creating product entity...")
    result = _one(_hf_json(
        "marketing-studio", "products", "create",
        "--title", "Arrae Clear Protein+",
        "--description", (
            "15g grass-fed protein, zero sugar, electrolyte blend, "
            "goes clear in water, raspberry yuzu flavor"
        ),
        "--image", upload_id,
    ))
    product_id = result.get("id")
    if not product_id:
        raise RuntimeError(f"Product creation returned no ID: {result}")

    print(f"  Product created ({product_id})")
    return product_id


# ── Step 4: Video generation ───────────────────────────────────────────────────

def generate_video(
    avatar_id: str,
    avatar_type: str,
    product_id: str,
    script: str,
) -> str:
    """
    Submit a marketing_studio_video job with:
      • custom avatar (person photo)
      • product entity (product photo)
      • generate_audio=true  → Higgsfield generates TTS + lipsync natively
      • product_review mode  → presenter speaks directly to camera about the product
      • 9:16 vertical format for Instagram Reels / TikTok

    Returns the CDN URL of the finished video.
    """
    prompt = (
        f"Speak this script naturally and confidently to camera:\n\n"
        f'"{script}"\n\n'
        "Delivery: warm, casual, authentic — like a real person, not an actor. "
        "Subtle natural movement, genuine expression. "
        "Warm flattering light. Near the end, clearly reveal the product."
    )

    # CLI requires JSON arrays passed via temp files with @-prefix
    avatars_payload = json.dumps([{"id": avatar_id, "type": avatar_type}])
    products_payload = json.dumps([product_id])

    with (
        tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as af,
        tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as pf,
    ):
        af.write(avatars_payload)
        pf.write(products_payload)
        avatars_file = af.name
        products_file = pf.name

    try:
        cmd = [
            _HF_BIN, "generate", "create", "marketing_studio_video",
            "--prompt",       prompt,
            "--avatars",      f"@{avatars_file}",
            "--product_ids",  f"@{products_file}",
            "--mode",         "product_review",   # presenter speaks about the product
            "--generate-audio", "true",           # Higgsfield TTS + lipsync, no external TTS needed
            "--duration",     "15",
            "--aspect_ratio", "9:16",
            "--resolution",   "720p",
            "--wait",
            "--wait-timeout", "25m",
            "--wait-interval", "10s",
        ]

        print("  Submitting to Higgsfield Marketing Studio...")
        print("  (generation typically takes 5-15 minutes — waiting...)\n")

        r = subprocess.run(cmd, capture_output=True, text=True)

        if r.returncode != 0:
            raise RuntimeError(
                f"Video generation failed (exit {r.returncode}):\n"
                f"{r.stderr.strip()}\n{r.stdout.strip()}"
            )

        output = r.stdout.strip()

        # --wait prints the result URL on its own line
        for line in output.splitlines():
            line = line.strip()
            if line.startswith("http") and any(
                x in line for x in (".mp4", "cdn", "higgsfield", "cloudfront")
            ):
                return line

        # Fallback: JSON parse when --wait returns structured output
        try:
            data = _one(json.loads(output))
            url = (
                data.get("media_url")
                or data.get("url")
                or data.get("result_url")
                or ((data.get("medias") or [{}])[0]).get("url")
            )
            if url:
                return url
        except (json.JSONDecodeError, KeyError, IndexError, TypeError):
            pass

        raise RuntimeError(f"Could not find video URL in output:\n{output}")

    finally:
        Path(avatars_file).unlink(missing_ok=True)
        Path(products_file).unlink(missing_ok=True)


# ── Step 5: Download ───────────────────────────────────────────────────────────

def download_video(url: str, output_path: str) -> None:
    """Download the CDN video to a local file with a progress indicator."""

    def _progress(count: int, block: int, total: int) -> None:
        if total > 0:
            pct = min(count * block / total * 100, 100)
            print(f"\r  {pct:5.1f}%", end="", flush=True)

    urllib.request.urlretrieve(url, output_path, reporthook=_progress)
    print()  # newline after progress
    size_mb = Path(output_path).stat().st_size / (1024 * 1024)
    print(f"  ✓ Saved: {output_path} ({size_mb:.1f} MB)")


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    if len(sys.argv) != 3:
        print("Usage:   python generate_ad.py <person_photo> <product_photo>")
        print("Example: python generate_ad.py person.jpg product.jpg")
        sys.exit(1)

    person_photo, product_photo = sys.argv[1], sys.argv[2]
    for path, label in [(person_photo, "Person photo"), (product_photo, "Product photo")]:
        if not Path(path).exists():
            sys.exit(f"ERROR: {label} not found: {path}")

    print("=" * 58)
    print("  AI Video Ad Generator — Arrae Clear Protein+")
    print("=" * 58)

    # 0. Pre-flight
    print("\nChecking dependencies...")
    check_dependencies()

    # 1. Script
    print("\nStep 1: Generating ad script (Claude)...")
    script = generate_script()
    words = len(script.split())
    preview = script if len(script) <= 90 else script[:87] + "..."
    print(f'  {words} words: "{preview}"')
    Path("ad_script.txt").write_text(script, encoding="utf-8")
    print("  Saved → ad_script.txt")

    # 2. Avatar
    print("\nStep 2: Setting up avatar (Higgsfield)...")
    avatar_id, avatar_type = get_or_create_avatar(person_photo)

    # 3. Product
    print("\nStep 3: Creating product entity (Higgsfield)...")
    product_id = create_product(product_photo)

    # 4. Video
    print("\nStep 4: Generating video (Higgsfield Marketing Studio)...")
    print("  Mode: product_review | TTS: native | Format: 9:16 | 15s | 720p")
    video_url = generate_video(avatar_id, avatar_type, product_id, script)
    print(f"\n  ✓ Video ready: {video_url}")

    # 5. Download
    print("\nStep 5: Downloading video...")
    output_video = "arrae_ad_final.mp4"
    download_video(video_url, output_video)

    print("\n" + "=" * 58)
    print("  Done!")
    print(f"  Script → {Path('ad_script.txt').absolute()}")
    print(f"  Video  → {Path(output_video).absolute()}")
    print("=" * 58)


if __name__ == "__main__":
    main()
