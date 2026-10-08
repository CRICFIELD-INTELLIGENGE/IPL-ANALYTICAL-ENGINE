from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler

from .config import PipelineConfig


def configure_logging(config: PipelineConfig, verbose: bool = False) -> logging.Logger:
    config.ensure_directories()
    logger = logging.getLogger("image_ingestion")
    logger.setLevel(logging.DEBUG if verbose else logging.INFO)
    logger.handlers.clear()
    logger.propagate = False

    formatter = logging.Formatter(
        "%(asctime)s %(levelname)s [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    stream_handler.setLevel(logging.DEBUG if verbose else logging.INFO)
    logger.addHandler(stream_handler)

    file_handler = RotatingFileHandler(
        config.logs_root / "image_ingestion.log",
        maxBytes=1_000_000,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.DEBUG)
    logger.addHandler(file_handler)
    return logger
