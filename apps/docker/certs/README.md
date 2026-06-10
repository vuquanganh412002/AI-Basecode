# Local SSL Certificates for agrinews.jp

## Prerequisites
Install mkcert (generates locally-trusted certificates):
- macOS: `brew install mkcert nss`
- Linux: `sudo apt install mkcert`

## Generate Certificates
Run from the project root:
```bash
./scripts/generate-certs.sh
```

This creates:
- `agrinews.jp.pem` — SSL certificate
- `agrinews.jp-key.pem` — SSL private key
- `dev-private.pem` — JWT RS256 private key
- `dev-public.pem` — JWT RS256 public key

## Add local domain to /etc/hosts
```bash
./scripts/setup-hosts.sh
```

## Access
- https://agrinews.jp — Frontend
- https://agrinews.jp/api/docs — Swagger UI
- http://localhost:8025 — Mailhog UI
- http://localhost:9001 — MinIO Console
