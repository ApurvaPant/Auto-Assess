# Stage 1: Build the React application
FROM node:18-alpine as build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

# Copy all project files (including index.html at the root)
COPY . .
RUN npm run build

# Stage 2: Serve the static files with Nginx
FROM nginx:1.25-alpine

COPY --from=build /app/dist /usr/share/nginx/html
# Copy Nginx config from the root of the frontend context
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]