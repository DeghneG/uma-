export type Lang = "en" | "fil";

export const GOAL = 20000;
export const START_MONEY = 4000;
export const SACK_PRICE = 1000;
export const COOP_MULT = 1.4;
export const COOP_FEE = 200;

export interface State {
  lang: Lang;
  money: number;
  morale: number;
  monthsLeft: number;
  /** Neighbors will help at harvest (shared the canal in week 3). */
  nb: boolean;
  /** Mistakes forgiven at harvest (bought fuel in week 3). */
  rbuf: number;
  /** Maximum sacks (planted fewer rows in week 3). */
  rcap: number;
  wMist: number;
  pMist: number;
  hMist: number;
  sacks: number;
  sold: number | null;
  /** Itemized money changes this month, shown in the summary. */
  ledger: { key: string; amount: number }[];
}

function fresh(lang: Lang): State {
  return {
    lang,
    money: START_MONEY,
    morale: 60,
    monthsLeft: 5,
    nb: false,
    rbuf: 0,
    rcap: 5,
    wMist: 0,
    pMist: 0,
    hMist: 0,
    sacks: 0,
    sold: null,
    ledger: [],
  };
}

export const state: State = fresh("en");

const subs = new Set<() => void>();
export const onChange = (f: () => void): void => {
  subs.add(f);
};
const emit = (): void => subs.forEach((f) => f());

export function patch(p: Partial<State>): void {
  Object.assign(state, p);
  emit();
}
export function addMoney(n: number, key?: string): void {
  if (key) state.ledger.push({ key, amount: n });
  patch({ money: Math.max(0, state.money + n) });
}
export function addMorale(n: number): void {
  patch({ morale: Math.min(100, Math.max(0, state.morale + n)) });
}
export function resetGame(): void {
  Object.assign(state, fresh(state.lang));
  emit();
}

export const peso = (n: number): string => "₱" + Math.round(n).toLocaleString("en-US");

/**
 * Sacks of rice from mistakes across nine decisions
 * (3 field-prep picks, 3 pest fixes, 3 harvest rounds).
 * 0-1 mistakes = 5 sacks, 2-4 = 3, 5-8 = 2, 9 = 0.
 */
export function computeSacks(): { sacks: number; mistakes: number } {
  const raw = Math.min(3, state.wMist) + state.pMist + state.hMist;
  const mistakes = Math.max(0, raw - state.rbuf);
  const base = mistakes <= 1 ? 5 : mistakes <= 4 ? 3 : mistakes <= 8 ? 2 : 0;
  return { sacks: Math.min(base, state.rcap), mistakes };
}
