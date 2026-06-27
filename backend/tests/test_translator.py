"""
Tests for services/translator.py
"""

import pytest
from services.translator import encode, decode, translate_hop


# ---------------------------------------------------------------------------
# Round-trip tests for every codex base in the universe
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("base", [5, 6, 8, 10, 14, 16])
def test_round_trip(base):
    """decode(encode(text, base), base) must equal the original text."""
    text = "HELLO"
    assert decode(encode(text, base), base) == text


@pytest.mark.parametrize("base", [5, 6, 8, 10, 14, 16])
def test_round_trip_with_spaces(base):
    text = "HI WORLD"
    assert decode(encode(text, base), base) == text


@pytest.mark.parametrize("base", [5, 6, 8, 10, 14, 16])
def test_round_trip_numbers(base):
    text = "12345"
    assert decode(encode(text, base), base) == text


def test_encode_base8():
    """H=72, E=69, L=76, L=76, O=79 in octal: 110, 105, 114, 114, 117"""
    result = encode("HELLO", 8)
    assert result == "110 105 114 114 117"


def test_encode_base16():
    """H=72→48, E=69→45, L=76→4C, L=76→4C, O=79→4F"""
    result = encode("HELLO", 16)
    assert result == "48 45 4C 4C 4F"


def test_decode_base8():
    assert decode("110 105 114 114 117", 8) == "HELLO"


def test_decode_base16():
    assert decode("48 45 4C 4C 4F", 16) == "HELLO"


def test_empty_payload():
    assert encode("", 8) == ""
    assert decode("", 8) == ""


def test_translate_hop_returns_encoded_and_decoded():
    encoded, decoded = translate_hop("HELLO", source_codex=8, dest_codex=16)
    assert decoded == "HELLO"
    assert "48" in encoded   # H=72=0x48


def test_single_character():
    for base in [5, 6, 8, 10, 14, 16]:
        assert decode(encode("A", base), base) == "A"
