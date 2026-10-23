import type { ReactNode } from 'react';

/** Authored line icons from the approved canvas: decorative, coloured by `currentColor`. */
function Line({ size, box, children }: { size: number; box: number; children: ReactNode }) {
  return (
    // Inline size: HeroUI's Button resizes any svg inside it through a class rule.
    <svg aria-hidden="true" width={size} height={size} style={{ width: size, height: size }} viewBox={`0 0 ${box} ${box}`} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      {children}
    </svg>
  );
}
type P = { size?: number };

export const SafeIcon = ({ size = 28 }: P) => (
  <Line size={size} box={28}><rect x="4" y="5" width="20" height="18" rx="2.5" strokeWidth="1.8" /><circle cx="14" cy="14" r="3.5" strokeWidth="1.8" /></Line>
);
export const ChartIcon = ({ size = 28 }: P) => (
  <Line size={size} box={28}><rect x="4" y="5" width="20" height="18" rx="2.5" strokeWidth="1.8" /><path d="M8 18l4-4 3 2.5 5-6" strokeWidth="1.8" /></Line>
);
export const PercentIcon = ({ size = 28 }: P) => (
  <Line size={size} box={28}><circle cx="9.5" cy="9.5" r="3" strokeWidth="1.8" /><circle cx="18.5" cy="18.5" r="3" strokeWidth="1.8" /><path d="M20 7L8 21" strokeWidth="1.8" /></Line>
);
export const CalendarIcon = ({ size = 28 }: P) => (
  <Line size={size} box={28}><rect x="4.5" y="6.5" width="19" height="17" rx="2.5" strokeWidth="1.8" /><path d="M4.5 11.5h19M10 4v4M18 4v4" strokeWidth="1.8" /></Line>
);
export const CashIcon = ({ size = 28 }: P) => (
  <Line size={size} box={28}><rect x="3.5" y="8" width="21" height="13" rx="2.5" strokeWidth="1.8" /><circle cx="14" cy="14.5" r="2.8" strokeWidth="1.8" /></Line>
);
export const PiggyIcon = ({ size = 28 }: P) => (
  <Line size={size} box={28}><circle cx="14" cy="15" r="8" strokeWidth="1.8" /><path d="M11 7h6" strokeWidth="1.8" /><path d="M14 11v8M11.5 13.5h4a1.5 1.5 0 010 3h-3a1.5 1.5 0 000 3h4" strokeWidth="1.5" /></Line>
);
export const SpendIcon = ({ size = 28 }: P) => (
  <Line size={size} box={28}><circle cx="14" cy="14" r="9" strokeWidth="1.8" /><path d="M14 5v9l6 5" strokeWidth="1.8" /></Line>
);
/** Two opposite arrows (Loan board): borrow now or save. */
export const LoanIcon = ({ size = 28 }: P) => (
  <Line size={size} box={28}><path d="M5 9h18M5 19h18M9 5l-4 4 4 4M19 15l4 4-4 4" strokeWidth="1.8" /></Line>
);
/** A rising line with an arrow (Investments board). */
export const InvestIcon = ({ size = 28 }: P) => (
  <Line size={size} box={28}><path d="M4 22h20M7 18l5-6 4 3 6-8" strokeWidth="1.8" /><path d="M18 7h4v4" strokeWidth="1.8" /></Line>
);
export const ChevronIcon = ({ size = 20 }: P) => (
  <Line size={size} box={20}><path d="M8 5l5 5-5 5" strokeWidth="1.8" /></Line>
);
export const InfoIcon = ({ size = 28 }: P) => (
  <Line size={size} box={28}><circle cx="14" cy="14" r="10" strokeWidth="1.8" /><path d="M14 12.5v6.5M14 9v.4" strokeWidth="2" /></Line>
);
export const AlertIcon = ({ size = 28 }: P) => (
  <Line size={size} box={28}><circle cx="14" cy="14" r="10" strokeWidth="1.8" /><path d="M14 8.5v6.5M14 18.6v.4" strokeWidth="2" /></Line>
);
export const BackIcon = ({ size = 24 }: P) => (
  <Line size={size} box={24}><path d="M19 12H5m6-6l-6 6 6 6" strokeWidth="2" /></Line>
);
/** Arrow up, for the round send button. */
export const SendIcon = ({ size = 22 }: P) => (
  <Line size={size} box={22}><path d="M11 18V4m-6 6l6-6 6 6" strokeWidth="2.2" /></Line>
);
export const CheckIcon = ({ size = 20 }: P) => (
  <Line size={size} box={20}><path d="M4.5 10.5l3.5 3.5L15.5 6" strokeWidth="2.2" /></Line>
);
export const PeopleIcon = ({ size = 28 }: P) => (
  <Line size={size} box={28}><circle cx="10" cy="10" r="4" strokeWidth="1.8" /><circle cx="19" cy="11" r="3" strokeWidth="1.8" /><path d="M3 23c0-4 3-7 7-7s7 3 7 7M17 17c4 0 8 2 8 6" strokeWidth="1.8" /></Line>
);

/** The home banner's illustration: a green coin stack with a tick (Chrome board). */
export const CoinStack = () => (
  <svg aria-hidden="true" width="56" height="56" viewBox="0 0 76 76" className="m-0 size-14 shrink-0">
    <ellipse cx="38" cy="58" rx="22" ry="6" fill="#0F3A22" />
    <rect x="16" y="44" width="44" height="12" rx="6" fill="#1A7A31" />
    <rect x="16" y="34" width="44" height="12" rx="6" fill="#21A038" />
    <rect x="16" y="24" width="44" height="12" rx="6" fill="#2DB84A" />
    <circle cx="56" cy="20" r="11" fill="#FFFFFF" />
    <path d="M51.5 20.3l3 3 6-6.3" fill="none" stroke="#21A038" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
