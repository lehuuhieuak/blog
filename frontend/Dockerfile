FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG API_URL=http://api:8080/api/v1
ARG PUBLIC_API_URL=http://localhost:8080/api/v1
ARG SITE_URL=http://localhost:4321
ARG SITE_NAME
ARG SITE_AUTHOR
ARG SITE_DESCRIPTION
ARG SITE_SOCIAL_URL
ENV API_URL=$API_URL \
    PUBLIC_API_URL=$PUBLIC_API_URL \
    SITE_URL=$SITE_URL \
    SITE_NAME=$SITE_NAME \
    SITE_AUTHOR=$SITE_AUTHOR \
    SITE_DESCRIPTION=$SITE_DESCRIPTION \
    SITE_SOCIAL_URL=$SITE_SOCIAL_URL
RUN npm run build

FROM node:24-alpine AS web
WORKDIR /app
ENV HOST=0.0.0.0 \
    PORT=4321 \
    NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
