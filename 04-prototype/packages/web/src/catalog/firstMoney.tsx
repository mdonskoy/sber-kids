import { useContext, useState, type ReactNode } from 'react';
import { createComponentImplementation } from '@a2ui/react/v0_9';
import { Button, Label, Meter, Radio, RadioGroup } from '@heroui/react';
import {
  ConfirmOpenProductDef,
  DepositCalculatorDef,
  FirstMoneyBannerDef,
  GoalPickerDef,
  GoalSetupDef,
  InvestSimDef,
  InviteRelativeDef,
  LoanCompareDef,
  PiggyBankCalculatorDef,
  ProductCardDef,
  QuickRepliesDef,
  SavingsAccountCalculatorDef,
  SpendAnalyticsDef,
  WaysToGoalDef,
  type AccountCalc,
  type DepositCalc,
  type FirstMoneyBanner,
  type GoalOption,
  type GoalSetup,
  type InvestCalc,
  type Invite,
  type LoanCalc,
  type PiggyCalc,
  type Product,
  type QuickReply,
  type SpendAnalytics,
  type WayId,
  type Ways,
} from '@proto/catalog';
import {
  ActionRow,
  AlertIcon,
  Amount,
  CalcResult,
  CalcSlider,
  CalendarIcon,
  CashIcon,
  ChartIcon,
  CheckIcon,
  ChevronIcon,
  CoinStack,
  HintButton,
  IconRow,
  InfoIcon,
  InvestIcon,
  KeyValue,
  LegalNote,
  LoanIcon,
  PeopleIcon,
  PercentIcon,
  PiggyIcon,
  ResultBox,
  SafeIcon,
  SpendIcon,
  WidgetCard,
  duration,
  monthsLabel,
  percent,
  ratePct,
  useLiveCalc,
} from '../ui';
import { Btn, Card, ShowChat, dispatch, rub } from './ui';

/** The home slot (tokens.md «FirstMoneyBanner»): one pressable card; pressing anywhere dispatches the CTA. */
export const FirstMoneyBannerImpl = createComponentImplementation(FirstMoneyBannerDef.api, ({ props, context }) => {
  const showChat = useContext(ShowChat);
  const b = props.banner as FirstMoneyBanner | undefined;
  if (!b) return null;
  return (
    <Button
      variant="ghost"
      fullWidth
      data-banner=""
      className="h-auto items-center justify-start gap-3 whitespace-normal rounded-card bg-surface p-4 text-left font-normal text-foreground border border-[rgba(33,160,56,0.35)]"
      onPress={() => (showChat ? showChat() : dispatch(context, 'chat.open'))}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        {/* The title stays on one line (owner, 2026-10-23); the question under it is the second level. */}
        <span className="truncate text-body font-semibold tabular-nums">
          {b.title} — {rub(b.amount)}
        </span>
        <span className="text-secondary text-foreground/75">{b.lead}</span>
        <span className="text-secondary font-semibold text-success">{b.ctaLabel}</span>
      </span>
      <CoinStack />
    </Button>
  );
});

export const GoalPickerImpl = createComponentImplementation(GoalPickerDef.api, ({ props, context }) => {
  const goals = props.goals as GoalOption[] | undefined;
  if (!goals) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {goals.map((g) => (
        <Button
          key={g.id}
          variant="ghost"
          className="h-auto min-h-11 gap-2 whitespace-normal rounded-full bg-[#232427] px-3.5 py-2.5 text-left font-normal text-foreground"
          onPress={() => dispatch(context, 'goal.select', { goalId: g.id })}
        >
          <span aria-hidden="true">{g.emoji}</span>
          <span className="text-secondary">{g.title}</span>
        </Button>
      ))}
    </div>
  );
});

