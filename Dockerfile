FROM node:latest as node
WORKDIR /app
COPY . .
RUN npm install
RUN npm install -g @angular/cli
RUN ng build

FROM nginx:alpine
COPY --from=node /app/dist/dsapp /usr/share/nginx/html
COPY --from=node /app/nginx-dsapp.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
