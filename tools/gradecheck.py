#!/usr/bin/env python3
"""Cross-pack check per grade: trap-letter sequences, trap patterns, repeated names.
Usage: python3 tools/gradecheck.py [packs_dir] [grade]"""
import json, sys, re, glob, os, collections
d = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'packs')
only = sys.argv[2] if len(sys.argv) > 2 else None
by = collections.defaultdict(list)
for f in sorted(glob.glob(os.path.join(d, '*.json'))):
    p = json.load(open(f))
    by[str(p.get('grade', p.get('level')))].append(p)
STOP = set("I I'm I've I'll I'd Mr Mrs Ms Dr English German Austria Austrian Vienna Europe Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July August September October November December Dear Diary Best Love Yours Hi Hello OK TV".split())
for g in sorted(by, key=lambda x: (len(x), x)):
    if only and g != only: continue
    packs = by[g]
    print(f"\n=== grade {g}: {len(packs)} packs ===")
    seqs = collections.defaultdict(list); names = collections.defaultdict(set)
    for p in packs:
        seq = []; traps = []
        for st in p.get('steps', []):
            for o in st.get('options', []):
                if o.get('crit'):
                    seq.append(o['l']); traps.append(f"{o['l']} {o['crit']}: {o.get('reject','')[:110]}")
        s = ''.join(seq); seqs[s].append(p['id'])
        print(f"- {p['id']}  traps {s}")
        for t in traps: print("     " + t)
        def en(x):
            if isinstance(x, dict): return ' '.join(en(v) for k, v in x.items() if not k.endswith('De') and k not in ('de', 'why', 'reject', 'q', 'part', 'label'))
            if isinstance(x, list): return ' '.join(en(v) for v in x)
            return x if isinstance(x, str) else ''
        txt = en({'t': p.get('task'), 's': p.get('steps'), 'm': p.get('meta')})
        for m in re.finditer(r"(?<=[a-z,;] )([A-Z][a-z]{2,})\b", txt):
            if m.group(1) not in STOP: names[m.group(1)].add(p['id'])
    for s, ids in seqs.items():
        if len(ids) > 1: print(f"  !! same trap-letter sequence {s}: {', '.join(ids)}")
    rep = {n: ids for n, ids in names.items() if len(ids) > 1}
    if rep: print("  names in >1 pack: " + "; ".join(f"{n} ({len(i)})" for n, i in sorted(rep.items())))
