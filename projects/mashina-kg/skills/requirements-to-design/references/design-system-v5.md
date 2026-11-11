# Дизайн-система Mashina.kg v.5 — справочник для макетов в Figma

- Источник: файл «Mashina.kg (v.5)» `ha0peUzFa2ENKOcmvcC1pZ`, страница «🟢 Design system» `3717:59`. Ссылка: https://www.figma.com/design/ha0peUzFa2ENKOcmvcC1pZ/Mashina.kg--v.5-?node-id=3717-59
- Выгрузка: 10.11.2026. Подпись свежести: `v8048e6c4-s9a11433b-c14ff4395` (152 переменные, 59 текстовых стилей, 3 эффекта, 1057 компонентов).
- Библиотека не опубликована: импорт по ключу (`importComponentByKeyAsync`) не работает. Файл v.5 открывать только на чтение.
- Старые «Design System» `cBVCpu…` и «DS:Mashina_Old» для макетов не использовать.

## 1. Обновление перед каждым запуском

1. Выполни в v.5 скрипт свежести (раздел 8), он только читает.
2. Подпись совпала — работай по этому файлу.
3. Подпись другая — выполни скрипты выгрузки (раздел 8). Обнови разделы 2–6, дату и подпись. В финальном ответе одной строкой напиши, что поменялось.
4. Файл v.5 недоступен — работай по этому файлу и укажи дату выгрузки как ограничение.

## 2. Цвета (коллекция Colors, режимы Light | Dark)

Основной режим — Light. Dark — только если тёмная тема указана в требованиях.

| Токен | Light | Dark | Когда |
|---|---|---|---|
| surface-canvas | #ffffff | #0f0f10 | Фон страницы |
| surface-container | #f7f7f8 | #181919 | Карточки, секции |
| surface-raised | #ffffff | #252729 | Bottom sheet, диалог, поповер |
| surface-muted | #eeeff1 | #2d2e2f | Подложка полей, чипов, вторичных кнопок |
| content-primary | #101114 | #f2f2f2 | Основной текст и иконки, цена |
| content-secondary | #505b6b | #b1b1b1 | Подписи, метаданные, placeholder |
| content-tertiary | #656e7a | #9198a0 | Пояснения низкого приоритета |
| content-disabled | #9b9ca4 | #71767c | Только недоступные контролы |
| fixed-light | #ffffff | #ffffff | Текст на насыщенной заливке |
| fixed-dark | #101114 | #101114 | Текст на VIP и светлых плашках |
| border-subtle | #e1e3e6 | #3e4042 | Разделители |
| border-control | #707b8a | #838b96 | Граница поля, чекбокса, радио |
| accent-solid | #0069c9 | #0069c9 | Основная кнопка, выбранный контрол |
| accent-foreground | #005fbf | #70bfff | Ссылки, акцентный текст, фокус |
| accent-tint | #e6f2ff | #112f4a | Выбранный чип, инфо-плашка |
| button-brand-secondary | #cfe6ff | #112f4a | Фон Secondary-кнопки Brand |
| positive-solid | #1fa840 | #1fa840 | Только кнопка Positive |
| positive-foreground | → positive-solid | #86dfa0 | Текст Positive |
| positive-tint | #e1f5e5 | #12351f | Подложка успеха |
| negative-solid | #e5484d | #e5484d | Только кнопка Negative |
| negative-foreground | → negative-solid | #ff969b | Текст ошибки |
| negative-tint | #fdecec | #421f24 | Подложка ошибки |
| warning-foreground | #895000 | #ffcc70 | Предупреждение |
| warning-tint | #fff0d6 | #3d2c14 | Подложка предупреждения |
| warning-solid | → promo-vip | → promo-vip | Кнопка-предупреждение |
| promo-vip | #ffa000 | #ffa000 | VIP, текст fixed-dark |
| promo-exclusive-gradient | #ffc367 → #e675f0 → #5bcbff | то же | Exclusive (бывший Premium) |
| listing-price-highlight | #7e22ce | #7e22ce | Подложка суммы объявления |
| brand-primary | #0094ff | #0094ff | Логотип, брендовые поверхности. Не для CTA |
| brand-logo-accent | #fabf00 | #fabf00 | Акцент логотипа |
| overlay-scrim | #000000 64% | #000000 64% | Затемнение под модалкой |
| overlay-scrim-50 | #000000 50% | #000000 50% | Затемнение 50% |
| state-hover | #000000 4% | #ffffff 8% | Слой hover поверх заливки |
| state-pressed | #000000 6% | #ffffff 10% | Слой pressed |
| state-primary-hover | #ffffff 20% | #ffffff 20% | Hover основной кнопки |
| state-primary-pressed | #000000 8% | #000000 8% | Pressed основной кнопки |
| segmented-selected-surface | → surface-raised | → neutral-600 #3d3f42 | Выбранный сегмент |
| segmented-selected-content | → content-primary | → fixed-light | Текст выбранного сегмента |
| hint-surface / hint-content | fixed-dark / fixed-light | fixed-light / fixed-dark | Подсказка (Hint) |
| surface-glass | #ffffff 8% | #ffffff 4% | Стекло с blur 24 |
| shadow-bottom-action-bar | #000000 16% | #000000 16% | Тень нижней панели |

