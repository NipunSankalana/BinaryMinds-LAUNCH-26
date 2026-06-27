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

import math


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
        source_base: The codex the string is currently in.

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


def encode_to_int_array(payload: str, target_base: int) -> List[int]:
    """
    Encode an ASCII payload to a list of base-N integers (ordinal values).

    Args:
        payload:     ASCII text.
        target_base: The codex (base) of the destination planet.

    Returns:
        List of integer ordinals for each character (in target_base range).

    Example:
        encode_to_int_array("Hi", 8) → [72, 105]  (raw ordinals, to be rendered in base-N)
    """
    return [ord(ch) for ch in payload]


def serialize_to_binary_stream(payload: str, codex_base: int) -> str:
    """
    Serialize a codex-encoded payload into a flat binary bit-stream for laser void transmission.

    Bit-packing standard:
      Each character ordinal is packed into a fixed-width binary field of
      width = ceil(log2(codex_base)) bits if codex_base > 2, else 8 bits.
      For ASCII-range ordinals (0–127), the field width is always sufficient
      since we use at least ceil(log2(128)) = 7 bits, padded to 8 for clarity.

    The actual implementation uses 8-bit fixed width (standard byte encoding)
    because the ordinal space is ASCII (0-127) regardless of codex base.
    Each ordinal is zero-padded to 8 bits for unambiguous framing.

    Args:
        payload:     ASCII text to serialize.
        codex_base:  The destination codex base (used for bit-width annotation).

    Returns:
        Flat binary string (e.g. "0100100001100101...").

    Example:
        serialize_to_binary_stream("Hi", 8)  →  "0100100001101001"
    """
    if not payload:
        return ""

    # Bit width per symbol: ceil(log2(codex_base)) for base ≥ 2, floor to 8 min
    bits_per_symbol = max(8, math.ceil(math.log2(codex_base)) if codex_base > 2 else 8)

    stream_parts: List[str] = []
    for ch in payload:
        ordinal = ord(ch)
        # Pack ordinal into fixed-width binary — zero-padded
        binary_repr = format(ordinal, f'0{bits_per_symbol}b')
        stream_parts.append(binary_repr)

    return "".join(stream_parts)


def translate_hop(
    payload: str,
    source_codex: int,
    dest_codex: int,
) -> tuple[str, str, str]:
    """
    Perform the full translation for a single void hop.

    Data pipeline:
      Raw ASCII  →  Base-N codex array  →  Binary stream  →  void  →  decode at dest

    Args:
        payload:      Current payload (ASCII string — the original message).
        source_codex: Codex of the sending planet (for display/logging only).
        dest_codex:   Codex of the receiving planet.

    Returns:
        (encoded_for_transmission, payload_decoded_at_dest, binary_stream)
        - encoded_for_transmission: space-separated base-N token string
        - payload_decoded_at_dest:  decoded ASCII (should equal payload)
        - binary_stream:            flat binary bit string for laser transmission
    """
    encoded = encode(payload, dest_codex)
    decoded = decode(encoded, dest_codex)   # should equal payload
    binary_stream = serialize_to_binary_stream(payload, dest_codex)
    return encoded, decoded, binary_stream
