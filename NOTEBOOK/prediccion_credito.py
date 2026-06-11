import pandas as pd
import joblib
import os
import warnings
warnings.filterwarnings('ignore')


# ─────────────────────────────────────────────────────────────
# RUTAS — ajusta solo aquí
# ─────────────────────────────────────────────────────────────
RUTA_CSV = r"C:\Users\diego\Desktop\PROYECTO INTEGRADOR\data\dataset_creditos.csv"
RUTA_PKL = r"C:\Users\diego\Desktop\PROYECTO INTEGRADOR\NOTEBOOK\modelo_riesgo_crediticio_xgb_V2.pkl"
RUTA_OUT = r"C:\Users\diego\Desktop\PROYECTO INTEGRADOR\data\resultado_predicciones.csv"

# ─────────────────────────────────────────────────────────────
# 1. CARGAR DATOS Y MODELO
# ─────────────────────────────────────────────────────────────
print("=" * 60)
print("  PREDICCIÓN DE CRÉDITO — MODELO XGBoost")
print("=" * 60)

print("\n[1/4] Cargando datos y modelo...")
df      = pd.read_csv(RUTA_CSV, encoding="utf-8-sig")
paquete = joblib.load(RUTA_PKL)

modelo   = paquete["modelo_xgboost"]
UMBRAL   = paquete["umbral_optimo"]       # 0.31
columnas = paquete["variables_entrenamiento"]

print(f"  ✓ Datos cargados     → {len(df):,} registros")
print(f"  ✓ Modelo cargado     → XGBoost")
print(f"  ✓ Umbral del modelo  → {UMBRAL}")
print(f"  ✓ Columnas esperadas → {len(columnas)}")
print(f"  ✓ Columnas: {columnas}")

# ─────────────────────────────────────────────────────────────
# 2. PREPARAR VARIABLES PARA EL MODELO
# ─────────────────────────────────────────────────────────────
print("\n[2/4] Preparando variables...")

# Estandarizar valores categóricos
df["person_home_ownership"] = df["person_home_ownership"].str.upper().str.strip()
df["loan_intent"]           = df["loan_intent"].str.upper().str.strip()
df["cb_person_default_on_file"] = df["cb_person_default_on_file"].str.upper().str.strip()

# ── OneHotEncoding SOLO de las 3 variables que usó el modelo ──
# EXCLUIR loan_grade y loan_int_rate — fueron eliminadas por data leakage
dummies = pd.get_dummies(df[[
    "person_home_ownership",
    "loan_intent",
    "cb_person_default_on_file"
]], prefix={
    "person_home_ownership":    "person_home_ownership",
    "loan_intent":              "loan_intent",
    "cb_person_default_on_file": "cb_person_default_on_file"
})

# ── Variables numéricas que sí usa el modelo ──
# EXCLUIR loan_int_rate (data leakage) y person_age (no está en VARIABLES del pkl)
numericas = df[[
    "person_income",
    "person_emp_length",
    "loan_amnt",
    "loan_percent_income",
    "cb_person_cred_hist_length"
]]

# Unir todo
X = pd.concat([numericas, dummies], axis=1)

# Alinear exactamente con las columnas del modelo entrenado
# (agrega columnas faltantes con 0, elimina sobrantes)
X = X.reindex(columns=columnas, fill_value=0)

print(f"  ✓ Variables preparadas → {X.shape[1]} columnas")
print(f"  ✓ Columnas nulas: {X.isnull().sum().sum()}")

# ─────────────────────────────────────────────────────────────
# 3. PREDECIR CON EL UMBRAL CORRECTO
# ─────────────────────────────────────────────────────────────
print("\n[3/4] Ejecutando predicción...")

# Usar predict_proba + umbral calibrado (igual que en el notebook)
probabilidades = modelo.predict_proba(X)[:, 1]   # prob de incumplimiento
predicciones   = (probabilidades >= UMBRAL).astype(int)

print(f"  ✓ Predicciones realizadas → {len(predicciones):,} clientes")

# ─────────────────────────────────────────────────────────────
# 4. CONSTRUIR RESULTADO FINAL
# ─────────────────────────────────────────────────────────────
print("\n[4/4] Construyendo tabla de resultados...")

