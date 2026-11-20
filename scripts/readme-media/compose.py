"""Turns recorded frames into styled README GIFs (Grafite look).

    python -I scripts/readme-media/compose.py [lang ...]

Reads scripts/readme-media/out/frames/<lang>/<scene>/ and writes
docs/media/<scene>.<lang>.gif. Needs Pillow and ffmpeg on PATH.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
FRAMES = ROOT / "scripts" / "readme-media" / "out" / "frames"
WORK = ROOT / "scripts" / "readme-media" / "out" / "composed"
DEST = ROOT / "docs" / "media"
INTER = ROOT / "node_modules" / "@fontsource-variable" / "inter" / "files" / "inter-latin-wght-normal.woff2"
MONO = Path("C:/Windows/Fonts/consola.ttf")

INK = (236, 234, 228)
INK2 = (163, 160, 152)
INK3 = (120, 117, 110)
ACCENT = (139, 124, 255)
LINE = (255, 255, 255, 26)

CAPTIONS = {
    "pt": {
        "flow": ("Do pedido à revisão, com você no controle", "O Planner propõe, você aprova, o Builder sugere diffs e o Reviewer confere."),
        "agents": ("Converse direto com cada agente", "O Octo conduz a orquestra. Cada agente tem mascote e personalidade."),
        "settings": ("Claro, escuro, português e inglês", "Tema e idioma mudam na hora e ficam salvos no seu dispositivo."),
        "tag": "demo offline · pt-BR",
        "tagline": "Planner divide. Builder propõe. Reviewer confere.",
        "tagline2": "E nada roda sem a sua aprovação.",
        "chips": ["open source · MIT", "Tauri 2 · React 19 · TypeScript · Rust"],
    },
    "en": {
        "flow": ("From request to review, with you in control", "The Planner proposes, you approve, the Builder suggests diffs and the Reviewer checks."),
        "agents": ("Chat with each agent directly", "Octo conducts the orchestra. Every agent has its own mascot and personality."),
        "settings": ("Light, dark, Portuguese and English", "Theme and language switch instantly and stay saved on your device."),
        "tag": "offline demo · en-US",
        "tagline": "The Planner splits. The Builder proposes. The Reviewer checks.",
        "tagline2": "And nothing runs without your approval.",
        "chips": ["open source · MIT", "Tauri 2 · React 19 · TypeScript · Rust"],
    },
}


def font(size: int, weight: int = 400) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(str(INTER), size)
    f.set_variation_by_axes([weight])
    return f


def mono(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(MONO), size)


def backdrop(w: int, h: int) -> Image.Image:
    """Graphite gradient with soft violet and blue glows."""
    bg = Image.new("RGB", (w, h))
    px = bg.load()
    top, bottom = (22, 22, 26), (11, 11, 14)
    for y in range(h):
        k = y / max(1, h - 1)
        row = tuple(int(top[i] + (bottom[i] - top[i]) * k) for i in range(3))
        for x in range(w):
            px[x, y] = row
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse((-w * 0.15, -h * 0.55, w * 0.55, h * 0.45), fill=(139, 124, 255, 70))
    g.ellipse((w * 0.6, h * 0.55, w * 1.25, h * 1.5), fill=(79, 182, 255, 38))
    glow = glow.filter(ImageFilter.GaussianBlur(min(w, h) * 0.18))
    bg = Image.alpha_composite(bg.convert("RGBA"), glow)
    # faint dot grid
    grid = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid, 'RGBA')
    for y in range(12, h, 24):
        for x in range(12, w, 24):
            gd.point((x, y), fill=(255, 255, 255, 14))
    return Image.alpha_composite(bg, grid).convert("RGB")


def rounded_mask(size: tuple[int, int], r: int) -> Image.Image:
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), r, fill=255)
    return m


def pill(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, f, fg, bg, border) -> int:
    x, y = xy
    tw = draw.textlength(text, font=f)
    h = f.size + 14
    draw.rounded_rectangle((x, y, x + tw + 24, y + h), h // 2, fill=bg, outline=border)
    draw.text((x + 12, y + h / 2), text, font=f, fill=fg, anchor="lm")
    return int(tw + 24)


# ---------------------------------------------------------------- scenes

W, WIN_X, WIN_Y, WIN_W = 1000, 40, 112, 920
APP_H = round(WIN_W * 800 / 1280)
BAR = 30
H = WIN_Y + BAR + APP_H + 36


def scene_static(lang: str, scene: str) -> tuple[Image.Image, Image.Image]:
    """Background with caption and window chrome; returns (canvas, window mask)."""
    title, sub = CAPTIONS[lang][scene]
    canvas = backdrop(W, H)
    d = ImageDraw.Draw(canvas, 'RGBA')
    d.text((WIN_X, 30), title, font=font(26, 640), fill=INK)
    d.text((WIN_X, 70), sub, font=font(15, 420), fill=INK2)
    tag = CAPTIONS[lang]["tag"]
    f = mono(13)
    tw = d.textlength(tag, font=f) + 24
    pill(d, (int(W - WIN_X - tw), 30), tag, f, INK2, (255, 255, 255, 10), (255, 255, 255, 30))

    canvas = canvas.convert("RGBA")
    win_h = BAR + APP_H
    # shadow
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        (WIN_X, WIN_Y + 14, WIN_X + WIN_W, WIN_Y + win_h + 14), 14, fill=(0, 0, 0, 150)
    )
    canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(22)))
    # title bar
    chrome = Image.new("RGBA", (WIN_W, win_h), (29, 29, 27, 255))
    cd = ImageDraw.Draw(chrome, 'RGBA')
    for i, c in enumerate([(255, 95, 87), (254, 188, 46), (40, 200, 64)]):
        cd.ellipse((14 + i * 18, 10, 24 + i * 18, 20), fill=c + (210,))
    cd.text((WIN_W / 2, BAR / 2), "Agent Orchestra", font=font(12, 500), fill=INK3, anchor="mm")
    cd.line((0, BAR - 1, WIN_W, BAR - 1), fill=(59, 58, 55, 255))
    return canvas, chrome


def compose_scene(lang: str, scene: str) -> list[tuple[Path, int]]:
    src = FRAMES / lang / scene
    timing = json.loads((src / "timing.json").read_text())
    canvas, chrome = scene_static(lang, scene)
    mask = rounded_mask(chrome.size, 12)
    out = WORK / lang / scene
    shutil.rmtree(out, ignore_errors=True)
    out.mkdir(parents=True)
    frames = []
    for i, item in enumerate(timing):
        shot = Image.open(src / item["file"]).convert("RGBA").resize((WIN_W, APP_H), Image.LANCZOS)
        win = chrome.copy()
        win.paste(shot, (0, BAR))
        frame = canvas.copy()
        frame.paste(win, (WIN_X, WIN_Y), mask)
        frame = frame.convert("RGB")
        ImageDraw.Draw(frame, 'RGBA').rounded_rectangle(
            (WIN_X, WIN_Y, WIN_X + WIN_W - 1, WIN_Y + chrome.size[1] - 1), 12, outline=LINE
        )
        path = out / f"{i:04d}.png"
        frame.convert("RGB").save(path)
        frames.append((path, item["ms"]))
    return frames


def compose_banner(lang: str) -> list[tuple[Path, int]]:
    src = FRAMES / lang / "banner"
    timing = json.loads((src / "timing.json").read_text())
    bw, bh = 1200, 420
    base = backdrop(bw, bh)
    d = ImageDraw.Draw(base, 'RGBA')
    c = CAPTIONS[lang]
    tx = 470
    d.text((tx, 92), "Agent Orchestra", font=font(64, 720), fill=INK)
    d.text((tx, 186), c["tagline"], font=font(22, 430), fill=INK2)
    d.text((tx, 220), c["tagline2"], font=font(22, 560), fill=ACCENT)
    x = tx
    for chip in c["chips"]:
        x += pill(d, (x, 284), chip, mono(15), INK2, (255, 255, 255, 12), (255, 255, 255, 34)) + 10
    # agent color dots, like a tiny score
    for i, col in enumerate([(139, 124, 255), (79, 182, 255), (255, 181, 71), (95, 208, 143)]):
        d.ellipse((tx + i * 22, 352, tx + i * 22 + 12, 364), fill=col)
    d.text((tx + 4 * 22 + 6, 358), "Orchestra · Planner · Builder · Reviewer", font=font(14, 460), fill=INK3, anchor="lm")
    # stage glow behind Octo
    stage = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    ImageDraw.Draw(stage).ellipse((70, 70, 390, 390), fill=(139, 124, 255, 60))
    base = Image.alpha_composite(base.convert("RGBA"), stage.filter(ImageFilter.GaussianBlur(48)))

    out = WORK / lang / "banner"
    shutil.rmtree(out, ignore_errors=True)
    out.mkdir(parents=True)
    frames = []
    size = 300
    for i, item in enumerate(timing):
        octo = Image.open(src / item["file"]).convert("RGBA").resize((size, size), Image.LANCZOS)
        frame = base.copy()
        frame.alpha_composite(octo, (230 - size // 2, bh // 2 - size // 2 + 4))
        path = out / f"{i:04d}.png"
        frame.convert("RGB").save(path)
        frames.append((path, item["ms"]))
    return frames


def encode(frames: list[tuple[Path, int]], dest: Path, colors: int = 256) -> None:
    lst = frames[0][0].parent / "list.txt"
    lines = []
    for path, ms in frames:
        lines.append(f"file '{path.as_posix()}'")
        lines.append(f"duration {max(ms, 40) / 1000:.3f}")
    lines.append(f"file '{frames[-1][0].as_posix()}'")
    lst.write_text("\n".join(lines), encoding="utf-8")
    dest.parent.mkdir(parents=True, exist_ok=True)
    vf = (
        f"split[a][b];[a]palettegen=max_colors={colors}:stats_mode=diff[p];"
        "[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle"
    )
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
         "-vf", vf, "-fps_mode", "vfr", "-loop", "0", str(dest)],
        check=True,
    )


def main() -> None:
    langs = sys.argv[1:] or ["pt", "en"]
    for lang in langs:
        for scene in ["banner", "flow", "agents", "settings"]:
            frames = compose_banner(lang) if scene == "banner" else compose_scene(lang, scene)
            dest = DEST / f"{scene}.{lang}.gif"
            encode(frames, dest)
            print(f"{dest.relative_to(ROOT)}  {len(frames)} frames  {dest.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    os.chdir(ROOT)
    main()
