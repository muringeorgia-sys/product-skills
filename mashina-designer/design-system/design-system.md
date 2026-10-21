# Design System Mashina.kg: справочник для агента-дизайнера

Источник: Figma `cBVCpuVZssfUSt2UG3bfNh` («Design System»), страница «⚙️ Components» (`0:1`) и страница «Logo» (`3992:10406`).
Выгрузка: 16.10.2026. Только чтение. Библиотека «DS:Mashina_Old» не использована. Файл Graph/Identity не открывался.

Файлы рядом: `tokens.css` (переменные, текстовые классы `.t-*`), `components.css` (классы компонентов), `kit.html` (живой каталог с подписями узлов), `figma-map.md` (узлы и ссылки), `icons/`, `logo/`.

## 1. Что нужно знать до начала работы

| Тема | Факт |
|---|---|
| Темы | В Figma-файле два режима переменных. Светлый нарисован в Buttons, Cells (поля, ячейки), Alerts legacy, Notification Toast и Banner. Только в тёмном нарисованы Various selectors, Navigation, «Главная», формы «Ручной ввод данных», Tooltips, Toastbar new и V3.<br>`:root` в `tokens.css` — светлая тема, основная. `[data-theme="dark"]` — тёмная по кадру «Главная». |
| Как получены светлые значения | Для компонентов, нарисованных только тёмными, имя переменной взято из кода Figma, а светлое значение — из светлых секций (Cells, Buttons). Цвета полей проверены по пикселям скриншотов. |
| Hover и Pressed | В Figma это прозрачность той же заливки: Hover 75%, Pressed 90%. Отдельных цветов нет. |
| Шрифты | Inter_mashina (кнопки, подписи, цены, карточки) и Google Sans Mashina (поля, ячейки, вкладки, ссылки). Файлы Inter_mashina 400–700 взяты с mashina.kg 16.10.2026 (`fonts/`, как на сайте). Сборка встраивает их под именем «Inter»: на него попадают обе цепочки. Файлов Google Sans Mashina нет: поля и ячейки тоже рисуются Inter, как на сайте. |
| `font-feature-settings "frac"` | Стоит в каждом тексте Figma, но в CSS не применён: на запасных шрифтах он ломает строки из цифр (ИНН, номера). |
| Обводка | В Figma рамка лежит внутри размера. Где высота не фиксирована (сегменты, тосты, подсказка), отступы в CSS уменьшены на 1px (`calc(… - var(--border-w))`): размеры и положение текста совпадают с Figma. |
| Проверка каталога | `kit.html` отрендерен в 1440 и сверен со скриншотами Figma: геометрия поля (48, рамка 1px, 92 с подписью и hint), кнопки 44, сегментов 38 совпала до пикселя. Шрифты в рендере запасные (Roboto), поэтому ширина текстов отличается. |
| Иконки | 34 файла в `icons/`, скачаны 16.10.2026 по манифесту, цвет `currentColor`. Часть векторов пришла без рамки: сборка центрирует их в рамке 16/20/22/24. Список и пробелы — в разделе 9. |
| Логотип | Основной — `logo/mashina-logo.svg` из Graph/Identity (выбор PO 14.10). Варианты со страницы «Logo» (`mashina-mark`, `mashina-wordmark-dark`, `mashina-pill-blue`, `mashina-pill-white`, `mashina-tile`) — в старом цвете #0f67ff, только по просьбе. |
| Сборка прототипа | `scripts/build.cjs` встраивает `tokens.css` и `components.css`, подставляет иконки `<i data-icon="имя">` и логотип `<i data-logo>`. Классы берутся из `kit.html`. |

## 2. Расхождения с ручными значениями от 14.10

