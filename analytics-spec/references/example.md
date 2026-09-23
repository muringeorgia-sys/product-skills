# Добавить ивенты для пушей и отчётов по VIN/госномеру

https://jira.mashina.kg/browse/MASHINA-250

## 1. Задача разметки

По каждой рассылке и серии видеть, дошёл ли пуш технически, сколько людей тапнули по нему, дошли до страницы, посмотрели примеры, проверили авто и купили отчёт, и сколько выручки принесла рассылка. Отдельно - популярность каждого отчёта на сайте и в приложении: сколько раз смотрят его пример, как часто он доступен после проверки, сколько раз его покупают.

## 2. Отчёты

Справочник `report_type`. Новый отчёт - новое значение в справочнике, события те же. Отчёт `mashina_history` продаётся на обеих страницах, поэтому метрики отчётов считаются по паре `report_type` + `check_type`.

| report_type | Отчёт | check_type | Цена, сом |
|---|---|---|---|
| `mashina_history` | История объявлений mashina.kg | vin, plate | 300 |
| `carfax` | Карфакс (США и Канада) | vin | 450 |
| `korea_export` | Экспортная декларация (Корея) | vin | 250 |
| `korea_recall` | Отзывные кампании (Корея) | vin | 200 |
| `carcheck_extended` | Расширенный Carcheck | plate | 12 |

## 3. Показатели

| Показатель | Определение |
|---|---|
| Аудитория рассылки | Устройства в push_audience рассылки |
| Попытки отправки | Устройства рассылки со строкой в push_log |
| Принятые пуши | Пуши, которые FCM или APNs приняли к доставке (send_status = accepted) |
| Ошибки отправки | Отказы FCM или APNs, кроме невалидных токенов |
| Невалидные токены | Ответы UNREGISTERED, BadDeviceToken, Unregistered: приложение удалено или токен устарел |
| Тапы | Устройства, на которых тап по пушу открыл приложение |
| Заходы из пуша | Устройства, на которых после тапа открылась страница проверки по VIN или госномеру |
| Показы примеров | Показы примера конкретного отчёта: кнопка «Пример отчёта» или переключение вкладки в окне примеров |
| Проверки | Ввод VIN или госномера, на который пришёл ответ API |
| Проверки с доступным отчётом | Проверки, после которых конкретный отчёт можно купить |
| Начала оплаты | Открытия экрана оплаты отчёта |
| Покупки из пуша | Оплаченные отчёты, если оплату начали после тапа по пушу в той же сессии |
| Покупки отчёта | Оплаченные отчёты конкретного report_type с любого входа |
| Выручка рассылки | Сумма покупок из пуша |

## 4. События

| Событие | Триггер | Платформы | Кто шлёт | Параметры |
|---|---|---|---|---|
| `push_sent` | Строка записана в push_log | ios, android | бэкенд | `push_campaign_id`, `push_id`, `push_language`, `target_path`, `send_status`, `error_code` |
| `push_clicked` | Тап по пушу открыл приложение | ios, android | клиент | `push_campaign_id`, `push_id`, `target_path` |
| `car_check_page_viewed` | Открыта страница проверки по VIN или госномеру | все | клиент | `check_type`, `entry_point`, `push_campaign_id` |
| `report_example_opened` | Показан пример отчёта: тап «Пример отчёта» в карточке или переключение вкладки в окне примеров | все | клиент | `report_type`, `check_type`, `entry_point`, `push_campaign_id` |
| `car_check_submitted` | Пришёл ответ API на введённый VIN или госномер | все | клиент | `check_type`, `check_result`, `reports_available`, `entry_point`, `push_campaign_id` |
| `begin_checkout` | Открыт экран оплаты отчёта | все | клиент | `order_id`, `service_type`, `report_type`, `check_type`, `value`, `currency`, `placement`, `push_campaign_id` |
| `purchase` | Платёжная система подтвердила оплату | все | бэкенд | `order_id`, `transaction_id`, `service_type`, `report_type`, `check_type`, `value`, `currency`, `placement`, `push_campaign_id` |

Общие параметры - по разделу 2.1 «ТЗ разметки аналитики Mashina.kg»: platform, user_id, page_type, app_version. На страницах проверки page_type = reports.

## 5. Параметры

