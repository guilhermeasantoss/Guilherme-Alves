import re
from pathlib import Path

p = Path('portifolio (3).html')
t = p.read_text(encoding='utf-8')

# Check tags
tags = re.findall(r'<(/?)(\w+)', t)
open_tags = {}
for closing, tag in tags:
    closing_tag = closing == '/'
    key = tag.lower()
    open_tags[key] = open_tags.get(key, 0) + (1 if not closing_tag else -1)

print('Tag balance:')
for k, v in sorted(open_tags.items()):
    if v != 0 or k in ['html', 'head', 'body', 'style', 'script', 'div', 'section']:
        print(f'  {k}: {v}')

# Find style location
style_start = t.find('<style>')
style_end = t.find('</style>')
print(f'\nStyle block: {style_start} to {style_end}')

# Check for unclosed selectors
style_text = t[style_start:style_end]
lines = style_text.split('\n')
print(f'Last 10 lines of style:')
for line in lines[-10:]:
    print(f'  {repr(line[:100])}')
