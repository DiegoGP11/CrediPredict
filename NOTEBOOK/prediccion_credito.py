import pandas as pd
import joblib
import warnings
warnings.filterwarnings('ignore')


# ─────────────────────────────────────────────────────────────
# RUTAS — ajusta solo aquí
# ─────────────────────────────────────────────────────────────
RUTA_CSV  = r"C:\Users\diego\Desktop\PROYECTO INTEGRADOR\data\BancoData\TABLA_FINAL\dataset_creditos.csv"
RUTA_PKL  = r"C:\Users\diego\Desktop\PROYECTO INTEGRADOR\data\NOTEBOOK\modelo_riesgo_crediticio_xgb_V2.pkl"
RUTA_OUT = r"C:\Users\diego\Desktop\PROYECTO INTEGRADOR\data\DATA_FINAL\resultado_predicciones.csv"

# ─────────────────────────────────────────────────────────────
# 1. CARGAR DATOS Y MODELO
# ─────────────────────────────────────────────────────────────
print("="*60)
print("  PREDICCIÓN DE CRÉDITO — MODELO LOGISTIC REGRESSION")
print("="*60)

print("\n[1/4] Cargando datos y modelo...")
df      = pd.read_csv(RUTA_CSV, encoding="utf-8-sig")
paquete = joblib.load(RUTA_PKL)

modelo    = paquete["modelo_xgboost"]
escalador = None  # no tiene escalador
columnas  = paquete["variables_entrenamiento"]

print(f"  ✓ Datos cargados     → {len(df):,} registros")
print(f"  ✓ Modelo cargado     → LogisticRegression")
print(f"  ✓ Columnas esperadas → {len(columnas)}")

# ─────────────────────────────────────────────────────────────
# 2. PREPARAR VARIABLES PARA EL MODELO
# ─────────────────────────────────────────────────────────────
print("\n[2/4] Preparando variables...")

# Estandarizar valores categóricos
df["person_home_ownership"] = df["person_home_ownership"].str.upper().str.strip()
df["loan_intent"]           = df["loan_intent"].str.capitalize().str.strip()
df["loan_grade"]            = df["loan_grade"].str.upper().str.strip()

# OneHotEncoding de las 3 columnas categóricas
dummies = pd.get_dummies(df[[
    "person_home_ownership",
    "loan_intent",
    "loan_grade"
]], prefix={
    "person_home_ownership": "person_home_ownership",
    "loan_intent":           "loan_intent",
    "loan_grade":            "loan_grade"
})

# Columnas numéricas directas
numericas = df[[
    "person_age",
    "person_emp_length",
    "loan_int_rate",
    "loan_percent_income",
    "cb_person_cred_hist_length"
]]

# Unir todo
X = pd.concat([numericas, dummies], axis=1)

# Alinear exactamente con las columnas del modelo
# (agrega columnas faltantes con 0, elimina sobrantes)
X = X.reindex(columns=columnas, fill_value=0)

print(f"  ✓ Variables preparadas → {X.shape[1]} columnas")

# ─────────────────────────────────────────────────────────────
# 3. ESCALAR Y PREDECIR
# ─────────────────────────────────────────────────────────────
print("\n[3/4] Ejecutando predicción...")

X_scaled      = X
predicciones  = modelo.predict(X_scaled)
probabilidades = modelo.predict_proba(X_scaled)[:, 1]  # prob de incumplimiento

print(f"  ✓ Predicciones realizadas → {len(predicciones):,} clientes")

# ─────────────────────────────────────────────────────────────
# 4. CONSTRUIR RESULTADO FINAL
# ─────────────────────────────────────────────────────────────
print("\n[4/4] Construyendo tabla de resultados...")

resultado = df[[
    # Identificación
    "dni", "nombre", "apellido_paterno", "apellido_materno",
    "telefono", "genero", "estado_civil", "numero_hijos",
    "nivel_educacion", "departamento",
    # Laboral
    "tipo_empleo", "nombre_empresa", "sector",
    "person_income",        # ← antes era ingreso_mensual
    "situacion_laboral",
    # Crédito
    "motivo_credito", "loan_amnt",     # ← antes era monto_solicitado
    "plazo_meses", "cuota_mensual_estimada",
    # Variables del modelo
    "person_age", "person_home_ownership", "person_emp_length",
    "loan_intent", "loan_grade", "loan_int_rate",
    "loan_percent_income", "cb_person_cred_hist_length",
    # Financiero
    "capacidad_pago", "endeudamiento_total"
]].copy()

# Resultados del modelo
resultado["prob_incumplimiento_%"] = (probabilidades * 100).round(2)
resultado["prob_pago_%"]           = ((1 - probabilidades) * 100).round(2)
resultado["prediccion_raw"]        = predicciones

# Decisión final
resultado["DECISION"] = resultado["prediccion_raw"].apply(
    lambda x: "✅ APROBADO" if x == 0 else "❌ RECHAZADO"
)

# Nivel de riesgo
def nivel_riesgo(prob):
    if prob < 20:   return "BAJO"
    elif prob < 50: return "MEDIO"
    elif prob < 75: return "ALTO"
    else:           return "MUY ALTO"

resultado["NIVEL_RIESGO"] = resultado["prob_incumplimiento_%"].apply(nivel_riesgo)

# Quitar columna auxiliar
resultado.drop(columns=["prediccion_raw"], inplace=True)

# Renombrar para la web
resultado.rename(columns={
    "prob_incumplimiento_%": "prob_incumplimiento",
    "prob_pago_%":           "prob_pago"
}, inplace=True)

# ─────────────────────────────────────────────────────────────
# 5. GUARDAR
# ─────────────────────────────────────────────────────────────
resultado.to_csv(RUTA_OUT, index=False, encoding="utf-8-sig")

import os
mb = os.path.getsize(RUTA_OUT) / 1024 / 1024

print(f"  ✓ resultado_predicciones.csv → {len(resultado):,} filas | {mb:.1f} MB")

# ─────────────────────────────────────────────────────────────
# RESUMEN EN CONSOLA
# ─────────────────────────────────────────────────────────────
aprobados  = (resultado["DECISION"] == "✅ APROBADO").sum()
rechazados = (resultado["DECISION"] == "❌ RECHAZADO").sum()
total      = len(resultado)

print("\n" + "="*60)
print("  📊 RESUMEN DE PREDICCIONES")
print("="*60)
print(f"  Total evaluados  : {total:>12,}")
print(f"  ✅ Aprobados      : {aprobados:>12,}  ({aprobados/total*100:.1f}%)")
print(f"  ❌ Rechazados     : {rechazados:>12,}  ({rechazados/total*100:.1f}%)")
print(f"\n  Riesgo BAJO      : {(resultado['NIVEL_RIESGO']=='BAJO').sum():>12,}")
print(f"  Riesgo MEDIO     : {(resultado['NIVEL_RIESGO']=='MEDIO').sum():>12,}")
print(f"  Riesgo ALTO      : {(resultado['NIVEL_RIESGO']=='ALTO').sum():>12,}")
print(f"  Riesgo MUY ALTO  : {(resultado['NIVEL_RIESGO']=='MUY ALTO').sum():>12,}")
print("="*60)
print(f"\n  📄 Resultado guardado en:\n  {RUTA_OUT}")
print("="*60)