| Параметр | Тип | Обязательный | Значения |
|---|---|---|---|
| `push_campaign_id` | string | на пуш-событиях - да, на остальных - в сессии после тапа по пушу | ID рассылки из админки. Тестовая отправка - ID + _test |
| `push_id` | string | да | UUID, один на пару рассылка + устройство |
| `push_language` | string | да | ru / ky / en - язык, на котором ушёл пуш |
| `target_path` | string | да | путь target_url без домена и параметров: /checkvin. Пустая ссылка - /. Бэкенд и клиент считают одинаково |
| `send_status` | string | да | accepted / invalid_token / error |
| `error_code` | string | при send_status ≠ accepted | код FCM или APNs как есть |
| `entry_point` | string | да | push - с момента тапа по пушу до конца сессии, иначе other |
| `check_type` | string | да | vin / plate. На оплате соответствует service_type: vin - vin_report, plate - plate_report |
| `report_type` | string | да | справочник раздела 2 |
| `check_result` | string | да | found - доступен хотя бы один отчёт / not_found / invalid / error |
| `reports_available` | string | при check_result = found | report_type через запятую: mashina_history,carfax |
| `service_type` | string | да | vin_report / plate_report |
| `placement` | string | да | экран, где начали оплату, по общему справочнику: reports, listing_page |

## 6. Правила

push_campaign_id и push_id приходят в data пуша. После тапа клиент хранит push_campaign_id до конца сессии и передаёт его вместе с entry_point = push на все события этой сессии. Тап по другому пушу в той же сессии заменяет push_campaign_id.

Признак покупки из пуша - заполненный push_campaign_id на purchase. placement пуш не обозначает.

На begin_checkout клиент передаёт push_campaign_id и app_instance_id в API. Бэкенд сохраняет их в заказ и отправляет с purchase.

Допущение: один заказ - один отчёт. Если бэкенд позволяет купить несколько отчётов одним заказом, разметку покупок пересматриваем.

report_example_opened - один раз на report_type за одно открытие окна примеров.

VIN и госномер в аналитику не передаются.

Допущение: сайт шлёт события car_check_page_viewed, report_example_opened, car_check_submitted, begin_checkout так же, как приложение. Параметры пуша на сайте пустые, entry_point = other.

Приложение при каждом запуске передаёт app_instance_id в тот же запрос, что app_language и notifications_enabled (раздел 6 ТЗ админки). Бэкенд пишет его в push_audience.

Бэкенд отправляет каждую строку push_log в Firebase через Measurement Protocol как push_sent, если у устройства есть app_instance_id. У устройств на версиях до релиза app_instance_id нет, поэтому метрики доставки считаются только по push_audience и push_log.

Связка: push_clicked с push_log - по push_id, покупки с получателями пуша - по app_instance_id.

Дедупликация: один push_sent на push_id. Один push_clicked на push_id. purchase - по transaction_id.

В GA4 регистрируются измерения push_campaign_id, target_path, entry_point, send_status, check_type, check_result, report_type. push_id, order_id, reports_available не регистрируются, отчёты по ним - в BigQuery.

## 7. Метрики

Нотация - как в разделе 1 «ТЗ разметки аналитики Mashina.kg». Дополнительно: devices(e) = uniq(app_instance_id, e). Все метрики пуша считаются по устройствам, чтобы тап без входа в аккаунт и покупка после входа считались одним участником.

Рассылка - по каждой рассылке push_campaign_id = C, итог серии - по всем рассылкам с одним series_id из push_campaigns. Воронка от страницы до покупки - для рассылок со ссылкой на /checkvin или /carcheck.

