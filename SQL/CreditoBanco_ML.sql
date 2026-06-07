create database CreditoBanco_ML;
go

use CreditoBanco_ML;
go



CREATE TABLE dataset_creditos (
    id_evaluacion               INT,
    id_solicitud                INT,
    id_cliente                  INT,
    dni                         VARCHAR(20),
    nombre                      VARCHAR(100),
    apellido_paterno            VARCHAR(100),
    apellido_materno            VARCHAR(100),
    telefono                    VARCHAR(20),
    genero                      CHAR(1),
    estado_civil                VARCHAR(50),
    numero_hijos                INT,
    nivel_educacion             VARCHAR(50),
    departamento                VARCHAR(100),
    tipo_empleo                 VARCHAR(50),
    nombre_empresa              VARCHAR(150),
    sector                      VARCHAR(100),
    ingreso_mensual             DECIMAL(10,2),
    situacion_laboral           VARCHAR(50),
    motivo_credito              VARCHAR(150),
    monto_solicitado            DECIMAL(10,2),
    plazo_meses                 INT,
    cuota_mensual_estimada      DECIMAL(10,2),
    fecha_solicitud             DATE,
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