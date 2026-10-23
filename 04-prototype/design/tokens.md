# Design tokens and anatomy — approved foundation

Approved by the owner on 2026-10-23 ("design approved"). Source of truth: the canvas boards in `design/foundation/` (`Main.dc.html` tokens, `Chrome.dc.html` home and chat, `Spend.dc.html`, `Savings.dc.html`, `LoanInvest.dc.html`, `Conversation.dc.html`; live copy https://claude.ai/artifact/XTyfu1aqnaDQ4rMCbxxaLj). Reference: the dark theme of the chat in СберБанк Онлайн (owner's screenshots). The canvas shows Inter only because a canvas cannot load the SB Sans CDN; the build uses SB Sans.

The app is **dark only**.

## Type (Tailwind `@theme`)

| Token | Family | Size / line | Weight | Use |
|---|---|---|---|---|
| `text-amount` | `font-display` | 28 / 34 | 600 | the result of a calculator, the wallet balance; tabular figures |
| `text-title` | `font-display` | 22 / 28 | 600 | card titles, the chat header, «История» |
| `text-body` | `font-sans` | 17 / 22 | 400 (600 for values) | bubbles, row values, button labels |
| `text-secondary` | `font-sans` | 15 / 20 | 400 | subtitles, row labels, descriptions (muted) |
| `text-caption` | `font-sans` | 13 / 18 | 400 | time stamps, «Сегодня», slider bounds, legal small print |

`--font-sans: "SB Sans Text", Inter, system-ui, sans-serif`; `--font-display: "SB Sans Display", "SB Sans Text", Inter, system-ui, sans-serif`. Weights 400 and 600 only. Every money figure: `tabular-nums`, `whitespace-nowrap`.

## Colour (HeroUI variables)

| HeroUI variable | Value | Use |
|---|---|---|
| `--background` | `#0F0F10` | phone screen |
| `--foreground` | `#FFFFFF` | text, sums |
| `--surface` (+ `-foreground` `#FFFFFF`) | `#1E1F22` | cards, model bubbles, the message field |
| `--default` (+ `-foreground` `#FFFFFF`) | `#2B2C30` | Лиза's bubble, secondary buttons, result box, selected row, skeleton |
| `--border`, `--separator` | `#34353A` | dividers, slider track |
| `--muted` | `#9A9DA3` | labels and descriptions (6.1:1 on surface) |
| `--accent` (+ `-foreground` `#111214`) | `#FFFFFF` | the primary button: white with dark text |
| `--success` (+ `-foreground` `#FFFFFF`) | `#21A038` | line icons, positive money («+7 234 ₽»), links, active tab, slider fill |
| `--success-text` | `#2DB84A` | audit 2026-10-23: positive money text on default surfaces (the result box), 5.36:1 |
| `--warning` | `#F2A33A` | risk (loan overpayment, Step 1) |
| `--danger` | `#FF6B5E` | errors |
| `--focus` | `#21A038` | focus ring |

Page around the phone: `--color-page: #08080A`; page header `#151618` with a 1 px `#34353A` bottom line. Chip outline (quick replies, Step 2): `#45464C`.

## Spacing and radii

4 px grid. Screen edge 8; between bubbles 8; before a card after a bubble 16; between turns 24; inside a card 16 (top 20); icon → text 12; title → subtitle 4.

Two radii: `--radius-card: 20px` (cards, bubbles, the message field) and `--radius-control: 14px` (buttons, selected rows, the result box). HeroUI `--radius: 0.875rem`.

Controls: buttons 52 high (`size="lg"`), full width inside cards; icon buttons 44–52; nothing tappable under 44 px.

## Chrome

- **Page:** background `page`; header with the logo, `h1` «Прототип: «Первые деньги»» (`text-title`) and a secondary «Сбросить демо»; the phone centred; above it the caption «Лиза, 19 лет» (`text-caption`, muted); the debug panel collapsed below.
- **Phone frame:** 390 × 844, radius 44, 10 px black bezel with a 1 px `#34353A` outline. Two views:
  1. **Home** (first view). Background: `radial-gradient(120% 45% at 15% 0%, #0D4A3B 0%, #0F2B26 35%, #0F0F10 70%)`. Decorative mock of the bank's home screen — not interactive, `aria-hidden` where it is pure decoration, no fake controls: a top row (profile, search field, chat), «В кошельке» + the balance (`text-amount`, kopecks muted), two tiles (card «45 000 ₽ · Дебетовая •• 4665», «Накопления · Пока пусто»), **the slot**, the «История» card (Зарплата · Сегодня · Поступления · «+45 000 ₽» success; Обслуживание карты · 27 сентября · Комиссии · 150 ₽), and a 5-tab bar (Главный active in success, Накопления, Для жизни, Платежи, Кредиты). **The slot** is where the home surface renders (the model-composed `FirstMoneyBanner`), in place of an ad.
  2. **Chat** (after `chat.open`). Header 56: icon `Button` «Назад» (back to Home) + «Первые деньги» (`text-title`). Feed: «Сегодня» (`text-caption`, centred); model prose as a left bubble (`surface`, radius card, padding 12/16, max-width 85 %); Лиза's messages as a right bubble (`default`, padding 12/16/8) with the time (HH:MM, `text-caption`, muted, right-aligned); widgets full width. Past turns stay at full contrast and lose their buttons. Footer: message field (`surface`, radius card, 52 high, placeholder «Сообщение») and a round white icon `Button` «Отправить» (52, arrow-up).
- **Waiting:** a left bubble with three dots and one widget-shaped `Skeleton` card; history is not faded; the field and send button are disabled.
- **Failed answer:** a card with a danger line icon, «Не получилось ответить» (`text-body` 600), «Связь прервалась. Попробуй ещё раз — твои данные не изменились.» (`text-secondary`, muted), and a secondary «Повторить» that repeats the last request.
- **Quick-reply chips** under an answer: drawn on the canvas, built in Step 2 (they need options from the model).

## Widget anatomy

**Card** (HeroUI `Card`): `surface`, radius card, padding 20/16/16, gap 20. Header: optional 28 px green line icon (gap 12) + title (`text-title`) + subtitle (`text-secondary`, muted, gap 4). **Icon row:** 28 px green line icon, value (`text-body`), label below (`text-secondary`, muted); rows 16 apart. No emoji anywhere.

**FirstMoneyBanner** (home slot): one pressable card (`surface`, radius card, padding 16, 1 px `rgba(33,160,56,.35)` ring): left column `«{title} — {amount}»` (`text-body` 600), subtitle (`text-secondary`, muted), the CTA label as green text (`text-secondary` 600, success); right a 76 px green coin-stack illustration (`design/foundation/Chrome.dc.html`). Pressing anywhere on it dispatches the CTA action.

**ConfirmOpenProduct** (Step 0; Step 1 moves it to `Conversation.dc.html`: «ты» copy, amount and income rows): title «Открыть {name with a lower-case first letter}», subtitle «Проверь условия — изменить их после открытия нельзя»; icon rows: percent icon — `ratePct(rate)` / «Ставка»; then each terms line: «A — B» becomes value «B» (first letter upper-case) with label «A» (calendar icon when A starts with «Срок», cash icon otherwise); a line without « — » becomes an info-icon row with no label. Then primary «Подтвердить» and secondary «Отмена», both full width. After a press the two buttons are replaced by a 52 px status: «Подтверждено» (success text on `rgba(33,160,56,.14)`, check icon) or «Отменено» (muted on `default`). Legal note last (`text-caption`, muted).

**DepositCalculator** (Step 0, superseded by `Savings.dc.html` — tariff in the title, result on top, hint): header with a safe icon, title «{name} — {ratePct(rate)}», subtitle «Посчитай, сколько получишь». Two sliders (HeroUI `Slider`): label (`text-secondary`, muted) left, value (`text-body` 600) right on one line; track `border`, fill `success`, white 24 px thumb; bounds under it (`text-caption`, muted). Result box (`default`, radius control, padding 14/16): «В конце срока» (`text-secondary`, muted), total (`text-amount`), row «Доход» / «+{income}» (success, 600). While not current: the figures at opacity .45 and a spinner with «Пересчитываем…» (`text-caption`). Primary button with `ctaLabel`; legal note last.

**SpendAnalytics** (`Spend.dc.html`): title «Куда уходят деньги», subtitle «{periodLabel} · {total}». HeroUI `RadioGroup`, legend «Выбери, что сократить» (`text-secondary`, muted); each row min 56 high, radius control, the selected one on `default`: radio, name (`text-body`) and amount (`text-body` 600) on one line, a HeroUI `Meter` (share relative to the largest category; white fill when selected, `#5C5E64` otherwise) and the share caption («28%», or «43% · обязательные» for a category you cannot cut — disabled and muted). Slider «Сократить «{accusative}» на» with value «20%», bounds «5%» / «50%». Result box: «Освободится в месяц» / «+{saved}» (success, 600); with a goal, a row «{goalTitle}» / «на {duration} раньше» («почти без изменений» when 0); without a goal, the caption «Выбери цель — покажем, насколько быстрее до неё дойдёшь.». Same not-current treatment as the deposit.

## Formats

- `rub(v)` → «45 000 ₽» (ru-RU, no kopecks).
- `ratePct(r)` → «15% годовых» (decimal comma, up to two decimals).
- `duration(months)` → «8 мес.», «1 год», «2 года», «5 лет», «1 год 6 мес.», «3 года 2 мес.»; used for every term and every «на … раньше».
