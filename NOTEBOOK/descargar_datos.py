import pyodbc
import pandas as pd
from tqdm import tqdm

# ============================================
# CONEXIÓN A SQL SERVER
# ============================================
conexion = pyodbc.connect(
    "DRIVER={SQL Server};"
    "SERVER=LAPTOP-856OJOJE\\SQLEXPRESS;"
    "DATABASE=CreditoBanco_ML;"
    "Trusted_Connection=yes;"
)

# ============================================
# PRIMERO CONTAR TOTAL DE FILAS
# ============================================
cursor = conexion.cursor()
cursor.execute("SELECT COUNT(*) FROM dataset_creditos")
total_filas = cursor.fetchone()[0]
print(f"📊 Total de filas a descargar: {total_filas:,}")

# ============================================
# DESCARGAR EN CHUNKS CON BARRA DE PROGRESO
# ============================================
CHUNK_SIZE = 50000
chunks = []

with tqdm(total=total_filas, desc="⬇️  Descargando", unit=" filas", colour="green") as barra:
    for chunk in pd.read_sql("SELECT * FROM dataset_creditos", conexion, chunksize=CHUNK_SIZE):
        chunks.append(chunk)
        barra.update(len(chunk))

# ============================================
# UNIR CHUNKS Y GUARDAR CSV
# ============================================
print("\n💾 Guardando CSV...")
df = pd.concat(chunks, ignore_index=True)

ruta = r"C:\Users\diego\Desktop\PROYECTO INTEGRADOR\data\BancoData\TABLA_FINAL\dataset_creditos.csv"
df.to_csv(ruta, index=False, encoding="utf-8-sig")

print(f"✅ Archivo guardado correctamente en:")
print(f"   {ruta}")
print(f"   Total filas: {len(df):,}")
print(f"   Total columnas: {len(df.columns)}")

conexion.close()