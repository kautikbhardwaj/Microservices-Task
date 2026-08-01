# Microservices Docker Deployment

Four Node.js microservices containerized with Docker and orchestrated via Docker Compose.

| Service          | Port | Entry Point | Container Name   |
|------------------|------|-------------|------------------|
| User Service     | 3000 | app.js      | user-service     |
| Product Service  | 3001 | app.js      | product-service  |
| Order Service    | 3002 | app.js      | order-service    |
| Gateway Service  | 3003 | app.js      | gateway-service  |

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (v20+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2+)

```bash
docker --version
docker compose version
```

---

## Project Structure

```
submission/
├── user-service/
│   ├── Dockerfile
│   ├── app.js
│   └── package.json
├── product-service/
│   ├── Dockerfile
│   ├── app.js
│   └── package.json
├── order-service/
│   ├── Dockerfile
│   ├── app.js
│   └── package.json
├── gateway-service/
│   ├── Dockerfile
│   ├── app.js
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## Setup & Run

```bash
# 1. Build and start all services
docker compose up --build

# 2. Run in background (detached)
docker compose up --build -d

# 3. Stop all services
docker compose down
```

---

## Testing Each Service

### Health Checks
```bash
curl http://localhost:3000/health   # User Service
curl http://localhost:3001/health   # Product Service
curl http://localhost:3002/health   # Order Service
curl http://localhost:3003/health   # Gateway Service
```

### Direct Service Endpoints
```bash
curl http://localhost:3000/users      # Get all users
curl http://localhost:3001/products   # Get all products
curl http://localhost:3002/orders     # Get all orders
```

### Via Gateway (port 3003)
```bash
curl http://localhost:3003/api/users      # Proxied → user-service
curl http://localhost:3003/api/products   # Proxied → product-service
curl http://localhost:3003/api/orders     # Proxied → order-service

# Create an order via gateway
curl -X POST http://localhost:3003/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "productId": 2}'
```

### Check running containers
```bash
docker compose ps
```

### View logs
```bash
docker compose logs -f                   # All services
docker compose logs -f gateway-service   # Single service
```

---

## Inter-Service Communication

Services communicate over `microservices-network` bridge network using container names as hostnames:

| Gateway Route      | Internal URL                          |
|--------------------|---------------------------------------|
| `/api/users`       | `http://user-service:3000/users`      |
| `/api/products`    | `http://product-service:3001/products`|
| `/api/orders`      | `http://order-service:3002/orders`    |

---

## Troubleshooting

### Port already in use
```bash
# Check what's using the port
netstat -ano | findstr :3000        # Windows
lsof -i :3000                       # Mac/Linux

# Change host port in docker-compose.yml
ports:
  - "4000:3000"   # host:container
```

### Container exits immediately
```bash
docker compose logs <service-name>
```

### Rebuild after changes
```bash
docker compose up --build
```

### Clean reset
```bash
docker compose down -v --remove-orphans
docker compose up --build
```
