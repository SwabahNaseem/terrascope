import re

def check_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    print(f"File: {path}, Size: {len(content)} chars, Lines: {len(content.splitlines())}")

check_file('frontend/js/map.js')
check_file('frontend/js/script.js')
check_file('frontend/js/report.js')