/** Follow-ups under the latest answer (Conversation board): outlined chips; a tap sends the reply as Лиза's message. */
export const QuickRepliesImpl = createComponentImplementation(QuickRepliesDef.api, ({ props, context }) => {
  const replies = props.replies as QuickReply[] | undefined;
  if (!replies) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {replies.map((r) => (
        <Button
          key={r.id}
          variant="outline"
          className="h-auto min-h-10 whitespace-normal rounded-full border-border px-3.5 py-2 text-left text-secondary font-normal [--button-fg:var(--foreground)]"
          onPress={() => dispatch(context, 'reply.pick', { replyId: r.id })}
        >
          {r.text}
        </Button>
      ))}
    </div>
  );
});

/** Amount and term of the goal (Conversation board, «Сумма и срок цели»): price points and two sliders; nothing here is a bank figure, so nothing is recalculated. */
export const GoalSetupImpl = createComponentImplementation(GoalSetupDef.api, ({ props, context }) => {
  const g = props.setup as GoalSetup | undefined;
  const [amount, setAmount] = useState(g?.amount ?? 0);
  const [months, setMonths] = useState(g?.months ?? 0);
  if (!g) return null;
  return (
    <WidgetCard title={`${g.emoji} ${g.title}`} subtitle="Сколько нужно и к какому сроку">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-2">
          {g.presets.map((p) => {
            const selected = p.amount === amount;
            return (
              <Button
                key={p.name}
                variant="ghost"
                aria-pressed={selected}
                className={`h-auto min-h-10 flex-col items-start justify-center gap-0 whitespace-normal rounded-control px-3 py-1.5 text-left font-normal ${selected ? 'bg-default ring-2 ring-success' : 'bg-[#232427]'}`}
                onPress={() => setAmount(p.amount)}
              >
                <span className="whitespace-nowrap text-secondary font-semibold tabular-nums text-foreground">{rub(p.amount)}</span>
                <span className="text-caption text-muted">{p.name}</span>
              </Button>
            );
          })}
        </div>
        <CalcSlider label="Сумма" value={amount} min={g.amountMin} max={g.amountMax} step={g.amountStep} format={rub} minLabel={rub(g.amountMin)} maxLabel={rub(g.amountMax)} onChange={setAmount} />
        <CalcSlider label="Срок" value={months} min={g.monthsMin} max={g.monthsMax} step={1} format={monthsLabel} minLabel={monthsLabel(g.monthsMin)} maxLabel={monthsLabel(g.monthsMax)} onChange={setMonths} />
        <ActionRow primary={{ label: g.ctaLabel, onPress: () => dispatch(context, 'goal.setup', { amount, months }) }} />
      </div>
    </WidgetCard>
  );
});

const WAY_ICONS: Record<WayId, ReactNode> = { deposit: <SafeIcon size={22} />, 'savings-account': <ChartIcon size={22} />, piggy: <PiggyIcon size={22} />, spend: <SpendIcon size={22} />, loan: <LoanIcon size={22} />, invest: <InvestIcon size={22} /> };

/** Ways to the goal (Savings board): the set the model chose; a tap picks the way and the chat answers with its calculator. */
export const WaysToGoalImpl = createComponentImplementation(WaysToGoalDef.api, ({ props, context }) => {
  const w = props.ways as Ways | undefined;
  const set = (props.set as 'big' | 'small' | 'urgent' | 'risk' | undefined) ?? w?.suggested;
  if (!w || !set || w[set].length === 0) return null; // every way in the set is done
  return (
    <WidgetCard title={w.title} subtitle={`Цель — ${rub(w.target)} за ${monthsLabel(w.months)} Выбери, с чего начать`}>
      <div className="-mx-2 flex flex-col">
        {w[set].map((row) => (
          <Button key={row.id} variant="ghost" fullWidth className="h-auto min-h-16 justify-start gap-3 whitespace-normal rounded-control px-2 py-3 text-left font-normal" onPress={() => dispatch(context, 'way.pick', { wayId: row.id })}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-default text-success">{WAY_ICONS[row.id]}</span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-body font-semibold text-foreground">{row.name}</span>
              <span className="text-secondary text-muted">{row.line}</span>
            </span>
            <span className="text-muted"><ChevronIcon /></span>
          </Button>
        ))}
      </div>
    </WidgetCard>
  );
});

