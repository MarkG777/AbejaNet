-- ======================================================
-- NEURONA ARTIFICIAL (PREDICCIÓN DE RIESGO) - versión validada
-- Mismas entradas/salida. Solo mejora robustez y normalización.
-- ======================================================

-- Tipo de salida (igual que antes)
DROP TYPE IF EXISTS estado_riesgo;
CREATE TYPE estado_riesgo AS ENUM ('SIN_RIESGO', 'RIESGO_POTENCIAL');

CREATE OR REPLACE FUNCTION predecir_riesgo_colmena(id_colmena_param INT)
RETURNS estado_riesgo AS $$
DECLARE
    -- Entradas crudas
    v_temperatura   DECIMAL;
    v_humedad       DECIMAL;
    v_peso          DECIMAL;
    v_fecha         TIMESTAMP;

    -- Normalizadas a [-1, 1]
    norm_temp       DECIMAL;
    norm_hum        DECIMAL;
    norm_peso       DECIMAL;

    -- Pesos
    w_temp          CONSTANT DECIMAL := 0.5;
    w_hum           CONSTANT DECIMAL := 0.3;
    w_peso          CONSTANT DECIMAL := -0.6; -- mayor peso => menor riesgo (signo negativo)
    bias            CONSTANT DECIMAL := -0.2;

    -- Suma y salida
    suma_ponderada  DECIMAL;
    resultado       estado_riesgo;

    -- Parámetros de validación/normalización (fundamentados)
    -- Temperatura del nido de cría alrededor de 34.5°C (tolerancia operativa ±3°C)
    OPT_TEMP_C      CONSTANT DECIMAL := 34.5;
    TEMP_SPAN_C     CONSTANT DECIMAL := 3.0;

    -- Humedad típica en colmena ~40–70% RH, centro ~55% (ver notas abajo)
    OPT_HUM_PCT     CONSTANT DECIMAL := 55.0;
    HUM_SPAN_PCT    CONSTANT DECIMAL := 15.0;

    -- Peso: rango operativo “genérico” 10–50 kg (depende de estación/región/equipo)
    PESO_CENTRO_KG  CONSTANT DECIMAL := 30.0;
    PESO_SPAN_KG    CONSTANT DECIMAL := 20.0;

    -- Controles de plausibilidad y frescura
    MAX_AGE_HOURS   CONSTANT INT := 6;     -- lectura no más vieja de 6 h
    TEMP_MIN_PLAUS  CONSTANT DECIMAL := -10.0; -- umbrales físicos plausibles
    TEMP_MAX_PLAUS  CONSTANT DECIMAL := 60.0;
    HUM_MIN_PLAUS   CONSTANT DECIMAL := 0.0;
    HUM_MAX_PLAUS   CONSTANT DECIMAL := 100.0;
    PESO_MIN_PLAUS  CONSTANT DECIMAL := 0.0;
    PESO_MAX_PLAUS  CONSTANT DECIMAL := 200.0;
BEGIN
    -- 1) Última lectura de la colmena (misma consulta; asumimos una fila trae t°, %RH y peso)
    SELECT le.temperatura, le.humedad, le.peso, le.fecha_registro
    INTO   v_temperatura, v_humedad, v_peso, v_fecha
    FROM lecturas_ambientales le
    JOIN sensores s ON le.sensor_id = s.id
    WHERE s.colmena_id = id_colmena_param
    ORDER BY le.fecha_registro DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE NOTICE 'No hay lecturas para colmena %', id_colmena_param;
        RETURN 'SIN_RIESGO';
    END IF;

    -- 2) Frescura de datos
    IF v_fecha < now() - (MAKE_INTERVAL(hours => MAX_AGE_HOURS)) THEN
        RAISE NOTICE 'Lectura desactualizada (% horas): %', MAX_AGE_HOURS, v_fecha;
        RETURN 'SIN_RIESGO';
    END IF;

    -- 3) Plausibilidad básica (descarta sensores rotos/fuera de rango físico)
    IF v_temperatura IS NULL OR v_temperatura < TEMP_MIN_PLAUS OR v_temperatura > TEMP_MAX_PLAUS THEN
        RAISE NOTICE 'Temperatura fuera de rango plausible: % °C', v_temperatura;
        RETURN 'SIN_RIESGO';
    END IF;

    IF v_humedad IS NULL OR v_humedad < HUM_MIN_PLAUS OR v_humedad > HUM_MAX_PLAUS THEN
        RAISE NOTICE 'Humedad fuera de rango plausible: % %%', v_humedad;
        RETURN 'SIN_RIESGO';
    END IF;

    IF v_peso IS NULL OR v_peso < PESO_MIN_PLAUS OR v_peso > PESO_MAX_PLAUS THEN
        RAISE NOTICE 'Peso fuera de rango plausible: % kg', v_peso;
        RETURN 'SIN_RIESGO';
    END IF;

    -- 4) Normalización con recorte a [-1, 1] alrededor de valores “óptimos”/esperados
    --    Temperatura: centro 34.5°C, span 3°C  -> ±3°C mapea a ±1
    norm_temp := GREATEST(-1, LEAST(1, (v_temperatura - OPT_TEMP_C) / TEMP_SPAN_C));

    --    Humedad: centro 55%, span 15% -> 40–70% mapea ~[-1, 1]
    norm_hum  := GREATEST(-1, LEAST(1, (v_humedad - OPT_HUM_PCT) / HUM_SPAN_PCT));

    --    Peso: centro 30 kg, span 20 kg -> 10–50 kg mapea ~[-1, 1]
    norm_peso := GREATEST(-1, LEAST(1, (v_peso - PESO_CENTRO_KG) / PESO_SPAN_KG));

    -- 5) Suma ponderada y activación (escalón)
    suma_ponderada := (norm_temp * w_temp) + (norm_hum * w_hum) + (norm_peso * w_peso) + bias;

    IF suma_ponderada > 0 THEN
        resultado := 'RIESGO_POTENCIAL';
    ELSE
        resultado := 'SIN_RIESGO';
    END IF;

    RETURN resultado;
END;
$$ LANGUAGE plpgsql;
