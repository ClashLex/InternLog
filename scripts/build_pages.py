"""Publish only website assets, never backend/configuration or local guides."""
import json
import os
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_FILES = ("index.html", "404.html")
PUBLIC_DIRECTORIES = ("css", "js", "user", "company", "admin")
PUBLIC_FONTS = (
    "fonts/Times New Roman MT Condensed Regular.otf",
    "fonts/akzidenz-grotesk-similar/aileron/Aileron-Regular.otf",
    "fonts/akzidenz-grotesk-similar/aileron/Aileron-SemiBold.otf",
    "fonts/akzidenz-grotesk-similar/aileron/Aileron-Bold.otf",
    "fonts/akzidenz-grotesk-similar/aileron/CC0 1.0 Universal (CC0 1.0)  Public Domain Dedication.txt",
)


def build(destination, revision, root=ROOT):
    destination = Path(destination)
    # Refuse a reused directory instead of deleting potentially unrelated files.
    destination.mkdir(parents=True, exist_ok=False)
    for name in PUBLIC_FILES:
        shutil.copyfile(root / name, destination / name)
    for name in PUBLIC_DIRECTORIES:
        shutil.copytree(root / name, destination / name)
    for name in PUBLIC_FONTS:
        (destination / name).parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(root / name, destination / name)
    (destination / ".nojekyll").touch()
    (destination / "deployment.json").write_text(
        json.dumps({"revision": revision}) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    build(ROOT / "_site", os.environ.get("GITHUB_SHA", "local"))
