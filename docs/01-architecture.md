# Architecture Overview

## System Diagram

```mermaid
graph TD
    User["Browser / Client"]
    FE["Frontend\nNext.js :3000"]
    GW["API Gateway\nExpress :8090"]
    US["User Service :3001"]
    BS["Book Catalog :3002"]
    OS["Order Service :3003"]
    PS["Payment Service :3004"]
    RS["Review Service :3005"]
    CS["Cart Service :3006"]
    REC["Recommendation :3007"]
    NS["Notification :3008"]
    DB["MongoDB :27017"]
    PROM["Prometheus :9091"]
    GRAF["Grafana :3030"]
    LOKI["Loki :3100"]
    PT["Promtail"]

    User --> FE
    FE --> GW
    GW --> US
    GW --> BS
    GW --> OS
    GW --> PS
    GW --> RS
    GW --> CS
    GW --> REC
    GW --> NS
    OS --> PS
    OS --> NS
    OS --> CS
    REC --> BS
    REC --> RS
    US --> DB
    BS --> DB
    OS --> DB
    RS --> DB
    CS --> DB
    REC --> DB
    PROM -->|scrape /metrics| FE
    PROM -->|scrape /metrics| GW
    PROM -->|scrape /metrics| US
    PROM -->|scrape /metrics| BS
    PROM -->|scrape /metrics| OS
    PROM -->|scrape /metrics| PS
    PROM -->|scrape /metrics| RS
    PROM -->|scrape /metrics| CS
    PROM -->|scrape /metrics| REC
    PROM -->|scrape /metrics| NS
    GRAF --> PROM
    GRAF --> LOKI
    PT -->|push logs| LOKI
```

## Services & Ports

| Service | Port | Description |
|---|---|---|
| Frontend | 3000 | Next.js UI |
| API Gateway | 8090 | Single entry point, JWT auth, proxies to services |
| User Service | 3001 | Auth: signup, login, JWT issuance |
| Book Catalog | 3002 | CRUD for books |
| Order Service | 3003 | Order lifecycle, calls payment + notification |
| Payment Service | 3004 | Payment processing (mock) |
| Review Service | 3005 | Book reviews |
| Cart Service | 3006 | Shopping cart |
| Recommendation | 3007 | Book recommendations based on reviews |
| Notification | 3008 | Email/event notifications (mock) |
| MongoDB | 27017 | Shared database |
| Prometheus | 9091 | Metrics collection |
| Grafana | 3030 | Dashboards & visualization |
| Loki | 3100 | Log aggregation |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express.js |
| Database | MongoDB 7 (Mongoose ODM) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Containerization | Docker, Docker Compose |
| Orchestration | Kubernetes (K8s) |
| CI/CD | GitHub Actions |
| Metrics | Prometheus + prom-client |
| Visualization | Grafana |
| Log Aggregation | Loki + Promtail |
| Ingress | NGINX Ingress Controller |

## Communication Pattern

- All external traffic enters through the **API Gateway**
- The API Gateway validates JWT tokens for protected routes
- Services communicate directly via Docker DNS / K8s DNS
- MongoDB is shared but each service uses its own collection
- Prometheus scrapes `/metrics` from every service every 10s
