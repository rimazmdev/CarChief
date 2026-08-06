# CarChief POC Docker Runbook

## Purpose and safety boundary

This setup runs the three **compiled POC demo artifacts**. It does not build the incomplete TS/TSX source and does not connect to Firebase, Firestore, Supabase, PostgreSQL or the future ASP.NET Core BFF.

The container is intended for local or controlled internal demonstrations only. The compiled POC grants forced mock access to customer and administrator views and contains realistic sample information. Do not expose it to the public internet.

## Prerequisites

- Docker Desktop or Docker Engine with Docker Compose.
- Ports available on the local machine; the default is `127.0.0.1:8080`.
- Browser internet access if the remote fixture images must load.
- Optional: a Gemini API key for AI-assisted inventory search and FAQ lookup.

Run all commands from the repository root.

## Start the standard POC

Validate the resolved Compose configuration:

```bash
docker compose -f docker-compose.poc.yml config
```

Build and start the web container:

```bash
docker compose -f docker-compose.poc.yml up --build -d
```

Check health and logs:

```bash
docker compose -f docker-compose.poc.yml ps
docker compose -f docker-compose.poc.yml logs -f
```

Open these routes:

| Route | Demo |
|---|---|
| <http://localhost:8080/> | Public Website |
| <http://localhost:8080/customer/> | Customer Application |
| <http://localhost:8080/staff/> | Salesperson Application, including finance and administration |
| <http://localhost:8080/__reset/> | Clear this browser's POC data and reload the initial fixtures |
| <http://localhost:8080/healthz> | Container health response |

Stop the stack:

```bash
docker compose -f docker-compose.poc.yml down
```

## Demo personas and sample data

No test password is required:

- The Public Website opens without an account.
- The Customer Application route automatically opens the compiled demo customer.
- The Salesperson Application route automatically opens the compiled mock administrator.

These are forced POC personas, not real authentication accounts. Login forms, password handling and browser-side permissions must not be used to assess production security.

The compiled artifacts initialize linked sample vehicles, customers, leads, invoices, payments, shipments, documents, notifications and administrative master data in browser `localStorage`. Because all applications use the same origin, changes can be visible across the applications after refreshing the affected page.

Docker volumes are intentionally not used. Restarting or deleting the container does not clear browser data.

### Reset the fixtures

Open <http://localhost:8080/__reset/> in the same browser profile used for the demo. The helper clears local/session storage, Cache Storage and service-worker registrations, then reloads the Public Website so the original fixtures initialize again.

For a completely isolated demonstration, use a new private/incognito browser window.

## Optional Gemini AI profile

The default web container does not require a key. Standard filters, static FAQ browsing and confident local heuristic searches continue to work. A complex AI request receives a controlled `503` response when the AI profile is not running.

To enable the existing `/api/search` and `/api/faq-ask` handlers:

1. Create a local environment file:

   ```bash
   cp docker/poc/.env.example docker/poc/.env
   ```

2. Add a valid `GEMINI_API_KEY` to `docker/poc/.env`. This file is ignored by the repository's `.gitignore`; verify with `git status` before continuing.

3. Start the stack with the AI profile:

   ```bash
   docker compose \
     --env-file docker/poc/.env \
     -f docker-compose.poc.yml \
     --profile ai \
     up --build -d
   ```

4. Confirm both services are healthy:

   ```bash
   docker compose \
     --env-file docker/poc/.env \
     -f docker-compose.poc.yml \
     --profile ai \
     ps
   ```

The key is passed to the AI container only at runtime and is not copied into either image. Do not print the resolved environment, share AI-container inspection output or commit the local environment file.

Enabling the profile sends the fixture vehicle/FAQ content included in each AI request to Google. Use only approved demonstration data.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `CARCHIEF_BIND_ADDRESS` | `127.0.0.1` | Interface exposed by Docker; retain the default for local use |
| `CARCHIEF_POC_PORT` | `8080` | Host port for all three applications |
| `GEMINI_API_KEY` | Empty | Optional AI profile credential |

To use another local port without creating an environment file:

```bash
CARCHIEF_POC_PORT=8090 docker compose -f docker-compose.poc.yml up --build -d
```

Then use `http://localhost:8090/` and the corresponding application paths.

## Suggested demonstration

1. Reset the fixtures.
2. On the Public Website, search stock, open a vehicle, calculate freight and submit an enquiry.
3. Open the Customer Application and review the dashboard, vehicles, PI/invoice, payment, shipment, document and notification views.
4. Open the Salesperson Application and demonstrate inventory, leads, reservations, PI, finance and administration screens.
5. Change a mock record, refresh the corresponding application and verify the shared browser fixture changed.
6. Reset again and confirm the original scenario returns.

## Limitations

- The POC source cannot currently be rebuilt because required customer, Firebase, Firestore cache and audit modules are absent. Docker deliberately serves the supplied compiled artifacts instead.
- The supplied package manifest and lockfile are also out of sync. The optional AI build reconciles and audits only its temporary image-layer dependency set; repository files are not changed.
- Mock CRUD persists only in the current browser origin/profile.
- Document links represented by placeholders do not become real downloadable files.
- PayPal, email, WhatsApp, carrier tracking and similar labels remain UI demonstrations unless separately integrated.
- Remote vehicle imagery requires internet access and can be unavailable or rate-limited.
- The POC service worker is removed automatically on `localhost`; the reset route also clears any prior registration and cache.
- Optional AI behavior depends on the external Gemini service, account entitlement, quota and the model referenced by the existing server code.

## Troubleshooting

### Docker cannot connect to the daemon

Start Docker Desktop/Engine, wait for it to report ready, then rerun:

```bash
docker info
docker compose -f docker-compose.poc.yml up --build -d
```

### Port 8080 is already in use

Use another local port:

```bash
CARCHIEF_POC_PORT=8090 docker compose -f docker-compose.poc.yml up -d
```

### Old or unexpected demo records appear

Open `/__reset/` on the same host and port. Browser storage is separated by origin, so changing the port creates a different dataset.

### AI requests report unavailable

Confirm the `ai` profile is running, the environment file contains a valid key and the AI container is healthy:

```bash
docker compose \
  --env-file docker/poc/.env \
  -f docker-compose.poc.yml \
  --profile ai \
  logs poc-ai
```

Do not paste logs into tickets or chat until they have been checked for sensitive content.

### Images do not appear

Confirm the browser can reach the remote image hosts. Images are not embedded in the container.
