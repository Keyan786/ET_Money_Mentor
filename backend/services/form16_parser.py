"""
Parse Form 16 PDF to extract salary structure, HRA, and deductions.
Uses PyPDF2 for text extraction and regex for field matching.
"""
import re
from typing import Optional
import PyPDF2
import io


def _extract_amount(text: str, pattern: str) -> float:
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        raw = match.group(1).replace(',', '').replace(' ', '')
        try:
            return float(raw)
        except ValueError:
            return 0.0
    return 0.0


def parse_form16_pdf(file_bytes: bytes) -> dict:
    """Extract financial data from a Form 16 PDF.
    Returns a dict with salary components and deductions."""
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
    except Exception:
        return {'error': 'Could not read PDF. Please upload a valid Form 16.'}

    full_text = ''
    for page in reader.pages:
        page_text = page.extract_text() or ''
        full_text += page_text + '\n'

    if not full_text.strip():
        return {'error': 'PDF appears empty or is a scanned image. Please upload a text-based Form 16.'}

    result = {
        'gross_salary': 0,
        'basic_salary': 0,
        'hra_received': 0,
        'standard_deduction': 0,
        'deductions': {
            '80C': 0,
            '80D': 0,
            '80CCD': 0,
            '80E': 0,
            '80G': 0,
            '80TTA': 0,
            'HRA': 0,
        },
        'total_income': 0,
        'tax_payable': 0,
        'raw_text_preview': full_text[:500],
    }

    gross_patterns = [
        r'gross\s+(?:total\s+)?(?:salary|income)[^\d]*?[\₹Rs.]*\s*([\d,]+(?:\.\d+)?)',
        r'income\s+(?:under|from)\s+(?:the\s+)?head\s+(?:\")?salaries?[^\d]*?([\d,]+(?:\.\d+)?)',
        r'total\s+(?:of\s+)?(?:salary)[^\d]*?([\d,]+(?:\.\d+)?)',
    ]
    for pat in gross_patterns:
        val = _extract_amount(full_text, pat)
        if val > 0:
            result['gross_salary'] = val
            break

    result['basic_salary'] = _extract_amount(
        full_text, r'(?:basic|salary)\s+(?:as per|under)[^\d]*?([\d,]+(?:\.\d+)?)'
    )

    hra_patterns = [
        r'house\s+rent\s+allow[^\d]*?([\d,]+(?:\.\d+)?)',
        r'HRA[^\d]*?([\d,]+(?:\.\d+)?)',
    ]
    for pat in hra_patterns:
        val = _extract_amount(full_text, pat)
        if val > 0:
            result['hra_received'] = val
            break

    hra_exempt_patterns = [
        r'(?:allowance|exemption)\s+(?:under|u/s)\s+(?:section\s+)?10[^\d]*?([\d,]+(?:\.\d+)?)',
        r'exempt\s+(?:allowance|hra)[^\d]*?([\d,]+(?:\.\d+)?)',
    ]
    for pat in hra_exempt_patterns:
        val = _extract_amount(full_text, pat)
        if val > 0:
            result['deductions']['HRA'] = val
            break

    sd = _extract_amount(full_text, r'standard\s+deduction[^\d]*?([\d,]+(?:\.\d+)?)')
    result['standard_deduction'] = sd if sd > 0 else 75000

    sec80c_patterns = [
        r'(?:section|sec|u/s)\s*80\s*C\b[^\d]*?([\d,]+(?:\.\d+)?)',
        r'80C[^\d]*?([\d,]+(?:\.\d+)?)',
        r'chapter\s+VI[\s-]*A[^\d]*?80C[^\d]*?([\d,]+(?:\.\d+)?)',
    ]
    for pat in sec80c_patterns:
        val = _extract_amount(full_text, pat)
        if val > 0:
            result['deductions']['80C'] = min(val, 150000)
            break

    val_80d = _extract_amount(full_text, r'(?:section|sec|u/s)\s*80\s*D[^\d]*?([\d,]+(?:\.\d+)?)')
    if val_80d > 0:
        result['deductions']['80D'] = min(val_80d, 75000)

    val_nps = _extract_amount(full_text, r'(?:section|sec|u/s)\s*80\s*CCD[^\d]*?([\d,]+(?:\.\d+)?)')
    if val_nps > 0:
        result['deductions']['80CCD'] = min(val_nps, 50000)

    val_80e = _extract_amount(full_text, r'(?:section|sec|u/s)\s*80\s*E[^\d]*?([\d,]+(?:\.\d+)?)')
    if val_80e > 0:
        result['deductions']['80E'] = val_80e

    val_80g = _extract_amount(full_text, r'(?:section|sec|u/s)\s*80\s*G[^\d]*?([\d,]+(?:\.\d+)?)')
    if val_80g > 0:
        result['deductions']['80G'] = val_80g

    val_80tta = _extract_amount(full_text, r'(?:section|sec|u/s)\s*80\s*TTA[^\d]*?([\d,]+(?:\.\d+)?)')
    if val_80tta > 0:
        result['deductions']['80TTA'] = min(val_80tta, 10000)

    total_inc = _extract_amount(full_text, r'total\s+(?:taxable\s+)?income[^\d]*?([\d,]+(?:\.\d+)?)')
    result['total_income'] = total_inc if total_inc > 0 else result['gross_salary']

    tax_patterns = [
        r'tax\s+(?:on\s+)?total\s+income[^\d]*?([\d,]+(?:\.\d+)?)',
        r'(?:net\s+)?tax\s+payable[^\d]*?([\d,]+(?:\.\d+)?)',
        r'total\s+tax[^\d]*?([\d,]+(?:\.\d+)?)',
    ]
    for pat in tax_patterns:
        val = _extract_amount(full_text, pat)
        if val > 0:
            result['tax_payable'] = val
            break

    return result
