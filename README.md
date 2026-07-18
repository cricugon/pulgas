# Las Pulgas Fantasy

App web cliente-servidor mobile-first tipo Comunio/Biwenger, hecha con HTML, CSS y JS nativos en el cliente, Node/Express en servidor y MongoDB como base de datos.

## Funcionalidades incluidas

- Registro e inicio de sesion con email y password.
- Usuarios con equipo propio, presupuesto en euros, plantilla y puntos acumulados.
- Administradores sin equipo de juego, dedicados solo a gestionar la liga.
- Presupuesto inicial configurable para nuevos equipos desde el panel admin.
- Mercado simulado de jugadores con compra y venta.
- Jugadores asociados a clubes reales.
- Jornadas con partidos entre clubes reales.
- Fecha y hora configurable para cada partido.
- Alineaciones de futbol 7 por jornada con limite de presupuesto, selector de formacion y editor visual sobre campo.
- Al iniciar una jornada se bloquea el equipo/alineacion activa de cada usuario.
- Puntuaciones por jugador y recalculo automatico de puntos de alineaciones.
- Al finalizar una jornada se suman los puntos y se actualiza la clasificacion general.
- Panel admin para gestionar configuracion, jugadores, clubes, equipos de usuario, jornadas, partidos, estados y puntuaciones.
- Interfaz mobile-first oscura, deportiva y futurista.
- Portal editorial independiente `Mundo Las Pulgas` con noticias, archivo, eventos, estados de jugadores y alineaciones probables.

## Mundo Las Pulgas

El portal publico esta disponible en:

```text
http://localhost:3000/mundolaspulgas
```

El panel editorial no aparece enlazado en ningun menu y utiliza una cuenta distinta a la administracion de la liga:

```text
http://localhost:3000/mundolaspulgas/gestion-editorial-7
```

La primera vez, inicia sesion como administrador principal en la app y abre esa ruta en el mismo navegador. El formulario inicial permite crear la cuenta editorial; una vez creada, la configuracion inicial queda cerrada y solo se muestra su login propio.

## Requisitos

- Node 20 o superior.
- MongoDB local o remoto.

## Puesta en marcha

1. Instala dependencias:

```bash
npm install
```

2. Crea un `.env` a partir de `.env.example` y ajusta `MONGODB_URI` si hace falta.

En produccion, establece `PUBLIC_BASE_URL` con el dominio publico HTTPS de la app. Se utiliza para generar la imagen, URL y metadatos sociales de cada noticia.

3. Arranca MongoDB.

4. Carga datos de demo:

```bash
npm run seed
```

5. Inicia la app:

```bash
npm run dev
```

La app quedara en `http://localhost:3000`.

## Usuarios demo

- Admin: `admin@pulgasleague.test` / `123456`
- Jugador: `demo@pulgasleague.test` / `123456`

## Endpoints principales

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/market`
- `POST /api/market/buy/:playerId`
- `POST /api/market/sell/:playerId`
- `GET /api/gameweeks`
- `GET /api/gameweeks/active`
- `POST /api/lineups/:gameweekId`
- `GET /api/leaderboard`
- `GET /api/admin/summary`
- `POST /api/admin/players`
- `PATCH /api/admin/teams/:id`
- `POST /api/admin/gameweeks/:id/matches/:matchId/scores`
