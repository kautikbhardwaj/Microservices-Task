# Skill Test 2 â€” Microservices Deployment on Kubernetes (Minikube)

Deployment of four Node.js microservices on Minikube with ClusterIP service discovery, health probes, resource limits, and an optional Ingress layer.

**Repository:** https://github.com/kautikbhardwaj/Microservices-Task
**Author:** Kautik Bhardwaj (bhardwajkautik@gmail.com)

---

## 1. Architecture

| Service | Container Port | K8s Service Name | Service Type | Endpoints |
|---|---|---|---|---|
| User Service | 3000 | `user-service` | ClusterIP | `/health`, `/users` |
| Product Service | 3001 | `product-service` | ClusterIP | `/health`, `/products` |
| Order Service | 3002 | `order-service` | ClusterIP | `/health`, `/orders` (GET, POST) |
| Gateway Service | 3003 | `gateway-service` | NodePort (30003) | `/health`, `/api/users`, `/api/products`, `/api/orders` |

Gateway calls backends by DNS name inside the cluster:

```
gateway-service  â”€â”€â–º  http://user-service:3000/users
                 â”€â”€â–º  http://product-service:3001/products
                 â”€â”€â–º  http://order-service:3002/orders
```

Service names in `services/*.yaml` intentionally match the hostnames hardcoded in `gateway-service/app.js`, so CoreDNS resolves them without code changes.

---

## 2. Repository / Submission Structure

```
submission/
â”œâ”€â”€ deployments/
â”‚   â”œâ”€â”€ user-service.yaml
â”‚   â”œâ”€â”€ product-service.yaml
â”‚   â”œâ”€â”€ order-service.yaml
â”‚   â””â”€â”€ gateway-service.yaml
â”œâ”€â”€ services/
â”‚   â”œâ”€â”€ user-service.yaml
â”‚   â”œâ”€â”€ product-service.yaml
â”‚   â”œâ”€â”€ order-service.yaml
â”‚   â””â”€â”€ gateway-service.yaml
â”œâ”€â”€ ingress/
â”‚   â””â”€â”€ ingress.yaml
â”œâ”€â”€ screenshots/
â”‚   â”œâ”€â”€ pods.png
â”‚   â”œâ”€â”€ logs.png
â”‚   â””â”€â”€ service-test.png
â””â”€â”€ README.md
```

---

## 3. Prerequisites

* Docker Desktop / Docker Engine
* Minikube â‰¥ 1.32
* kubectl â‰¥ 1.28
* Source code of the four services (cloned from the repository above)

---

## 4. Minikube Setup

```bash
minikube start --driver=docker --cpus=2 --memory=4096
minikube status
kubectl config use-context minikube
kubectl get nodes
```

---

## 5. Build the Images

The manifests use `imagePullPolicy: IfNotPresent`, so images built directly inside Minikube's Docker daemon are used without any registry.

```bash
# Point the local Docker CLI at Minikube's Docker daemon
eval $(minikube docker-env)          # Linux / macOS
# minikube docker-env | Invoke-Expression   # Windows PowerShell

cd Microservices-Task

docker build -t kautikbhardwaj/user-service:v1     ./user-service
docker build -t kautikbhardwaj/product-service:v1  ./product-service
docker build -t kautikbhardwaj/order-service:v1    ./order-service
docker build -t kautikbhardwaj/gateway-service:v1  ./gateway-service

docker images | grep kautikbhardwaj
```

<details>
<summary>Alternative: pull from Docker Hub instead of building locally</summary>

```bash
docker login
docker push kautikbhardwaj/user-service:v1
docker push kautikbhardwaj/product-service:v1
docker push kautikbhardwaj/order-service:v1
docker push kautikbhardwaj/gateway-service:v1
```
The image references in the manifests stay the same.
</details>

---

## 6. Deploy

```bash
cd submission

# Services first, so DNS records exist before the gateway starts
kubectl apply -f services/
kubectl apply -f deployments/

# Or apply everything recursively
kubectl apply -f . --recursive
```

Verify:

```bash
kubectl get pods -o wide
kubectl get svc
kubectl get deployments
kubectl rollout status deployment/gateway-service
```

Expected: 8 pods (2 replicas Ã— 4 services) in `Running` / `READY 1/1`.

---

## 7. Testing Service Communication

### 7.1 Port-forward the gateway

```bash
kubectl port-forward svc/gateway-service 3003:3003
```

In a second terminal:

```bash
curl http://localhost:3003/health
curl http://localhost:3003/api/users
curl http://localhost:3003/api/products
curl http://localhost:3003/api/orders

curl -X POST http://localhost:3003/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"productId":2}'
```

### 7.2 NodePort access

```bash
minikube service gateway-service --url
curl $(minikube service gateway-service --url)/api/products
```

### 7.3 In-cluster DNS test (proves ClusterIP discovery)

```bash
kubectl run curl-test --image=curlimages/curl:8.5.0 -it --rm --restart=Never -- sh

# inside the pod:
curl http://user-service:3000/users
curl http://product-service:3001/products
curl http://order-service:3002/orders
curl http://gateway-service:3003/api/users
exit
```

### 7.4 Logs showing inter-service communication

```bash
kubectl logs -l app=gateway-service --tail=50
kubectl logs -l app=user-service --tail=50
kubectl logs deployment/gateway-service -c wait-for-backends
```

### 7.5 Individual service port-forwards

