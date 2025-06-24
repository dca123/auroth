#!/usr/bin/env python3
import sys
import json
import nltk
from nltk import word_tokenize, pos_tag, ne_chunk

# download required NLTK data silently
nltk.download('punkt', quiet=True)
nltk.download('averaged_perceptron_tagger', quiet=True)
nltk.download('maxent_ne_chunker', quiet=True)
nltk.download('words', quiet=True)

# read input text from stdin
text = sys.stdin.read()

# tokenize and POS-tag
tokens = word_tokenize(text)
tags = pos_tag(tokens)

# perform named entity chunking
tree = ne_chunk(tags)

entities = []
for subtree in tree:
    # subtree is a Tree if it represents a named entity
    if hasattr(subtree, 'label'):
        ent_text = ' '.join(leaf[0] for leaf in subtree.leaves())
        ent_type = subtree.label()
        entities.append({
            'entity': ent_text,
            'type': ent_type
        })

# output the JSON list
print(json.dumps(entities))
