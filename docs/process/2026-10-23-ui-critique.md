# UI critique — «Первые деньги» chat, before the HeroUI foundation

Date: 2026-10-23. Method: impeccable critique, dual-agent (A: design review on screenshots and source; B: impeccable detector + browser overlay + computed-style inventory, run in isolation). Target: `04-prototype/packages/web` after bet 1 was removed (commit 932d10b). Evidence: one screenshot per chat turn (banner, goal question, plan, spending, confirmation, done, refusal, page at 560 px), the detector's JSON, and computed styles from Chromium.

**Verdict.** The owner's "many fonts, crooked alignment, unclear accents" is measurable: 9 font sizes and 3 weights in one phone, 3 different left edges in every turn, 10 spacing values and 8 radii, and Sber green doing five jobs, with white labels on it at 3.41:1 (fails WCAG AA). Nielsen score **18/40 (poor)**. Without the logo it could be any fintech chat; the product's real idea — the bank computes every figure, the model only composes — is invisible.

## What works (keep)

1. Honest-number mechanics: investment outcomes are ranges labelled «диапазон, не обещание»; a moved slider hides the old result instead of showing it as current; disclosures come from fixed code the model cannot edit.
2. The refusal turn: an empathetic model line, then a fixed card with the reason, the alternative and one action.
3. Free text and tappable widgets side by side; earlier turns stay readable and are made non-interactive; ru-RU money formatting is right.

## Findings, most severe first

Each finding names where it is fixed: **S0** = the Step 0 foundation (tokens, chrome, the three reference widgets on the canvas), **S1** = that widget's Step 1 group, **S2** = the CJM and copy step.

| # | Sev | Finding | Evidence | Fix | Where |
|---|---|---|---|---|---|
| 1 | P1 | **No type system.** 9 sizes (26, 22, 18, 16, 15, 14, 13, 12, 11 px), weights 400/600/700 mixed at random, one system font beside the Sber logotype, emoji as the icon set. Body text alone comes in three sizes in one turn (bubble 16, model 15, card 14). Adjacent heading roles differ by 1.08× (detector `flat-type-hierarchy`). | B: computed styles; A §6.1 | SB Sans Text / Display; five steps with ≥1.2× between them; weights 400 and 600 only; tabular figures for money. | S0 |
| 2 | P1 | **Crooked alignment, off-grid spacing.** Cards at x=46, model text at x=50, card content at x=60; vertical rhythm comes from browser-default `<p>` margins, so title→body is 16 px in one card and 30 px in another; spacing values 2–32 px, radii 4–40 px (8 values). | A §6.2 | One left edge (model prose aligns with the card edge); 4 px grid — gutter 16, card padding 16, gaps 8 / 12 / 16 / 24; two radii; HeroUI `Card` parts own header/body/footer spacing. | S0 |
| 3 | P1 | **Green means everything, three primary CTAs at once, labels fail contrast.** Green fills the primary and secondary buttons, goal choices, the user's bubble, send, the banner outline, a pill, the slider fill and «Сбросить демо». White on #21A038 = 3.41:1. History faded to 75 % and the busy feed to 60 % drop muted text to 2.4–3.1:1. | B: `low-contrast` ×3; A §6.4 | Green only for the one primary action per turn and positive money; a darker Sber green for fills and green text (≥4.5:1); secondary actions neutral; user bubble neutral; never fade history with opacity. | S0 |
| 4 | P1 | **The confirmation is not a confirmation.** Looks like every other card; four text treatments; repeats the product card directly above it; «Не является публичной офертой» sits right above «Подтвердить»; small left-aligned buttons with a green-tinted «Отмена»; after the tap both buttons stay, faded, so you cannot tell which was pressed. Missing: amount, source card, goal. | A §6.3; `5-confirm`, `6-done` | Own layout: a clear title, label–value rows, the fixed terms, one full-width primary «Подтвердить» and a neutral «Отмена», legal small print under the actions; after the tap the actions are replaced by a status chip. Amount / card / goal need data the confirmation does not carry yet. | S0 layout; S2 data and copy |
| 5 | P1 | **Money hierarchy inverted.** Spending amounts are muted and smaller than category names; the goal target is a 12 px grey meta; plan results are buried mid-line and ranges wrap mid-figure; «94 мес.» / «240 мес.»; a 4 million overpayment typeset like a saving. | A §6.6; `3-plan`, `4-spend` | Money is always ink, ≥ body, semibold, tabular, right-aligned, never wrapped; durations in years and months; bars (HeroUI `Meter`) for category shares; the bank's result has its own row. | S0 (SpendAnalytics, deposit); S1 others |
| 6 | P1 | **The chat has no structure.** No sign who speaks; taps (goal, «Открыть счёт», «Подтвердить») leave no user turn; turns re-render the banner, the goal picker and the account card again and again; past turns at 75 % with clickable-looking buttons. | A §6.5 | Chrome: an assistant mark on each model turn, prose and widgets on one edge, past turns full-contrast without actions. Echoing taps as user bubbles and "a widget appears once unless its data changed" are journey rules. | S0 chrome; S2 rules |
| 7 | P2 | **Copy register and template grammar.** ты in the model's text, вы in fixed widgets («Подтвердите», «Проверьте», «Попробуйте ещё раз»); «на «Доставка еды»»; «Сейчас это недоступно» implies "later". | A §6.7 | One register, ты; case forms in the copy table; refusal titles that do not promise availability. | S0 (the three reference widgets' fixed strings); S2 the rest |
| 8 | P2 | **Touch targets and sliders.** Buttons ≈36 px, chips ≈30 px; native range thumbs ≈16 px with a near-black track (the heaviest element in the card); value on its own line after a colon; no bounds; screen readers hear «9000», not «9 000 ₽». | A §6.8 | Controls ≥44 px; HeroUI `Slider` with label and formatted value on one line, bounds as captions, neutral track, green fill, formatted value text. | S0 |
| 9 | P2 | **Loading, busy and error states are generic.** The whole history fades while four grey blocks promise four cards; a bare `<p role="alert">` with no retry; nothing tells a screen reader what is happening. | A §6.9; B 390 px skeleton | History stays at full contrast, only the input and the live turn's actions are disabled; one widget-shaped skeleton under an assistant mark; errors as a turn with «Повторить»; a polite live region. | S0 chrome |
| 10 | P3 | **Shell.** «Сбросить демо» pushes the page 22 px past a 390 px viewport (B: overflow); the title wraps at 560 px; the fixed 780 px phone nests a scroll inside the page scroll; persona («Лиза, 19 лет / СберБанк Онлайн») sits inside the phone as if Лиза were the contact. | B: overflow; A §6.10 | Header wraps cleanly; the persona caption moves above the phone; the phone header becomes the app's own («Первые деньги»); below 480 px the bezel goes. | S0 chrome |

