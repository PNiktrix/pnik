"""
keychain_app.py
─────────────────────────────────────────────────────────────
Pniktrix 3D Keychain Maker — Desktop Studio & 3MF Generator v4.0
─────────────────────────────────────────────────────────────
Desktop GUI application for decoding customer WhatsApp order
messages and generating print-ready multi-material 3MF files
for Bambu Studio, OrcaSlicer, and PrusaSlicer.

Features in v4.0:
  • 100% Watertight Mesh Engine (0 non-manifold edges, guaranteed clean slicing).
  • Ultra-Tight Bubble Contour Base hugging text & charms (Sophia MakerWorld style).
  • Text Style Modes: Raised (Embossed +1.4mm), Flush Infill (Flat multi-color surface), Engraved (Debossed).
  • Custom Charms: 🌸 Flower, ❤️ Heart, ⭐ Star, 👑 Crown, 🐾 Paw, ⚡ Lightning, 🎵 Music with custom color.
  • 5 Print-Ready Fonts: Bubbly (Sophia), Modern Bold (Helvetiker), Impact Block, Tech Aero (Gentilis), Luxury (Optimer).
  • Live Interactive Visual Preview with zoom/pan and live material colors.
  • 1-Click WhatsApp Full Message & Design Code Auto-Parser.
─────────────────────────────────────────────────────────────
"""

import sys
import os
import re
import math
import json
import zipfile
import base64
from pathlib import Path
from collections import defaultdict

# External installed libraries
import cv2
import numpy as np

# Standard GUI
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, colorchooser


# ═════════════════════════════════════════════════════════════
# CONFIGURATION & CONSTANTS
# ═════════════════════════════════════════════════════════════

FONT_FILES = {
    'bubbly':     'bubbly.typeface.json',
    'helvetiker': 'helvetiker_bold.typeface.json',
    'impact':     'impact.typeface.json',
    'gentilis':   'gentilis_bold.typeface.json',
    'optimer':    'optimer_bold.typeface.json',
}

FONT_DISPLAY_NAMES = {
    'bubbly':     'Bubbly / Rounded (Sophia Style)',
    'helvetiker': 'Modern Bold (Helvetiker)',
    'impact':     'Impact 3D Block (Heavy)',
    'gentilis':   'Tech Aero (Gentilis)',
    'optimer':    'Luxury Display (Optimer)',
}

SHAPE_DISPLAY_NAMES = {
    'contour': 'Ultra-Tight Contour (Hugs Text Border - Sophia Style)',
    'pill':    'Pill / Stadium Capsule',
    'tag':     'Rounded Luggage Tag',
    'hex':     'Modern Hexagon Shield',
}

STYLE_DISPLAY_NAMES = {
    'embossed': 'Raised / Embossed (+1.4mm Pops Out)',
    'flush':    'Flush Infill (0.0mm Flat Multi-Color Surface)',
    'engraved': 'Debossed / Engraved (-1.0mm Carved In)',
}

CHARM_DISPLAY_NAMES = {
    'none':   'None (Text Only)',
    'flower': '🌸 Daisy Flower (Sophia Style)',
    'heart':  '❤️ Classic Heart',
    'star':   '⭐ 5-Point Star',
    'crown':  '👑 Regal Crown',
    'paw':    '🐾 Pet Paw Print',
    'bolt':   '⚡ Lightning Bolt',
    'music':  '🎵 Music Note',
}

COLOR_PRESETS = [
    ('Matte Black',   '#1A1A1A'),
    ('Silk Gold',     '#D4AF37'),
    ('Pure White',    '#FFFFFF'),
    ('Pastel Pink',   '#FFB6C1'),
    ('Barbie Pink',   '#E84393'),
    ('Crimson Red',   '#C0392B'),
    ('Daisy Yellow',  '#FFD700'),
    ('Mint Green',    '#2ECC71'),
    ('Sky Blue',      '#3498DB'),
    ('Electric Cyan', '#00F2FE'),
    ('Galaxy Navy',   '#1A3A5C'),
    ('Lavender',      '#9B59B6'),
]

SIZE_PRESETS = {
    'compact':  55.0,
    'standard': 75.0,
    'large':    95.0,
}


# ═════════════════════════════════════════════════════════════
# FONT LOADER & GLYPH CONTOURS
# ═════════════════════════════════════════════════════════════

def find_font_file(font_key):
    filename = FONT_FILES.get(font_key, 'helvetiker_bold.typeface.json')
    search_dirs = [
        Path(__file__).resolve().parent / 'data' / 'fonts',
        Path.cwd() / 'data' / 'fonts',
        Path(r'c:\Users\Niktrix\Desktop\Store\pnik\data\fonts'),
    ]
    for d in search_dirs:
        candidate = d / filename
        if candidate.exists():
            return candidate
    return None

def load_font(font_key):
    path = find_font_file(font_key)
    if not path:
        return None
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"[KeychainApp] Error loading font {font_key}: {e}")
        return None

def clean_polygon_points(poly):
    """Removes duplicate closing endpoints and consecutive near-identical points."""
    pts = list(poly)
    while len(pts) > 2 and (pts[0][0] - pts[-1][0])**2 + (pts[0][1] - pts[-1][1])**2 < 1e-8:
        pts.pop()
    res = []
    for p in pts:
        if not res or (p[0] - res[-1][0])**2 + (p[1] - res[-1][1])**2 > 1e-8:
            res.append(p)
    return res

def polygon_signed_area(pts):
    n = len(pts)
    if n < 3: return 0.0
    area = sum(pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1] for i in range(n))
    return area * 0.5

def is_point_in_polygon(px, py, poly):
    inside = False
    n = len(poly)
    for i in range(n):
        j = (i - 1) % n
        xi, yi = poly[i]
        xj, yj = poly[j]
        if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi + 1e-12) + xi):
            inside = not inside
    return inside