Служебные состояния кнопок (outline-hover 32%, secondary-pressed 8%) берутся из компонента Button, вручную не собирать.

## 3. Размеры

| Коллекция | Значения |
|---|---|
| Spacing | 0, 2, 4, 6, 8, 12, 14, 16, 18, 24, 32, 36, 40, 44, 56, 64, 80, 124, 256, 512 |
| Corner radius | 0, 4, 8, 12, 16, 24, 32, 40, 999 |
| Input · Layout | min-height 40, padding 8 / 12, иконка 18, радиус 12, текст 14 |
| Textarea | min-height 96 |
| Button | высота small 30, обводка Outline 1 |
| Header | desktop: контент до 1408, min 1024, default min 1152<br>mobile: min 320, статус-бар 48, иконка 20 |
| Slider | бегунок 20 |

## 4. Типографика

- Семейство: **Google Sans Mashina**, начертания Regular, Medium, Bold, Black. Межбуквенный интервал 0.
- В «For Oleg» этого шрифта нет (проверено 10.11.2026). Замена — **Google Sans Flex** того же начертания. Замену укажи в заметке к макету.
- Имя стиля: `Google Sans Mashina/<Начертание>/<Роль> (<размер>)`.

| Роль | Размер / строка |
|---|---|
| Tiny | 8 / 10 |
| Micro | 10 / 12 |
| Caption | 12 / 16 |
| Body S | 14 / 18 |
| Input Content, Breadcrumbs | 14 / 20 |
| Body M | 16 / 20 |
| Body L | 18 / 22 |
| Title S | 20 / 24 |
| Title M | 24 / 30 |
| Title L | 32 / 40 |
| Heading S | 36 / 44 |
| Heading M | 40 / 50 |
| Heading L | 44 / 54 |
| Display L | 56 / 68 |
| Display XL | 64 / 78 |

## 5. Эффекты

| Стиль | Параметры |
|---|---|
| Glass / Bottom action bar | background blur 24; тень 0, −2, blur 16, #000 16% |
| Elevation / Popover | тень 0, 4, blur 16, #000 10% |
| Headlight / Soft glow | layer blur 4 |

## 6. Компоненты (узлы в v.5)

Размеры, отступы и состояния новых элементов бери из этих компонентов: снимок через `get_screenshot`, параметры через `get_design_context` или `use_figma` на чтение.

### 02 · Управление `3717:137`

| Компонент | Узел | Варианты |
|---|---|---|
| Button | 958:1077 | Size: small / Big<br>Variant: Brand / Positive / Negative<br>Appearance: Primary / Secondary / Outline<br>State: Default / Hover / Pressed / Disabled / Loading |
| Input | 882:470 | No Label: False / True |
| Input / Field | 882:373 | 11 состояний: Default … Error, Success, View-only |
| Input / Trailing Label | 882:152 | Tone: Primary / Secondary |
| Textarea | 945:4141 | No Label: False / True |
| Textarea / Field | 945:3907 | 11 состояний, как у Input |
| Textarea / Character Counter | 970:543 | Default / Error |
| Segmented control | 1413:81850 | Tabs: 2 / 3; Selected; State; Surface: Container / Canvas |

### 03 · Навигация `3717:163`

| Компонент | Узел | Варианты |
|---|---|---|
| Header/Desktop | 1258:725 | Active: None / Ads / Favorites / Messages<br>Layout: Default / Compact |
| Header/Mobile | 1258:1204 | Leading: Logo / Back / Title / None<br>Trailing: None / 1–3 icons / Text / Button |
| Header/Status bar | 1844:4819 | 375×48 |
| Header/Icon button | 1256:465 | Size: M / S; 5 состояний |
| Header/Nav item | 1256:491 | 4 состояния |
| Header/Logo | 1256:436 | Size: S / M |
| Header/Avatar, Count badge | 1256:437, 1287:3279 | — |
| Menu | 2983:8115 | Active: Легковые / Коммерческие / Мото / Услуги / Запчасти |
| Menu/Item | 2983:7974 | 4 состояния |
| Breadcrumbs | 3596:17668 | Actions: Show / Hide |
| Footer | 3075:423 | Desktop / Mobile |
| Store badge | 3071:8915 | App Store / Google Play |
| Bottom Navigation / Light, Dark | 970:38548, 970:38685 | Selected Tab: Home / Favorites / Messages / Profile |
| Tab bar / Lite / Light, Dark | 1025:3930, 1025:4747 | то же |
| Navigation Badge / Light, Dark | 322:183, 322:336 | None / Count / 9+ / NEW |