Detector findings judged false positives: `side-tab` on `.disclosure` (a grey 3 px hairline, not a coloured accent — it goes with `theme.css` anyway); `skipped-heading` h2→h4 inside the team-only debug panel; most of `nested-cards` (the `.turn` wrapper has no card chrome). Real: `low-contrast` (white on #21A038), `tiny-text` (11 px disclosure), `flat-type-hierarchy`, `skipped-heading` h1→h3 in the phone.

## Persona red flags

- **Лиза, 19, first salary (first-timer).** On the first screen «Составить план» and five goal buttons do the same thing, and she cannot tell which to press; «94 мес.» needs dividing by 12; «симуляция», «публичная оферта» are unexplained; at the confirmation she does not see how much money moves or from where; «Готово» ends flat with a pale «К плану».
- **Screen-reader user.** Button labels at 3.41:1; sliders announce bare numbers; two `h1` and no `h2` per turn; `aria-busy` on the whole screen but nothing announced; no visible focus style on green fills.
- **One-handed on the go.** 36 px buttons, 30 px chips; «Подтвердить» on the left next to a same-colour «Отмена».
- **The Sber hiring manager (≈3 minutes, laptop).** In seconds reads "emoji cards, system font, everything green" and files it as a junior prototype before noticing the idea; spots the offer disclaimer on the confirmation and the wrong case; remembers the flat ending.

## Questions the critique leaves open (for Steps 1–2)

1. Should the bank's own figures have their own visual voice (SB Sans Display, tabular, on their own row), so the architecture is visible without being explained?
2. After the goal is chosen, should the plan become one living card that later turns update in place, with the chat kept for questions and refusals?
3. Should «Готово» be the most rewarding screen of the journey (goal progress, the first rouble in) rather than the plainest?

Questions skipped: the owner asked to proceed without per-step questions, and the approved UI spec already fixes direction (HeroUI + Sber theme), scope (Step 0 → 1 → 2) and tone (ты).