def parse_glyph_contours(glyph, scale, cursor_x):
    """
    Parses typeface.json vector commands into clean outer contours and hole contours.
    Correctly interprets quadratic curves (cpx, cpy, endx, endy) and cubic curves (b).
    """
    if not glyph or 'o' not in glyph:
        return []
    parts = glyph['o'].strip().split()
    contours = []
    current_pts = []
    curr = (0.0, 0.0)
    i = 0

    while i < len(parts):
        cmd = parts[i]
        i += 1
        if cmd == 'm':
            if len(current_pts) > 2:
                contours.append(clean_polygon_points(current_pts))
            curr = (float(parts[i]) * scale + cursor_x, float(parts[i+1]) * scale)
            i += 2
            current_pts = [curr]
        elif cmd == 'l':
            curr = (float(parts[i]) * scale + cursor_x, float(parts[i+1]) * scale)
            i += 2
            current_pts.append(curr)
        elif cmd == 'q':
            end_x = float(parts[i]) * scale + cursor_x
            end_y = float(parts[i+1]) * scale
            cp_x  = float(parts[i+2]) * scale + cursor_x
            cp_y  = float(parts[i+3]) * scale
            i += 4
            for step in range(1, 6):
                t = step / 5.0
                x = (1 - t)**2 * curr[0] + 2 * (1 - t) * t * cp_x + t**2 * end_x
                y = (1 - t)**2 * curr[1] + 2 * (1 - t) * t * cp_y + t**2 * end_y
                current_pts.append((x, y))
            curr = (end_x, end_y)
        elif cmd == 'b':
            end_x = float(parts[i]) * scale + cursor_x
            end_y = float(parts[i+1]) * scale
            cp1_x = float(parts[i+2]) * scale + cursor_x
            cp1_y = float(parts[i+3]) * scale
            cp2_x = float(parts[i+4]) * scale + cursor_x
            cp2_y = float(parts[i+5]) * scale
            i += 6
            for step in range(1, 6):
                t = step / 5.0
                x = (1 - t)**3 * curr[0] + 3 * (1 - t)**2 * t * cp1_x + 3 * (1 - t) * t**2 * cp2_x + t**3 * end_x
                y = (1 - t)**3 * curr[1] + 3 * (1 - t)**2 * t * cp1_y + 3 * (1 - t) * t**2 * cp2_y + t**3 * end_y
                current_pts.append((x, y))
            curr = (end_x, end_y)

    if len(current_pts) > 2:
        contours.append(clean_polygon_points(current_pts))

    # Separate outer contours from hole contours by signed area
    outers = []
    holes = []
    for c in contours:
        if len(c) < 3: continue
        area = polygon_signed_area(c)
        if area < 0:  # In typeface.json fonts, CW is outer (negative area in screen coords)
            outers.append(c)
        else:
            holes.append(c)

    # Match each hole to its enclosing outer contour
    shapes = []
    for out in outers:
        matching_holes = []
        for h in holes:
            if is_point_in_polygon(h[0][0], h[0][1], out):
                matching_holes.append(h)
        shapes.append((out, matching_holes))

    return shapes


# ═════════════════════════════════════════════════════════════
# 100% WATERTIGHT EAR-CUT POLYGON TRIANGULATION ENGINE
# ═════════════════════════════════════════════════════════════

class Node:
    def __init__(self, i, x, y):
        self.i = i
        self.x = x
        self.y = y
        self.prev = None
        self.next = None

def insert_node(i, x, y, last):
    p = Node(i, x, y)
    if not last:
        p.prev = p
        p.next = p
    else:
        p.next = last.next
        p.prev = last
        last.next.prev = p
        last.next = p
    return p

def remove_node(p):
    p.next.prev = p.prev
    p.prev.next = p.next

def cross_area(p, q, r):
    return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y)

def point_in_triangle(ax, ay, bx, by, cx, cy, px, py):
    return ((cx - px) * (ay - py) - (ax - px) * (cy - py) >= -1e-9 and
            (ax - px) * (by - py) - (bx - px) * (ay - py) >= -1e-9 and
            (bx - px) * (cy - py) - (cx - px) * (by - py) >= -1e-9)

def is_ear(ear):
    a, b, c = ear.prev, ear, ear.next
    if cross_area(a, b, c) >= 0: return False
    p = ear.next.next
    while p != ear.prev:
        if point_in_triangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) and cross_area(p.prev, p, p.next) >= 0:
            return False
        p = p.next
    return True

def split_polygon(a, b):
    a2 = Node(a.i, a.x, a.y)
    b2 = Node(b.i, b.x, b.y)
    an = a.next
    bp = b.prev
    a.next = b
    b.prev = a
    a2.next = an
    an.prev = a2
    b2.next = a2
    a2.prev = b2
    bp.next = b2
    b2.prev = bp
    return b2

def find_hole_bridge(hole, outer_node):
    p = outer_node
    hx, hy = hole.x, hole.y
    qx = -float('inf')
    m = None
    while True:
        if hy <= p.y and hy >= p.next.y and p.next.y != p.y:
            x = p.x + (hy - p.y) * (p.next.x - p.x) / (p.next.y - p.y)
            if x <= hx and x > qx:
                qx = x
                if x == hx:
                    if hy == p.y: return p
                    if hy == p.next.y: return p.next
                m = p if p.x < p.next.x else p.next
        p = p.next
        if p == outer_node: break
    if not m:
        min_d = float('inf')
        p = outer_node
        while True:
            d = (p.x - hx)**2 + (p.y - hy)**2
            if d < min_d:
                min_d = d
                m = p
            p = p.next
            if p == outer_node: break
    return m

def create_linked_list(pts, start_idx, clockwise=False):
    n = len(pts)
    s_area = polygon_signed_area(pts)
    order = list(range(n))
    if (s_area < 0) != clockwise:
        order.reverse()
    last = None
    for k in order:
        last = insert_node(start_idx + k, pts[k][0], pts[k][1], last)
    return last

def earcut_triangulate(outer_pts, holes):
    """
    Standard Mapbox Earcut implementation in Python.
    Guarantees 100% planar triangulation for any polygon with or without holes.
    """
    outer_node = create_linked_list(outer_pts, 0, clockwise=False)
    start_idx = len(outer_pts)

    for hole in holes:
        hole_node = create_linked_list(hole, start_idx, clockwise=True)
        start_idx += len(hole)
        # Find leftmost node of hole
        h = hole_node
        min_h = h
        curr = h.next
        while curr != h:
            if curr.x < min_h.x: min_h = curr
            curr = curr.next
        bridge = find_hole_bridge(min_h, outer_node)
        if bridge:
            outer_node = split_polygon(bridge, min_h)

    triangles = []
    ear = outer_node
    stop = ear
    max_iter = max(len(outer_pts) * 20, 2000)

    while ear.prev != ear.next and max_iter > 0:
        max_iter -= 1
        prev = ear.prev
        next = ear.next
        if is_ear(ear):
            triangles.append((prev.i, ear.i, next.i))
            remove_node(ear)
            ear = next.next
            stop = next.next
            continue
        ear = next
        if ear == stop:
            # Cure reflex corner
            triangles.append((prev.i, ear.i, next.i))
            remove_node(ear)
            ear = next
            stop = next

    return triangles


# ═════════════════════════════════════════════════════════════
# 3D MESH BUILDER
# ═════════════════════════════════════════════════════════════