| Что | Ручное значение 14.10 | Figma | Итог |
|---|---|---|---|
| Primary | #0094FF | Buttons/Primary button #0094ff | совпало |
| Hover primary | #0084E6 | Отдельного цвета нет: тот же #0094ff, прозрачность 75% (Pressed 90%) | **расхождение** |
| Secondary | #BFD7FF | Buttons/Secondary button #bfd7ff | совпало |
| Текст | #101114 | Text/Primary text #101114 | совпало |
| Вторичный текст | #5F7696 | Text/Secondary text #505b6b. #5f7696 в Figma — Borders/Input border | **расхождение**: #5f7696 это рамка, не текст |
| Приглушённый текст | #8A9AB0 | Text/Tertiary #8195b2 (плейсхолдер, disabled), Text/GreyLight #7c8a9e, Text/Hint #9b9ca4 | **расхождение**: три близких значения |
| Линии | #E6ECF5 | Divider и рамки: Borders/Default border #94a8c5. #e6ecf5 в Figma — Semantic/GreyBg (фон плашки статуса, трек категорий) | **расхождение** |
| Фон | #F5F7FA | Surface/Primary background #ffffff, Surface/Primary container background #f7f7f8. #F5F7FA в Figma не найден | **не подтверждено**; в `--surface-secondary` записан как ручное значение |
| Кнопки: высота, радиус, отступы | h44, r8, 8/16 | h44, r8, 8/16 | совпало |
| Кнопки: текст | 14/600 | Inter_mashina **Medium 500**, 14 / 1.25 | **расхождение**. SemiBold 14 есть только как Font.label.text.new (поля, Special info) |
| Поле web | h48, r8, 1px #5F7696 | Inputs web: h48, r8, 1px Borders/Input border #5f7696 | совпало. Поле mobile: r12, рамка Borders/Default border #94a8c5 |
| Чипы | h32, r20, рамка 1px primary, выбранный залит primary | то же. Текст Inter Regular 14/20, отступы 8/10 | совпало |
| Бейджи карточки | h24, r4, отступы 4/8, статус r12 | Credit available: отступы 4/8, r4 (высота 24 по тексту). Status: r12, h20 или h22 | совпало |
| Нижняя панель | «Создать»: синий квадрат r8 с плюсом, активная вкладка синяя | Подпись «Продать». Bottom Bar 1–5: плюс — синяя картинка-квадрат. V3.0: синий круг 24 (r20). Активная вкладка: подпись Text/Primary text, в V3.0 ещё плашка Surface/Tertiary container. Синей вкладки нет | **расхождение** |

## 3. Токены

Имена CSS — в `tokens.css`, рядом с каждой переменной стоит имя переменной Figma. Значения даны для `:root` (светлая тема), где нет пометки.

### Текст

| CSS | Figma | Значение | Когда применять |
|---|---|---|---|
| `--text-primary` | Text/Primary text | #101114 | Основной текст, заголовки |
| `--text-secondary` | Text/Secondary text | #505b6b | Подписи полей, параметры в карточке, метки статуса |
| `--text-tertiary` | Text/Tertiary | #8195b2 | Плейсхолдер, неактивная вкладка, текст disabled |
| `--text-hint` | Text/Hint | #9b9ca4 | Подсказка под полем |
| `--text-grey-light` | Text/GreyLight | #7c8a9e | Неактивные подписи нижней панели, рамка чекбокса |
| `--text-negative` | Text/Negative text | #ef4444 | Ошибка, звёздочка обязательного поля |
| `--text-positive` | Text/Positive text | #36b555 | Рассрочка, успех, зелёная кнопка «Создать» |
| `--text-info` | Text/Info text | #0094ff | Акцентный текст, курсор, фон чекбокса, выбранная вкладка |
| `--text-link` | Text/Link | #2d79f5 | Ссылка, иконка баннера |
| `--text-white` | Text/Brand White | #ffffff | Текст на цветном фоне |
| `--text-dark` | Text/Brand Dark | #13151e | Метка в Special info |
| `--fg-primary` | foreground/primary | #101114 | Текст баннера |

Тёмная тема: `--text-primary` #f2f2f2, `--text-secondary` #808080, `--text-tertiary` #e9eaec, `--text-grey-light` #b3b3b3.

### Кнопки, рамки, поля

| CSS | Figma | Значение | Когда применять |
|---|---|---|---|
| `--btn-primary` | Buttons/Primary button | #0094ff | Главная кнопка, выбранный чип и сегмент, текст «Text only» |
| `--btn-secondary` | Buttons/Secondary button | #bfd7ff | Второстепенная кнопка, hover строки списка |
| `--btn-semantic` | Buttons/Semantic button | #fb923c | Оранжевая кнопка, срочно |
| `--btn-disabled` | Buttons/Disabled button | #e8eaed | Фон отключённой кнопки |
| `--btn-secondary-pressed` | Buttons/Secondary button pressed | #ffffff | Белый текст «Text only White» |
| `--border-default` | Borders/Default border | #94a8c5 | Рамка поля mobile, divider, сегменты, пагинация |
| `--border-active` | Borders/Active border | #0094ff | Фокус поля, рамка «Tertiary», подчёркивание вкладки |
| `--border-negative` | Borders/Negative border | #ef4444 | Ошибка поля |
| `--border-input` | Borders/Input border | #5f7696 | Рамка поля web |
| `--border-disabled` | Borders/Disabled border | #e7e7e7 | Рамка отключённой «Tertiary» |
| `--border-high` | border/high | #e7e7e7 | Служебные границы |
| `--input-bg` | Input/Input background | #ffffff | Фон поля |
| `--input-readonly` | Input/Input read only | #f1f2f4 | Поле «только чтение», Spiner |
| `--input-special` | Input/Special input background | #f4f4f5 | Calculator input, Special info |
| `--surface-field-hover` | surface/field/dark-hover | #eeeff1 | Приставка валюты в Multi input |
| `--input-disabled`, `--input-web-bg` | Input/Input disabled, Input/Web: input background | #ffffff | Disabled-поле (ещё прозрачность 50%), поле web |

