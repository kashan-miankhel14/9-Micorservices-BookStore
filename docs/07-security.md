# Security Guide

## What's Secured

### Secrets Management

**Local (Docker Compose)**
- All secrets live in `.env` which is gitignored
- `.env.example` is committed — it shows the shape of config without real values
- `docker-compose.yml` reads from `.env` via `${VAR}` syntax — no hardcoded values

**Kubernetes**
- Secrets in `k8s/secret.yaml` use `stringData` for readability
- In real production, replace with one of:
  - **Sealed Secrets** (Bitnami) — encrypt secrets before committing
  - **External Secrets Operator** — pull from AWS Secrets Manager / Vault
  - **AWS Secrets Manager** + IRSA (for EKS)

### Authentication

- JWT tokens issued by `user-service`, validated by `api-gateway`
- Protected routes: `/orders`, `/cart`, `/payments`, `/notify`
- Public routes: `/users` (signup/login), `/books`, `/reviews`, `/recs`
- Tokens expire in 7 days

### Network Security (Kubernetes)

`k8s/network-policy.yaml` implements zero-trust networking:

```
Internet → Ingress Controller → Frontend
Frontend → API Gateway
API Gateway → Microservices
Microservices → MongoDB (only the ones that need it)
Prometheus → All pods (scraping only)
Everything else: DENIED
```

This means even if one service is compromised, it cannot reach services it has no business talking to.

## What to Harden for Real Production

### High Priority

1. **Rotate JWT secret** — use a long random string, store in Secrets Manager
2. **MongoDB auth** — change default `root/example` credentials
3. **HTTPS** — add TLS to the Ingress:
   ```yaml
   # k8s/ingress.yaml
   tls:
     - hosts: [yourdomain.com]
       secretName: tls-secret
   ```
   Use cert-manager with Let's Encrypt for automatic TLS.

4. **CORS** — restrict `cors-allow-origin` in Ingress from `*` to your actual domain
5. **Rate limiting** — add to API Gateway or Ingress:
   ```yaml
   nginx.ingress.kubernetes.io/limit-rps: "10"
   ```

### Medium Priority

6. **Non-root containers** — add to all Dockerfiles:
   ```dockerfile
   RUN addgroup -S app && adduser -S app -G app
   USER app
   ```
7. **Read-only filesystem** — add to K8s deployments:
   ```yaml
   securityContext:
     readOnlyRootFilesystem: true
   ```
8. **Resource limits** — already set in K8s manifests, verify they're appropriate
9. **Image scanning** — add Trivy to CI pipeline to scan for CVEs:
   ```yaml
   - uses: aquasecurity/trivy-action@master
     with:
       image-ref: ghcr.io/${{ github.repository_owner }}/bookstore-api-gateway:${{ github.sha }}
   ```

### Lower Priority (but good to know)

10. **Pod Security Standards** — add `pod-security.kubernetes.io/enforce: restricted` label to namespace
11. **Audit logging** — enable K8s audit logs on the cluster
12. **Grafana auth** — change default `admin/admin` password, or integrate with OAuth (GitHub, Google)
13. **MongoDB network exposure** — in production, MongoDB should NOT have a NodePort or LoadBalancer service. ClusterIP only.
