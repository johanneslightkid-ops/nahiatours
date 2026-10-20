#!/usr/bin/env python3
"""
A photograph graded for the home page's hero: upscaled, and given a bright,
HDR-like finish that holds up under the hero's dark text gradient.

  1. Lanczos to `width` (2400 by default),
  2. clarity — local contrast from a wide, gentle unsharp mask,
  3. a small shadow lift and an S-curve (deeper blues, brighter sand),
  4. vibrance — muted colours raised more than already-strong ones,
  5. bloom — the brightest glints glow softly (screen-blended blur),
  6. fine sharpening last.

Not AI. Usage: python3 scripts/grade-hero.py <source> <out.webp> [width]
Needs Pillow and numpy.
"""

import sys
from PIL import Image, ImageFilter, ImageEnhance, ImageChops
import numpy as np

def grade(src, out, width=2400):
    im = Image.open(src).convert('RGB')
    h = round(im.height * width / im.width)
    im = im.resize((width, h), Image.LANCZOS)
    # Clarity: local contrast from a wide, gentle unsharp mask.
    im = im.filter(ImageFilter.UnsharpMask(radius=45, percent=28, threshold=0))
    a = np.asarray(im).astype(np.float32) / 255.0
    # Tone: lift shadows, hold highlights (an HDR-like compressed range with a soft S-curve).
    lum = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    lift = np.clip(0.12 - lum, 0, 0.12) * 0.6
    a = a + lift[..., None]
    a = np.clip(a, 0, 1)
    x = a
    a = x + 0.40 * (x - x * x) * (2 * x - 1)  # an S-curve: deeper blues, brighter sand
    # Vibrance: saturate muted colours more than saturated ones.
    mean = a.mean(axis=2, keepdims=True)
    sat = a.max(axis=2, keepdims=True) - a.min(axis=2, keepdims=True)
    a = mean + (a - mean) * (1 + 0.45 * (1 - sat))
    a = np.clip(a, 0, 1)
    out_im = Image.fromarray((a * 255 + 0.5).astype(np.uint8))
    # Bloom: the brightest parts glow softly — water glints, sand, sails.
    bright = out_im.point(lambda v: max(0, v - 200) * 4)
    glow = bright.filter(ImageFilter.GaussianBlur(radius=18))
    out_im = ImageChops.screen(out_im, ImageEnhance.Brightness(glow).enhance(0.7))
    # Fine detail last.
    out_im = out_im.filter(ImageFilter.UnsharpMask(radius=1.3, percent=55, threshold=3))
    out_im = ImageEnhance.Color(out_im).enhance(1.04)
    out_im = ImageEnhance.Contrast(out_im).enhance(1.05)
    out_im.save(out, 'WEBP', quality=80, method=6)
    return out_im

if __name__ == '__main__':
    grade(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 2400)
