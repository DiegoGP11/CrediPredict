"""
╔══════════════════════════════════════════════════════════════╗
║             CREDIPREDICT — PIPELINE AUTOMATIZADO             ║
║                                                              ║
║  Ejecutara todo el proceso desde aqui,:                      ║
║    1. Descarga el dataset desde Google Drive                 ║
║    2. Crea las carpetas necesarias                           ║
║    3. Genera las predicciones con el modelo XGBoost          ║
║    4. Abre el sistema web en el navegador                    ║
╚══════════════════════════════════════════════════════════════╝

  USO:
    python pipeline.py

  REQUISITOS:
    pip install gdown pandas joblib scikit-learn xgboost
"""

import os
import sys
import subprocess
import webbrowser
from pathlib import Path

# ─────────────────────────────────────────────────────────────
# RUTAS — se detectan automáticamente desde donde esté el proyecto
# ─────────────────────────────────────────────────────────────
NOTEBOOK      = Path(__file__).resolve().parent        # NOTEBOOK/
BASE          = NOTEBOOK.parent                        # CrediPredict-main/
DATA_FINAL    = BASE / "DATA_FINAL"
RESULTADO     = BASE / "RESULTADO_FINAL"
SISTEMA_WEB   = BASE / "sistema web"

RUTA_CSV      = DATA_FINAL / "dataset_creditos.csv"
RUTA_PKL      = NOTEBOOK   / "modelo_riesgo_crediticio_xgb_V2.pkl"
RUTA_INDEX    = SISTEMA_WEB / "index.html"
SCRIPT_PRED   = NOTEBOOK   / "prediccion_credito.py"

# ─────────────────────────────────────────────────────────────
# LINK DE GOOGLE DRIVE — ID del archivo dataset_creditos.csv
# Cambia solo el ID si subes una nueva versión del dataset
# ─────────────────────────────────────────────────────────────
DRIVE_FILE_ID = "1apYsvsY8ExVUkUWTUjhp6Ob4JgKfcvWx"

# ─────────────────────────────────────────────────────────────
# UTILIDADES
# ─────────────────────────────────────────────────────────────
def titulo(texto):
    print(f"\n{'='*60}")
    print(f"  {texto}")
    print(f"{'='*60}")

def paso(n, texto):
    print(f"\n[{n}] {texto}...")

def ok(texto):
    print(f"  ✓ {texto}")

def error(texto):
    print(f"\n  ✗ ERROR: {texto}")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────
# PASO 0 — Verificar que gdown esté instalado
# ─────────────────────────────────────────────────────────────
def verificar_gdown():
    try:
        import gdown
        return gdown
    except ImportError:
        print("\n  Instalando gdown para descarga desde Google Drive...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "gdown", "-q"])
        import gdown
        return gdown

# ─────────────────────────────────────────────────────────────
# PASO 1 — Crear carpetas necesarias
# ─────────────────────────────────────────────────────────────
def crear_carpetas():
    paso(1, "Verificando estructura de carpetas")
    DATA_FINAL.mkdir(parents=True, exist_ok=True)
    RESULTADO.mkdir(parents=True, exist_ok=True)
    ok(f"DATA_FINAL     → {DATA_FINAL}")
    ok(f"RESULTADO_FINAL → {RESULTADO}")

# ─────────────────────────────────────────────────────────────
# PASO 2 — Descargar dataset desde Google Drive
# ─────────────────────────────────────────────────────────────
def descargar_dataset(gdown):
    paso(2, "Descargando dataset desde Google Drive")

    if RUTA_CSV.exists():
        print(f"  → dataset_creditos.csv ya existe, omitiendo descarga.")
        ok(f"Dataset listo en {RUTA_CSV}")
        return

    if DRIVE_FILE_ID == "REEMPLAZA_CON_EL_ID_DEL_ARCHIVO_EN_DRIVE":
        error(
            "No se configuró el ID del archivo de Google Drive.\n"
            "  Abre pipeline.py y reemplaza DRIVE_FILE_ID con el ID real del archivo.\n"
            "  Puedes obtenerlo del link de Drive: drive.google.com/file/d/ESTE_ES_EL_ID/view"
        )

    url = f"https://drive.google.com/uc?id={DRIVE_FILE_ID}"
    print(f"  → Descargando desde Drive...")
    gdown.download(url, str(RUTA_CSV), quiet=False)

    if not RUTA_CSV.exists():
        error("La descarga falló. Verifica que el archivo de Drive sea público o compartido correctamente.")

    ok(f"Dataset descargado → {RUTA_CSV}")

# ─────────────────────────────────────────────────────────────
# PASO 3 — Verificar que el modelo .pkl existe
# ─────────────────────────────────────────────────────────────
def verificar_modelo():
    paso(3, "Verificando modelo XGBoost")

    if not RUTA_PKL.exists():
        error(
            f"No se encontró el modelo en:\n  {RUTA_PKL}\n"
            "  Descárgalo desde Google Drive y colócalo en la carpeta NOTEBOOK."
        )

    ok(f"Modelo encontrado → {RUTA_PKL.name}")

# ─────────────────────────────────────────────────────────────
# PASO 4 — Ejecutar predicción
# ─────────────────────────────────────────────────────────────
def ejecutar_prediccion():
    paso(4, "Ejecutando predicción de créditos")

    if not SCRIPT_PRED.exists():
        error(f"No se encontró el script en:\n  {SCRIPT_PRED}")

    resultado = subprocess.run(
        [sys.executable, str(SCRIPT_PRED)],
        capture_output=False
    )

    if resultado.returncode != 0:
        error("El script de predicción terminó con errores. Revisa los mensajes anteriores.")

    ok("Predicción completada")

# ─────────────────────────────────────────────────────────────
# PASO 5 — Abrir sistema web
# ─────────────────────────────────────────────────────────────
def abrir_web():
    paso(5, "Abriendo sistema web")

    if not RUTA_INDEX.exists():
        error(f"No se encontró el archivo:\n  {RUTA_INDEX}")

    url = RUTA_INDEX.as_uri()   # convierte a file:///ruta/index.html
    webbrowser.open(url)
    ok(f"Sistema web abierto en el navegador")

# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    titulo("CREDIPREDICT — PIPELINE AUTOMATIZADO")

    gdown = verificar_gdown()

    crear_carpetas()
    descargar_dataset(gdown)
    verificar_modelo()
    ejecutar_prediccion()
    abrir_web()

    print("\n" + "=" * 60)
    print("  PIPELINE COMPLETADO EXITOSAMENTE")
    print("=" * 60)
    print(f"\n  El sistema web está listo en tu navegador.")
    print(f"  Resultado guardado en:")
    print(f"  {RESULTADO / 'resultado_predicciones.csv'}")
    print("=" * 60 + "\n")