Тёмная тема: `--btn-primary` #0f67ff, `--btn-secondary` #2d2e2f, `--btn-disabled` #4b525d, `--border-default` #272934, `--border-active` #0f67ff, `--input-bg` #1c1e21.

### Поверхности и семантика

| CSS | Figma | Значение | Когда применять |
|---|---|---|---|
| `--surface-bg` | Surface/Primary background | #ffffff | Фон экрана и окон |
| `--surface-container` | Surface/Primary container background | #f7f7f8 | Карточка раздела, тост, фон фото-заглушки |
| `--surface-tertiary` | Surface/Tertiary container | #ffffff | Метка Verified, активная вкладка V3.0 |
| `--surface-black` | Surface/Black container background | #000000 | Бейдж Filled, кнопки магазинов, нижняя полоса подвала |
| `--surface-greed` | Surface/GreedDark | #e1f5e5 | Плашка «от 61 000 ⃀ в месяц» |
| `--surface-dark-opacity` | Surface/Dark-opacity | #25272980 | Метки поверх фото |
| `--surface-accent` | Surface/Accent container background | #0183e2 | Синяя полоса шапки web, трек «Легковые». Figma: #0183e2 в рендере, #0094ff в get_variable_defs |
| `--surface-secondary` | Surface/Secondary background | #f5f7fa | **Светлое значение не найдено в Figma**; записано ручное значение 14.10. Тёмное: #212a3a. Плитки категорий, капсула V3.0, disabled-ячейка web |
| `--surface-secondary-container` | Surface/Secondary container background | #f5f7fa | То же: светлое не найдено. Фон Select |
| `--semantic-brand` | Semantic/Brand | #0094ff | Активный сегмент прогресса, номер страницы. В секции Alerts Figma отдаёт старый #0f67ff |
| `--semantic-positive`, `--semantic-negative` | Semantic/Positive, Semantic/Negative | #36b555, #ef4444 | Рамки и иконки тостов |
| `--semantic-grey-bg` | Semantic/GreyBg | #e6ecf5 | Метка «Status» Lg, трек категорий, заглушка аватара |
| `--semantic-positive-bg`, `--semantic-negative-bg` | Semantic/Positive alert bg, Semantic/Negative alert bg | #e1f5e5, #fdecec | Фон тостов legacy |
| `--semantic-orange-bg`, `--semantic-info-bg` | Semantic/Orange, Semantic/Info alert bg | #ffe6bd, #e2ecfe | Фон предупреждения и информации |
| `--info-bg-secondary` | Info/background/secondary | #e2ecfe | Notification Banner |

### Продвижение (Special card) и прочее

| CSS | Figma | Значение | Применение |
|---|---|---|---|
| `--card-vip`, `--card-red`, `--card-purple` | Special card/VIP, Red, Purple | #ffa000, #ef4444, #fa5b72 | VIP, «New» и счётчик, «Покраска» |
| `--card-blue`, `--card-violet`, `--card-green` | Special card/Blue, Violet, Green | #2d79f5, #7e22ce, #1fa840 | TOP, «Стикеры», UP |
| `--card-purple-light`, `--card-purple-dark` | Special card/Purple-Light, Purple-Dark | #f363ae, #be185d | PROMO, POST |
| `--card-color` | Special card/Card-color | #5518a5 | Плашка «Premium price» |
| `--toggle-on`, `--toggle-off` | картинка Switchers / Toggle | #0f67ff, #4b525d | Цвет снят с пикселей: в Figma переключатель — SVG, не привязан к переменным |
| `--tooltip-bg`, `--tooltip-bg-alt`, `--tooltip-text`, `--tooltip-border` | Surface/Primary container, Secondary container, Text/Primary text, Borders/Default в тёмном режиме | #181919, #0f0f10, #f2f2f2, #272934 | Tooltip: в Figma чёрная плашка |
| `--opacity-hover`, `--opacity-pressed`, `--opacity-disabled-field` | State=Hover, State=Pressed, State=Disabled | 0.75, 0.9, 0.5 | Hover и Pressed кнопок, ячеек, чипов. Disabled поля |

### Отступы, радиусы, размеры, тени