export const ProductCardImpl = createComponentImplementation(ProductCardDef.api, ({ props, context }) => {
  const p = props.product as Product | undefined;
  if (!p) return null;
  return (
    <Card title={p.name} icon={<PercentIcon />} subtitle={ratePct(p.rate)}>
      <ul className="flex list-disc flex-col gap-1 pl-5">{p.termsLines.map((t) => <li key={t}>{t}</li>)}</ul>
      <LegalNote text={p.disclosure} />
      <Btn onClick={() => dispatch(context, 'product.open', { productId: p.id })}>{p.ctaLabel}</Btn>
    </Card>
  );
});

export const InviteRelativeImpl = createComponentImplementation(InviteRelativeDef.api, ({ props, context }) => {
  const i = props.invite as Invite | undefined;
  if (!i) return null;
  return (
    <WidgetCard icon={<PeopleIcon />} title="Копить вместе с мамой" subtitle={`Цель «${i.goalTitle}»`}>
      <div className="flex flex-col gap-5">
        <p>{i.text}</p>
        <ActionRow primary={{ label: i.ctaLabel, onPress: () => dispatch(context, 'invite.send') }} />
      </div>
    </WidgetCard>
  );
});

export const DepositCalculatorImpl = createComponentImplementation(DepositCalculatorDef.api, ({ props, context }) => {
  const d = props.deposit as DepositCalc | undefined;
  const calc = useLiveCalc(d ? d.calculatedFor : { amount: 0, months: 0 }, (inputs) => dispatch(context, 'deposit.recalc', inputs));
  if (!d) return null;
  const apply = d.hint.apply;
  return (
    <WidgetCard icon={<SafeIcon />} title={`Вклад «${d.tariffName}»`} subtitle={d.conditions}>
      <div ref={calc.ref} className="flex flex-col gap-5">
        <ResultBox>
          <CalcResult isCurrent={calc.isCurrent}>
            <div className="flex gap-4">
              <span className="flex min-w-24 flex-col gap-0.5">
                <span className="whitespace-nowrap font-display text-amount tabular-nums">{percent(d.rate)}</span>
                <span className="text-caption text-muted">Ставка</span>
              </span>
              <span className="flex flex-col gap-0.5">
                <Amount value={d.income} size="amount" tone="positive" plus />
                <span className="text-caption text-muted">Доход к {d.payoutLabel}</span>
              </span>
            </div>
          </CalcResult>
        </ResultBox>
        <CalcSlider label="Сумма" value={calc.inputs.amount} min={d.amountMin} max={d.amountMax} step={d.amountStep} format={rub} minLabel={rub(d.amountMin)} maxLabel={rub(d.amountMax)} onChange={(amount) => calc.change({ amount })} />
        <CalcSlider label="Срок" value={calc.inputs.months} min={d.monthsMin} max={d.monthsMax} step={1} format={monthsLabel} minLabel={monthsLabel(d.monthsMin)} maxLabel={monthsLabel(d.monthsMax)} onChange={(months) => calc.change({ months })} />
        <HintButton icon={<PercentIcon size={20} />} text={d.hint.text} actionLabel={apply ? 'Поставить' : undefined} onPress={apply ? () => calc.change(apply) : undefined} />
        <ActionRow primary={{ label: `Открыть на ${rub(calc.inputs.amount)}`, onPress: () => dispatch(context, 'product.open', { productId: d.productId, ...calc.inputs }) }} />
        <LegalNote text={d.disclosure} />
      </div>
    </WidgetCard>
  );
});

