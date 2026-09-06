from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter


VARIANTS = {
    "campus-gate-main": ("gate", "#f1a67f", 0.16),
    "campus-library": ("library", "#84c8ba", 0.13),
    "campus-train": ("train", "#e8ad69", 0.14),
    "campus-lane": ("lane", "#74b5b1", 0.13),
    "campus-panorama": ("panorama", "#a7d38d", 0.10),
    "campus-gate-dusk": ("gate", "#334e82", 0.26),
    "campus-library-night": ("library", "#52618c", 0.23),
    "campus-train-retro": ("train", "#c9825d", 0.22),
    "campus-lane-summer": ("lane", "#80b96a", 0.18),
    "campus-panorama-evening": ("panorama", "#dd9b76", 0.20),
}

SOURCE_NAMES = {
    "gate": "5c6ca776a54cddb00a078f3d6f8108eb.jpg",
    "library": "b22a8dfd28574b3f9b2e8474c6c50f87.jpg",
    "train": "a9a0332e73bf940c5a5ec3cdd8593ec2.jpg",
    "lane": "d7f4df238dec4ec328782938983d4bcc.jpg",
    "panorama": "40be7ced0a179ffbe175f7845ba3f439.jpg",
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


def pixelize(source: Path, output: Path, tint: str, amount: float) -> None:
    image = crop_to_ratio(Image.open(source).convert("RGB"))
    small = image.resize((192, 108), Image.Resampling.LANCZOS)
    small = ImageEnhance.Color(small).enhance(1.12)
    small = ImageEnhance.Contrast(small).enhance(1.04)
    small = small.quantize(colors=56, method=Image.Quantize.MEDIANCUT).convert("RGB")
    tinted = Image.new("RGB", small.size, tint)
    small = Image.blend(small, tinted, amount)
    small = small.filter(ImageFilter.UnsharpMask(radius=0.7, percent=110, threshold=3))
    final = small.resize((1280, 720), Image.Resampling.NEAREST)
    output.parent.mkdir(parents=True, exist_ok=True)
    final.save(output, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Create pixel-art campus assets from supplied campus photos.")
    parser.add_argument("--source-dir", type=Path, default=Path(r"C:\Users\ASUS\Desktop"))
    parser.add_argument("--output-dir", type=Path, default=Path("public/assets/campus-pixel"))
    args = parser.parse_args()
    manifest = {}
    for name, (source_key, tint, amount) in VARIANTS.items():
        source = args.source_dir / SOURCE_NAMES[source_key]
        if not source.exists():
            raise FileNotFoundError(f"Missing source image: {source}")
        output = args.output_dir / f"{name}.png"
        pixelize(source, output, tint, amount)
        manifest[name] = f"/assets/campus-pixel/{output.name}"
    (args.output_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {len(manifest)} pixel assets in {args.output_dir}")


if __name__ == "__main__":
    main()