| CSS | Figma | Значение |
|---|---|---|
| `--sp-2` `--sp-4` `--sp-8` `--sp-10` `--sp-12` `--sp-16` `--sp-20` `--sp-32` | spacingBase/50, 100, 200, 250, 300, 400, 500, 800 | 2, 4, 8, 10, 12, 16, 20, 32 |
| `--sp-6`, `--sp-24`, `--sp-36`, `--sp-0` | 6px (spasingElement/small-x, medium-x), 24px, 36px, spacingBase/0 | 6, 24, 36, 0 |
| `--r-4` `--r-8` `--r-10` `--r-12` `--r-16` `--r-20` | radiusBase/50, 200, 300; radiusInput/medium; radiusBase/500; radiusBase/600 | 4, 8, 10, 12, 16, 20 |
| `--r-6` `--r-9` `--r-18` `--r-full` | 6px, radiusInner/300, число в Segmented, radiusBase/full | 6, 9, 18, 499 (Rounded: 999) |
| `--h-btn`, `--h-btn-m`, `--h-btn-s` | высоты кнопок | 44, 36, 28 |
| `--h-input`, `--h-input-s`, `--h-input-l` | sizeInput/medium, Small, large | 48, 40, 56 |
| `--w-control` | sizeComponents/minimum | 328 |
| `--border-w`, `--border-w-2` | border/primary, border/primary-pressed | 1, 2 |
| `--shadow-bottom-medium` | Shadow/Bottom/Medium | `0 4 8 #515C690D` и `0 0 16 #515C691A` |
| `--shadow-toast` | Toast/Shadow | `0 2 4 #515C690D` и `0 0 8 #515C691A` |
| `--font-primary`, `--font-label` | Inter_mashina, Google Sans Mashina | запасные: Inter, Roboto, system-ui, Arial |

Радиусы по месту: кнопка 8, поле web 8, поле mobile 12, чип 20, тост 12, баннер 8, плитка и карточка раздела 16, Select 10, пагинация 12, чекбокс 4 (рамка 6), Icon-button 10.

## 4. Типографика по ролям

Все стили: `margin:0`, без трекинга. Цвет задаётся отдельно (`.c-primary`, `.c-secondary`, `.c-tertiary`, `.c-hint`, `.c-info`, `.c-negative`, `.c-positive` или переменная).

| Класс | Стиль Figma | Параметры | Где |
|---|---|---|---|
| `.t-display` | Body 2.0/Display 2.0/font.display.medium | Inter Bold 45 / 1.25 | Крупные цифры |
| `.t-h1` | Body 2.0/Title 3.0/font.title.large | Inter Bold 22 / 1.1 | Заголовок экрана (в форме: 22 / 1.5) |
| `.t-h2` | Title20 | Inter SemiBold 20 / 1.25 | Заголовок секции («Новые объявления») |
| `.t-h3` | Title 3.0/font.title.medium | Inter SemiBold 16 / 1.25 | Заголовок карточки раздела |
| `.t-title`, `.t-title-m` | Title 14, Titile16 - medium | SemiBold 14 / 1.25, Medium 16 / 1.25 | Подзаголовки, Spiner |
| `.t-subtitle` | Title 2.0/font.title.small | Inter SemiBold 14 / 1.5 | Заголовок тоста |
| `.t-price` | Label 3.0/font.label.large.semibold | Inter Medium 15 / 1.25 | Цена в карточке |
| `.t-body-l`, `.t-body` | font.body.large, Body 3.0/body14 | Inter Regular 15 / 1.5, 14 / 1.45 | Основной текст |
| `.t-body-13`, `.t-body-12`, `.t-body-s`, `.t-body-xs` | Body 3.0/body, font.body.medium, text.body, font.body.small | Inter Regular 13 / 1.45, 12 / 1.5, 12 / 1.45, 10 / 1.25 | Параметры карточки, тексты тостов, мелкий текст |
| `.t-caption` | Label 2.0/font.label.small | Inter Regular 12 / 16 | Hint, подпись поля |
| `.t-detail`, `.t-small-medium`, `.t-micro`, `.t-micro-8` | label.details, lable.small, lable.small, label.micro | Inter Medium 13, 12, 10, 8 / 1.25 | Подпись нижней панели, счётчики, метки |
| `.t-btn` | Body 2.0/3.1 font.buttons.text | Inter Medium 14 / 1.25 | Кнопки, action-текст шапки |
| `.t-semibold` | Label 3.0/Font.label.text.new | Inter SemiBold 14 / 1.25 | Значение в Special info |
| `.t-label-inter`, `.t-label-inter-14` | Label/font.label.medium, Label 3.0/Label14 | Inter Regular 14 / 20, 14 / 1.4 | Web-поля |
| `.t-label-l` | 3.1 Label/font.label.large | Google Sans Regular 16 / 24 | Ячейки, значения Action input, вкладки |
| `.t-label`, `.t-label-14`, `.t-label-s` | font.label.medium, Label14, 3.1 Body/font.body.medium | Google Sans Regular 14 / 20, 14 / 1.4, 12 / 1.5 | Подписи и значения полей, ссылки |

## 5. Сетка и отступы экрана

### Mobile 390

В Figma экраны 393 («Главная») и 360 (компоненты, формы). В прототипе 390: контент растягивается, ширина 328 из Figma — минимальная.

