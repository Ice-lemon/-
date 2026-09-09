from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageEnhance


VARIANTS = {
    "campus-gate-main": ("gate", "day"),
    "campus-library": ("library", "day"),
    "campus-train": ("train", "day"),
    "campus-lane": ("lane", "day"),
    "campus-panorama": ("panorama", "day"),
    "campus-gate-dusk": ("gate", "dusk"),
    "campus-library-night": ("library", "night"),
    "campus-train-retro": ("train", "retro"),
    "campus-lane-summer": ("lane", "summer"),
    "campus-panorama-evening": ("panorama", "evening"),
}

# The five supplied illustrations are already in the requested clean 16-bit style.
SOURCE_NAMES = {
    "gate": "0aebd01ef48df7b52ffe007a77b5f30f.jpg",
    "library": "829f475ecb2fca92a5dd73987b1ead42.jpg",
    "train": "18b84f5a522c23275017a1724aae66d5.jpg",
    "lane": "0cedfc0cd20aad901036233efb75b5df.jpg",
    "panorama": "b3c91d1d46922276bcd2c0cf63436a0e.jpg",
}

# Variants preserve the source art and only apply restrained color grading.
TONE_STYLES = {
    "day": ("#ffffff", 0.00, 1.00),
    "dusk": ("#5e659c", 0.16, 0.92),
    "night": ("#243c72", 0.25, 0.78),
    "retro": ("#d58b63", 0.13, 0.96),
    "summer": ("#91c95d", 0.10, 1.06),
    "evening": ("#de8d74", 0.14, 0.94),
}


def crop_to_ratio(image: Image.Image, ratio: float = 16 / 9) -> Image.Image:
    width, height = image.size
    current = width / height
    if current > ratio:
        crop_width = int(height * ratio)
        left = (width - crop_width) // 2
        return image.crop((left, 0, left + crop_width, height))
    crop_height = int(width / ratio)
    top = (height - crop_height) // 2
    return image.crop((0, top, width, top + crop_height))


def pixelize(source: Path, output: Path, tone: str) -> None:
    image = crop_to_ratio(Image.open(source).convert("RGB"))
    image = image.resize((1280, 720), Image.Resampling.LANCZOS)
    tint, amount, brightness = TONE_STYLES[tone]
    if amount:
        image = Image.blend(image, Image.new("RGB", image.size, tint), amount)
    if brightness != 1:
        image = ImageEnhance.Brightness(image).enhance(brightness)
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, optimize=True, quality=95)


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare supplied HJTU 16-bit campus illustrations.")
    parser.add_argument("--source-dir", type=Path, default=Path(r"C:\Users\ASUS\Desktop"))
    parser.add_argument("--output-dir", type=Path, default=Path("public/assets/campus-pixel"))
    parser.add_argument("--style-reference", type=Path, default=None, help="Compatibility option; source illustrations define the style.")
    args = parser.parse_args()
    manifest = {}
    for name, (source_key, tone) in VARIANTS.items():
        source = args.source_dir / SOURCE_NAMES[source_key]
        if not source.exists():
            raise FileNotFoundError(f"Missing source image: {source}")
        output = args.output_dir / f"{name}.png"
        pixelize(source, output, tone)
        manifest[name] = f"/assets/campus-pixel/{output.name}"
    (args.output_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {len(manifest)} supplied-style pixel assets in {args.output_dir}")


if __name__ == "__main__":
    main()
