# Langkah 1: Build aplikasi menggunakan Node.js
FROM node:18-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# SUNTIKKAN VARIABEL SAMARAN UNTUK MEMBYPASS ERROR FETCH SAAT COMPILING
ENV VITE_SUPABASE_URL=http://localhost:8000
ENV VITE_SUPABASE_ANON_KEY=placeholder_key
ENV SUPABASE_SERVICE_ROLE_KEY=placeholder_key

RUN npm run build

# Langkah 2: Jalankan aplikasi menggunakan web server Nginx yang ringan
FROM nginx:stable-alpine AS production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