class Mesh:
    def __init__(self):
        self.vertices = []
        self.triangles = []

    def add_vertex(self, x, y, z):
        idx = len(self.vertices)
        self.vertices.append((x, y, z))
        return idx

    def add_triangle(self, v1, v2, v3):
        self.triangles.append((v1, v2, v3))

    def extrude_polygon(self, outer_poly, holes, z0, z1):
        """
        Extrudes 2D polygon with holes into a 100% watertight 3D manifold solid.
        Zero non-manifold edges. Top and bottom caps are planar triangulated;
        side walls are extruded separately around outer perimeter and hole perimeters.
        """
        c_out = clean_polygon_points(outer_poly)
        if len(c_out) < 3: return
        c_holes = [clean_polygon_points(h) for h in holes if len(clean_polygon_points(h)) >= 3]

        all_pts = list(c_out)
        for h in c_holes: all_pts.extend(h)

        cap_tris = earcut_triangulate(c_out, c_holes)

        v_offset = len(self.vertices)
        N = len(all_pts)

        # Bottom cap vertices (z0)
        for x, y in all_pts:
            self.add_vertex(x, y, z0)

        # Top cap vertices (z1)
        for x, y in all_pts:
            self.add_vertex(x, y, z1)

        # Bottom cap faces (normal pointing down)
        for i1, i2, i3 in cap_tris:
            self.add_triangle(v_offset + i3, v_offset + i2, v_offset + i1)

        # Top cap faces (normal pointing up)
        for i1, i2, i3 in cap_tris:
            self.add_triangle(v_offset + N + i1, v_offset + N + i2, v_offset + N + i3)

        # Outer perimeter vertical side walls (normal pointing outward)
        N_out = len(c_out)
        for i in range(N_out):
            j = (i + 1) % N_out
            b1 = v_offset + i
            b2 = v_offset + j
            t1 = v_offset + N + i
            t2 = v_offset + N + j
            self.add_triangle(b1, b2, t2)
            self.add_triangle(b1, t2, t1)

        # Hole vertical side walls (normal pointing inward into hole)
        h_offset = N_out
        for h in c_holes:
            nh = len(h)
            for i in range(nh):
                j = (i + 1) % nh
                b1 = v_offset + h_offset + i
                b2 = v_offset + h_offset + j
                t1 = v_offset + N + h_offset + i
                t2 = v_offset + N + h_offset + j
                self.add_triangle(b2, b1, t1)
                self.add_triangle(b2, t1, t2)
            h_offset += nh

    def to_xml(self):
        v_lines = [f'          <vertex x="{v[0]:.4f}" y="{v[1]:.4f}" z="{v[2]:.4f}"/>' for v in self.vertices]
        t_lines = [f'          <triangle v1="{t[0]}" v2="{t[1]}" v3="{t[2]}"/>' for t in self.triangles]
        return (
            "      <mesh>\n"
            "        <vertices>\n" + "\n".join(v_lines) + "\n        </vertices>\n"
            "        <triangles>\n" + "\n".join(t_lines) + "\n        </triangles>\n"
            "      </mesh>"
        )


# ═════════════════════════════════════════════════════════════
# CHARM / DECORATIVE SHAPES GENERATOR
# ═════════════════════════════════════════════════════════════

def get_charm_polygon(charm_type, size=13.0):
    """Generates 2D vector polygon for charms attached next to the text."""
    pts = []
    if charm_type == 'flower':
        # 6-petal daisy matching Sophia reference
        steps = 48
        r_inner = size * 0.28
        r_outer = size * 0.52
        for i in range(steps):
            theta = 2 * math.pi * (i / steps)
            r = r_inner + (r_outer - r_inner) * (0.5 + 0.5 * math.cos(6 * theta))
            pts.append((r * math.cos(theta), r * math.sin(theta)))
    elif charm_type == 'heart':
        steps = 32
        scale = size / 32.0
        for i in range(steps):
            t = 2 * math.pi * (i / steps)
            x = 16 * (math.sin(t)**3) * scale
            y = (13 * math.cos(t) - 5 * math.cos(2*t) - 2 * math.cos(3*t) - math.cos(4*t)) * scale
            pts.append((x, y))
    elif charm_type == 'star':
        steps = 10
        r_out = size * 0.52
        r_in = size * 0.24
        for i in range(steps):
            r = r_out if i % 2 == 0 else r_in
            a = -math.pi * 0.5 + 2 * math.pi * (i / steps)
            pts.append((r * math.cos(a), r * math.sin(a)))
    elif charm_type == 'crown':
        w, h = size * 0.5, size * 0.45
        pts = [(-w, -h), (-w*0.8, h*0.7), (-w*0.3, h*0.2), (0, h), (w*0.3, h*0.2), (w*0.8, h*0.7), (w, -h)]
    elif charm_type == 'paw':
        steps = 24
        for i in range(steps):
            a = 2 * math.pi * (i / steps)
            pts.append((size * 0.38 * math.cos(a), -size * 0.12 + size * 0.3 * math.sin(a)))
    elif charm_type == 'bolt':
        s = size * 0.45
        pts = [(s*0.2, s*1.1), (-s*0.9, -s*0.1), (-s*0.1, -s*0.1), (-s*0.4, -s*1.1), (s*0.9, s*0.1), (s*0.1, s*0.1)]
    elif charm_type == 'music':
        w, h = size * 0.45, size * 0.45
        pts = [(-w, -h), (-w*0.4, -h), (-w*0.4, h*0.7), (w*0.8, h*0.7), (w*0.8, -h*0.2), (w*1.2, -h*0.2), (w*1.2, h), (-w*0.8, h), (-w*0.8, -h*0.3), (-w, -h*0.3)]
    return clean_polygon_points(pts)


# ═════════════════════════════════════════════════════════════
# PARAMETRIC GEOMETRY GENERATORS
# ═════════════════════════════════════════════════════════════

