# WHApi — Real-Time Messaging Backend

**WHApi** is a REST API developed with **Node.js and Express**, designed to power real-time messaging applications.

The project implements a client-server architecture with real-time communication through **Socket.IO**, persistent message storage, authentication, and session management.

It supports private and group conversations, message synchronization, online/offline presence, and multi-device sessions.

WHApi is a personal backend development project currently under active development, focused on exploring backend architecture, real-time communication, authentication strategies, and data management.

---

## Features

### Authentication & Security
- JWT-based authentication.
- Access and refresh token mechanism.
- Password hashing with Bcrypt.
- Authentication middleware.
- Request validation using Zod.

### Real-Time Messaging
- Private conversations.
- Group conversations.
- Instant message delivery using Socket.IO.
- Persistent message storage.
- Message synchronization.
- Automatic socket reconnection.
- Chat rooms management.

### Presence & Session Management
- Online/offline user presence.
- Active session handling.
- Multi-device support.
- Real-time connection management.

### Backend Architecture
- Layered architecture with separation of responsibilities.
- Controllers and services separation.
- Dedicated socket event handling.
- Centralized error handling.
- Middleware-based request processing.
- Database access through Prisma ORM.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express.js | REST API framework |
| PostgreSQL | Relational database |
| Prisma ORM | Database access and migrations |
| Socket.IO | Real-time bidirectional communication |
| Redis | In-memory data management |
| JWT | Authentication |
| Bcrypt | Password hashing |
| Zod | Schema validation |
| Docker | Containerization |
| Dotenv | Environment configuration |

---

## Architecture

WHApi follows a layered backend architecture designed to separate responsibilities and improve maintainability.

The application separates HTTP request handling, business logic, database operations, and real-time communication.

### Architecture overview

```text
                  CLIENT APPLICATION
                         |
             +-----------+-----------+
             |                       |
          REST API               Socket.IO
             |                       |
             v                       v
        Express Server          Socket Layer
             |                       |
             v                       v
         Middleware             Socket Events
             |                       |
             v                       v
         Controllers           Event Handlers
             |                       |
             +-----------+-----------+
                         |
                         v
                      Services
                         |
                         v
                    Prisma ORM
                         |
                         v
                    PostgreSQL

                       Redis
```

The REST API handles traditional HTTP operations, while Socket.IO manages real-time events and communication between connected clients.

---

## Project Structure

The project is organized into different layers to keep the codebase modular and maintainable.

```text
+---Backend
|   |   .env
|   |   .env.example
|   |   .gitignore
|   |   docker-compose.yml
|   |   Dockerfile
|   |   main.js
|   |   package-lock.json
|   |   package.json
|   |   prisma.config.ts
|   |   server.js
|   |   swagger.js
|   |   swagger.json
|   |   
|   +---controllers
        # HTTP request handlers
|   |       
|   +---middlewares
         # Authentication and request middlewares
|   |           
|   +---models
|   |       
|   +---prisma
|   |   \---migrations
        # Database migrations
|   |               
|   +---routes
|   |       
|   +---schema
|   |   |     
         # Request validation schemas
|   |   \---redis
|   |       |   
|   |       # Redis schemas
|   |               
|   +---services
|   |   |   
        # Business logic services
|   |   \---selects
        # Database queries
|   |           
|   +---sockets
|   |   |   
|   |   # Socket.io handlers & events
|   |           
|   \---validations
    # Request validations
|           
\---Frontend
    |   .gitignore
    |   eslint.config.js
    |   index.html
    |   package-lock.json
    |   package.json
    |   README.md
    |   vite.config.js
    |   
    +---Context
    |   # React context    
    +---Model
    |   # React models
    |         
    +---Schema
    |   # React schemas
    |       
    +---Services
    |   # React services
    |       
    +---src
    |   |   App.jsx
    |   |   index.css
    |   |   main.jsx
    |   |   Styles.css
    |   |       
    |   +---Components
    |   |   |   # React components
    |   |       
    |   \---Socket
    |       |   # Socket.io connection
    |           
    \---Wrapper
        # API requests wrapper
```

---

## Real-Time Communication

One of the main components of WHApi is its real-time communication system.

The project uses **Socket.IO** to establish persistent connections between clients and the backend.

This enables:

- Instant message delivery.
- Real-time presence updates.
- Chat room communication.
- Connection and disconnection events.
- Automatic reconnection handling.
- Message synchronization.

Socket communication complements the REST API, allowing the application to handle both traditional HTTP operations and real-time events.

---

## Data Persistence

WHApi uses **PostgreSQL** as its relational database, with **Prisma ORM** to interact with database entities.

Messages and application data are persisted, allowing conversations to remain available beyond individual socket connections.

Prisma also provides database schema management and migration support.

Redis is included in the technology stack for in-memory data management.

---

## Authentication Flow

The authentication system uses JSON Web Tokens (JWT) and refresh tokens.

The general authentication flow is:

1. The client submits its authentication credentials.
2. The backend validates the request.
3. Passwords are verified using Bcrypt.
4. The server issues authentication tokens.
5. Protected endpoints validate the access token through authentication middleware.
6. Refresh tokens allow the client to obtain new access tokens.

This approach separates authentication from the application's business logic and provides a mechanism for managing authenticated sessions.

---

## Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [Redis](https://redis.io/)
- [Docker](https://www.docker.com/) (optional)
- npm

### 1. Clone the repository

```bash
git clone https://github.com/HttpsSebas/WHApi.git
```

### 2. Navigate to the project directory

```bash
cd WHApi
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file in the project root using `.env.example` as a reference.

```bash
cp .env.example .env
```

Configure the required values according to your local environment.

### 5. Configure the database

Make sure PostgreSQL and Redis are running and that your environment configuration points to the correct instances.

Apply Prisma migrations using the project's configured migration command.

### 6. Start the server

Check the available scripts in `package.json` and run the appropriate development or production command.

---

## Docker

The repository includes a Dockerfile to support containerized execution.

Build the Docker image:

```bash
docker build -t whapi .
```

Run the container:

```bash
docker run -p 3000:3000 whapi
```

Database and Redis services must also be accessible to the application.

---

## API Testing

The REST API can be tested using tools such as:

- [Postman](https://www.postman.com/)
- [Insomnia](https://insomnia.rest/)

Socket.IO events can also be tested using a compatible Socket.IO client.

---

## Technical Challenges & Learning

This project has been an opportunity to work with backend concepts beyond basic CRUD operations.

Some of the main technical areas explored include:

- Designing a layered backend architecture.
- Implementing JWT authentication and refresh token flows.
- Managing authenticated sessions.
- Building real-time communication with Socket.IO.
- Handling socket connections and reconnections.
- Synchronizing messages between multiple devices.
- Managing online/offline user presence.
- Persisting real-time application data.
- Implementing request validation and centralized error handling.
- Working with PostgreSQL, Prisma, and Redis.

---

## Future Improvements

WHApi is still under development. Planned improvements include:

- [ ] Expand automated testing.
- [ ] Improve real-time message synchronization.
- [ ] Refine session and multi-device management.
- [ ] Improve error handling and logging.
- [ ] Optimize database queries.
- [ ] Improve scalability and performance.
- [ ] Add API documentation.
- [ ] Improve deployment and production configuration.

---

## Author

**Sebastian Infante**

Backend Developer focused on Node.js, REST APIs, database management, and real-time communication systems.
- LinkedIn: [Sebastian Infante](https://www.linkedin.com/in/sebastian-infante-7324a3275/)

---

## Project Status

**In Development**

WHApi is an ongoing personal project. Features, architecture, and implementation details may evolve as development progresses.
