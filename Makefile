.PHONY: up down build logs clean lint deploy-k8s ps restart

up:
	docker-compose up -d

down:
	docker-compose down

build:
	docker-compose build

logs:
	docker-compose logs -f

ps:
	docker-compose ps

restart:
	docker-compose restart

clean:
	docker-compose down -v --rmi all

lint:
	npm run lint

deploy-k8s:
	bash k8s/deploy.sh

monitoring:
	@echo "Prometheus: http://localhost:9091"
	@echo "Grafana:    http://localhost:3030  (admin/admin)"
	@echo "Loki:       http://localhost:3100"
