#!/usr/bin/env python3
"""Test the Gemini API key directly"""
from google import genai
from google.genai import types
import httpx
import os

# Create a simple test image (small red square)
from PIL import Image
import io

# Create a small test image in memory
img = Image.new('RGB', (100, 100), color='red')
img_bytes = io.BytesIO()
img.save(img_bytes, format='JPEG')
img_bytes = img_bytes.getvalue()

# Test with current key
api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY', '')
if not api_key:
    raise SystemExit('Set GEMINI_API_KEY or GOOGLE_API_KEY to run this check.')
client = genai.Client(api_key=api_key)
image_part = types.Part.from_bytes(data=img_bytes, mime_type='image/jpeg')

try:
    response = client.models.generate_content(
        model='gemini-3.8-flash',
        contents=[image_part, 'Test prompt - describe this image briefly'],
        config=types.GenerateContentConfig(temperature=0.1, max_output_tokens=100)
    )
    print('SUCCESS - Response:', response.text)
except Exception as e:
    print(f'ERROR: {type(e).__name__}: {e}')
