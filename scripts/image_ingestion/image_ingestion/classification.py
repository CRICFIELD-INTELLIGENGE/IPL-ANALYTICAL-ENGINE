from __future__ import annotations

from collections.abc import Iterable, Mapping
from pathlib import Path
from typing import Protocol


class ImageClassificationHook(Protocol):
    """Optional extension point for lightweight image classifiers."""

    def classify(self, image_path: Path, metadata: Mapping[str, str]) -> Iterable[str]:
        ...


class NoopImageClassifier:
    def classify(self, image_path: Path, metadata: Mapping[str, str]) -> Iterable[str]:
        return ()