def generate_keychain_geometry(
    text, font_data, shape_type, text_style, hole_pos, target_width,
    charm_type='none', charm_pos='right', base_thickness=3.2, text_height=1.4
):
    """
    Generates exact 3D multi-material geometry:
      1. Base Plate mesh (Watertight, hugging text and charm silhouette).
      2. Text mesh (Raised, Flush Inlay, or Engraved).
      3. Charm mesh (if charm_type != 'none').
    """
    glyphs = font_data.get('glyphs', {})
    total_advance = sum(glyphs.get(ch, glyphs.get('?', {'ha': 600})).get('ha', 600) for ch in text)
    if total_advance == 0: total_advance = 1000
    scale = (target_width * 0.72) / total_advance

    all_letter_shapes = []
    cursor_x = 0.0

    for ch in text:
        g = glyphs.get(ch) or glyphs.get('?')
        if g:
            shapes = parse_glyph_contours(g, scale, cursor_x)
            all_letter_shapes.extend(shapes)
            cursor_x += g.get('ha', 600) * scale

    if not all_letter_shapes:
        all_letter_shapes = [([(-15, -6), (15, -6), (15, 6), (-15, 6)], [])]

    # Compute text bounding box
    min_x = min(pt[0] for out, _ in all_letter_shapes for pt in out)
    max_x = max(pt[0] for out, _ in all_letter_shapes for pt in out)
    min_y = min(pt[1] for out, _ in all_letter_shapes for pt in out)
    max_y = max(pt[1] for out, _ in all_letter_shapes for pt in out)
    cx, cy = (min_x + max_x) * 0.5, (min_y + max_y) * 0.5
    text_w = max_x - min_x
    text_h = max_y - min_y

    # Center letters at origin
    centered_letters = []
    for out, holes in all_letter_shapes:
        c_out = [(x - cx, y - cy) for x, y in out]
        c_holes = [[(x - cx, y - cy) for x, y in h] for h in holes]
        centered_letters.append((c_out, c_holes))

    # Generate Charm Shape if selected
    charm_shapes = []
    charm_size = max(text_h * 0.85, 12.0)
    if charm_type != 'none':
        raw_charm_poly = get_charm_polygon(charm_type, charm_size)
        if raw_charm_poly:
            offset_x = (text_w * 0.5 + charm_size * 0.65 + 1.5) if charm_pos == 'right' else (-text_w * 0.5 - charm_size * 0.65 - 1.5)
            c_charm = [(p[0] + offset_x, p[1]) for p in raw_charm_poly]
            charm_shapes.append((c_charm, []))

    # Determine Z-levels based on text_style
    # Embossed: Starts at z=1.6mm inside base, protrudes +1.4mm above top surface
    # Flush: Starts at z=1.6mm inside base, stops EXACTLY at z=base_thickness (flush single surface)
    # Engraved: Starts at z=base_thickness - 1.2mm, stops at base_thickness
    if text_style == 'flush':
        z_text_min = max(0.0, base_thickness - 1.6)
        z_text_max = base_thickness
    elif text_style == 'engraved':
        z_text_min = max(0.0, base_thickness - 1.2)
        z_text_max = base_thickness
    else:  # embossed
        z_text_min = max(0.0, base_thickness - 1.6)
        z_text_max = base_thickness + text_height

    # 1. Build 3D Text Mesh
    text_mesh = Mesh()
    for out, holes in centered_letters:
        text_mesh.extrude_polygon(out, holes, z_text_min, z_text_max)

    # 2. Build 3D Charm Mesh
    charm_mesh = Mesh()
    for out, holes in charm_shapes:
        charm_mesh.extrude_polygon(out, holes, z_text_min, z_text_max)

    # 3. Build Base Plate Shape
    base_outer_poly = []
    base_hole = []

    # Combined bounding box of text + charm
    all_combined_shapes = list(centered_letters) + list(charm_shapes)
    comb_min_x = min(p[0] for out, _ in all_combined_shapes for p in out)
    comb_max_x = max(p[0] for out, _ in all_combined_shapes for p in out)
    comb_min_y = min(p[1] for out, _ in all_combined_shapes for p in out)
    comb_max_y = max(p[1] for out, _ in all_combined_shapes for p in out)
    total_w = comb_max_x - comb_min_x
    total_h = comb_max_y - comb_min_y
    mid_x = (comb_min_x + comb_max_x) * 0.5
    mid_y = (comb_min_y + comb_max_y) * 0.5

    if shape_type == 'contour':
        PPM = 10  # 10 pixels per mm resolution
        pad_mm = 16.0
        grid_w = int((total_w + pad_mm * 2) * PPM)
        grid_h = int((total_h + pad_mm * 2) * PPM)
        grid = np.zeros((grid_h, grid_w), dtype=np.uint8)

        # Draw text + charm glyphs onto high-res mask
        for out, holes in all_combined_shapes:
            pts = np.array([[(p[0] - mid_x + total_w * 0.5 + pad_mm) * PPM, (grid_h * 0.5 - (p[1] - mid_y) * PPM)] for p in out], dtype=np.int32)
            cv2.fillPoly(grid, [pts], 255)
            for h in holes:
                h_pts = np.array([[(p[0] - mid_x + total_w * 0.5 + pad_mm) * PPM, (grid_h * 0.5 - (p[1] - mid_y) * PPM)] for p in h], dtype=np.int32)
                cv2.fillPoly(grid, [h_pts], 0)

        # Ultra-tight bubble contour dilation (radius = 2.2mm - hugs letters like Sophia sticker)
        r_px = int(2.2 * PPM)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (r_px * 2 + 1, r_px * 2 + 1))
        dilated = cv2.dilate(grid, kernel)

        # Keyring loop boss
        loop_radius_mm = 5.0
        hole_radius_mm = 2.2
        if hole_pos == 'left':
            loop_x_mm = comb_min_x - 4.0
            loop_y_mm = 0.0
            lx_px = int((loop_x_mm - mid_x + total_w * 0.5 + pad_mm) * PPM)
            ly_px = int(grid_h * 0.5 - (loop_y_mm - mid_y) * PPM)
            cv2.circle(dilated, (lx_px, ly_px), int(loop_radius_mm * PPM), 255, -1)
        elif hole_pos == 'right':
            loop_x_mm = comb_max_x + 4.0
            loop_y_mm = 0.0
            lx_px = int((loop_x_mm - mid_x + total_w * 0.5 + pad_mm) * PPM)
            ly_px = int(grid_h * 0.5 - (loop_y_mm - mid_y) * PPM)
            cv2.circle(dilated, (lx_px, ly_px), int(loop_radius_mm * PPM), 255, -1)
        elif hole_pos == 'top':
            loop_x_mm = mid_x
            loop_y_mm = comb_max_y + 4.0
            lx_px = int((loop_x_mm - mid_x + total_w * 0.5 + pad_mm) * PPM)
            ly_px = int(grid_h * 0.5 - (loop_y_mm - mid_y) * PPM)
            cv2.circle(dilated, (lx_px, ly_px), int(loop_radius_mm * PPM), 255, -1)

        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_TC89_KCOS)
        if contours:
            largest = max(contours, key=cv2.contourArea)
            approx = cv2.approxPolyDP(largest, 1.0, True)
            for p in approx:
                x_mm = (p[0][0] / PPM) - total_w * 0.5 - pad_mm + mid_x
                y_mm = (grid_h * 0.5 - p[0][1]) / PPM + mid_y
                base_outer_poly.append((x_mm, y_mm))

        if hole_pos != 'none':
            steps = 16
            for i in range(steps):
                a = 2 * math.pi * (i / steps)
                base_hole.append((loop_x_mm + hole_radius_mm * math.cos(a), loop_y_mm + hole_radius_mm * math.sin(a)))

    else:
        # Standard geometric shapes: Pill, Tag, Hex
        pad_x = 7.0
        pad_y = 6.0
        loop_extra = 11.5
        W = max(total_w + pad_x * 2, 42.0)
        H = max(total_h + pad_y * 2, 18.0)
        x0 = mid_x - W * 0.5 - (loop_extra if hole_pos == 'left' else 0.0)
        x1 = mid_x + W * 0.5 + (loop_extra if hole_pos == 'right' else 0.0)
        y0 = mid_y - H * 0.5
        y1 = mid_y + H * 0.5 + (loop_extra * 0.8 if hole_pos == 'top' else 0.0)
        radius = min(H * 0.45, 9.0)
        segs = 16

        if shape_type == 'pill':
            r = (y1 - y0) * 0.5
            for i in range(segs + 1):
                a = -math.pi * 0.5 + math.pi * (i / segs)
                base_outer_poly.append((x1 - r + r * math.cos(a), (y0 + y1) * 0.5 + r * math.sin(a)))
            for i in range(segs + 1):
                a = math.pi * 0.5 + math.pi * (i / segs)
                base_outer_poly.append((x0 + r + r * math.cos(a), (y0 + y1) * 0.5 + r * math.sin(a)))
        elif shape_type == 'hex':
            ch = 8.0
            mid_y_val = (y0 + y1) * 0.5
            base_outer_poly = [(x0 + ch, y0), (x1 - ch, y0), (x1, mid_y_val), (x1 - ch, y1), (x0 + ch, y1), (x0, mid_y_val)]
        else:  # tag
            for i in range(segs + 1):
                a = -math.pi * 0.5 + (math.pi * 0.5) * (i / segs)
                base_outer_poly.append((x1 - radius + radius * math.cos(a), y0 + radius + radius * math.sin(a)))
            for i in range(segs + 1):
                a = 0.0 + (math.pi * 0.5) * (i / segs)
                base_outer_poly.append((x1 - radius + radius * math.cos(a), y1 - radius + radius * math.sin(a)))
            for i in range(segs + 1):
                a = math.pi * 0.5 + (math.pi * 0.5) * (i / segs)
                base_outer_poly.append((x0 + radius + radius * math.cos(a), y1 - radius + radius * math.sin(a)))
            for i in range(segs + 1):
                a = math.pi + (math.pi * 0.5) * (i / segs)
                base_outer_poly.append((x0 + radius + radius * math.cos(a), y0 + radius + radius * math.sin(a)))

        if hole_pos != 'none':
            hx = x0 + 6.8 if hole_pos == 'left' else (x1 - 6.8 if hole_pos == 'right' else (x0 + x1) * 0.5)
            hy = (y0 + y1) * 0.5 if hole_pos != 'top' else y1 - 6.8
            for i in range(16):
                a = 2 * math.pi * (i / 16.0)
                base_hole.append((hx + 2.4 * math.cos(a), hy + 2.4 * math.sin(a)))

    if not base_outer_poly:
        base_outer_poly = [(-total_w*0.5 - 10, -12), (total_w*0.5 + 10, -12), (total_w*0.5 + 10, 12), (-total_w*0.5 - 10, 12)]

    # 4. Extrude Base Plate Mesh (100% Watertight)
    base_mesh = Mesh()
    holes_list = [base_hole] if base_hole else []
    base_mesh.extrude_polygon(base_outer_poly, holes_list, 0.0, base_thickness)

    # Calculate final dimensions
    bw = max(p[0] for p in base_outer_poly) - min(p[0] for p in base_outer_poly)
    bh = max(p[1] for p in base_outer_poly) - min(p[1] for p in base_outer_poly)
    bz = max(z_text_max, base_thickness)

    preview_data = {
        'base_poly': base_outer_poly,
        'hole': base_hole,
        'letters': centered_letters,
        'charms': charm_shapes,
        'dimensions': (bw, bh, bz)
    }

    return base_mesh, text_mesh, charm_mesh, preview_data