| Метрика | Формула | Зачем |
|---|---|---|
| Охват рассылки | строк push_log / строк push_audience, рассылка C | Пуш ушёл на всю выбранную долю |
| Охват серии | uniq(device_id, push_log where send_status = accepted) / uniq(device_id, push_audience) без устройств, у которых в серии был только invalid_token | Цель серии - все устройства с живым токеном |
| Доля принятых | строк push_log where send_status = accepted / строк push_log, рассылка C | Техническая доставляемость |
| Доля ошибок отправки | строк push_log where send_status = error / строк push_log where send_status ≠ invalid_token, рассылка C | Проверка между рассылками, порог 1% |
| Доля невалидных токенов | строк push_log where send_status = invalid_token / строк push_log, рассылка C | Чистка базы токенов |
| CTR пуша | count(push_clicked where push_campaign_id = C) / строк push_log where send_status = accepted, рассылка C | Интерес к теме |
| Доходимость до страницы | devices(car_check_page_viewed where push_campaign_id = C) / devices(push_clicked where push_campaign_id = C) | Ссылка открывает нужный экран |
| Доля смотревших примеры | devices(report_example_opened where push_campaign_id = C) / devices(car_check_page_viewed where push_campaign_id = C) | Нужны ли примеры на странице |
| Конверсия в проверку | devices(car_check_submitted where push_campaign_id = C) / devices(car_check_page_viewed where push_campaign_id = C) | Страница доводит до ввода VIN |
| Доля проверок с отчётом | count(car_check_submitted where check_result = found and push_campaign_id = C) / count(car_check_submitted where check_result in (found, not_found) and push_campaign_id = C) | Покрытие базы отчётов |
| Конверсия в оплату | devices(purchase where push_campaign_id = C) / devices(begin_checkout where push_campaign_id = C) | Потери на оплате |
| Конверсия пуша в покупку | devices(purchase where push_campaign_id = C) / devices(push_clicked where push_campaign_id = C) | Итог воронки |
| Выручка рассылки | sum(value, purchase where push_campaign_id = C) | Сколько принесла рассылка |
| Доля купивших за 7 дней | устройства с accepted в рассылке C и purchase where service_type in (vin_report, plate_report) в течение 7 дней после sent_at / устройства с accepted в рассылке C | Покупки с любого входа после пуша. Допущение: сравниваем с долей купивших у тех же устройств за 7 дней до sent_at, контрольной группы нет |

Популярность отчётов - по всему трафику, сайт и приложение, по каждой паре report_type = X и check_type = Y. Для рассылки - с фильтром push_campaign_id = C.

| Метрика | Формула | Зачем |
|---|---|---|
| Показы примера | count(report_example_opened where report_type = X and check_type = Y) | Какие отчёты интересны до покупки |
| Доступность отчёта | count(car_check_submitted where X in reports_available and check_type = Y) / count(car_check_submitted where check_type = Y and check_result in (found, not_found)) | Как часто отчёт вообще можно купить |
| Покупки отчёта | count(purchase where report_type = X and check_type = Y) | Популярность отчёта |
| Доля в покупках | count(purchase where report_type = X and check_type = Y) / count(purchase where service_type in (vin_report, plate_report)) | Какие отчёты продают |
| Конверсия доступного отчёта в покупку | Покупки X, перед которыми в той же сессии был car_check_submitted с X в reports_available, / count(car_check_submitted where X in reports_available and check_type = Y) | Берут ли отчёт, когда он есть |
| Выручка отчёта | sum(value, purchase where report_type = X and check_type = Y) | Вклад отчёта в выручку |

Метрики с push_campaigns, push_audience, push_log и reports_available считаются в BigQuery.

Разрезы обязательны по: push_campaign_id, series_id, target_path, push_language, report_type, check_type, entry_point, platform, app_version, is_registered.

## 8. Приёмка

| # | Проверка | Ожидаемый результат |
|---|---|---|
| 1 | Тестовая отправка на /checkvin, тап, DebugView | По порядку пришли push_clicked с push_campaign_id = ID + _test и target_path = /checkvin, затем car_check_page_viewed с check_type = vin, тем же push_campaign_id, entry_point = push, page_type = reports |
| 2 | Тап по пушу при открытом приложении | Следующие события сессии с entry_point = push и push_campaign_id |
| 3 | «Пример отчёта» у каждой из 4 карточек VIN и 2 карточек госномера | На каждый пример - report_example_opened с верными report_type и check_type |
| 4 | Переключение вкладок в окне примеров туда и обратно | По одному report_example_opened на каждый report_type за открытие окна |
| 5 | Проверка VIN, по которому доступно несколько отчётов | car_check_submitted с check_result = found и списком в reports_available, VIN в параметрах нет |
| 6 | Покупка отчёта после тапа по пушу | В begin_checkout и purchase есть report_type, check_type, placement = reports, push_campaign_id |
| 7 | Те же действия на сайте /checkvin и /carcheck | Те же события с platform = web, entry_point = other, без push_campaign_id |
| 8 | Рассылка отправлена | На каждую строку push_log с app_instance_id - push_sent в Firebase с тем же push_id |
| 9 | Метрики рассылки C после тестовой отправки | Тапы с push_campaign_id = ID + _test в метрики C не попали |

