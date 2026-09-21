# AgroAlerta-SV

Sistema web de prevención de riesgos agrícolas para el departamento de Morazán, El Salvador. Arquitectura orientada a eventos (EDA): combina viabilidad de cultivo por zona (CENTA), clima (Open-Meteo) e inversión del agricultor para generar proyecciones de cosecha, riesgo y recomendaciones.

## Stack
- Backend: Node.js + TypeScript + Express
- Frontend: Angular
- Base de datos: MySQL
- Clima: Open-Meteo API

## Requisitos
- Node.js 22.x
- npm actualizado (ver Troubleshooting si `npm install` falla)

## Backend

    cd backend
    npm install
    npm run dev

Levanta en `http://localhost:3000`. Verificar con `GET /health`.

## Frontend

    cd frontend
    npm install
    npx ng serve

Levanta en `http://localhost:4200`. Si tienen Angular CLI instalado globalmente, pueden usar `ng serve` directo en vez de `npx ng serve`.

## Troubleshooting

**`npm install` falla con `Cannot read properties of null (reading 'edgesOut')`:**
Bug conocido y actualmente abierto en el resolutor de dependencias de npm, no relacionado con este proyecto.

    npm install --legacy-peer-deps

Si persiste, bajar la versión de npm:

    npm install -g npm@10.8.2

**`ng` no reconocido / Angular CLI no encontrado globalmente:**
No es necesario instalarlo global. Dentro de `frontend/`, usar `npx ng <comando>` (por ejemplo `npx ng serve`, `npx ng generate component ...`).

## Estructura

    backend/
      src/
        auth/         → Parte 1: usuarios, login, perfil
        viabilidad/    → Parte 2: zonas y granos viables (CENTA)
        clima/         → Parte 3: integración Open-Meteo
        siembra/       → Parte 4: registro de siembra
        estimacion/    → Parte 5: proyección de cosecha y riesgo
        events/        → Bus de eventos (EventEmitter nativo)
        config/
    frontend/          → Angular (dashboard, historial, clima zonal, configuración)
