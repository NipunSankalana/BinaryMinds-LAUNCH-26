"""
Codex translation engine.
Converts packet payloads between ASCII and planet-specific numerical bases (codices).

Each planet communicates in its own codex (numerical base):
  Aegis   → base 8   (octal)
  Boreas  → base 5
  Dawn    → base 6
  Elysium → base 10  (decimal)
  Fenix   → base 16  (hex)
  Caelum  → base 14

Encoding process (before a void hop, source → dest):
  ASCII payload  →  integer ordinal of each character
               →  convert each ordinal to target_base string representation
               →  space-join tokens to form encoded payload

Decoding process (on arrival at dest):
  Space-split encoded string  →  parse each token as source_base integer
                              →  chr(ordinal)  →  join  →  ASCII string

Round-trip guarantee: decode(encode(text, base), base) == text   for any base ≥ 2
"""

from __future__ import annotations
from typing import List


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _int_to_base(n: int, base: int) -> str:
    """
    Convert a non-negative integer to its string representation in the given base.
    Uses digits 0–9 then A–Z for bases above 10.
    """
    if base < 2:
        raise ValueError(f"Base must be ≥ 2, got {base}.")
    if n == 0:
        return "0"

    digits: List[str] = []
    negative = n < 0
    n = abs(n)

    while n:
        remainder = n % base
        digits.append("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"[remainder])
        n //= base

    if negative:
        digits.append("-")

    return "".join(reversed(digits))


def _base_to_int(token: str, base: int) -> int:
    """
    Parse a string token as an integer in the given base.
    Accepts digits 0–9 and uppercase A–Z.
    """
    return int(token, base)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def encode(payload: str, target_base: int) -> str:
    """
    Encode an ASCII string into the target planet's codex (numerical base).

    Args:
        payload:     ASCII text to encode.
        target_base: The codex (base) of the destination planet.

    Returns:
        Space-separated string of each character's ordinal in target_base.

    Example:
        encode("HI", 8)  →  "110 111"
    """
    if not payload:
        return ""
    tokens = [_int_to_base(ord(ch), target_base) for ch in payload]
    return " ".join(tokens)


def decode(encoded: str, source_base: int) -> str:
    """
    Decode a codex-encoded string back to ASCII.

    Args:
        encoded:     Space-separated tokens in source_base.
        source_base: The codex (base) the string is currently in.

    Returns:
        Decoded ASCII string.

    Example:
        decode("110 111", 8)  →  "HI"
    """
    if not encoded.strip():
        return ""
    tokens = encoded.strip().split()
    chars = [chr(_base_to_int(tok, source_base)) for tok in tokens]
    return "".join(chars)


def translate_hop(
    payload: str,
    source_codex: int,
    dest_codex: int,
) -> tuple[str, str]:
    """
    Perform the full translation for a single void hop.
    The payload arrives encoded in source_codex, is decoded to ASCII,
    then re-encoded in dest_codex for transmission.

    Args:
        payload:      Current payload (ASCII string — the original message).
        source_codex: Codex of the sending planet (for display/logging only).
        dest_codex:   Codex of the receiving planet.

    Returns:
        (encoded_for_transmission, payload_decoded_at_dest)
        Both values are returned so the hop log can show the full transformation.
    """
    encoded = encode(payload, dest_codex)
    decoded = decode(encoded, dest_codex)   # should equal payload
    return encoded, decoded
