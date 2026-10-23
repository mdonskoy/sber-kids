import type { Done, Handoff, Product, Refusal } from '@proto/catalog';
import type { Recipe } from './validate';

// Screens the server builds in code. Their text and numbers are backend data under
// /static, so the model can neither see nor alter them (FR-005).

export interface StaticScreen { recipe: Recipe; data: Record<string, unknown> }

function single(component: string, prop: string, key: string, value: unknown): StaticScreen {
  return {
    data: { static: { [key]: value } },
    recipe: {
      components: [
        { id: 'root', component: 'Column', children: ['main'] },
        { id: 'main', component, [prop]: { path: `/static/${key}` } },
      ],
    },
  };
}

export const confirmOpenProductScreen = (p: Product) => single('ConfirmOpenProduct', 'product', 'product', p);
export const doneScreen = (done: Done) => single('Done', 'done', 'done', done);
export const refusalScreen = (r: Refusal) => single('Refusal', 'refusal', 'refusal', r);
export const handoffScreen = (h: Handoff) => single('Handoff', 'handoff', 'handoff', h);

const BACK = 'К плану';
const OPENED_NEXT: Record<Product['id'], string> = {
  'savings-account': 'Цель будет пополняться отсюда.',
  deposit: 'Деньги будут работать до конца срока.',
  'broker-account': 'Пополнить его можно с карты в любой момент.',
};

export const DONE = {
  handoff: { title: 'Специалист скоро ответит', text: 'Мы передали разговор сотруднику банка. Ответ придёт в чат поддержки.', backLabel: BACK },
  actionFailed: { title: 'Не получилось', text: 'Это уже сделано или устарело. Вернись к плану.', backLabel: BACK },
  productOpened: (p: Product): Done => ({ title: 'Готово', text: `${p.name} открыт. ${OPENED_NEXT[p.id]}`, backLabel: 'К плану' }),
  productCancelled: { title: 'Открытие отменено', text: 'Ничего не открыто. Можно вернуться к плану.', backLabel: 'К плану' },
  piggyOn: { title: 'Копилка включена', text: 'Будем откладывать процент с каждой покупки по карте. Выключить можно в любой момент.', backLabel: 'К плану' },
  inviteSent: { title: 'Приглашение отправлено', text: 'Мама получит ссылку на Совместный счёт для твоей цели.', backLabel: 'К плану' },
};
