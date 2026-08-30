export const SALONS = [
  'ТЦ "Град" пав. 559',
  'ТЦ "Coolman"',
  'Салон "Vegas" (Уручье)',
  'ТЦ "Домашний очаг"',
  'ТЦ "ТРЮМ"',
  'ТЦ "Мост"',
  'ТЦ "ОЗЕРЦО"',
  'ТЦ "ЗАМОК" Корона',
  'ТЦ "Корона-ДОМ"',
  'ТЦ "КАМЕЛОТ"',
  'ТЦ "Globo"',
  'ТЦ "Palazzo"',
  'ТЦ "Армада"',
  'ТЦ "Стиль"',
  'ТРЦ "МЕГА"',
  'МЦ "Крепость"',
  'ТРЦ "Мандарин Плаза"',
  'ТЦ "КОРОНА"',
  'ТЦ "Спутник"',
  'ТВК "Апельсин"',
  'Центр мебели "КОМОД+"',
  'ТЦ "Дом мебели"',
  'ТЦ "ВамРад"',
  'ТЦ "Интериум"',
] as const;

export const LAST_SALON_KEY = "vegas_last_salon";

export function getSavedSalon() {
  try {
    return localStorage.getItem(LAST_SALON_KEY) || "";
  } catch {
    return "";
  }
}

export function saveSalonLocal(salon: string) {
  try {
    localStorage.setItem(LAST_SALON_KEY, salon);
  } catch {
    /* ignore */
  }
}
