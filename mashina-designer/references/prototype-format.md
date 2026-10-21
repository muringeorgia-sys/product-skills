# Формат исходника прототипа

Агент пишет исходник `web.src.html` или `mobile.src.html`. Сборщик `scripts/build.cjs` делает из него один HTML-файл без внешних ссылок: встраивает DS, иконки, логотип, рантайм. Готовый файл открывается с диска, в браузере телефона и во вложении Confluence.

Механика (экраны, переходы, окна, состояния) задаётся атрибутами `data-*`. Свой JS нужен только для логики фичи: расчёты, фильтрация, генерация данных.

## Скелет исходника

```html
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Кредиты · Web</title>
<script type="application/json" id="proto-config">
{
  "feature": "Подстраница «Кредиты»",
  "platform": "web",
  "start": "credit",
  "other": "Подстраница-Кредиты.mobile.prototype.html",
  "states": {
    "auth": {"label": "Вход", "values": {"guest": "Гость", "user": "С входом"}, "default": "guest"}
  },
  "initial": {"tab": "calc"},
  "data": {"cars": [{"title": "Toyota Camry 70", "year": 2019, "price": 23500}]}
}
</script>
<style>
/* стили фичи: только var(--…) из tokens.css, без сырых цветов */
</style>
</head>
<body>
<section data-screen="credit" data-title="Кредиты">
  <!-- @include web-header -->
  …
  <!-- @include web-footer -->
</section>
<div data-modal="apply" data-over="credit">…</div>
<script>
/* логика фичи */
</script>
</body>
</html>
```

## proto-config

| Поле | Что задаёт |
|---|---|
| `feature` | Название фичи на панели прототипа |
| `platform` | `web` (1440) или `mobile` (390) |
| `mobileKind` | Для mobile: `mweb` — мобильный сайт,<br>`app` — приложение (рисуется статус-бар) |
| `start` | id первого экрана |
| `other` | Имя файла второй платформы:<br>ссылка «Mobile →» или «Web →» |
| `states` | Переключатели на панели: роль, вход,<br>данные, ошибка сети. `default` обязателен |
| `initial` | Внутренние состояния без переключателя:<br>вкладка, шаг, раскрытый блок |
| `data` | Массивы для `<template data-each>` |
| `usdBefore` | Где знак доллара. По умолчанию как на сайте:<br>web и mweb `23 500 $`, приложение `$23 500` |
| `themes` | `true` — переключатель светлой и тёмной темы DS |
| `fonts` | `false` — не встраивать шрифт сайта<br>(файл легче на 280 КБ, шрифт системный) |

Все ключи из `data-if` и `data-set` объявляются в `states` или `initial`. Иначе проверка пишет предупреждение. Исключение — `auth`: шаблоны шапки опираются на него, и если фича его не объявила, прототип показывает гостя.

## Экраны

- Экран — `<section data-screen="id" data-title="Название">`. id латиницей, kebab-case.
- `data-note="…"` на экране — заметка к экрану в панели «Заметки».
- `data-screen-event="name"` — событие аналитики при показе экрана.
- `data-shot-states="auth=user"` — в каком состоянии снимать экран для PNG.

Mobile: экран из трёх зон. Шапка и нижняя панель не скроллятся, тело скроллится:

```html
<section data-screen="list" data-title="Выдача">
  <div class="scr-top"><!-- @include mobile-header --></div>
  <div class="scr-body">…</div>
  <div class="scr-bottom"><!-- @include mobile-tabbar active="search" --></div>
</section>
```

Без этих зон скроллится весь экран.

## Переходы и действия

Атрибуты работают на любом элементе. Порядок выполнения: проверка формы → задержка → событие → состояние → закрыть → открыть → перейти → назад → тост.

| Атрибут | Действие |
|---|---|
| `data-go="id"` | Перейти на экран |
| `data-back` | Назад: закрыть окно или вернуться на экран |
| `data-open="id"` | Открыть окно, шторку, панель, меню |
| `data-close` | Закрыть верхнее окно.<br>`data-close="id"` — конкретное |
| `data-toast="Текст"` | Показать тост DS |
| `data-toast-kind="success"` | Вариант тоста, если есть в DS |
| `data-set="key:value"` | Записать состояние. Можно несколько<br>через пробел: `data-set="tab:docs step:2"` |
| `data-toggle="key"` | Переключить флаг true/false |
| `data-toggle-class="is-selected"` | Переключить класс на себе<br>или на `data-target="селектор"` |
| `data-submit` | Сначала проверить обязательные поля формы |
| `data-loading="800"` | Показать `.is-loading` N мс, потом действие |
| `data-stub="Текст"` | Переход вне прототипа: служебный тост |
| `data-event="name"` | Событие аналитики в журнал |
| `data-event-params='{"k":"v","price":"$price"}'` | Параметры события.<br>`$ключ` подставляет значение состояния |