## 9. Дашборды

### 9.1 Пуш-рассылки: итог

**Вопрос:** какая рассылка и серия принесли покупки и выручку, какие темы стоит повторять.
**Для кого:** продакт и маркетинг, после каждой рассылки и раз в неделю.
**Источник и фильтры:** BigQuery в Redash; фильтры - период, series_id, push_campaign_id, platform; тестовые рассылки (_test) исключены; сравнение с предыдущей рассылкой серии.

| # | Отчёт | Метрики | Вид | Разрез |
|---|---|---|---|---|
| 1 | Итог рассылки | Охват рассылки, CTR пуша, Конверсия пуша в покупку, Выручка рассылки | KPI-плитка | push_campaign_id |
| 2 | Сравнение рассылок | Охват рассылки, CTR пуша, Конверсия пуша в покупку, Выручка рассылки, Доля купивших за 7 дней | таблица | push_campaign_id, series_id, target_path, push_language |
| 3 | Выручка по рассылкам | Выручка рассылки | столбцы | push_campaign_id |
| 4 | Отложенный эффект | Доля купивших за 7 дней | столбцы | push_campaign_id, is_registered |
| 5 | Итог серии | Охват серии, Выручка рассылки (сумма по серии) | KPI-плитка | series_id |

### 9.2 Пуш-рассылки: воронка

**Вопрос:** на каком шаге от тапа до покупки теряются люди из пуша.
**Для кого:** продакт, после каждой рассылки.
**Источник и фильтры:** BigQuery в Redash; фильтры - push_campaign_id, platform, app_version; только рассылки с target_path /checkvin или /carcheck.

| # | Отчёт | Метрики | Вид | Разрез |
|---|---|---|---|---|
| 1 | Воронка из пуша | CTR пуша, Доходимость до страницы, Доля смотревших примеры, Конверсия в проверку, Конверсия в оплату, Конверсия пуша в покупку | воронка | push_campaign_id |
| 2 | Воронка по платформам | Доходимость до страницы, Конверсия в проверку, Конверсия в оплату | столбцы | platform, app_version |
| 3 | Покрытие базы отчётов | Доля проверок с отчётом | KPI-плитка | check_type |
| 4 | Воронка по языку пуша | CTR пуша, Конверсия пуша в покупку | столбцы | push_language |

### 9.3 Популярность отчётов

**Вопрос:** какие отчёты смотрят, могут купить и покупают, куда развивать справочник отчётов.
**Для кого:** продакт и CEO, раз в неделю.
**Источник и фильтры:** GA4 и BigQuery (метрики с reports_available); фильтры - период, platform, entry_point, push_campaign_id; сравнение с прошлой неделей.

| # | Отчёт | Метрики | Вид | Разрез |
|---|---|---|---|---|
| 1 | Выручка отчётов | Выручка отчёта, Покупки отчёта | KPI-плитка | report_type |
| 2 | Сводка по отчётам | Показы примера, Доступность отчёта, Конверсия доступного отчёта в покупку, Покупки отчёта, Выручка отчёта | таблица | report_type, check_type |
| 3 | Структура покупок | Доля в покупках | stacked-столбцы по неделям | report_type, check_type |
| 4 | Покупки по дням | Покупки отчёта | линия по дням | report_type, platform |
| 5 | Интерес до покупки | Показы примера | столбцы | report_type, entry_point |

### 9.4 Техническое качество рассылок

**Вопрос:** доходят ли пуши и нужна ли чистка токенов перед следующей рассылкой.
**Для кого:** продакт и бэкенд, перед каждой рассылкой.
**Источник и фильтры:** BigQuery (push_audience, push_log) в Redash; фильтры - push_campaign_id, platform; порог ошибок 1%.

| # | Отчёт | Метрики | Вид | Разрез |
|---|---|---|---|---|
| 1 | Доставка рассылки | Охват рассылки, Доля принятых, Доля ошибок отправки, Доля невалидных токенов | KPI-плитка | push_campaign_id |
| 2 | Ошибки по рассылкам | Доля ошибок отправки, Доля невалидных токенов | линия по рассылкам, линия порога 1% | push_campaign_id, platform |
| 3 | Коды ошибок | Ошибки отправки (count по error_code) | таблица | error_code, platform |