export const SpendAnalyticsImpl = createComponentImplementation(SpendAnalyticsDef.api, ({ props, context }) => {
  const s = props.spend as SpendAnalytics | undefined;
  const calc = useLiveCalc(s ? s.calculatedFor : { categoryId: '', cutPct: 0 }, (inputs) => dispatch(context, 'spend.recalc', inputs));
  if (!s) return null;
  const picked = s.categories.find((c) => c.id === calc.inputs.categoryId);
  const largest = Math.max(...s.categories.map((c) => c.share)); // each bar is a share against the largest category
  return (
    <WidgetCard title="Куда уходят деньги" subtitle={`${s.periodLabel} · ${rub(s.total)}`}>
      <div ref={calc.ref} className="flex flex-col gap-5">
        <ResultBox>
          <CalcResult isCurrent={calc.isCurrent}>
            {/* Spend board: the freed amount is the result, in amount size like the other calculators. */}
            <span className="text-secondary text-muted">Освободится в месяц</span>
            <Amount value={s.saved} size="amount" tone="positive" plus />
            {s.goalTitle !== null && s.monthsSooner !== null && (
              <KeyValue rows={[{ label: s.goalTitle, value: <span className="whitespace-nowrap">{s.monthsSooner > 0 ? `на ${duration(s.monthsSooner)} раньше` : 'почти без изменений'}</span> }]} />
            )}
            {s.goalTitle === null && <span className="text-caption text-muted">Выбери цель — покажем, насколько быстрее до неё дойдёшь.</span>}
          </CalcResult>
        </ResultBox>
        <RadioGroup className="gap-0" value={calc.inputs.categoryId} onChange={(categoryId) => calc.change({ categoryId })}>
          <Label className="pb-2 text-secondary font-normal [color:var(--muted)]">Выбери, что сократить</Label>
          {s.categories.map((c) => (
            <Radio
              key={c.id}
              value={c.id}
              isDisabled={!c.cuttable}
              className="group -mx-2 min-h-14 justify-center rounded-control px-2 py-1.5 data-[disabled=true]:opacity-100 data-[selected=true]:bg-default"
            >
              <Radio.Content className="w-full gap-3 font-normal">
                <Radio.Control className="size-5 border-[1.5px] border-[#7A7D84] group-data-[selected=true]:border-transparent group-data-[disabled=true]:opacity-50"><Radio.Indicator /></Radio.Control>
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className={`flex justify-between gap-2 text-body ${c.cuttable ? 'text-foreground' : 'text-muted'}`}>
                    <span>{c.name}</span>
                    <span className="whitespace-nowrap font-semibold tabular-nums">{rub(c.amount)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {/* The caption says the share aloud; the bar is for the eye (react-aria's Meter drops aria-hidden). */}
                    <span aria-hidden="true" className="min-w-0 flex-1">
                      <Meter aria-label={`Доля: ${c.name}`} value={c.share} maxValue={largest} valueLabel={`${c.share}%`} size="sm" className="block">
                        <Meter.Track className="bg-default">
                          <Meter.Fill className={c.id === calc.inputs.categoryId ? 'bg-white' : 'bg-[#5C5E64]'} />
                        </Meter.Track>
                      </Meter>
                    </span>
                    <span className="w-34 shrink-0 whitespace-nowrap text-right text-caption text-muted">{c.cuttable ? `${c.share}%` : `${c.share}% · обязательные`}</span>
                  </span>
                </span>
              </Radio.Content>
            </Radio>
          ))}
        </RadioGroup>
        <CalcSlider
          label={`Сократить «${picked?.accusative ?? ''}» на`}
          value={calc.inputs.cutPct}
          min={s.cutMin}
          max={s.cutMax}
          step={s.cutStep}
          format={(v) => `${v}%`}
          minLabel={`${s.cutMin}%`}
          maxLabel={`${s.cutMax}%`}
          onChange={(cutPct) => calc.change({ cutPct })}
        />
        <ActionRow primary={{ label: 'Откладывать сэкономленное', onPress: () => dispatch(context, 'spend.save', { ...calc.inputs }) }} />
      </div>
    </WidgetCard>
  );
});

const upperFirst = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/** A terms line «A — B» reads as value «B» labelled «A»; a line without a dash is a plain fact. */
function TermRow({ line }: { line: string }) {
  const at = line.indexOf(' — ');
  if (at < 0) return <IconRow icon={<InfoIcon />} value={line} />;
  const label = line.slice(0, at);
  return <IconRow icon={label.startsWith('Срок') ? <CalendarIcon /> : <CashIcon />} value={upperFirst(line.slice(at + 3))} label={label} />;
}

export const ConfirmOpenProductImpl = createComponentImplementation(ConfirmOpenProductDef.api, ({ props, context }) => {
  const p = props.product as Product | undefined;
  const [choice, setChoice] = useState<'confirmed' | 'cancelled' | null>(null);
  if (!p) return null;
  const choose = (next: 'confirmed' | 'cancelled') => {
    setChoice(next);
    dispatch(context, next === 'confirmed' ? 'product.confirm' : 'product.cancel', { productId: p.id });
  };
  return (
    <WidgetCard title={`Открыть ${lowerFirst(p.name)}`} subtitle="Проверь условия — после открытия их не изменить">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4">
          {p.rate > 0 && <IconRow icon={<PercentIcon />} value={ratePct(p.rate)} label="Ставка" />}
          {p.termsLines.map((t) => <TermRow key={t} line={t} />)}
        </div>
        {choice === null && (
          <ActionRow primary={{ label: 'Подтвердить', onPress: () => choose('confirmed') }} secondary={[{ label: 'Отмена', onPress: () => choose('cancelled') }]} />
        )}
        {choice === 'confirmed' && (
          <div role="status" className="flex h-13 items-center justify-center gap-2 rounded-control bg-[rgba(33,160,56,0.14)] text-body font-semibold text-success">
            <CheckIcon />
            Подтверждено
          </div>
        )}
        {choice === 'cancelled' && (
          <div role="status" className="flex h-13 items-center justify-center rounded-control bg-default text-body font-semibold text-muted">
            Отменено
          </div>
        )}
        <LegalNote text={p.disclosure} />
      </div>
    </WidgetCard>
  );
});

export const SavingsAccountCalculatorImpl = createComponentImplementation(SavingsAccountCalculatorDef.api, ({ props, context }) => {
  const a = props.account as AccountCalc | undefined;
  const calc = useLiveCalc(a ? a.calculatedFor : { topUp: 0, months: 0 }, (inputs) => dispatch(context, 'account.recalc', inputs));
  if (!a) return null;
  return (
    <WidgetCard icon={<ChartIcon />} title={a.name} subtitle={`${ratePct(a.rate)} · без срока · снимай и пополняй когда хочешь`}>
      <div ref={calc.ref} className="flex flex-col gap-5">
        <ResultBox>
          <CalcResult isCurrent={calc.isCurrent}>
            <span className="text-secondary text-muted">Через {monthsLabel(a.months)} на счёте</span>
            <Amount value={a.total} size="amount" />
            <KeyValue rows={[{ label: 'Из них доход', value: <Amount value={a.income} tone="positive" plus /> }]} />
            <span className="text-caption text-muted">Старт — {rub(a.start)} с карты, дальше {rub(a.topUp)} в месяц</span>
          </CalcResult>
        </ResultBox>
        <CalcSlider label="Пополнять в месяц" value={calc.inputs.topUp} min={a.topUpMin} max={a.topUpMax} step={a.topUpStep} format={rub} minLabel={rub(a.topUpMin)} maxLabel={rub(a.topUpMax)} onChange={(topUp) => calc.change({ topUp })} />
        <CalcSlider label="Срок" value={calc.inputs.months} min={a.monthsMin} max={a.monthsMax} step={1} format={monthsLabel} minLabel={monthsLabel(a.monthsMin)} maxLabel={monthsLabel(a.monthsMax)} onChange={(months) => calc.change({ months })} />
        <HintButton icon={<InfoIcon size={20} />} text={a.note} />
        <ActionRow primary={{ label: a.ctaLabel, onPress: () => dispatch(context, 'product.open', { productId: a.productId }) }} />
        <LegalNote text={a.disclosure} />
      </div>
    </WidgetCard>
  );
});

export const PiggyBankCalculatorImpl = createComponentImplementation(PiggyBankCalculatorDef.api, ({ props, context }) => {
  const p = props.piggy as PiggyCalc | undefined;
  const calc = useLiveCalc(p ? p.calculatedFor : { sharePct: 0, months: 0 }, (inputs) => dispatch(context, 'piggy.recalc', inputs));
  if (!p) return null;
  const pct = (v: number) => `${v}%`;
  return (
    <WidgetCard icon={<PiggyIcon />} title="Копилка" subtitle="Откладывает процент с каждой покупки по карте">
      <div ref={calc.ref} className="flex flex-col gap-5">
        <ResultBox>
          <CalcResult isCurrent={calc.isCurrent}>
            <span className="text-secondary text-muted">За {monthsLabel(p.months)} отложится</span>
            <Amount value={p.total} size="amount" />
            <KeyValue rows={[{ label: 'В месяц', value: <Amount value={p.monthly} /> }]} />
            <span className="text-caption text-muted">По твоим тратам — {rub(p.monthlySpend)} в месяц</span>
          </CalcResult>
        </ResultBox>
        <CalcSlider label="С каждой покупки" value={calc.inputs.sharePct} min={p.shareMin} max={p.shareMax} step={p.shareStep} format={pct} minLabel={pct(p.shareMin)} maxLabel={pct(p.shareMax)} onChange={(sharePct) => calc.change({ sharePct })} />
        <CalcSlider label="Срок" value={calc.inputs.months} min={p.monthsMin} max={p.monthsMax} step={1} format={monthsLabel} minLabel={monthsLabel(p.monthsMin)} maxLabel={monthsLabel(p.monthsMax)} onChange={(months) => calc.change({ months })} />
        <HintButton icon={<InfoIcon size={20} />} text={p.note} />
        <ActionRow primary={{ label: p.ctaLabel, onPress: () => dispatch(context, 'piggy.enable') }} />
      </div>
    </WidgetCard>
  );
});

/** Saving versus borrowing (Loan board): the loan's payment and cost, then the same payment saved; the button moves to saving, never to a loan. */
export const LoanCompareImpl = createComponentImplementation(LoanCompareDef.api, ({ props, context }) => {
  const l = props.loan as LoanCalc | undefined;
  const calc = useLiveCalc(l ? l.calculatedFor : { amount: 0, months: 0 }, (inputs) => dispatch(context, 'loan.recalc', inputs));
  if (!l) return null;
  return (
    <WidgetCard icon={<LoanIcon />} title="Копить или взять кредит" subtitle={`${l.goalTitle} · ${l.loanTitle}, ${percent(l.rate)}`}>
      <div ref={calc.ref} className="flex flex-col gap-5">
        <ResultBox>
          <CalcResult isCurrent={calc.isCurrent}>
            <span className="text-secondary text-muted">Кредит — сразу</span>
            <span className="whitespace-nowrap">
              <Amount value={l.payment} size="amount" /> <span className="text-body text-muted">в месяц</span>
            </span>
            <KeyValue rows={[{ label: 'Переплата', value: rub(l.overpayment) }, { label: 'ПСК', value: percent(l.psk) }]} />
            <div className="my-1.5 h-px bg-border" />
            <span className="text-secondary text-muted">Копить тем же платежом</span>
            <span className="whitespace-nowrap font-display text-amount tabular-nums text-success-text">{monthsLabel(l.saveMonths)}</span>
            <span className="text-caption text-muted">На накопительном счёте под {percent(l.saveRate)}, без переплаты</span>
          </CalcResult>
        </ResultBox>
        <CalcSlider label="Сумма" value={calc.inputs.amount} min={l.amountMin} max={l.amountMax} step={l.amountStep} format={rub} minLabel={rub(l.amountMin)} maxLabel={rub(l.amountMax)} onChange={(amount) => calc.change({ amount })} />
        <CalcSlider label="Срок кредита" value={calc.inputs.months} min={l.monthsMin} max={l.monthsMax} step={1} format={monthsLabel} minLabel={monthsLabel(l.monthsMin)} maxLabel={monthsLabel(l.monthsMax)} onChange={(months) => calc.change({ months })} />
        <HintButton icon={<span className={l.hint.warn ? 'text-warning' : undefined}><InfoIcon size={20} /></span>} text={l.hint.text} />
        <ActionRow
          primary={{ label: l.ctaLabel, onPress: () => dispatch(context, 'loan.save', { ...calc.inputs }) }}
          secondary={l.handoffLabel ? [{ label: l.handoffLabel, onPress: () => dispatch(context, 'handoff.request') }] : []}
        />
        <LegalNote text={l.disclosure} />
      </div>
    </WidgetCard>
  );
});

/** An investment simulation (Investments board): two named benchmarks, never a forecast; the warning is always on screen. */
export const InvestSimImpl = createComponentImplementation(InvestSimDef.api, ({ props, context }) => {
  const v = props.invest as InvestCalc | undefined;
  const calc = useLiveCalc(v ? v.calculatedFor : { monthly: 0, months: 0 }, (inputs) => dispatch(context, 'invest.recalc', inputs));
  if (!v) return null;
  return (
    <WidgetCard icon={<InvestIcon />} title="Симуляция инвестиций" subtitle="Брокерский счёт · доход не гарантирован">
      <div ref={calc.ref} className="flex flex-col gap-5">
        <ResultBox>
          <CalcResult isCurrent={calc.isCurrent}>
            <span className="text-secondary text-muted">Через {monthsLabel(v.months)} может быть</span>
            {v.benchmarks.map((b, i) => (
              <span key={b.id} className="flex flex-col gap-0.5">
                <Amount value={b.total} size="amount" tone={i === 1 ? 'positive' : 'default'} />
                <span className="text-caption text-muted">{b.name} — {b.line}</span>
              </span>
            ))}
            <div className="mt-1 border-t border-border pt-1">
              <KeyValue rows={[{ label: 'Твои взносы', value: <span className="whitespace-nowrap">{rub(v.paid)}</span> }]} />
            </div>
          </CalcResult>
        </ResultBox>
        <CalcSlider label="Вкладывать в месяц" value={calc.inputs.monthly} min={v.monthlyMin} max={v.monthlyMax} step={v.monthlyStep} format={rub} minLabel={rub(v.monthlyMin)} maxLabel={rub(v.monthlyMax)} onChange={(monthly) => calc.change({ monthly })} />
        <CalcSlider label="Срок" value={calc.inputs.months} min={v.monthsMin} max={v.monthsMax} step={1} format={monthsLabel} minLabel={monthsLabel(v.monthsMin)} maxLabel={monthsLabel(v.monthsMax)} onChange={(months) => calc.change({ months })} />
        <HintButton icon={<span className="text-warning"><AlertIcon size={20} /></span>} text={v.warning} />
        <ActionRow
          primary={{ label: 'Открыть брокерский счёт', onPress: () => dispatch(context, 'product.open', { productId: 'broker-account' }) }}
          secondary={[{ label: 'Сравнить с накопительным счётом', onPress: () => dispatch(context, 'invest.compare', { ...calc.inputs }) }]}
        />
        <LegalNote text={v.disclosure} />
      </div>
    </WidgetCard>
  );
});