Элементы с `data-set` и `data-toggle` получают `.is-selected`, когда состояние совпадает. Так делаются вкладки, сегменты, чипы, избранное.

Ссылка `<a href>` без `data-*` в прототипе не работает: показывается тост «Этот переход не входит в прототип». Ссылка на другую платформу — `data-allow-link`.

## Условия показа

`data-if` скрывает элемент, если условие ложно. Условия через пробел — это «и».

| Запись | Смысл |
|---|---|
| `auth:user` | auth = user |
| `auth:guest\|user` | auth = guest или user |
| `auth!:user` | auth ≠ user |
| `potential` / `!potential` | Значение есть / пусто, false, 0 |
| `sum>=250000` | Числовое сравнение: `>`, `<`, `>=`, `<=` |

Пример: `<div data-if="auth:user sum>=250000">`.

## Окна

Элемент верхнего уровня `<body>` с одним атрибутом:

| Атрибут | Что это | Где |
|---|---|---|
| `data-modal="id"` | Окно по центру с затемнением | web, mobile |
| `data-sheet="id"` | Шторка снизу | mobile; на web — до 560 px |
| `data-drawer="id"` | Панель справа во всю высоту | web: фильтры, корзина |
| `data-popover="id"` | Меню под кнопкой, без затемнения | web, mobile |

- Внутри — компонент DS (`.modal`, `.sheet` и др. по `design-system.md`). Позицию, затемнение и анимацию даёт рантайм.
- `data-over="id"` — над каким экраном снимать окно для PNG. `data-shot-states` — в каком состоянии.
- `data-open-event="name"` на содержимом — событие при открытии.
- Esc и клик по затемнению закрывают окно.

## Формы

```html
<form data-form>
  <div class="field" data-field>
    <input class="input" required inputmode="tel" pattern="\+996 \d{3} \d{3} \d{3}" placeholder="+996 ___ ___ ___">
    <p class="field__error" data-error hidden>Укажите номер телефона</p>
  </div>
  <button class="btn btn--primary" data-submit data-loading="800" data-go="done">Отправить</button>
</form>
```

- `data-submit` проверяет `required` и `pattern`. Ошибка — `.is-error` на поле и на `[data-field]`, показ `[data-error]`.
- Формы никогда не отправляются по-настоящему, Enter тоже обрабатывается рантаймом.

## Привязка полей и вывод значений

- `data-model="key"` на `input`, `select`, `textarea`, `range`, `checkbox`, `radio` пишет значение в состояние при вводе.
- `data-mask="num"` — число с пробелами: «1 500 000».
- `data-text="key" data-format="som"` выводит значение. Форматы, как на сайте:

| Формат | Вывод |
|---|---|
| `num` | `1 250 000` |
| `som` | `1 250 000 ⃀` — знак сома после числа |
| `usd` | `23 500 $`; в приложении `$23 500` |
| `pct` | `15 %` |
| `raw` | Как есть |

Расчёт делается в скрипте фичи:

```js
Proto.on('state', s => {
  const monthly = calcMonthly(s.price, s.down, s.term);
  Proto.patch({ monthly }, { silent: true });
});
```

## Повторяемые элементы

```html
<div class="grid">
  <template data-each="cars">
    <article class="card" data-go="ad" data-event="card_click" data-event-params='{"pos":"{{@index}}"}'>
      <div class="ph card__photo"><i data-icon="camera"></i></div>
      <h3 class="card__title">{{title}}, {{year}}</h3>
      <p class="card__price">{{price|usd}}</p>
      <span class="badge" data-item-if="vip">VIP</span>
    </article>
  </template>
</div>
```

- `{{поле}}`, `{{поле|формат}}`, `{{@index}}`. Данные — `data` в proto-config или `Proto.data.cars = […]` в скрипте фичи до загрузки.
- `data-item-if="поле"` / `"!поле"` удаляет элемент у карточки без значения.
- После изменения данных в скрипте — `Proto.render('cars')`.

## Иконки, логотип, фото

- Иконка: `<i data-icon="search"></i>`. Размер — классы `ic--16`, `ic--20`, `ic--32`; по умолчанию 24. Цвет — `color`.
- Иконки DS (34): `car`, `chat`, `check`, `check-circle`, `chevron-down`, `chevron-right`, `chevron-right-bold`, `clear`, `close`, `error`, `eye`, `eye-off`, `favorite-add`, `favorite-search`, `filter`, `heart`, `heart-filled`, `help`, `home`, `info`, `info-circle`, `mail`, `more`, `moto`, `parts`, `plus`, `profile`, `rocket`, `search`, `share`, `sort`, `truck`, `user`, `warning`.
  - «Назад» — `chevron-right` с поворотом на 180°: в `.topbar__back` это уже сделано.
  - В DS нет: телефон, камера, геометка, календарь, звезда, уведомления, редактировать, удалить, загрузить, сетка, список, меню, луна (тема), глобус (язык). Свои не рисуй. Обходись текстом или ближайшей иконкой из списка и помечай `data-ds="НЕТ В DS: иконка …"`.