| Элемент | Значение |
|---|---|
| Поля экрана | 16 слева и справа |
| Шапка | Статус-бар 52 (рисует рантайм) + строка 48: итого 100. Заголовок слева 16, иконки 48x48 справа с отступом 4 |
| Начало контента | Главная: 112 от верха (шапка 100 + 12). Форма: 116 (шапка 100 + 16) |
| Между блоками | Главная: 36 между рядом плиток, меню категорий и карточкой поиска, 24 до секции объявлений, 16 от заголовка секции до списка. Форма: 20 между блоками, 4 внутри блока |
| Карточка объявления | Поля 16, снизу 16, зазор 12. Фото 240x180 в ленте с горизонтальной прокруткой, зазор 1 |
| Нижняя панель | Bottom Bar 1–5: высота 84 (панель 60 + индикатор 24). V3.0: капсула с отступом 12 по бокам и 24 снизу |
| Кнопки в форме | Блок с отступом 16 и зазором 10, кнопки на всю ширину |

### Web 1440

Холст Figma — 1920, контент 1200 по центру (поля шапки и подвала 360). При ширине 1440 поля 120.

| Элемент | Значение |
|---|---|
| Шапка | Три полосы: верхняя (отступы 16 и 8), синяя 62, нижняя 64; всего 189 |
| Меню категорий | Пункты высотой 48, отступы 8/16, зазор 24 |
| Подвал | Верхний отступ 32, зазор 24; колонки: 480, ссылки, 284. Чёрная нижняя полоса с отступом 8 |
| Поля формы | Высота 48, радиус 8, ширина 328 минимум |

Web-сетки каталога, фильтров и страниц в DS нет: см. «Нет в DS».

## 6. Компоненты

Узлы и состояния подробнее в `kit.html` и `figma-map.md`. Hover и Pressed: прозрачность 75% и 90%.

### Кнопки

| Класс | Узел | Варианты и состояния | Размеры | Когда применять |
|---|---|---|---|---|
| `.btn` + `--primary` `--secondary` `--tertiary` `--semantic` `--text` `--text-white` `--nav` | `25:2601`, роли: 332:3363, 332:3365, 332:3367, 632:6022, 332:3369, 4707:7956, 2895:6212 | Default, Hover, Pressed, Disabled; иконка слева или справа (24); `.btn--positive` — зелёная «Создать объявление» | h44, 8/16, r8; `--m` h36; `--s` h28 (Small Button 4186:20541) | Primary — одно главное действие на экране. Secondary — рядом с ним. Tertiary — рамка. Text — ссылочное действие. Semantic — срочность, продвижение |
| `.btn-icon` + `--secondary` `--liner` `--outline` `--semantic` | `1101:7979` | Default 44, Small 36; иконка 24; r10 | 44 или 36 | Кнопка из одной иконки |
| `.link`, `.link--info` | `844:12379`, `1236:3916` | Link, с иконкой; «Смотреть все» | Google Sans 14/20 | Ссылка в тексте и подпись блока |

Не применять: Buttons New (r16, 4072:6975) — старый стиль, в Figma он тёмный. На экране формы Figma кнопки высотой 34, в DS 44: брать 44.

### Поля и ячейки

