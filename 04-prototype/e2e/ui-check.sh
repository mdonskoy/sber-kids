#!/bin/bash
# Real-Chromium check: no page errors, no horizontal overflow at six widths (two of them phones), on the phone and the showcase;
# nothing visible inside a card (in an answer or a showcase figure) reaches past the card's own edges.
# Needs a running server (npm run start) and agent-browser on PATH.
set -u
BASE=${1:-http://localhost:8787}
AB="agent-browser --session ui-check"
fail=0
for path in "/" "/#/catalog"; do
  for w in 375 390 560 760 1000 1400; do
    $AB errors --clear >/dev/null
    $AB open "$BASE$path" >/dev/null
    $AB set viewport "$w" 900 >/dev/null
    $AB wait 2500 >/dev/null
    over=$($AB eval "(() => { const vis = (e, stop) => { let { left, right } = e.getBoundingClientRect(); for (let a = e.parentElement; a && a !== stop; a = a.parentElement) { const st = getComputedStyle(a); if (st.overflowX !== 'visible' || st.clip !== 'auto' || st.clipPath !== 'none') { const r = a.getBoundingClientRect(); left = Math.max(left, r.left); right = Math.min(right, r.right); } } return right - left > 0 ? { left, right } : null; }; const shown = [...document.querySelectorAll('body *')].filter(e => !e.closest('[hidden]')); return JSON.stringify({ sw: document.documentElement.scrollWidth, iw: innerWidth, past: shown.filter(e => (vis(e, document.body)?.right ?? 0) > innerWidth + 1).length, clipped: [...document.querySelectorAll('main article .card, figure .card')].filter(c => !c.closest('[hidden]')).flatMap(c => { const b = c.getBoundingClientRect(); return [...c.querySelectorAll('*')].filter(e => { const v = vis(e, c); return v && (v.right > b.right + 1 || v.left < b.left - 1); }); }).length }); })()")
    errs=$($AB errors)
    echo "$path @ $w: $over ${errs:+errors: $errs}"
    python3 -c "import json,sys; d=json.loads(json.loads(sys.argv[1])); sys.exit(0 if d['sw']<=d['iw'] and d['past']==0 and d['clipped']==0 else 1)" "$over" || fail=1
    [ -n "$errs" ] && fail=1
  done
done
$AB close >/dev/null
exit $fail