### 04 · Контент `3717:189`

| Компонент | Узел | Варианты |
|---|---|---|
| Checkbox, Radio, Toggle | 2701:13703, 2701:13716, 2701:13725 | Checked; State: Default / Disabled |
| List / Cell | 2701:13735 | 375×80 |
| Table, Table / Row, Table / Cell | 3606:9074, 3605:9155, 3605:9016 | Cell: Body / Emphasis / Positive / Header; Left / Right |
| Table / Toggle | 3606:9039 | — |
| Table / Mobile / Operation, Bonus history | 3656:4030, 3663:2042 | — |

### 05 · Всплывающие элементы `3717:208`

| Компонент | Узел | Варианты |
|---|---|---|
| Bottom sheet/Mobile | 2441:423 | Illustration: Shown / Hidden<br>Buttons: Vertical / Horizontal |
| Bottom sheet content | 2704:13260, :13265, :13291, :13312 | Label, Input, Textarea, List |
| Overlay | 2742:1088 | 375×812 |
| Promo bottom sheet / Exclusive | 2857:2667 | — |
| Hint | 3263:265 | Top / Bottom / Left / Right; Start / Center / End |
| Action menu, Item | 3511:11376, 3511:11375 | Tone: Default / Destructive; 4 состояния |
| Account menu | 3532:327 | — |
| Account navigation | 3557:10554 | Reports / Applications / Transactions / Saved searches |

### 01 · Основы `3717:111`: иконки

220 наборов `Icons/<группа>/<имя>`, вариант Style: Regular / Solid. Секция Icons — `3717:123`. Логотипы брендов и устройства — `3717:130`.

| Группа | Кол-во | Примеры |
|---|---|---|
| Navigation | 54 | angle-small-*, arrow-*, search, filters, sort, cross, check, plus, share, menu-dots |
| Automotive | 96 | car, car-side, truck-side, motorcycle, engine, tire, gas-pump, key, garage, parking |
| General | 61 | heart, comment, user, wallet, credit-card, calculator, bell, star, camera, edit, trash, eye, info |
| Tab Bar | 5 | home, heart, plus-circle, message, user |
| Benefits | 4 | exclusive, vip, top, auto-up |

Иконку переноси через `download_assets` (SVG) узла v.5 и `createNodeFromSvg` в макете. Не рисуй похожую вручную.

## 7. Правила применения в макете

- Цвет, отступ, радиус и текст новых элементов — только значения из разделов 2–5. Значение не из списка — допущение, укажи его в заметке.
- Повторяющийся новый элемент: собери локальный компонент с параметрами компонента v.5 и назови его так же, как в v.5.
- Скриншоты эмулятора могут показывать старый стиль. Неизменённые части остаются скриншотами. Новые и изменённые элементы — по v.5, даже если рядом старый вид.
- Не заявляй «из библиотеки»: элементы локальные, со значениями v.5.

## 8. Скрипты (use_figma, файл `ha0peUzFa2ENKOcmvcC1pZ`, только чтение)

### Свежесть

```js
const h = s => { let x = 5381; for (let i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) >>> 0; return x.toString(16); };
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const vparts = [];
for (const c of cols) for (const id of c.variableIds) { const v = await figma.variables.getVariableByIdAsync(id); vparts.push(c.name + '/' + v.name + '=' + JSON.stringify(Object.values(v.valuesByMode))); }
const ts = await figma.getLocalTextStylesAsync();
const es = await figma.getLocalEffectStylesAsync();
const sparts = ts.map(s => s.name + s.fontName.style + s.fontSize + JSON.stringify(s.lineHeight)).concat(es.map(s => s.name + JSON.stringify(s.effects)));
const page = await figma.getNodeByIdAsync('3717:59');
await figma.setCurrentPageAsync(page);
const comps = page.findAllWithCriteria({ types: ['COMPONENT_SET','COMPONENT'] });
const cparts = comps.map(c => c.id + c.name + Math.round(c.width) + 'x' + Math.round(c.height)).sort();
return { signature: `v${h(vparts.join('|'))}-s${h(sparts.join('|'))}-c${h(cparts.join('|'))}`, nComponents: comps.length };
```

### Выгрузка (только если подпись изменилась)

1. Переменные: для каждой коллекции `getLocalVariableCollectionsAsync` → `getVariableByIdAsync`; значения по режимам, алиасы как `→имя`, цвета в hex; описание переменной.
2. Стили: `getLocalTextStylesAsync` (семейство, начертание, размер, строка), `getLocalEffectStylesAsync`.
3. Компоненты: на странице `3717:59` по секциям `findAllWithCriteria({types:['COMPONENT_SET','COMPONENT']})`, без вариантов внутри наборов. Имя, id, размер, `variantGroupProperties`. Иконки `Icons/*` — только счёт и имена по группам.

Каждую выгрузку возвращай отдельным вызовом, проверяй размер ответа.
