#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador de la galería de Petrasur
===================================

Escanea la carpeta  assets/galeria/  y genera el archivo
assets/js/galeria-data.js  a partir de los archivos que sigan la
convención de nombres:

    obraNN_fotoMM.jpg     -> imagen
    obraNN_videoMM.mp4    -> video
    obraNN_videoMM.jpg    -> portada (poster) del video

Opcionalmente puedes describir cada obra en  assets/galeria/obras.json:

    {
      "obra01": {
        "titulo": "Revestimiento de canal",
        "categoria": "canales",
        "ubicacion": "Región de Valparaíso",
        "descripcion": "Texto descriptivo..."
      }
    }

Uso:
    python3 generar_galeria.py
"""

import json
import os
import re
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
GAL_DIR = os.path.join(BASE, "assets", "galeria")
OUT_FILE = os.path.join(BASE, "assets", "js", "galeria-data.js")
META_FILE = os.path.join(GAL_DIR, "obras.json")

IMG_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
VID_EXT = {".mp4", ".webm", ".ogg", ".mov"}

PATTERN = re.compile(r"^(obra\d+)_(foto|video)(\d+)\.(\w+)$", re.IGNORECASE)


def main():
    if not os.path.isdir(GAL_DIR):
        print("No existe la carpeta:", GAL_DIR)
        sys.exit(1)

    meta = {}
    if os.path.isfile(META_FILE):
        with open(META_FILE, encoding="utf-8") as f:
            meta = json.load(f)

    obras = {}
    for name in sorted(os.listdir(GAL_DIR)):
        m = PATTERN.match(name)
        if not m:
            continue
        obra_id = m.group(1).lower()
        tipo = m.group(2).lower()
        num = m.group(3)
        ext = "." + m.group(4).lower()
        obras.setdefault(obra_id, {"fotos": [], "videos": [], "posters": {}})
        if tipo == "foto":
            obras[obra_id]["fotos"].append(name)
        elif tipo == "video":
            if ext in VID_EXT:
                obras[obra_id]["videos"].append(name)
            else:
                obras[obra_id]["posters"][num] = name

    data = []
    for obra_id in sorted(obras.keys()):
        info = meta.get(obra_id, {})
        titulo = info.get("titulo", "Obra " + obra_id.replace("obra", ""))
        media = []
        for f in sorted(obras[obra_id]["fotos"]):
            media.append({"tipo": "imagen", "src": "assets/galeria/" + f, "alt": titulo})
        for v in sorted(obras[obra_id]["videos"]):
            num = re.search(r"video(\d+)", v, re.IGNORECASE).group(1)
            poster = obras[obra_id]["posters"].get(num)
            item = {"tipo": "video", "src": "assets/galeria/" + v, "alt": titulo}
            if poster:
                item["poster"] = "assets/galeria/" + poster
            media.append(item)
        data.append({
            "id": obra_id,
            "titulo": titulo,
            "categoria": info.get("categoria", "otros"),
            "ubicacion": info.get("ubicacion", ""),
            "descripcion": info.get("descripcion", ""),
            "media": media,
        })

    js = (
        "/* Archivo generado automáticamente por generar_galeria.py.\n"
        "   Puedes editarlo a mano, pero se sobrescribirá al volver a ejecutar el script. */\n"
        "window.GALERIA = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n"
    )

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write(js)

    print("Galería generada:", OUT_FILE)
    print("Obras encontradas:", len(data))


if __name__ == "__main__":
    main()
