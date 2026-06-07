create database Banco
go

-- ============================================
-- CREAR BASE DE DATOS
-- ============================================
USE Banco;
GO

-- ============================================
-- TABLA: CLIENTES
-- ============================================
CREATE TABLE Clientes (
    id_cliente           INT PRIMARY KEY,
    dni                  VARCHAR(20),
    nombre               VARCHAR(100),
    apellido_paterno     VARCHAR(100),
    apellido_materno     VARCHAR(100),
    genero               CHAR(1),
    edad                 INT,
    fecha_nacimiento     DATE,
    estado_civil         VARCHAR(50),
    numero_hijos         INT,
    nivel_educacion      VARCHAR(50),
    departamento         VARCHAR(100),
    tipo_vivienda        VARCHAR(50),
    telefono             VARCHAR(20),
    email                VARCHAR(150)
);
GO

-- ============================================
-- TABLA: EMPLEOS
-- ============================================
CREATE TABLE Empleos (
    id_cliente           INT,
    tipo_empleo          VARCHAR(50),
    nombre_empresa       VARCHAR(100),
    sector               VARCHAR(100),
    ingreso_mensual      DECIMAL(10,2),
    antiguedad_laboral_anos INT,
    situacion_laboral    VARCHAR(50)
);
GO

-- ============================================
-- TABLA: SOLICITUDES
-- ============================================
CREATE TABLE Solicitudes (
    id_solicitud             INT PRIMARY KEY,
    id_cliente               INT,
    motivo_credito           VARCHAR(150),
    loan_intent              VARCHAR(50),
    monto_solicitado         DECIMAL(10,2),
    plazo_meses              INT,
    tasa_interes             DECIMAL(5,2),
    cuota_mensual_estimada   DECIMAL(10,2),
    fecha_solicitud          DATE
);
GO

-- ============================================
-- TABLA: EVALUACION
-- ============================================
CREATE TABLE Evaluacion (
    id_evaluacion               INT PRIMARY KEY,
    id_solicitud                INT,
    id_cliente                  INT,
    person_age                  INT,
    person_home_ownership       VARCHAR(20),
    person_emp_length           INT,
    loan_intent                 VARCHAR(50),
    loan_grade                  CHAR(1),
    loan_int_rate               DECIMAL(5,2),
    loan_percent_income         DECIMAL(6,4),
    cb_person_cred_hist_length  INT,
    capacidad_pago              DECIMAL(10,2),
    endeudamiento_total         DECIMAL(6,4)
);
GO


-- ============================================
-- BULK INSERT: CLIENTES
-- (Reemplaza la ruta entre comillas)
-- ============================================
BULK INSERT Clientes
FROM 'C:\Users\diego\Desktop\PROYECTO INTEGRADOR\data\BancoData\clientes.csv'
WITH (
    FIRSTROW = 2,
    FIELDTERMINATOR = ',',
    ROWTERMINATOR = '\n',
    CODEPAGE = '65001'   -- UTF-8 para tildes y caracteres especiales
);
GO

-- ============================================
-- BULK INSERT: EMPLEOS
-- ============================================
BULK INSERT Empleos
FROM 'C:\Users\diego\Desktop\PROYECTO INTEGRADOR\data\BancoData\empleos.csv'
WITH (
    FIRSTROW = 2,
    FIELDTERMINATOR = ',',
    ROWTERMINATOR = '\n',
    CODEPAGE = '65001'
);
GO

-- ============================================
-- BULK INSERT: SOLICITUDES
-- ============================================
BULK INSERT Solicitudes
FROM 'C:\Users\diego\Desktop\PROYECTO INTEGRADOR\data\BancoData\solicitudes.csv'
WITH (
    FIRSTROW = 2,
    FIELDTERMINATOR = ',',
    ROWTERMINATOR = '\n',
    CODEPAGE = '65001'
);
GO

-- ============================================
-- BULK INSERT: EVALUACION
-- ============================================
BULK INSERT Evaluacion
FROM 'C:\Users\diego\Desktop\PROYECTO INTEGRADOR\data\BancoData\evaluaciones.csv'
WITH (
    FIRSTROW = 2,
    FIELDTERMINATOR = ',',
    ROWTERMINATOR = '\n',
    CODEPAGE = '65001'
);
GO
