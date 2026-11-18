# Готовые запросы

Протокол теста — [tests-2026-11-11.md](tests-2026-11-11.md).

Проверены на базе 11.11.2026. Параметры — через `{name:Type}` в `run_query`.

## 1. Свежесть данных

```sql
SELECT max(latest_listing_snapshot_at) AS snapshot, max(calculated_at) AS calculated
FROM marts.mart_residual_value_rolling
```

## 2. RV за 36 мес — строки с ценой новой и хотя бы одним возрастом n ≥ 11

```sql
SELECT make, model, generation_key, powertrain, vehicle_class, class_status,
       new_price_usd, new_n,
       price_age_1_usd, n_age_1, rv_age_1_pct, status_age_1,
       price_age_2_usd, n_age_2, rv_age_2_pct, status_age_2,
       price_age_3_usd, n_age_3, rv_age_3_pct, status_age_3,
       price_age_5_usd, n_age_5, rv_age_5_pct, status_age_5
FROM marts.mart_residual_value_rolling
WHERE requested_window_months = {w:UInt16}
  AND new_price_usd IS NOT NULL
  AND (n_age_1 > 10 OR n_age_2 > 10 OR n_age_3 > 10 OR n_age_5 > 10)
ORDER BY make, model, generation_key, powertrain
```

## 3. RV одной модели

```sql
SELECT requested_window_months, generation_key, powertrain, vehicle_class,
       new_price_usd, new_n, rv_age_1_pct, n_age_1, rv_age_2_pct, n_age_2,
       rv_age_3_pct, n_age_3, rv_age_5_pct, n_age_5
FROM marts.mart_residual_value_rolling
WHERE make = {make:String} AND model = {model:String}
  AND new_n + n_age_1 + n_age_2 + n_age_3 + n_age_5 > 0
ORDER BY requested_window_months, generation_key
```

## 4. Конфликты классов RV (сколько и какие)

```sql
SELECT make, model, generation_key, powertrain, observed_known_classes, report_eligible_any_age
FROM marts.mart_residual_value_rolling
WHERE requested_window_months = 36 AND class_status = 'conflicting_assigned_classes'
ORDER BY report_eligible_any_age DESC, make, model
```

## 5. Разбор конфликта: из чего состоит группа

```sql
SELECT vehicle_class, classification_method, body, engine_volume, count() AS vehicles
FROM staging.int_vehicle_period_prices
WHERE period_type = 'month'
  AND make = {make:String} AND model = {model:String}
  AND generation_key = {gen:String}
  AND representative_publication_date >= toDate('2023-10-01')
  AND representative_publication_date <  toDate('2026-10-01')
GROUP BY vehicle_class, classification_method, body, engine_volume
ORDER BY vehicles DESC
```

## 6. Структура по классам за год

```sql
SELECT vehicle_class, vehicles_published, class_share_within_location_pct,
       price_sample_n, median_asking_price_usd, price_sample_status,
       mean_vehicle_age_years, median_mileage_km, electric_share_pct, hybrid_share_pct, unclassified_n
FROM marts.mart_market_segmentation
WHERE period_type = 'year' AND period_start = toDate({y:String})
  AND location_scope = 'all'
ORDER BY vehicle_class = 'Всего', vehicles_published DESC
```

Контроль: сумма `vehicles_published` по классам без `Всего` = строка `Всего`.

## 7. Рынок по годам

```sql
SELECT publication_year, vehicles_published, price_sample_n, median_asking_price_usd,
       mean_vehicle_age_years, suv_body_share_pct, electric_share_pct, hybrid_share_pct,
       is_current_calendar_year
FROM marts.mart_market_trends
WHERE summary_level = 'market'
ORDER BY publication_year
```

## 8. Топ-10 моделей в классе за год

```sql
SELECT vehicle_class, listed_model_rank_in_class AS rank, make, model,
       vehicles_published, share_of_class_pct, median_asking_price_usd, price_sample_n
FROM marts.mart_market_trends
WHERE summary_level = 'model' AND publication_year = {y:UInt16}
  AND listed_model_rank_in_class <= 10
ORDER BY vehicle_class, rank
```

## 9. Доля неклассифицированных по годам (знаменатель — все машины)

```sql
SELECT toYear(period_start) AS y,
       sumIf(vehicles_published, vehicle_class = 'Всего') AS total,
       sumIf(vehicles_published, vehicle_class = 'Не классифицировано') AS unclassified,
       round(100 * unclassified / total, 1) AS unclassified_pct
FROM marts.mart_market_segmentation
WHERE period_type = 'year' AND location_scope = 'all'
GROUP BY y ORDER BY y
```