resultado = df[[
    # Identificación
    "id_solicitud",
    "dni", "nombre", "apellido_paterno", "apellido_materno",
    "telefono", "genero", "estado_civil", "numero_hijos",
    "nivel_educacion", "departamento",
    # Laboral
    "tipo_empleo", "nombre_empresa", "sector",
    "person_income",
    "situacion_laboral",
    # Crédito
    "motivo_credito", "loan_amnt",
    "plazo_meses", "cuota_mensual_estimada",
    # Variables del modelo
    "person_age", "person_home_ownership", "person_emp_length",
    "loan_intent", "loan_grade", "loan_int_rate",
    "loan_percent_income", "cb_person_cred_hist_length",
    "cb_person_default_on_file",
    # Financiero
    "capacidad_pago", "endeudamiento_total"
]].copy()

# Resultados del modelo
resultado["prob_incumplimiento"] = (probabilidades * 100).round(2)
resultado["prob_pago"]           = ((1 - probabilidades) * 100).round(2)

# Decisión final con umbral calibrado
resultado["DECISION"] = predicciones
resultado["DECISION"] = resultado["DECISION"].apply(
    lambda x: "APROBADO" if x == 0 else "RECHAZADO"
)

# Nivel de riesgo
def nivel_riesgo(prob):
    if prob < 20:   return "BAJO"
    elif prob < 50: return "MEDIO"
    elif prob < 75: return "ALTO"
    else:           return "MUY ALTO"

# # El modelo XGBoost retorna un valor entre 0 y 1 por cliente.
# Se clasifica según rangos estándar de la industria financiera:
#   BAJO     (< 20%) → cliente casi seguro, probabilidad mínima de impago
#   MEDIO    (20-50%) → zona gris, riesgo manejable, banco puede aprobar con condiciones
#   ALTO     (50-75%) → alta probabilidad de incumplir, generalmente rechazado
#   MUY ALTO (> 75%) → modelo casi seguro del impago, rechazo directo
# Nota: con umbral 0.31, todo cliente con prob >= 31% ya es RECHAZADO,
# pero igual se etiqueta el nivel para tener el dato completo en la tabla.
# ─────────────────────────────────────────────────────────────

resultado["NIVEL_RIESGO"] = resultado["prob_incumplimiento"].apply(nivel_riesgo)

# ─────────────────────────────────────────────────────────────
# 5. GUARDAR
# ─────────────────────────────────────────────────────────────
resultado.to_csv(RUTA_OUT, index=False, encoding="utf-8-sig")

mb = os.path.getsize(RUTA_OUT) / 1024 / 1024
print(f"  ✓ resultado_predicciones.csv → {len(resultado):,} filas | {mb:.1f} MB")

# ─────────────────────────────────────────────────────────────
# RESUMEN EN CONSOLA
# ─────────────────────────────────────────────────────────────
aprobados  = (resultado["DECISION"] == "APROBADO").sum()
rechazados = (resultado["DECISION"] == "RECHAZADO").sum()
total      = len(resultado)

print("\n" + "=" * 60)
print("  RESUMEN DE PREDICCIONES")
print("=" * 60)
print(f"  Total evaluados  : {total:>12,}")
print(f"  Aprobados        : {aprobados:>12,}  ({aprobados/total*100:.1f}%)")
print(f"  Rechazados       : {rechazados:>12,}  ({rechazados/total*100:.1f}%)")
print(f"\n  Riesgo BAJO      : {(resultado['NIVEL_RIESGO']=='BAJO').sum():>12,}")
print(f"  Riesgo MEDIO     : {(resultado['NIVEL_RIESGO']=='MEDIO').sum():>12,}")
print(f"  Riesgo ALTO      : {(resultado['NIVEL_RIESGO']=='ALTO').sum():>12,}")
print(f"  Riesgo MUY ALTO  : {(resultado['NIVEL_RIESGO']=='MUY ALTO').sum():>12,}")
print("=" * 60)
print(f"\n  Resultado guardado en:\n  {RUTA_OUT}")
print("=" * 60)
