#!/usr/bin/env python3
"""
Big-screen copies of photographs: `<name>-uhd.webp` beside each `<name>.webp`.

For the in-store TV, where a 1400-pixel photo is shown across 1920 pixels or
more. Not AI: a careful classical pass, the best that can be done without a
generative upscaler —

  1. Lanczos resampling to `--scale` times the size (capped at `--max-width`),
  2. an unsharp mask tuned for upscaled detail (radius 1.2, 60 %, threshold 3,
     so flat sky and skin stay smooth while edges and textures firm up),
  3. a gentle vibrance (+5 % colour) and contrast (+2 %) lift, because a TV
     panel viewed across a room flattens both.

Optionally pulls the still "hold" frames out of an animated WebP slideshow
(`--frames-from`), which the show then plays with its own transitions instead
of making the TV decode every frame of an animation.

Usage:
  python3 scripts/upscale-images.py public/imgs/edt/tours/**/[0-9]*.webp
  python3 scripts/upscale-images.py --frames-from public/imgs/edt/inspire/paradise.webp

Needs Pillow (pip install pillow). Existing -uhd files are skipped unless
--force. Prints what it wrote and the sizes.
"""

import argparse
import glob
import os
import struct
import sys

from PIL import Image, ImageEnhance, ImageFilter


def enhance(image, scale, max_width):
    image = image.convert('RGB')
    width = min(max_width, round(image.width * scale))
    height = round(image.height * width / image.width)
    up = image.resize((width, height), Image.LANCZOS)
    up = up.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=3))
    up = ImageEnhance.Color(up).enhance(1.05)
    up = ImageEnhance.Contrast(up).enhance(1.02)
    return up


def uhd_name(path):
    root, _ = os.path.splitext(path)
    return f'{root}-uhd.webp'


def hold_frames(path):
    """Indices of the frames an animated WebP holds on (longer than the rest)."""
    data = open(path, 'rb').read()
    durations = []
    offset = 12
    while offset < len(data):
        tag = data[offset:offset + 4]
        size = struct.unpack('<I', data[offset + 4:offset + 8])[0]
        if tag == b'ANMF':
            durations.append(int.from_bytes(data[offset + 8 + 12:offset + 8 + 15], 'little'))
        offset += 8 + size + (size & 1)
    if not durations:
        return [0]
    longest = max(durations)
    return [index for index, duration in enumerate(durations) if duration == longest]


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('files', nargs='*')
    parser.add_argument('--scale', type=float, default=2.0)
    parser.add_argument('--max-width', type=int, default=3840)
    parser.add_argument('--quality', type=int, default=80)
    parser.add_argument('--force', action='store_true')
    parser.add_argument('--frames-from', help='an animated WebP slideshow to split into stills')
    args = parser.parse_args()

    written = 0
    total = 0

    if args.frames_from:
        source = Image.open(args.frames_from)
        root, _ = os.path.splitext(args.frames_from)
        for number, index in enumerate(hold_frames(args.frames_from), start=1):
            source.seek(index)
            still = source.convert('RGB')
            plain = f'{root}-{number}.webp'
            still.save(plain, 'WEBP', quality=88, method=6)
            out = uhd_name(plain)
            enhance(still, args.scale, args.max_width).save(out, 'WEBP', quality=args.quality, method=6)
            size = os.path.getsize(out)
            total += size
            written += 1
            print(f'{out}  {size // 1024} kB')

    files = []
    for pattern in args.files:
        files.extend(glob.glob(pattern, recursive=True) or [pattern])
    for path in sorted(set(files)):
        if path.endswith('-uhd.webp') or path.endswith('-sm.webp') or not os.path.isfile(path):
            continue
        out = uhd_name(path)
        if os.path.exists(out) and not args.force:
            continue
        enhance(Image.open(path), args.scale, args.max_width).save(out, 'WEBP', quality=args.quality, method=6)
        size = os.path.getsize(out)
        total += size
        written += 1

    print(f'{written} files, {total / 1e6:.1f} MB', file=sys.stderr)


if __name__ == '__main__':
    main()