- Логотип: `<i data-logo></i>` — основной (`mashina-logo`, жёлтый знак и голубая надпись). Варианты из `design-system/logo/`: `mashina-mark`, `mashina-wordmark-dark`, `mashina-pill-blue`, `mashina-pill-white`, `mashina-tile`. Высота — через `style="height:32px"` или класс.
- Фото объявлений — заглушка `.ph` с иконкой `car`. Настоящие картинки — только переданные PM: файл рядом с исходником, `<img src="photo.jpg">` встраивается при сборке.
- Шрифт сайта Inter_mashina встраивается сам: тексты выглядят как на mashina.kg и без интернета.

## Шаблоны шапки, подвала, панелей

`<!-- @include имя параметр="значение" -->` вставляет `templates/partials/имя.html`. В шаблоне `{{@параметр}}` заменяется значением. Структура шаблонов — как на mashina.kg 16.10.2026, оформление — DS.

| Шаблон | Где | Параметры |
|---|---|---|
| `web-header` | Web: шапка, вторая строка — категории | `active` = `passenger`, `commercial`, `moto`,<br>`services`, `parts`; `nav="0"` — без категорий |
| `web-footer` | Web: подвал | — |
| `mobile-header` | Mobile web: логотип, поиск, «Войти» | — |
| `mobile-topbar` | Mobile: «назад» и заголовок | `title` |
| `mobile-footer` | Mobile web: подвал | — |
| `app-tabbar` | Приложение: нижняя панель | `active` = `home`, `favorites`, `sell`,<br>`chat`, `profile` |

Готовые классы раскладки из `templates/partials/partials.css`:
- `site-main` — контейнер страницы web 1200 по центру;
- `site-crumbs` — хлебные крошки;
- `site-grid` и `card site-card` — сетка 4 × 288 и web-карточка объявления (в DS её нет, собрана из классов mobile CarCard по замерам сайта);
- `mweb-list` — лента карточек на mobile web.

Разметка карточки — в `templates/web.src.html`.

Выбор пункта без JS: контейнер `data-selected="значение"`, пункты `data-value="…"` — совпавший получает `.is-selected`. Так работают категории шапки и нижняя панель.

## Пометки для ревью и разработки

- `data-ds="Buttons / Primary / L"` — какой компонент DS. В режиме «Спека» видна подпись поверх элемента.
- `data-note="Блок скрыт, если сумма < 250 000 сом"` — правило поведения: номер на экране и текст в панели «Заметки».
- Новый элемент, которого нет в DS, помечается `data-ds="НЕТ В DS: …"`.

## API для скрипта фичи

| Вызов | Что делает |
|---|---|
| `Proto.go(id)`, `Proto.back()` | Переходы |
| `Proto.open(id)`, `Proto.close(id?)`, `Proto.closeAll()` | Окна |
| `Proto.toast(text, {kind})` | Тост |
| `Proto.set(k, v)`, `Proto.patch({…}, {silent})`, `Proto.get(k)`, `Proto.state` | Состояние |
| `Proto.on('state' \| 'screen' \| 'open' \| 'close' \| 'event' \| 'ready', fn)` | Подписка |
| `Proto.track(name, params)` | Событие аналитики в журнал |
| `Proto.fmt.num / som / usd / pct` | Форматирование чисел |
| `Proto.data`, `Proto.render(key)` | Данные для `<template data-each>` |

Скрипт фичи выполняется до запуска рантайма: подписки через `Proto.on` срабатывают уже на первом показе.

## Сборка и проверка

```bash
node ~/.claude/skills/mashina-designer/scripts/build.cjs <исходник.src.html> --out <Фича>.web.prototype.html
node ~/.claude/skills/mashina-designer/scripts/shoot.cjs <Фича>.web.prototype.html <папка снимков>
```

Обе команды — из корня проекта: playwright берётся из его `node_modules`.

Сборщик сообщает:
- ОШИБКА — переход или окно не найдены, нет иконки, lorem ipsum, неверный JSON;
- ВНИМАНИЕ — классы без стилей, сырые цвета, неизвестные `var(--…)`, внешние ресурсы;
- ИНФО — свои классы фичи вне DS: их показывают лиду дизайна.

Снимки: PNG каждого экрана (mobile — во всю длину и первый экран 390×844), каждого окна и `report.json` с ошибками JS и разметки.

## Режимы готового файла

- Панель сверху: экраны, переключатели состояний, «Клики» (подсветка кликабельных зон), «Спека», «Панель» (экраны, заметки, события), ссылка на вторую платформу, «Сброс».
- Клик по пустому месту на полсекунды подсвечивает кликабельные зоны.
- Адрес хранит экран и состояние: `#/credit?auth=user` — такой ссылкой можно поделиться.
- Mobile на компьютере показывается в рамке 390×844. На телефоне — во весь экран, панель за кнопкой ☰.
