---

# 🎯 Objetivo del Proyecto

Desarrollar una solución inteligente capaz de evaluar solicitudes crediticias utilizando modelos de Machine Learning entrenados con datos históricos, reduciendo tiempos de análisis y mejorando la precisión en la aprobación de créditos.

---

# 🛠️ Tecnologías Utilizadas

### 🗄️ Base de Datos

* SQL Server
* SQL Server Management Studio (SSMS)

### 🔄 Integración y ETL

* SQL Server Integration Services (SSIS)

### 🤖 Ciencia de Datos y Machine Learning

* Python
* Pandas
* NumPy
* Scikit-Learn
* XGBoost
* Joblib
* Jupyter Notebook

### 🌐 Desarrollo Web

* HTML5
* CSS3
* JavaScript

### 🔧 Control de Versiones

* Git
* GitHub

---

# 🏗️ Arquitectura del Proyecto

```text
SQL Server (fin de mes)
        ↓
SSIS ETL (automático)
        ↓
dataset_creditos actualizado
        ↓
Desarrollo del Modelo ML
├── Mini Análisis Exploratorio de Datos (EDA)
├── Limpieza y transformación de datos
├── Selección de variables
├── División Train/Test (70% - 30%)
├── Entrenamiento de modelos
│   ├── Regresión Logística
│   ├── Random Forest
│   ├── AdaBoost
│   ├── Gradient Boosting
│   └── XGBoost
├── Evaluación de métricas
│   ├── AUC-ROC
│   ├── Precision
│   ├── Recall
│   └── F1-Score
├── Optimización de umbral
└── Exportación del mejor modelo (.pkl)
        ↓
Python Script (Producción)
├── Extrae datos desde SQL Server
├── Limpia y transforma datos
├── Carga modelo (.pkl)
├── Genera predicciones
└── Guarda resultados en CSV
        ↓
Aplicación Web (HTML)
├── Consulta resultados
├── Muestra aprobados/rechazados
└── Permite ejecutar el proceso
```

---

# 🧠 Desarrollo del Modelo de Machine Learning

El proceso completo de construcción del modelo fue desarrollado en un Notebook de Jupyter, donde se realizaron todas las etapas necesarias para obtener el modelo final utilizado en producción.

### 📊 Etapas desarrolladas

* Análisis Exploratorio de Datos (EDA)
* Limpieza y transformación de datos
* Ingeniería y selección de variables
* División de datos Train/Test
* Entrenamiento de múltiples algoritmos
* Comparación de desempeño
* Optimización de umbral
* Evaluación de métricas
* Exportación del modelo final (.pkl)

### 🤖 Modelos Evaluados

* Regresión Logística
* Random Forest
* AdaBoost
* Gradient Boosting
* XGBoost

### 📈 Métricas Utilizadas

* AUC-ROC
* Precision
* Recall
* F1-Score

---

# 📁 Estructura del Proyecto

```text
PROYECTO INTEGRADOR
│
├── 📂 NOTEBOOK
│       ├── descargar_datos.ipynb
│       ├── Modelo.ipynb
│       ├── modelo_riesgo_crediticio_xgb_V2.pkl
│       └── prediccion_credito.ipynb
│
├── 📂 ETL
│   └── Procesos SSIS
│
├── 📂 sistema web
│   ├── css
│   ├── js
│   ├── assets
│   └── html
│
└── 📂 SQL
    ├── Scripts de creación
    ├── Procedimientos almacenados
    └── Consultas
```

---

# 📂 Recursos del Proyecto

Debido al tamaño de los datasets y archivos utilizados durante el entrenamiento, estos se encuentran disponibles mediante Google Drive.

### 🏦 BancoData

Datos históricos utilizados para el entrenamiento inicial del modelo.

🔗 https://drive.google.com/drive/folders/1KWpp7cy9Kh_lzeI0MBIjeJx7hjQsDsjC

### 📊 DATA_FINAL

Dataset final procesado utilizado para generar predicciones y resultados.

🔗 https://drive.google.com/drive/folders/1hDfBNA9oXGtQ_M9B01trOIqoRxrN2Z_p

### 📓 Notebook de Desarrollo

Contiene todo el proceso de construcción del modelo de Machine Learning, incluyendo EDA, limpieza de datos, entrenamiento, evaluación y exportación del modelo final.

📂 Ubicación:
data/NOTEBOOK/

---

# ⚙️ Funcionamiento del Sistema

El proceso inicia con la actualización de información desde SQL Server mediante SSIS.

Posteriormente, Python carga el modelo previamente entrenado y genera las predicciones correspondientes para cada solicitud de crédito.

Los resultados son exportados a un archivo CSV que posteriormente es consumido por la aplicación web.

La plataforma permite visualizar:

* Clientes evaluados
* Créditos aprobados
* Créditos rechazados
* Riesgo de incumplimiento
* Ingresos proyectados
* Distribución de niveles de riesgo
* Historial de predicciones

---

# ✨ Características Principales

✅ Automatización ETL con SSIS

✅ Evaluación crediticia inteligente

✅ Predicción de riesgo mediante Machine Learning

✅ Integración con SQL Server

✅ Generación automática de resultados

✅ Interfaz web moderna e intuitiva

✅ Arquitectura escalable

---

# 📊 Resultados Esperados

* Reducir tiempos de evaluación crediticia.
* Mejorar la precisión en la toma de decisiones.
* Disminuir el riesgo financiero.
* Automatizar procesos manuales.
* Centralizar la información en una sola plataforma.

---

# 👨‍💻 Autor

- Guizado Prado, Diego
- Fanola Cardenas, Gabriel
- Godoy Fabian, Giuliana

Proyecto Integrador de la carrera de Big Data y Ciencia de Datos.
