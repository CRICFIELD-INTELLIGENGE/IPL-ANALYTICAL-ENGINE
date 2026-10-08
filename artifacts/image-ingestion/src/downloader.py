import io
import time
import asyncio
import aiohttp
from PIL import Image
from pathlib import Path
from src.config import (
    WEBP_QUALITY, MAX_PROFILE_SIZE, DOWNLOAD_RETRIES, 
    CONCURRENT_DOWNLOAD_LIMIT, FAILED_LOG, DEFAULT_HEADERS
)
from src.utils import logger

class ImageDownloader:
    """Robust engine to download, process, resize, and convert player images to WebP format."""
    
    def __init__(self):
        self.headers = DEFAULT_HEADERS
        self.semaphore = asyncio.Semaphore(CONCURRENT_DOWNLOAD_LIMIT)
        
    def log_failed_download(self, player_name: str, url: str, reason: str):
        """Logs failed downloads to a dedicated log file for trace and debug actions."""
        with open(FAILED_LOG, 'a', encoding='utf-8') as f:
            f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Player: {player_name} | URL: {url} | Reason: {reason}\n")
            
    def process_and_save_image(self, img_bytes: bytes, output_path: Path, max_size: tuple = MAX_PROFILE_SIZE) -> bool:
        """Processes raw image bytes, maintains aspect ratio, resizes if needed, and saves as optimized WebP."""
        try:
            # Load raw bytes into PIL Image
            img = Image.open(io.BytesIO(img_bytes))
            
            # Convert RGBA to RGB to support WebP conversion cleanly without transparency artifacts if necessary
            if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                # Save alpha layer as a white background mask
                background = Image.new("RGB", img.size, (255, 255, 255))
                background.paste(img, mask=img.convert("RGBA").split()[3]) # 3 is the alpha channel
                img = background
            elif img.mode != "RGB":
                img = img.convert("RGB")
                
            # Maintain aspect ratio while resizing
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Ensure folder hierarchy exists
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Save as optimized WebP
            img.save(output_path, "WEBP", quality=WEBP_QUALITY, method=6)
            return True
        except Exception as e:
            logger.error(f"Failed to process and optimize image: {e}")
            return False

    async def download_single_image(self, session: aiohttp.ClientSession, player_name: str, url: str, output_path: Path) -> bool:
        """Downloads a single image with thread-safe semaphore throttling and robust retry capabilities."""
        if not url:
            self.log_failed_download(player_name, "N/A", "Empty source URL")
            return False
            
        async with self.semaphore:
            for attempt in range(1, DOWNLOAD_RETRIES + 1):
                try:
                    logger.info(f"Downloading image for {player_name} (Attempt {attempt}/{DOWNLOAD_RETRIES})...")
                    async with session.get(url, headers=self.headers, timeout=12) as response:
                        if response.status_code == 200 or response.status == 200:
                            img_bytes = await response.read()
                            
                            # Process and save in a separate executor thread so we don't block the async loop
                            loop = asyncio.get_running_loop()
                            success = await loop.run_in_executor(
                                None, 
                                self.process_and_save_image, 
                                img_bytes, 
                                output_path
                            )
                            if success:
                                logger.info(f"Successfully saved optimized WebP for {player_name} to {output_path.name}")
                                return True
                            else:
                                self.log_failed_download(player_name, url, "Image optimization failed")
                                return False
                        else:
                            logger.warning(f"Failed server response {response.status} for {player_name}")
                except Exception as e:
                    logger.warning(f"Error downloading {player_name} on attempt {attempt}: {e}")
                    
                # Small exponential backoff delay between retry iterations
                await asyncio.sleep(attempt * 1.0)
                
            self.log_failed_download(player_name, url, f"All {DOWNLOAD_RETRIES} attempts failed")
            return False

    async def execute_downloads(self, download_tasks: list) -> int:
        """Executes the download queue concurrently and reports total success count."""
        async with aiohttp.ClientSession() as session:
            tasks = []
            for player_name, url, output_path in download_tasks:
                # Avoid unnecessary re-downloads if the local image is already optimized and mapped
                if output_path.exists():
                    logger.info(f"Skipping duplicate download. Optimized file exists: {output_path.name}")
                    continue
                tasks.append(self.download_single_image(session, player_name, url, output_path))
                
            results = await asyncio.gather(*tasks)
            return sum(1 for r in results if r)
