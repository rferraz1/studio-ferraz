#!/usr/bin/env python3
"""
Gera public/gifs/manifest.json a partir dos GIFs existentes.

Uso:
    python3 scripts/generate_manifest.py
    python3 scripts/generate_manifest.py --root public/gifs --output public/gifs/manifest.json
"""

from __future__ import annotations

import argparse
import json
import pathlib
import re
import urllib.parse
from typing import Iterable, List, Set


def humanize_name(path: pathlib.Path) -> str:
    base = path.stem
    base = re.sub(r"[_-]+", " ", base)
    base = re.sub(r"\s+", " ", base).strip()
    return base.title() or path.stem


def as_id(path: pathlib.Path, seen: Set[str]) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", path.stem.lower()).strip("-") or "exercicio"
    if slug not in seen:
        seen.add(slug)
        return slug
    i = 2
    while f"{slug}-{i}" in seen:
        i += 1
    final = f"{slug}-{i}"
    seen.add(final)
    return final


def gather_files(root: pathlib.Path, exts: Iterable[str]) -> List[pathlib.Path]:
    allowed = {e.lower() for e in exts}
    return [
        p
        for p in root.rglob("*")
        if p.is_file() and p.suffix.lower() in allowed and not p.name.startswith(".")
    ]


def encode_path(path: pathlib.Path) -> str:
  # Encode cada segmento separadamente para preservar barras
  return "/".join(urllib.parse.quote(part) for part in path.parts)


def build_manifest(root: pathlib.Path, files: List[pathlib.Path], base_url: str | None) -> List[dict]:
    seen_ids: Set[str] = set()
    manifest = []
    for file_path in sorted(files):
        rel = file_path.relative_to(root)
        rel_str = encode_path(rel)
        url = f"{base_url.rstrip('/')}/{rel_str}" if base_url else rel_str
        item = {
            "id": as_id(rel, seen_ids),
            "name": humanize_name(rel),
            "group": rel.parent.name.title() if rel.parent != pathlib.Path(".") else "Geral",
            "file": url,
        }
        manifest.append(item)
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description="Gerar manifest.json para GIFs de exercícios.")
    parser.add_argument("--root", default="public/gifs", help="Pasta raiz dos GIFs (default: public/gifs)")
    parser.add_argument(
        "--output",
        default="public/gifs/manifest.json",
        help="Caminho de saída do manifest (default: public/gifs/manifest.json)",
    )
    parser.add_argument(
        "--base-url",
        default=None,
        help="URL base para apontar os GIFs (ex: https://.../gifs). Se informado, o campo file terá URLs completas.",
    )
    args = parser.parse_args()

    root = pathlib.Path(args.root).resolve()
    if not root.exists():
        raise SystemExit(f"Pasta não encontrada: {root}")

    files = gather_files(root, exts=[".gif", ".apng", ".webp"])
    if not files:
        raise SystemExit(f"Nenhum GIF encontrado em {root}")

    manifest = build_manifest(root, files, base_url=args.base_url)
    output_path = pathlib.Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Manifest salvo em {output_path} com {len(manifest)} exercícios.")


if __name__ == "__main__":
    main()
