#!/usr/bin/env python
"""Live test with the configured API key"""
import sys
sys.path.insert(0, '.')

from grader import CoffeeGrader, display_result
import os
import logging

# Enable debug logging
logging.basicConfig(level=logging.DEBUG)

api_key = os.getenv('GEMINI_API_KEY')
print(f"Using API key: {api_key[:20]}...")
print(f"Key format check - starts with AIza: {api_key.startswith('AIza')}")

grader = CoffeeGrader(api_key)

# Use a working Unsplash coffee beans image
print("\n🫘 Testing with coffee beans image...")
result = grader.grade(image_url='https://images.unsplash.com/photo-1511920170033-f8396924c348?w=640')

display_result(result)