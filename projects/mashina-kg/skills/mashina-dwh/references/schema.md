# Схема DWH — снято с базы 11.11.2026

Снимок объявлений: 2026-11-11 01:00 UTC. Витрины пересчитаны 2026-11-11 10:48 UTC. Курс USD (seed) до 2026-11-10.

## Таблицы

| Таблица | Строк | Зерно |
|---|---:|---|
| marts.mart_market_segmentation | 112 892 | период × класс × гео-срез |
| marts.mart_market_trends | 16 693 | год × уровень (market / class / model) |
| marts.mart_residual_value_calendar | 27 322 | год × марка/модель/поколение/двигатель |
| marts.mart_residual_value_rolling | 14 815 | окно 12/24/36 × марка/модель/поколение/двигатель |
| marts.mart_residual_value | 2 424 | старый прототип, не использовать в отчёте |
| staging.int_vehicle_listings | 3 558 295 | одно объявление (`source_record_key`) |
| staging.int_vehicle_groups | 3 558 295 | объявление → `vehicle_key` |
| staging.int_vehicle_period_prices | 6 457 186 | машина × месяц и отдельно машина × год |
| staging.seed_fx_usd_rates | 308 | курс KGS за USD |
| staging.stg_* | view | сырьё после нормализации |

## Значения справочных полей

| Поле | Значения |
|---|---|
| `vehicle_class` | A, B, C, D, E, F<br>SUV B–SUV F<br>MPV, Pickup, электро<br>Не классифицировано<br>Всего (только в segmentation) |
| segmentation `period_type` | year, month (годы 2019–2026) |
| segmentation `location_scope` | all, source_region, source_city |
| trends `summary_level` | market, class, model |
| RV `requested_window_months` | rolling: 12, 24, 36 |
| RV `powertrain` | ДВС, гибрид, электро, NULL |
| RV `class_status` | single_assigned_class<br>conflicting_assigned_classes<br>unclassified |
| RV `class_assignment_quality` | single_observed_class<br>sole_known_class_with_unclassified_members<br>conflicting_known_classes<br>no_known_class |
| RV `status_age_N` | eligible, no_used_sample, thin_used_sample<br>no_new_baseline, thin_new_baseline<br>review_ratio_above_100 |
| `*_sample_status` | sufficient_sample (30+)<br>directional (11–29)<br>insufficient_sample<br>no_usable_prices (segmentation) |
| `report_minimum_sample_n` | 11 |
| `classification_method` | electric_override, brief_model_draft<br>body_engine_fallback, body_fallback<br>unclassified |
| `classification_exclusion_reason` | missing_body_and_model_mapping<br>missing_or_invalid_engine_volume<br>unsupported_body_without_model_mapping |
| `classification_rule_version` | brief_draft_v2_body_coverage |
| `price_exclusion_reason` | before_reporting_start<br>missing_canonical_make_or_model<br>missing_or_invalid_manufacture_year<br>manufacture_year_after_publication<br>vehicle_age_above_30<br>source_specification_conflict<br>missing_usd_price<br>usd_price_outside_range |
| `source_system` | legacy_mysql (до 12.05.2026), postgres |

## Покрытие RV rolling на 11.11.2026

Окна заканчиваются 2026-10-01 (не включительно).

| Окно | Строк | Есть RV хотя бы по 1 возрасту | Все 4 возраста | Из «хотя бы 1» без класса |
|---|---:|---:|---:|---:|
| 12 мес | 4 365 | 213 | 8 | 17 |
| 24 мес | 4 978 | 304 | 16 | 27 |
| 36 мес | 5 472 | 411 | 33 | 47 |

Конфликты классов в окне 36 мес: 381 группа всего, из них 47 с RV хотя бы по одному возрасту. Цифра 54 из хэндоффа — из более ранней выгрузки, не текущая.

Неклассифицированные машины в segmentation (all, year): 0,1% в 2019–2025, 0,3% в 2026. Классы почти полностью проставлены. Способ (2025, машин 467 014, `int_vehicle_period_prices` year): черновой справочник `brief_model_draft` 72,6%, `body_engine_fallback` 21,7%, `body_fallback` 2,7%, `electric_override` 2,9%, `unclassified` 0,1% (поправка 11.11). Справочник не утверждён. Примеры: ВАЗ 2107 → C, Audi A3 IV → B.

## Ключевые поля

### mart_residual_value_rolling / _calendar
- Окно: `report_start`, `report_end_exclusive`, `requested_window_months`, `is_partial_period`
- Модель: `make`, `model`, `generation_key`, `powertrain`
- Класс: `vehicle_class`, `class_status`, `observed_sample_classes`, `observed_known_classes`, `has_unclassified_sample_members`, `class_assignment_quality`
- Новая: `new_price_usd` (с порогом), `raw_new_price_usd` (без), `new_n`, `new_sample_status`
- Возраст N ∈ {1,2,3,5}: `price_age_N_usd`, `raw_price_age_N_usd`, `n_age_N`, `rv_age_N_pct`, `status_age_N`, `rv_sample_status_age_N`
- Допуск: `report_eligible_any_age`, `report_eligible_all_ages`
- Аудит: `selected_vehicles`, `rv_eligible_vehicles`, `rv_excluded_vehicles`, `exclusion_reason_counts` (Map)

