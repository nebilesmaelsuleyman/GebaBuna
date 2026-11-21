#!/usr/bin/env python3
"""Test OpenRouter API directly"""
import httpx
import base64
from PIL import Image
import io
import os

# Create a simple test image (small red square)
img = Image.new('RGB', (100, 100), color='red')
img_bytes = io.BytesIO()
img.save(img_bytes, format='JPEG')
img_bytes = img_bytes.getvalue()

# Encode image
encoded = base64.b64encode(img_bytes).decode("utf-8")

# Test with OpenRouter key
api_key = os.getenv('OPENROUTER_API_KEY') or os.getenv('OpenRouter_API_KEY', '')
if not api_key:
    raise SystemExit('Set OPENROUTER_API_KEY to run this check.')
model = os.getenv('OPENROUTER_MODEL', 'openrouter/free')

payload = {
    "model": model,
    "temperature": 0.1,
    "messages": [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "Test prompt - describe this image briefly"},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{encoded}"
                    },
                },
            ],
        }
    ],
    "response_format": {"type": "json_object"},
}

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
    "HTTP-Referer": "https://github.com/",
    "X-Title": "Buna Fair Price",
}

try:
    with httpx.Client(timeout=60.0) as client:
        response = client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        print('SUCCESS - Response:', content)
except Exception as e:
    print(f'ERROR: {type(e).__name__}: {e}')
    if hasattr(e, 'response'):
        print(f'Response: {e.response.text}')
