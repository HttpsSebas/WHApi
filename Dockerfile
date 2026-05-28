# Imagen de base de Node
FROM node:20-alpine

# Carpeta de trabajo dentro del contenedor
WORKDIR /app

# Copiamos dependencias
COPY package*.json ./

# Instalamos dependencias
RUN npm install

# Puerto que usa la app
EXPOSE 3000

COPY . .

CMD ["node", "server.js"]