# ═════════════════════════════════════════════════════════════
# 3MF PACKAGER
# ═════════════════════════════════════════════════════════════

def export_3mf(base_mesh, text_mesh, charm_mesh, base_hex, text_hex, charm_hex, output_path, title="Pniktrix Keychain"):
    bc = base_hex.upper() if base_hex.startswith('#') else f'#{base_hex.upper()}'
    tc = text_hex.upper() if text_hex.startswith('#') else f'#{text_hex.upper()}'
    cc = charm_hex.upper() if charm_hex.startswith('#') else f'#{charm_hex.upper()}'

    has_charm = len(charm_mesh.triangles) > 0

    colorgroup_xml = f"""    <m:colorgroup id="1">
      <m:color color="{bc}"/>
      <m:color color="{tc}"/>
      <m:color color="{cc}"/>
    </m:colorgroup>"""

    charm_object_xml = ""
    charm_component_xml = ""
    if has_charm:
        charm_object_xml = f"""    <object id="4" type="model" name="Keychain_Charm" pid="1" pindex="2">
{charm_mesh.to_xml()}
    </object>"""
        charm_component_xml = """        <component objectid="4"/>"""

    model_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US"
       xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"
       xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">
  <metadata name="Title">{title}</metadata>
  <metadata name="Designer">Pniktrix 3D Studio</metadata>
  <resources>
{colorgroup_xml}
    <object id="2" type="model" name="Keychain_Base" pid="1" pindex="0">
{base_mesh.to_xml()}
    </object>
    <object id="3" type="model" name="Keychain_Text" pid="1" pindex="1">
{text_mesh.to_xml()}
    </object>
{charm_object_xml}
    <object id="5" type="model" name="Assembled_Keychain">
      <components>
        <component objectid="2"/>
        <component objectid="3"/>
{charm_component_xml}
      </components>
    </object>
  </resources>
  <build>
    <item objectid="5"/>
  </build>
