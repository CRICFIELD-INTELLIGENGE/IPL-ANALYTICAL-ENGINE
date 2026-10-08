import io
import base64
from PIL import Image, ImageFilter
from pathlib import Path
from src.config import IMAGE_SIZES, WEBP_QUALITY
from src.utils import logger

class ImageOptimizer:
    """Creates responsive multi-scale sizes and compact Base64 blur placeholders for fluid progressive loads."""
    
    def generate_responsive_sizes(self, image_path: Path) -> dict:
        """Saves downscaled versions of the image corresponding to responsive breakpoints."""
        if not image_path.exists():
            logger.error(f"Image path does not exist for responsive sizing: {image_path}")
            return {}
            
        generated = {}
        try:
            img = Image.open(image_path)
            base_dir = image_path.parent
            base_name = image_path.stem  # e.g., 'profile'
            
            for size_name, dimensions in IMAGE_SIZES.items():
                # Skip resizing if the original is already smaller than target bounds
                if img.width <= dimensions[0] and img.height <= dimensions[1]:
                    generated[size_name] = str(image_path)
                    continue
                    
                target_path = base_dir / f"{base_name}_{size_name}.webp"
                
                # Maintain aspect ratio
                resized_img = img.copy()
                resized_img.thumbnail(dimensions, Image.Resampling.LANCZOS)
                resized_img.save(target_path, "WEBP", quality=WEBP_QUALITY)
                
                # Relative path representation
                try:
                    rel_path = str(target_path.relative_to(target_path.parent.parent.parent.parent.parent))
                except Exception:
                    rel_path = str(target_path)
                    
                generated[size_name] = rel_path
                logger.info(f"Generated responsive {size_name} image size: {target_path.name}")
                
        except Exception as e:
            logger.error(f"Failed responsive generation for {image_path.name}: {e}")
            
        return generated

    def generate_blur_placeholder(self, image_path: Path) -> str:
        """Returns a ultra-low-resolution 10x10 blurred Base64 string for progressive image lazy-loading."""
        if not image_path.exists():
            return ""
            
        try:
            img = Image.open(image_path)
            # Resize to a very small box (10x10 pixels)
            tiny_img = img.copy()
            tiny_img.thumbnail((10, 10), Image.Resampling.BOX)
            
            # Apply Gaussian Blur to smooth blocky pixel colors
            blurred_img = tiny_img.filter(ImageFilter.GaussianBlur(1))
            
            # Save into memory stream as small WebP
            buffer = io.BytesIO()
            blurred_img.save(buffer, format="WEBP", quality=20)
            img_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
            
            placeholder = f"data:image/webp;base64,{img_str}"
            logger.info(f"Created Base64 blur placeholder for {image_path.name} ({len(placeholder)} chars)")
            return placeholder
        except Exception as e:
            logger.error(f"Error creating blur placeholder: {e}")
            return ""
            
    def get_cdn_url(self, relative_path: str, cdn_domain: str = "https://cdn.ipl-analytics.com") -> str:
        """Returns a future-ready CDN URL from the local asset path."""
        # Replace backslashes with forward slashes for clean URL paths
        normalized = relative_path.replace("\\", "/")
        # Strip redundant folder items
        if normalized.startswith("artifacts/"):
            normalized = normalized[len("artifacts/"):]
        return f"{cdn_domain}/{normalized}"