### mart_market_segmentation
- `vehicles_published`, `listing_publications`, `class_share_within_location_pct`
- Цена: `price_sample_n`, `median_asking_price_usd`, `price_sample_status`
- Возраст и пробег: `age_sample_n`, `mean_vehicle_age_years`, `mileage_sample_n`, `median_mileage_km`
- Двигатель: `electric_share_pct`, `hybrid_share_pct`, `unknown_powertrain_n`
- Качество класса: `draft_model_mapping_n`, `fallback_classification_n`, `unclassified_n`
- Гео: `region_raw`, `city_raw` (не гармонизированы)
- Пусто намеренно: `active_inventory_vehicle_count`, `sold_*`, `median_exposure_days`, `dealer_share_pct` + поля `*_status`

### mart_market_trends
- `publication_year`, `summary_level`, `vehicle_class`, `make`, `model`
- `vehicles_published`, `share_of_market_pct`, `share_of_class_pct`, `listed_model_rank_in_class`
- `median_asking_price_usd`, `price_sample_n`, `mean_vehicle_age_years`
- Доли кузовов (`suv_body_share_pct` и др.) и двигателей — пересекаются, не суммировать
- `is_current_calendar_year`

### int_vehicle_period_prices (аудит)
- `vehicle_key`, `period_type`, `period_start`, `representative_source_record_key`
- Спека: `make`, `model`, `generation_key`, `manufacture_year`, `vehicle_age_years`, `body`, `fuel`, `engine_volume`, `powertrain`, `mileage_km`, `is_new_reported`, `condition_raw`
- Класс: `vehicle_class`, `classification_method`, `classification_exclusion_reason`
- Цена: `price_original`, `currency_original`, `stored_price_usd`, `analysis_price_usd`, `price_eligible`, `price_exclusion_reason`, `price_fx_date`

## Журнал изменений
- 11.11.2026 — первая версия, схема снята запросами к system.columns.
- 11.11.2026 — доли способов классификации пересчитаны: основной — черновой справочник (72,6%), а не «кузов + объём». Гео (`source_region`/`source_city`) разбито по `location_source_system`: счётчики двух баз складываются, медианы — нет. В `mart_market_trends` model-уровень покрывает все модели: сумма по марке = объём марки.


## Изменения 12.11.2026
- RV-витрины calendar / rolling — длинный формат: когорта × год наблюдения; поля `rv_pct`, `new_price_usd` (историческая база), `used_price_usd`, `baseline_year`, `baseline_alignment`, `rv_status`, `report_has_prices`. Строк: calendar 89 041 (2019–2026), rolling 101 437 (12/24/36).
- Политика `historical_cohort_n1_allow_above100_v1`: n ≥ 1, RV > 100% видно.
- Склеены копии объявлений между базами (191 272 пары): за 2025 — 386 850 машин (было 467 014).
- Классы: `brief_draft_v3_model_generation_54` (временные маппинги).
- В staging у `int_vehicle_period_prices` нет города/региона: брать из `int_vehicle_listings` по `representative_source_record_key = source_record_key`. Метки регионов в обеих базах одинаковые (Чуйская область, Бишкек…), есть страны (Китай, Южная Корея, США).
- Вывод MCP больше ~9 МБ рвёт соединение: выгружать частями ≤ 25 тыс. строк RV.

## Изменения 13.11.2026
- Витрины пересчитаны 13.11 12:50 (Бишкек). Строк: calendar 89 066, rolling 101 434, segmentation 110 722, trends 16 619; staging listings 3 368 940, period_prices 6 124 975.
- Витрины доступны в Redash: источник 21 `CH_Sultanbek` (без VPN и туннеля). Дашборд 97, скрипт `03_scripts/stable/redash_b2b_dashboard`.
- Средний возраст в витринах считается по машинам 0–30 лет (staging: `vehicle_age_years between 0 and 30` даёт те же числа).
- Ключ когорты RV по названиям (make, model, generation_key, powertrain, manufacture_year, observation_year) не уникален: 79 лишних строк в calendar, 55 в окне 12 мес — у модели два `make_id` / `model_id`.
- `calculated_at` и `latest_listing_snapshot_at` — DateTime64 UTC; для Бишкека `toTimeZone(..., 'Asia/Bishkek')`.

## Изменения 14–16.11.2026
- Расчёт витрин воспроизводится из staging точно (скрипт `03_scripts/stable/redash_b2b_dashboard/verify.js`): RV окон 12/24/36 — 100% ячеек, структура по классам — 100%. Правила отбора — `sqls.js` (SPEC, USED, NEW). Пробег в структуре: `mileage_km between 0 and 800000 and not (mileage_km = 0 and vehicle_age_years > 2)`. Класс когорты RV — единственный известный класс среди машин б/у и базовой выборки «новая».
- `int_vehicle_listings.deactivate_reason_label_raw`: старая база — `sold_on_mashina`, `sold_elsewhere`, `withdrawn`; новая — «Продано на Mashina.kg», «Продано в другом месте», «Передумал продавать», «В архив». Массово отметки «продано» в новой базе — с 05.2026.
- `deactivated_at_raw`: в старой базе равна `created_at` (срок экспозиции не посчитать), в новой пустая.
- `dealer_ref_raw` (id автосалона) заполнен только у объявлений новой базы с 12.05.2026 (≈ 10–25% в месяц); у перенесённых из старой базы пусто.
- Машины под заказ: `region` — страна (Китай, Южная Корея, США, Россия…), не область КР. В 2025 ≈ 29,8 тыс. из 386,8 тыс. машин.
- Автофинансирование ↔ объявление: ds 12 `credit_core_db`, лог `application_created` (`application_logs.application_id` = `applications.application_id`, uuid), `(event_data->>'request')::json->'car_data'->>'id'` = `listing_id`. Выдача — первый лог `status = given` (`application_logs.application_id` = `applications.id::text`). С 12.05.2026: 1 626 объявлений; лог содержит персональные поля — выбирать только id.
