#!/usr/bin/env python3
"""
keychain_decoder.py
─────────────────────────────────────────────────────────────
Pniktrix Keychain Decoder CLI — Decodes WhatsApp design codes or messages into 3MF files.

Usage:
  python keychain_decoder.py "KC|Sanjana|bubbly|contour|embossed|#FFFFFF|#E84393|flower|#FFD700|left|standard"
  python keychain_decoder.py "Custom 3D Keychain Order... Code: KC|..."
─────────────────────────────────────────────────────────────
"""

import sys
import re
from pathlib import Path
import keychain_app

def main():
    if len(sys.argv) < 2:
        print("Usage: python keychain_decoder.py \"<DESIGN_CODE_OR_WHATSAPP_MESSAGE>\" [output.3mf]")
        sys.exit(1)

    raw_input = sys.argv[1]
    cfg = keychain_app.parse_full_message(raw_input)
    font_data = keychain_app.load_font(cfg['font']) or keychain_app.load_font('helvetiker')
    target_w = keychain_app.SIZE_PRESETS.get(cfg['size'], 75.0)

    base_mesh, text_mesh, charm_mesh, _ = keychain_app.generate_keychain_geometry(
        text=cfg['text'],
        font_data=font_data,
        shape_type=cfg['shape'],
        text_style=cfg['style'],
        hole_pos=cfg['hole_pos'],
        target_width=target_w,
        charm_type=cfg['charm'],
        charm_pos='right'
    )

    if len(sys.argv) >= 3:
        out_name = sys.argv[2]
    else:
        text_safe = re.sub(r'[^a-zA-Z0-9]', '', cfg['text']) or "Keychain"
        out_name = f"Keychain-{text_safe}.3mf"

    keychain_app.export_3mf(
        base_mesh=base_mesh,
        text_mesh=text_mesh,
        charm_mesh=charm_mesh,
        base_hex=cfg['base_color'],
        text_hex=cfg['text_color'],
        charm_hex=cfg['charm_color'],
        output_path=out_name,
        title=f"Pniktrix Keychain - {cfg['text']}"
    )

    print(f"✓ Successfully generated print-ready 3MF: {out_name}")

if __name__ == '__main__':
    main()
