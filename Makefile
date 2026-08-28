.PHONY: install dev-server dev-client build up down

install:
	cd server && npm install
	cd client && npm install

dev-server:
	cd server && npm run dev

dev-client:
	cd client && npm run dev

build:
	cd server && npm run build
	cd client && npm run build

up:
	docker compose up --build

down:
	docker compose down
