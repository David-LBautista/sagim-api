# SAGIM API

**Sistema de Gestión Integral Municipal** - API Backend Multi-Tenant

API RESTful desarrollada con NestJS para la gestión integral de múltiples municipios mexicanos.

## 🚀 Tecnologías y Librerías Principales

### Framework y Core

- **NestJS** v11.1.12 - Framework Node.js progresivo
- **TypeScript** v5.9.3 - Lenguaje de programación tipado
- **Node.js** - Runtime JavaScript

### Base de Datos

- **MongoDB** con Mongoose v8.22.0 - Base de datos NoSQL

### Autenticación y Seguridad

- **Passport.js** - Autenticación
- **JWT** (@nestjs/jwt) - JSON Web Tokens
- **bcrypt** v6.0.0 - Hashing de contraseñas

### Procesamiento de Pagos

- **Stripe** v20.3.0 - Plataforma de pagos

### Almacenamiento

- **AWS S3** - Almacenamiento de archivos
- **Cloudinary** v2.9.0 - Gestión de imágenes

### Validación y Transformación

- **class-validator** v0.14.3 - Validación de DTOs
- **class-transformer** v0.5.1 - Transformación de objetos

### Utilidades

- **date-fns** v4.1.0 - Manipulación de fechas
- **uuid** v13.0.0 - Generación de IDs únicos
- **PDFKit** v0.17.2 - Generación de PDFs

### Logging

- **Winston** v3.19.0 - Sistema de logs
- **winston-daily-rotate-file** v5.0.0 - Rotación de archivos de log

### Documentación

- **Swagger** (@nestjs/swagger) - Documentación API automática

### Testing

- **Jest** v29.7.0 - Framework de testing
- **Supertest** v7.2.2 - Testing HTTP

## 📁 Estructura del Proyecto

```
sagim-api/
├── src/
│   ├── common/                      # Elementos compartidos
│   │   ├── decorators/              # Decoradores personalizados
│   │   ├── filters/                 # Filtros de excepciones
│   │   ├── guards/                  # Guards (autenticación, roles, municipios)
│   │   └── interceptors/            # Interceptores globales
│   │
│   ├── config/                      # Configuraciones
│   │   └── winston.config.ts        # Configuración de logs
│   │
│   ├── database/                    # Base de datos
│   │   └── seeds/                   # Scripts de datos iniciales
│   │       ├── initial-seed.ts
│   │       └── test-seed.ts
│   │
│   ├── modules/                     # Módulos de negocio
│   │   ├── auth/                    # Autenticación y autorización
│   │   ├── users/                   # Gestión de usuarios
│   │   ├── municipalities/          # Multi-tenant (municipios)
│   │   ├── ciudadanos/              # Padrón de ciudadanos
│   │   ├── reportes/                # Reportes ciudadanos
│   │   ├── dif/                     # DIF - Apoyos sociales
│   │   ├── catastro/                # Catastro y predios
│   │   ├── tesoreria/               # Tesorería
│   │   ├── pagos/                   # Pagos con Stripe
│   │   ├── auditoria/               # Auditoría de operaciones
│   │   ├── dashboard/               # Dashboards y métricas
│   │   ├── cloudinary/              # Servicio de imágenes
│   │   ├── s3/                      # Servicio de almacenamiento
│   │   ├── notificaciones/          # Notificaciones
│   │   └── health/                  # Health checks
│   │
│   ├── shared/                      # Código compartido
│   │   ├── constants/               # Constantes
│   │   ├── enums/                   # Enumeraciones
│   │   └── interfaces/              # Interfaces TypeScript
│   │
│   ├── app.module.ts                # Módulo principal
│   └── main.ts                      # Punto de entrada
│
├── test/                            # Tests E2E
├── logs/                            # Archivos de log (generados)
├── FLUJOS/                          # Documentación de flujos
├── .env.development                 # Variables de entorno desarrollo
├── .env.example                     # Ejemplo de variables de entorno
└── package.json                     # Dependencias y scripts

```

## ⚙️ Instalación y Configuración

### Prerrequisitos

- Node.js (v18 o superior)
- MongoDB (local o Atlas)
- npm o yarn

### 1. Clonar el repositorio

```bash
git clone git@github.com:David-LBautista/sagim-api.git
cd sagim-api
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copia el archivo de ejemplo y configura tus variables:

```bash
cp .env.example .env.development
```

Edita `.env.development` con tus credenciales:

```env
# Base de datos
MONGODB_URI=mongodb://localhost:27017/sagim

# JWT
JWT_SECRET=tu-secreto-super-secreto
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=tu-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# API
PORT=3000
API_PREFIX=api/v1

# Stripe (opcional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cloudinary (opcional)
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret

# AWS S3 (opcional)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu-access-key
AWS_SECRET_ACCESS_KEY=tu-secret-key
AWS_S3_BUCKET_NAME=tu-bucket
```

### 4. Ejecutar seeds (opcional)

Para poblar la base de datos con datos iniciales:

```bash
npm run seed
```

## 🏃 Ejecutar el Proyecto

### Modo desarrollo

```bash
npm run start:dev
```

El servidor estará disponible en: `http://localhost:3000`

### Modo producción

```bash
# Compilar
npm run build

# Ejecutar
npm run start:prod
```

### Otros comandos útiles

```bash
# Formatear código
npm run format

# Ejecutar linter
npm run lint

# Ejecutar tests
npm run test

# Ejecutar tests con cobertura
npm run test:cov

# Ejecutar tests E2E
npm run test:e2e

# Seed de prueba
npm run seed:test
```

## 📚 Documentación API

Una vez iniciado el servidor, accede a Swagger en:

```
http://localhost:3000/api/docs
```

## 📋 Módulos Principales

- **Autenticación**: Login, JWT, refresh tokens
- **Multi-tenant**: Gestión de múltiples municipios
- **Ciudadanos**: Padrón digital de ciudadanos
- **Reportes**: Sistema de reportes ciudadanos
- **DIF**: Gestión de apoyos sociales, beneficiarios, programas e inventario
- **Catastro**: Gestión de predios y citas
- **Pagos**: Integración con Stripe
- **Tesorería**: Servicios de cobro municipales
- **Auditoría**: Registro de todas las operaciones

## 👥 Roles de Usuario

- `SUPER_ADMIN`: Administrador SAGIM
- `ADMIN`: Administrador municipal
- `PRESIDENTE`: Presidente municipal
- `CONTRALOR`: Contraloría
- `DIF`: Sistema DIF
- `CATASTRO`: Catastro municipal
- `TESORERIA`: Tesorería municipal
- `SOPORTE`: Soporte técnico

## 📄 Licencia

MIT