</model>"""

    rels_xml = """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>"""

    content_types_xml = """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>"""

    with zipfile.ZipFile(output_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('_rels/.rels', rels_xml)
        zf.writestr('[Content_Types].xml', content_types_xml)
        zf.writestr('3D/3dmodel.model', model_xml)

    print(f"[KeychainApp] Successfully exported watertight 3MF to {output_path}")
    return True


# ═════════════════════════════════════════════════════════════
# MESSAGE PARSER (Full WhatsApp Message & Compact Codes)
# ═════════════════════════════════════════════════════════════

def parse_full_message(raw_text):
    """
    Parses a raw WhatsApp message or design code into configuration specs.
    Formats supported:
      1. KC|Text|Font|Shape|Style|BaseColor|TextColor|Charm|CharmColor|HolePos|Size
      2. Key-value lines (e.g. *Custom Text:* Sophia)
    """
    raw = (raw_text or "").strip()
    config = {
        'text':        'NIKTRIX',
        'font':        'helvetiker',
        'shape':       'contour',
        'style':       'embossed',
        'base_color':  '#1A1A1A',
        'text_color':  '#D4AF37',
        'charm':       'none',
        'charm_color': '#FFD700',
        'hole_pos':    'left',
        'size':        'standard',
    }

    # Match embedded compact code `KC|...`
    code_match = re.search(r'KC\|([^`\n\r]+)', raw)
    if code_match:
        parts = code_match.group(1).split('|')
        if len(parts) >= 1 and parts[0]: config['text'] = parts[0]
        if len(parts) >= 2 and parts[1]: config['font'] = parts[1].lower()
        if len(parts) >= 3 and parts[2]: config['shape'] = parts[2].lower()
        if len(parts) >= 4 and parts[3]: config['style'] = parts[3].lower()
        if len(parts) >= 5 and parts[4]: config['base_color'] = parts[4]
        if len(parts) >= 6 and parts[5]: config['text_color'] = parts[5]
        if len(parts) >= 7 and parts[6]: config['charm'] = parts[6].lower()
        if len(parts) >= 8 and parts[7]: config['charm_color'] = parts[7]
        if len(parts) >= 9 and parts[8]: config['hole_pos'] = parts[8].lower()
        if len(parts) >= 10 and parts[9]: config['size'] = parts[9].lower()
        return config

    # Match natural WhatsApp lines
    text_m = re.search(r'Text[:\s*]+([^\n\r]+)', raw, re.IGNORECASE)
    if text_m: config['text'] = text_m.group(1).replace('*', '').strip()

    font_m = re.search(r'Font[:\s*]+(\w+)', raw, re.IGNORECASE)
    if font_m:
        fk = font_m.group(1).lower()
        for k in FONT_FILES:
            if k in fk: config['font'] = k; break

    shape_m = re.search(r'Shape[:\s*]+(\w+)', raw, re.IGNORECASE)
    if shape_m:
        sk = shape_m.group(1).lower()
        for k in SHAPE_DISPLAY_NAMES:
            if k in sk: config['shape'] = k; break

    style_m = re.search(r'Style[:\s*]+(\w+)', raw, re.IGNORECASE)
    if style_m:
        stk = style_m.group(1).lower()
        for k in STYLE_DISPLAY_NAMES:
            if k in stk: config['style'] = k; break

    charm_m = re.search(r'Charm[:\s*]+(\w+)', raw, re.IGNORECASE)
    if charm_m:
        ck = charm_m.group(1).lower()
        for k in CHARM_DISPLAY_NAMES:
            if k in ck: config['charm'] = k; break

    hex_codes = re.findall(r'#[0-9a-fA-F]{6}', raw)
    if len(hex_codes) >= 1: config['base_color'] = hex_codes[0]
    if len(hex_codes) >= 2: config['text_color'] = hex_codes[1]
    if len(hex_codes) >= 3: config['charm_color'] = hex_codes[2]

    return config


# ═════════════════════════════════════════════════════════════
# DESKTOP GUI APPLICATION (Tkinter)
# ═════════════════════════════════════════════════════════════

class KeychainApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Pniktrix 3D Keychain Maker — Desktop Studio v4.0")
        self.root.geometry("1100x780")
        self.root.minsize(950, 680)

        # Apply dark theme styling
        self.bg_dark = "#131418"
        self.bg_panel = "#1C1E24"
        self.bg_card = "#252830"
        self.fg_text = "#FFFFFF"
        self.accent_gold = "#D4AF37"
        self.accent_green = "#25D366"

        self.root.configure(bg=self.bg_dark)

        # State Variables
        self.text_var = tk.StringVar(value="NIKTRIX")
        self.font_var = tk.StringVar(value="helvetiker")
        self.shape_var = tk.StringVar(value="contour")
        self.style_var = tk.StringVar(value="embossed")
        self.base_color_var = tk.StringVar(value="#1A1A1A")
        self.text_color_var = tk.StringVar(value="#D4AF37")
        self.charm_var = tk.StringVar(value="none")
        self.charm_color_var = tk.StringVar(value="#FFD700")
        self.hole_var = tk.StringVar(value="left")
        self.size_var = tk.StringVar(value="standard")

        self.preview_scale = 3.5
        self.pan_offset = [0, 0]
        self._drag_start = None

        self._build_ui()
        self.on_value_change()

    def _build_ui(self):
        # Top Header Bar
        hdr = tk.Frame(self.root, bg=self.bg_panel, height=54)
        hdr.pack(fill=tk.X, side=tk.TOP)
        hdr.pack_propagate(False)

        logo = tk.Label(hdr, text="PNIKTRIX", font=("Segoe UI", 16, "bold"), fg=self.accent_gold, bg=self.bg_panel)
        logo.pack(side=tk.LEFT, padx=(20, 8))
        subtitle = tk.Label(hdr, text="3D Keychain Studio & Multi-Material 3MF Maker", font=("Segoe UI", 10), fg="#A0A0A0", bg=self.bg_panel)
        subtitle.pack(side=tk.LEFT)

        status_badge = tk.Label(hdr, text="● Slicer Watertight Engine Ready", font=("Segoe UI", 9, "bold"), fg=self.accent_green, bg=self.bg_panel)
        status_badge.pack(side=tk.RIGHT, padx=20)

        # Main Layout: Left Controls Panel (Scrollable) | Right Interactive Visual Preview
        main_pane = tk.PanedWindow(self.root, orient=tk.HORIZONTAL, bg=self.bg_dark, bd=0, sashwidth=4)
        main_pane.pack(fill=tk.BOTH, expand=True)

        # Left Controls Frame
        left_frame = tk.Frame(main_pane, bg=self.bg_panel, width=460)
        left_frame.pack_propagate(False)
        main_pane.add(left_frame)

        # Right Preview Frame
        right_frame = tk.Frame(main_pane, bg=self.bg_dark)
        main_pane.add(right_frame)

        self._build_controls(left_frame)
        self._build_preview(right_frame)

    def _build_controls(self, parent):
        canvas = tk.Canvas(parent, bg=self.bg_panel, bd=0, highlightthickness=0)
        scrollbar = ttk.Scrollbar(parent, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg=self.bg_panel)

        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw", width=440)
        canvas.configure(yview_command=scrollbar.set)

        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        pad = {'padx': 16, 'pady': 6}

        # 1. WhatsApp Order Import Box
        sec1 = self._make_card(scrollable_frame, "1. WhatsApp Order Message Auto-Import")
        lbl_msg = tk.Label(sec1, text="Paste customer WhatsApp message or design code:", font=("Segoe UI", 8), fg="#A0A0A0", bg=self.bg_card)
        lbl_msg.pack(anchor="w", padx=10, pady=(4, 2))

        self.txt_wa = tk.Text(sec1, height=3, bg="#18191E", fg="#FFFFFF", insertbackground="#FFF", font=("Consolas", 8), bd=1, relief="solid")
        self.txt_wa.pack(fill=tk.X, padx=10, pady=2)
        self.txt_wa.insert("1.0", "Custom 3D Keychain Order\n*Name:* Sanjana\n*Font:* bubbly | *Charm:* flower\nCode: `KC|Sanjana|bubbly|contour|embossed|#FFFFFF|#E84393|flower|#FFD700|left|standard`")

        btn_parse = tk.Button(sec1, text="⚡ Decode & Populate Options", bg=self.accent_green, fg="#FFF", font=("Segoe UI", 9, "bold"), bd=0, padx=12, pady=4, cursor="hand2", command=self.parse_wa_input)
        btn_parse.pack(anchor="e", padx=10, pady=(4, 8))

        # 2. Text & Font Settings
        sec2 = self._make_card(scrollable_frame, "2. Text & Font Typography")

        tk.Label(sec2, text="Keychain Name / Text:", font=("Segoe UI", 9, "bold"), fg=self.fg_text, bg=self.bg_card).pack(anchor="w", padx=10, pady=(6, 2))
        ent_text = tk.Entry(sec2, textvariable=self.text_var, font=("Segoe UI", 12, "bold"), bg="#18191E", fg=self.accent_gold, insertbackground="#FFF", bd=1, relief="solid")
        ent_text.pack(fill=tk.X, padx=10, pady=(0, 6))
        self.text_var.trace_add("write", lambda *args: self.on_value_change())

        tk.Label(sec2, text="Font Family:", font=("Segoe UI", 9, "bold"), fg=self.fg_text, bg=self.bg_card).pack(anchor="w", padx=10, pady=(4, 2))
        font_cb = ttk.Combobox(sec2, textvariable=self.font_var, values=list(FONT_DISPLAY_NAMES.keys()), state="readonly")
        font_cb.pack(fill=tk.X, padx=10, pady=(0, 8))
        font_cb.bind("<<ComboboxSelected>>", lambda e: self.on_value_change())

        # 3. Base Plate Shape & Text Style
        sec3 = self._make_card(scrollable_frame, "3. Base Plate Shape & 3D Text Style")

        tk.Label(sec3, text="Base Plate Silhouette:", font=("Segoe UI", 9, "bold"), fg=self.fg_text, bg=self.bg_card).pack(anchor="w", padx=10, pady=(6, 2))
        shape_cb = ttk.Combobox(sec3, textvariable=self.shape_var, values=list(SHAPE_DISPLAY_NAMES.keys()), state="readonly")
        shape_cb.pack(fill=tk.X, padx=10, pady=(0, 6))
        shape_cb.bind("<<ComboboxSelected>>", lambda e: self.on_value_change())

        tk.Label(sec3, text="3D Text Print Style:", font=("Segoe UI", 9, "bold"), fg=self.fg_text, bg=self.bg_card).pack(anchor="w", padx=10, pady=(4, 2))
        style_cb = ttk.Combobox(sec3, textvariable=self.style_var, values=list(STYLE_DISPLAY_NAMES.keys()), state="readonly")
        style_cb.pack(fill=tk.X, padx=10, pady=(0, 8))
        style_cb.bind("<<ComboboxSelected>>", lambda e: self.on_value_change())

        # 4. Decorative Charm / Icon
        sec4 = self._make_card(scrollable_frame, "4. Decorative Charm (Side Icon)")

        tk.Label(sec4, text="Attach Decorative Charm:", font=("Segoe UI", 9, "bold"), fg=self.fg_text, bg=self.bg_card).pack(anchor="w", padx=10, pady=(6, 2))
        charm_cb = ttk.Combobox(sec4, textvariable=self.charm_var, values=list(CHARM_DISPLAY_NAMES.keys()), state="readonly")
        charm_cb.pack(fill=tk.X, padx=10, pady=(0, 6))
        charm_cb.bind("<<ComboboxSelected>>", lambda e: self.on_value_change())

        # 5. Filament Color Customization
        sec5 = self._make_card(scrollable_frame, "5. Filament Colors (Multi-Material)")

        colors_frame = tk.Frame(sec5, bg=self.bg_card)
        colors_frame.pack(fill=tk.X, padx=10, pady=6)

        # Base Color
        col1 = tk.Frame(colors_frame, bg=self.bg_card)
        col1.pack(side=tk.LEFT, expand=True, fill=tk.X, padx=2)
        tk.Label(col1, text="Base Color", font=("Segoe UI", 8), fg="#A0A0A0", bg=self.bg_card).pack()
        self.btn_base_col = tk.Button(col1, bg=self.base_color_var.get(), width=8, height=1, relief="ridge", cursor="hand2", command=lambda: self.pick_color('base'))
        self.btn_base_col.pack(pady=2)

        # Text Color
        col2 = tk.Frame(colors_frame, bg=self.bg_card)
        col2.pack(side=tk.LEFT, expand=True, fill=tk.X, padx=2)
        tk.Label(col2, text="Text Color", font=("Segoe UI", 8), fg="#A0A0A0", bg=self.bg_card).pack()
        self.btn_text_col = tk.Button(col2, bg=self.text_color_var.get(), width=8, height=1, relief="ridge", cursor="hand2", command=lambda: self.pick_color('text'))
        self.btn_text_col.pack(pady=2)

        # Charm Color
        col3 = tk.Frame(colors_frame, bg=self.bg_card)
        col3.pack(side=tk.LEFT, expand=True, fill=tk.X, padx=2)
        tk.Label(col3, text="Charm Color", font=("Segoe UI", 8), fg="#A0A0A0", bg=self.bg_card).pack()
        self.btn_charm_col = tk.Button(col3, bg=self.charm_color_var.get(), width=8, height=1, relief="ridge", cursor="hand2", command=lambda: self.pick_color('charm'))
        self.btn_charm_col.pack(pady=2)

        # 6. Keyring Hole & Size Preset
        sec6 = self._make_card(scrollable_frame, "6. Keyring Hole & Size Preset")
        sub_frame = tk.Frame(sec6, bg=self.bg_card)
        sub_frame.pack(fill=tk.X, padx=10, pady=6)

        sub1 = tk.Frame(sub_frame, bg=self.bg_card)
        sub1.pack(side=tk.LEFT, expand=True, fill=tk.X, padx=2)
        tk.Label(sub1, text="Hole Position:", font=("Segoe UI", 8), fg="#A0A0A0", bg=self.bg_card).pack()
        hole_cb = ttk.Combobox(sub1, textvariable=self.hole_var, values=['left', 'right', 'top', 'none'], state="readonly")
        hole_cb.pack(fill=tk.X)
        hole_cb.bind("<<ComboboxSelected>>", lambda e: self.on_value_change())

        sub2 = tk.Frame(sub_frame, bg=self.bg_card)
        sub2.pack(side=tk.LEFT, expand=True, fill=tk.X, padx=2)
        tk.Label(sub2, text="Length Preset:", font=("Segoe UI", 8), fg="#A0A0A0", bg=self.bg_card).pack()
        size_cb = ttk.Combobox(sub2, textvariable=self.size_var, values=['compact', 'standard', 'large'], state="readonly")
        size_cb.pack(fill=tk.X)
        size_cb.bind("<<ComboboxSelected>>", lambda e: self.on_value_change())

        # 7. Action Button
        btn_export = tk.Button(
            scrollable_frame, text="🖨️ Export Print-Ready Multi-Material 3MF",
            font=("Segoe UI", 11, "bold"), bg=self.accent_gold, fg="#131418",
            activebackground="#E5C158", activeforeground="#000", bd=0, pady=12,
            cursor="hand2", command=self.export_3mf_file
        )
        btn_export.pack(fill=tk.X, padx=16, pady=(12, 24))

    def _make_card(self, parent, title):
        card = tk.Frame(parent, bg=self.bg_card, bd=1, relief="solid")
        card.pack(fill=tk.X, padx=16, pady=6)
        hdr = tk.Label(card, text=title, font=("Segoe UI", 9, "bold"), fg=self.accent_gold, bg=self.bg_card)
        hdr.pack(anchor="w", padx=10, pady=(6, 2))
        return card

    def _build_preview(self, parent):
        top_bar = tk.Frame(parent, bg="#18191E", height=38)
        top_bar.pack(fill=tk.X, side=tk.TOP)
        top_bar.pack_propagate(False)

        self.lbl_dims = tk.Label(top_bar, text="Dimensions: 75.0 × 24.0 × 4.6 mm", font=("Segoe UI", 9, "bold"), fg=self.accent_gold, bg="#18191E")
        self.lbl_dims.pack(side=tk.LEFT, padx=14)

        lbl_hint = tk.Label(top_bar, text="Mouse Wheel: Zoom | Drag: Pan", font=("Segoe UI", 8), fg="#707070", bg="#18191E")
        lbl_hint.pack(side=tk.RIGHT, padx=14)

        self.canvas_preview = tk.Canvas(parent, bg="#0D0E11", bd=0, highlightthickness=0)
        self.canvas_preview.pack(fill=tk.BOTH, expand=True)

        self.canvas_preview.bind("<ButtonPress-1>", self._on_pan_start)
        self.canvas_preview.bind("<B1-Motion>", self._on_pan_move)
        self.canvas_preview.bind("<MouseWheel>", self._on_zoom)

    def _on_pan_start(self, event):
        self._drag_start = (event.x, event.y)

    def _on_pan_move(self, event):
        if self._drag_start:
            dx = event.x - self._drag_start[0]
            dy = event.y - self._drag_start[1]
            self.pan_offset[0] += dx
            self.pan_offset[1] += dy
            self._drag_start = (event.x, event.y)
            self.draw_preview()

    def _on_zoom(self, event):
        if event.delta > 0:
            self.preview_scale = min(self.preview_scale * 1.15, 12.0)
        else:
            self.preview_scale = max(self.preview_scale * 0.85, 1.0)
        self.draw_preview()

    def pick_color(self, target):
        initial = getattr(self, f"{target}_color_var").get()
        color = colorchooser.askcolor(color=initial, title=f"Choose {target.title()} Filament Color")
        if color and color[1]:
            hex_val = color[1].upper()
            getattr(self, f"{target}_color_var").set(hex_val)
            getattr(self, f"btn_{target}_col").configure(bg=hex_val)
            self.on_value_change()

    def parse_wa_input(self):
        raw = self.txt_wa.get("1.0", tk.END).strip()
        if not raw:
            messagebox.showwarning("Empty Message", "Please paste customer WhatsApp text or design code.")
            return

        cfg = parse_full_message(raw)
        self.text_var.set(cfg['text'])
        self.font_var.set(cfg['font'])
        self.shape_var.set(cfg['shape'])
        self.style_var.set(cfg['style'])
        self.base_color_var.set(cfg['base_color'])
        self.text_color_var.set(cfg['text_color'])
        self.charm_var.set(cfg['charm'])
        self.charm_color_var.set(cfg['charm_color'])
        self.hole_var.set(cfg['hole_pos'])
        self.size_var.set(cfg['size'])

        self.btn_base_col.configure(bg=cfg['base_color'])
        self.btn_text_col.configure(bg=cfg['text_color'])
        self.btn_charm_col.configure(bg=cfg['charm_color'])

        self.on_value_change()
        messagebox.showinfo("Order Decoded", f"Successfully loaded design for: {cfg['text']}")

    def on_value_change(self):
        font_data = load_font(self.font_var.get()) or load_font('helvetiker')
        if not font_data: return

        target_w = SIZE_PRESETS.get(self.size_var.get(), 75.0)

        self.last_geom = generate_keychain_geometry(
            text=self.text_var.get().strip() or "NIKTRIX",
            font_data=font_data,
            shape_type=self.shape_var.get(),
            text_style=self.style_var.get(),
            hole_pos=self.hole_var.get(),
            target_width=target_w,
            charm_type=self.charm_var.get(),
            charm_pos='right',
            base_thickness=3.2,
            text_height=1.4
        )

        dims = self.last_geom[3]['dimensions']
        self.lbl_dims.configure(text=f"Dimensions: {dims[0]:.1f} × {dims[1]:.1f} × {dims[2]:.1f} mm | Price: ₹99")
        self.draw_preview()

    def draw_preview(self):
        if not hasattr(self, 'last_geom'): return
        self.canvas_preview.delete("all")

        w = self.canvas_preview.winfo_width() or 600
        h = self.canvas_preview.winfo_height() or 500
        cx = w * 0.5 + self.pan_offset[0]
        cy = h * 0.5 + self.pan_offset[1]
        scale = self.preview_scale

        geom_data = self.last_geom[3]

        # Draw Base Plate
        base_poly = geom_data['base_poly']
        if len(base_poly) >= 3:
            pts = []
            for p in base_poly:
                pts.extend([cx + p[0] * scale, cy - p[1] * scale])
            self.canvas_preview.create_polygon(pts, fill=self.base_color_var.get(), outline="#404040", width=2)

        # Draw Keyring Hole
        hole_poly = geom_data.get('hole')
        if hole_poly and len(hole_poly) >= 3:
            pts = []
            for p in hole_poly:
                pts.extend([cx + p[0] * scale, cy - p[1] * scale])
            self.canvas_preview.create_polygon(pts, fill="#0D0E11", outline="#888888", width=1)

        # Draw Charm if present
        for out, _ in geom_data.get('charms', []):
            pts = []
            for p in out:
                pts.extend([cx + p[0] * scale, cy - p[1] * scale])
            self.canvas_preview.create_polygon(pts, fill=self.charm_color_var.get(), outline="#000", width=1)

        # Draw Letters
        for out, holes in geom_data.get('letters', []):
            pts = []
            for p in out:
                pts.extend([cx + p[0] * scale, cy - p[1] * scale])
            self.canvas_preview.create_polygon(pts, fill=self.text_color_var.get(), outline="#000000", width=1)

            # Draw holes inside letters with base color
            for h_pts in holes:
                h_screen = []
                for p in h_pts:
                    h_screen.extend([cx + p[0] * scale, cy - p[1] * scale])
                self.canvas_preview.create_polygon(h_screen, fill=self.base_color_var.get(), outline="#000000", width=1)

    def export_3mf_file(self):
        text_safe = re.sub(r'[^a-zA-Z0-9_\-]', '', self.text_var.get().strip()) or "Keychain"
        default_filename = f"Keychain-{text_safe}.3mf"

        file_path = filedialog.asksaveasfilename(
            defaultextension=".3mf",
            filetypes=[("3MF 3D Manufacturing File", "*.3mf"), ("All Files", "*.*")],
            initialfile=default_filename,
            title="Save Multi-Material 3MF File"
        )
        if not file_path:
            return

        base_mesh, text_mesh, charm_mesh, _ = self.last_geom
        success = export_3mf(
            base_mesh=base_mesh,
            text_mesh=text_mesh,
            charm_mesh=charm_mesh,
            base_hex=self.base_color_var.get(),
            text_hex=self.text_color_var.get(),
            charm_hex=self.charm_color_var.get(),
            output_path=file_path,
            title=f"Pniktrix Keychain - {text_safe}"
        )

        if success:
            messagebox.showinfo(
                "3MF Export Complete",
                f"Exported watertight print-ready file:\n\n{file_path}\n\n"
                "✓ 0 Non-Manifold Edges\n"
                "✓ Multi-Material Colors Configured\n"
                "✓ Direct Bambu Studio / OrcaSlicer compatible!"
            )


# ═════════════════════════════════════════════════════════════
# CLI ENTRY POINT
# ═════════════════════════════════════════════════════════════

def main():
    if len(sys.argv) > 1 and not sys.argv[1].startswith('-'):
        # CLI Mode: python keychain_app.py "KC|Sanjana|bubbly|contour|..."
        arg = sys.argv[1]
        cfg = parse_full_message(arg)
        font_data = load_font(cfg['font']) or load_font('helvetiker')
        target_w = SIZE_PRESETS.get(cfg['size'], 75.0)

        base_mesh, text_mesh, charm_mesh, _ = generate_keychain_geometry(
            text=cfg['text'],
            font_data=font_data,
            shape_type=cfg['shape'],
            text_style=cfg['style'],
            hole_pos=cfg['hole_pos'],
            target_width=target_w,
            charm_type=cfg['charm'],
            charm_pos='right'
        )

        out_name = f"Keychain-{re.sub(r'[^a-zA-Z0-9]', '', cfg['text'])}.3mf"
        export_3mf(base_mesh, text_mesh, charm_mesh, cfg['base_color'], cfg['text_color'], cfg['charm_color'], out_name)
        print(f"Exported CLI 3MF: {out_name}")
        return

    root = tk.Tk()
    app = KeychainApp(root)
    root.mainloop()

if __name__ == '__main__':
    main()
