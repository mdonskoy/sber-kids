const NUM = new Intl.NumberFormat('ru-RU');

/** Server-built copy: «30 000 ₽» (the browser formats its own figures). */
export const rubText = (v: number) => `${NUM.format(v)} ₽`;
/** A rate in server-built copy: «12,5%». */
export const pctText = (r: number) => `${NUM.format(Math.round(r * 1000) / 10)}%`;
