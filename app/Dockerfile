# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- serve stage (nginx) ---
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
# Build:  docker build -t tik-atar app/
# Run:    docker run -p 8080:80 tik-atar   ->  http://localhost:8080
