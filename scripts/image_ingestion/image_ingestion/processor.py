from __future__ import annotations

import base64
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps

from .config import PipelineConfig
from .utils import relative_posix


@dataclass(slots=True)
class ProcessedImage:
    local_path: str
    width: int
    height: int
    blur_placeholder: str
    variants: dict[int, str]


class ImageProcessor:
    def __init__(self, config: PipelineConfig):
        self.config = config

    def process_profile_image(self, image_bytes: bytes, player_dir: Path, base_name: str = "profile") -> ProcessedImage:
        player_dir.mkdir(parents=True, exist_ok=True)
        with Image.open(BytesIO(image_bytes)) as raw:
            image = ImageOps.exif_transpose(raw)
            if image.mode not in {"RGB", "RGBA"}:
                image = image.convert("RGB")

            image = self._resize_to_max(image, self.config.image.max_dimension)
            output = player_dir / f"{base_name}.webp"
            image.save(output, "WEBP", quality=self.config.image.webp_quality, method=6)

            variants: dict[int, str] = {}
            for width in self.config.image.responsive_widths:
                if image.width <= width:
                    continue
                variant = self._resize_to_width(image, width)
                variant_path = player_dir / f"{base_name}_{width}.webp"
                variant.save(variant_path, "WEBP", quality=self.config.image.webp_quality, method=6)
                variants[width] = relative_posix(variant_path, self.config.output_root)

            return ProcessedImage(
                local_path=relative_posix(output, self.config.output_root),
                width=image.width,
                height=image.height,
                blur_placeholder=self._blur_placeholder(image),
                variants=variants,
            )

    def _resize_to_max(self, image: Image.Image, max_dimension: int) -> Image.Image:
        if max(image.size) <= max_dimension:
            return image.copy()
        resized = image.copy()
        resized.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
        return resized

    def _resize_to_width(self, image: Image.Image, width: int) -> Image.Image:
        height = round(image.height * (width / image.width))
        return image.resize((width, height), Image.Resampling.LANCZOS)

    def _blur_placeholder(self, image: Image.Image) -> str:
        placeholder = self._resize_to_width(image, self.config.image.blur_width)
        buffer = BytesIO()
        placeholder.save(buffer, "WEBP", quality=30, method=6)
        encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
        return f"data:image/webp;base64,{encoded}"