```bash
kubectl port-forward svc/user-service 3000:3000
kubectl port-forward svc/product-service 3001:3001
kubectl port-forward svc/order-service 3002:3002
```

---

## 8. Bonus â€” Ingress

```bash
minikube addons enable ingress
kubectl get pods -n ingress-nginx

kubectl apply -f ingress/ingress.yaml
kubectl get ingress
```

Map the host:

```bash
echo "$(minikube ip) microservices.local" | sudo tee -a /etc/hosts
# Windows: add "<minikube ip> microservices.local" to C:\Windows\System32\drivers\etc\hosts
```

Test the routes:

```bash
curl http://microservices.local/api/users      # â†’ user-service /users
curl http://microservices.local/api/products   # â†’ product-service /products
curl http://microservices.local/api/orders     # â†’ order-service /orders
curl http://microservices.local/health         # â†’ gateway-service /health
```

Each path rule uses its own `nginx.ingress.kubernetes.io/rewrite-target` annotation, because the backend services expose `/users`, `/products` and `/orders` â€” not `/api/...`.

If `minikube tunnel` is needed (Docker driver on macOS/Windows):

```bash
minikube tunnel
curl -H "Host: microservices.local" http://127.0.0.1/api/users
```

---

## 9. Screenshots

| File | Command captured |
|---|---|
| `screenshots/pods.png` | `kubectl get pods -o wide` + `kubectl get svc` |
| `screenshots/logs.png` | `kubectl logs -l app=gateway-service` showing backend calls |
| `screenshots/service-test.png` | `kubectl port-forward` + `curl` responses from `/api/users`, `/api/products`, `/api/orders` |

---

## 10. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `ErrImagePull` / `ImagePullBackOff` | Image not present in Minikube's Docker daemon | Run `eval $(minikube docker-env)` **before** `docker build`, then `kubectl rollout restart deployment/<name>` |
| Pod stuck in `Init:0/1` | Backend services not reachable yet | `kubectl get svc` â€” confirm `user-service`, `product-service`, `order-service` exist with the exact names |
| Gateway returns `{"error":"Error fetching users"}` | DNS name or port mismatch | Service `metadata.name` must be `user-service`/`product-service`/`order-service`; ports 3000/3001/3002 |
| `CrashLoopBackOff` | App crashed on start | `kubectl logs <pod> --previous`, `kubectl describe pod <pod>` |
| Readiness probe failing | Wrong path/port | Probes must hit `/health` on the container port; check `kubectl describe pod <pod>` events |
| `0/1 nodes available: insufficient memory` | Limits too high for the Minikube VM | `minikube start --memory=4096` or lower `resources.limits` |
| Port-forward drops connection | Pod restarted | Re-run the `kubectl port-forward` command |
| Ingress returns 404 | Addon not ready or host not mapped | `kubectl get pods -n ingress-nginx`, verify `/etc/hosts` entry, use `-H "Host: microservices.local"` |
| `connection refused` on NodePort | Wrong IP | Use `minikube service gateway-service --url` instead of `localhost` |

Useful diagnostics:

```bash
kubectl describe pod <pod-name>
kubectl get events --sort-by=.lastTimestamp
kubectl get endpoints
kubectl exec -it <gateway-pod> -- wget -qO- http://user-service:3000/users
```

---

## 11. Cleanup

```bash
kubectl delete -f ingress/ingress.yaml
kubectl delete -f deployments/
kubectl delete -f services/
minikube stop
# minikube delete
```

---

## 12. Notes from the actual run

### order-service replicas
order-service stores orders in an in-memory array, so it runs with 1 replica. With 2 replicas the ClusterIP load-balances POST and GET to different pods and a created order appears missing. user-service, product-service and gateway-service are stateless and run 2 replicas each. Scaling order-service horizontally requires an external datastore.

### Ingress on Windows (Docker driver)
With the Docker driver on Windows the ingress controller is not reachable at the address shown by kubectl get ingress. Run minikube tunnel in an Administrator PowerShell and map 127.0.0.1 microservices.local in C:\Windows\System32\drivers\etc\hosts.

### PowerShell curl quoting
PowerShell mangles inline JSON. Use the stop-parsing token:

```powershell
curl.exe --% -X POST http://localhost:3003/api/orders -H "Content-Type: application/json" -d "{\"userId\":1,\"productId\":2}"
```

---

## 12. Notes from the actual run

### order-service replicas
order-service stores orders in an in-memory array, so it runs with 1 replica. With 2 replicas the ClusterIP load-balances POST and GET to different pods and a created order appears missing. user-service, product-service and gateway-service are stateless and run 2 replicas each. Scaling order-service horizontally requires an external datastore.

### Ingress on Windows (Docker driver)
With the Docker driver on Windows the ingress controller is not reachable at the ADDRESS shown by kubectl get ingress. Run 'minikube tunnel' in an Administrator PowerShell and add '127.0.0.1 microservices.local' to C:\Windows\System32\drivers\etc\hosts.

### PowerShell curl quoting
PowerShell mangles inline JSON bodies. Use the stop-parsing token --% before the curl.exe arguments when sending POST requests.

### Screenshots captured
- pods.png : kubectl get pods -o wide and kubectl get svc
- logs.png : init container output, gateway logs, and in-cluster DNS calls to all three backends
- service-test.png : port-forward + curl on all gateway routes including POST
- ingress.png : all four ingress routes via microservices.local