| Класс | Узел | Варианты | Когда применять |
|---|---|---|---|
| `.field`, `.field__label`, `.field__hint`, `.field__error`, `.field__req`, `.input` | Inputs `14:1512` | Label снаружи; Default, Active, Filled, Error, Disabled, Read only; Lead и Tail иконки 20; Required | Любая форма. Mobile: r12. Для web — `.input--web` (`5180:7649`, r8) |
| `.input.textarea` + `.field__counter` | `1025:7269` | Счётчик «0 / 500» | Длинный текст |
| `.input` + `.input__control` + `.input__icon--24` | Password `456:8846` | Глаз, очистка | Пароль |
| `.input__cluster` | Phone `512:7135`, Currency `585:6157` | Код страны, валюта | Телефон, сумма. Флаг в DS есть, файл не выгружен |
| `.action-input` | `1930:15070` | Подчёркнутая строка: Default, Active, Filled, Error; Lead 28; Hint | Длинные формы данных (паспорт, ФИО) |
| `.cell` | Action cell `806:9852` | Подпись над значением, Lead 28, Hint; Filled, Read only, Error | Строка списка с переходом |
| `.cell--choice` + `.checkbox` `.radio` `.toggle` | `429:5155`, `440:5231`, `440:5270`, `429:3359` | Выбрано и нет | Настройки, согласия, выбор одного из списка |
| `.select`, `.web-cell`, `.web-cell-pair`, `.dropdown` | `1789:8979`, `1216:6583`, `1216:6739`, `1418:7629` | Default, Filled, Active, Disabled; список со строками 56 | Выбор на web, фильтры |
| `.input--special`, `.info-row` | `5035:15648`, `5037:15706` | Calculator input, Special info | Кредитный калькулятор |
| `.filter-field`, `.filter-range`, `.filter-field--addon` | Field Container `4480:13005`, Multi input `4519:13185` | Default, Filled, Active, Disabled; Required; пара «от — до» и приставка валюты. h40, r12, подпись Inter 13/16 | Фильтры web: марка, год, цена. В Figma рамка этого компонента почти чёрная (#272934), в классе `--border-input` |
| `.cell.cell--logo` | Cells with car logos `358:2729` | Selected (шеврон 16), Default. h56, текст Inter 17/24 | Выбор марки. Логотипы марок — растровые слои, не выгружены |

Не применять: Radio V2 (`4354:7086`, цвет #0f67ff): старая версия. Поля Inside (метка внутри) в классе упрощены до `.input__stack` + `.input__mini`.

### Чипы, бейджи, метки

| Класс | Узел | Варианты | Размеры | Когда применять |
|---|---|---|---|---|
| `.chip`, `.chip.is-selected` | `1192:3644` | Default, Selected; с иконкой 22 | h32, 8/10, r20 | Фильтры, выбор категории |
| `.badge`, `.badge--outline` | `453:5406` | Filled, Outline; с иконкой 12 | h16, r499 | Короткая метка |
| `.tag` + `--credit` `--premium` `--basic` `--status` `--status-s` `--prod` `--info` | Card bages `4069:6286` | Verified, Credit available, Premium price, Basic account, Status Lg и Sm, Status-Prod, Info | h14–24, r4 или r12 | Метки карточки объявления |
| `.benefit` + `--vip` `--paint` `--top` `--sticker` `--up` `--promo` `--post` `--urgent` | `469:9751` | Premium, VIP, Plus, Покраска, TOP, Стикеры, UP, PROMO, POST, СРОЧНО | h18, r9 | Платные услуги на карточке. Иконка в круге — слой Product, не выгружена |
| `.counter` | Bottom Bar `4145:26678` | «9+» | 18x18, r12 | Счётчик вкладки |

### Вкладки, сегменты, прогресс

| Класс | Узел | Варианты | Когда применять |
|---|---|---|---|
| `.tabs`, `.tab`, `.tab.is-selected` | Tab / Horizontal `982:8701` | 2–5 вкладок, h48, зазор 16 | Переключение разделов на экране |
| `.segmented` + `--tabs` `--round` | `4982:7208`, `562:2713` | 2–4 сегмента; рамка 1px | Выбор режима (сумма, срок, тип) |
| `.pagination`, `.page`, `.page.is-selected` | `3054:15575` | Active, Default, Navigation, More | Список на web |
| `.progress`, `.progress__seg.is-active` | `841:12252`, `1999:9994` | 2–5 шагов | Шаги заявки |
| `.spinner` | `585:5853` | Level 1–3 (100%, 75%, 50%) | Выбор значения |

### Алерты и подсказки

| Класс | Узел | Варианты | Когда применять |
|---|---|---|---|
| `.toastbar` + `--negative` `--alert` `--attention` | Toastbar legacy `926:6046` | Positive, Negative, Alert, Attention; с заголовком (h75) и без (h52) | Алерт в потоке страницы. **Светлый** |
| `.toast` + `--info` `--positive` `--warning` `--negative` + `--colored` | Notification Toast / 4.0 `5346:7386` | Info, Positive, Warning, Negative; обычный и цветной | Всплывающий тост (данные задаёт `data-toast`) |
| `.banner` | Notification Banner `2291:6785` | Информация | Плашка на странице |
| `.tooltip`, `.tooltip--alt` | Tooltip standart `2635:5745` | Default, Variant2 | Подсказка. В Figma чёрная плашка |

Не применять: Toastbar new (`4319:7842`) и V3 (`4322:6955`) нарисованы тёмными; Toastbar V3 Positive с заголовком — вертикальный блок с иконкой 32 и отступом 16.

### Навигация

| Класс | Узел | Варианты | Когда применять |
|---|---|---|---|
| `.topbar` + `__title` `__btn` `__back` `__action`; `.topbar--back`, `.topbar--detail`, `.topbar--chat` | Topbar `364:4554` | Primary Head, Action text, Listing, Detailed page (`380:3759`: назад + поделиться, избранное, меню), Chat (`2408:10769`: аватар 36, имя Inter Bold 16, «Online»), Balance, Bonus (всего 14 вариантов) | Шапка mobile. Статус-бар рисует рантайм |
| `.tabbar` + `__item` `__plus` `__badge`; `.tabbar--float` | Bottom Bar `483:4893`, V3.0 `4671:7589` | State 1–5; V3.0 — плавающая капсула | Нижняя панель |
| `.web-header`, `.web-nav`, `.web-pill` | Header `1964:9038` | mashina и house; с входом и без | Шапка web. Для 1440 брать как на текущем сайте (`references/site-ui.md`) |
| `.web-footer`, `.store-btn` | Footer `1099:7886` | Один вариант | Подвал web |
| `.cat-tabs`, `.cat-track` | Category menu `4937:8349` | Выбранная категория, полоса 2px | Категории на «Главной» |

### Карточки

| Класс | Узел | Когда применять |
|---|---|---|
| `.card` + `__photos` `__photo` `__tags` `__head` `__prices` `__price` `__credit` `__fav` `__specs` `__title` `__meta` `__dot` | [M] CarCard `4937:8386` | Карточка объявления mobile: цена в сомах и долларах, рассрочка, параметры, город, метки на фото |
| `.tile`, `.tile--wide` | Category `4937:8326`, `4937:8329` | Быстрые разделы («Мой Гараж», «Авторынок») |
| `.section-card` | Section - Search & Categories `4937:8367` | Строка «Марка, Модель» с числом предложений |

## 7. Паттерны экрана «Главная» (mobile, `4937:8322`)

1. Фон `--surface-bg`. Шапка 100: слева логотип mashina.kg (плитка 36 с знаком и надпись), справа две иконки 48x48 («ракета», «поиск»).
2. Ряд плиток: два квадрата 92x92 (r16, отступ 12, подпись 11/1.25, красная метка «New» справа сверху) и два блока 140x42 (r10) друг над другом. Зазор 8.
3. Меню категорий: пункты высотой 36, иконка 22 и текст Inter Medium 14, зазор 24. Выбранный — `--text-primary`, остальные `--text-secondary`. Под ним полоса 2px (`.cat-track`), выбранная часть 19.88%.
4. Карточка поиска `.section-card`: иконка фильтра, заголовок «Марка, Модель» (SemiBold 16), число предложений (14, `--text-grey-light`), стрелка.
5. Заголовок секции `.t-h2` («Новые объявления»), отступ слева 16, до списка 16.
6. Карточки `.card` без разделителей: фото-лента, метки поверх фото (Status Sm), цена и избранное, рассрочка, параметры, город.
7. Плавающая нижняя панель `.tabbar--float`.

Форма «Ручной ввод данных» (`2291:6567`, 360): тост legacy сверху, заголовок `.t-h1` (22/1.5), пояснение (Inter Medium 13/16, цвет foreground/tertiary #717d8e), блок Action input и Action cell с divider, строка согласия (чекбокс 24 и текст 12/1.5), блок с двумя кнопками на всю ширину.

## 8. Нет в DS

Агент собирает это из токенов и помечает `data-ds="НЕТ В DS: …"`.

| Чего нет | Что известно |
|---|---|
| Окно (modal) и нижняя шторка (sheet) | В библиотеке «Design System» есть Profile modal, Modal selector with icon, Modal selector without icon, Modal Action-Cell, Container Action Sheets, Container, (W) Filter, web Close popup, но узлов на странице Components нет. Классы `.modal` и `.sheet` собраны из токенов: поверхность, r16, отступы 16 |
| Состояние загрузки (spinner, кнопка в загрузке), Skeleton | Только Shimmers `4766:8037` в тёмном режиме: градиент 98.5° от rgb(50,61,81) к rgb(33,42,58), r16. `.is-loading` и `.skeleton` — упрощение |
| Фокус (`:focus-visible`) | Не нарисован. В классах: контур 2px `--border-active` |
| Hover и Active у чипа, вкладки, ячейки, ссылки, пагинации, select | Не нарисованы. В классах — прозрачность 75% и 90% по аналогии с кнопками |
| Avatar (группа), Rating, Календарь и выбор даты | Нет в «Design System». Есть только заглушка аватара 24 в шапке (`.avatar`) |
| Карточка объявления web (сетка каталога), фильтры блоком, хлебные крошки, таблицы | Есть только mobile CarCard. Web-карточка, сетка 4 × 288, крошки, шапка и подвал сайта собраны в `templates/partials/` из классов DS по замерам сайта |
| Slider | Нет компонента: есть линия 4px и ползунок 12 внутри Selector `4127:10271` |
| Светлая тема для Tooltip, Header, Footer, Navigation, Toggle, Progress (трек), Shimmers | В Figma только тёмные. Цвет трека прогресса в Figma #272934; в `.progress__seg` светлое значение `--border-default` |
| Светлые значения `Surface/Secondary background`, `Surface/Secondary container background` | Не найдены; записан фон #F5F7FA (ручной замер 14.10) |
| Иконки: телефон, камера, геометка, календарь, звезда, уведомления, редактировать, удалить, загрузить, сетка, список, меню-гамбургер | Не найдены среди иконок, использованных в файле. Свои не рисовать |
| Флаг страны, фото, картинки плиток | Растровые слои Figma, не выгружены. `.input__flag` — заглушка |

## 9. Иконки и логотип

### Статус

34 иконки и 5 логотипов сохранены 16.10.2026 скриптом `tmp/designer-agent/fetch-icons.mjs` по манифесту `tmp/designer-agent/icons-manifest.json` (URL Figma живут около 7 дней). Цвет приведён к `currentColor`: `mono` — все цвета, `solid` — белый остаётся. Для перевыгрузки — `download_assets` или `get_design_context` по узлам из манифеста, порядок — `references/ds-update.md`.

Недостающие иконки (телефон, камера, геометка и др., раздел 8) есть в библиотеке «Icons_Mashina», но её файла в доступе нет. Нужна ссылка на файл библиотеки.

### Иконки из Figma (имя файла → слой)

| Файл | Слой Figma | Для чего |
|---|---|---|
| `search` | search | Поиск |
| `filter` | vuesax/linear/setting-4 | Фильтр, настройки |
| `heart`, `heart-filled` | vuesax/outline/heart, vuesax/bold/heart | Избранное |
| `home`, `chat`, `profile`, `plus` | vuesax/outline/home-2, message-text, frame, add | Нижняя панель |
| `chevron-right` (назад — поворот 180), `chevron-right-bold`, `chevron-down` | vuesax/linear/arrow-right, vuesax/outline/arrow-right, outline/chevron-bottom | Стрелки и шевроны |
| `close`, `clear` | outline/cross, icon (x в круге) | Закрыть, очистить поле |
| `check`, `check-circle` | Group (галочка чекбокса), solid/checked | Галочка |
| `info`, `warning`, `error`, `info-circle` | solid/option-error (три цвета), vuesax/linear/info-circle | Инфо, предупреждение, ошибка |
| `eye`, `eye-off` | visible, Icon | Пароль |
| `share`, `more`, `sort`, `rocket` | share, more, ic:round-sort, launch | Поделиться, меню-три точки, сортировка |
| `car`, `truck`, `moto`, `parts` | Categories (22) | Категории |
| `user`, `mail`, `help`, `favorite-search`, `favorite-add` | outline/user, outline/mail, favorite-search, add-favourite | Шапка web |

Размеры слоёв: 24 (нижняя панель, стрелки), 20 (поля, шапка), 16 (close, chevron-down), 22 (категории). Disabled-кнопки в Figma содержат обёртку 28: в классах 24.

### Логотипы

| Файл | Что | Статус |
|---|---|---|
| `logo/mashina-logo.svg` | Основной логотип из Graph/Identity (выгрузка 14.10), 870x249 | сохранён |
| `mashina-mark` `3992:10407` | Знак: машина | в манифесте |
| `mashina-wordmark-dark` `3992:10413` | Надпись mashina.kg тёмная, для светлого фона (цвет #292a2d) | в манифесте |
| `mashina-pill-blue` `3992:10414` | Белая надпись в синей плашке (#0f67ff) | в манифесте |
| `mashina-pill-white` `3992:10440` | Синяя надпись в белой плашке, для тёмного фона | в манифесте |
| `mashina-tile` `3992:10412` | Синяя плитка 148x148 под знак | в манифесте |

Логотипы auto.ru (`aru_logo_red 1`, `aru_logo_black 1`, `Autoru_v4 1`) не выгружались.
Логотип на странице «Logo» отличается от основного (синий #0f67ff против жёлтого знака и голубого #0094ff в основном): какой использовать в прототипах, решает лид дизайна.

## 10. Расхождения и замечания к Figma-файлу

- Режимы переменных смешаны: в коде Figma `var(--…, #fallback)` часто отдаёт тёмное значение, а рендер светлый (поля Cells). Проверка по пикселям скриншотов подтвердила светлые значения полей: рамка #94a8c5, плейсхолдер #8195b2, текст #101114, активная рамка #0094ff, ошибка #ef4444, read only #f1f2f4.
- Две тёмные палитры: нейтральная (#0f0f10, #181919) в Selectors, Navigation, Buttons-2 и тёмно-синяя (#171819, #212a3a, #1e232c, #303949) на «Главной».
- Старый бренд #0f67ff остаётся в тёмных секциях, в секции Alerts (Semantic/Brand, Text/Info text) и в картинках (Toggle, Chips V2).
- Radio и Checkbox: у выбранного чекбокса r4, у невыбранного рамка r6 и цвет GreyLight. В Cells with choice у невыбранного рамка Borders/Default border.
- Disabled-кнопки с иконкой: обёртка иконки 28, у остальных состояний 24.
- Кнопки на экране формы высотой 34 при высоте компонента 44.
- Navigation role (h36) по умолчанию оранжевая; в шапке mashina переопределена в зелёный Text/Positive text.
- Нижняя панель: подпись «Продать»; рядом в Figma нет «Создать».
- Метки «Placeholder» и тексты в Figma — заглушки, брать тексты из PRD.

## 11. Изменения

| Дата | Что |
|---|---|
| 16.10.2026 | Первая выгрузка: токены, классы, каталог, карта узлов |
| 16.10.2026 | Иконки и логотипы сохранены; шрифт Inter_mashina с сайта; шаблоны шапки, подвала и web-карточки; `kit.built.html` — каталог с иконками |
