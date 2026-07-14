.PHONY: dev dev-down build up down logs ssl clean

dev:
	docker compose --profile development up -d
	@echo "Gateway: http://localhost:3000"
	@echo "Admin:   http://localhost:3002"
	@echo "Dashboard: http://localhost:3004"
	@echo "Grafana: http://localhost:3005"
	@echo "Prometheus: http://localhost:9090"
	@echo "Keycloak: http://localhost:8080"
	@echo "Vault: http://localhost:8200"

dev-down:
	docker compose --profile development down -v

build:
	docker compose build

up:
	docker compose --profile core --profile observability up -d

down:
	docker compose down -v

logs:
	docker compose logs -f

gateway:
	docker compose logs -f gateway

admin:
	docker compose logs -f admin

clean:
	docker compose down -v --remove-orphans
	docker system prune -f
