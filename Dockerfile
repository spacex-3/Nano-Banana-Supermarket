# 多阶段构建 - 构建前端
FROM --platform=$BUILDPLATFORM node:20-alpine AS frontend-builder

ARG TARGETPLATFORM
ARG BUILDPLATFORM

WORKDIR /app

# 复制前端 package 文件
COPY package.json package-lock.json ./
RUN npm ci

# 复制前端源代码并构建
COPY . .
RUN npm run build

# 构建 API 服务器
FROM node:20-alpine AS api-builder

WORKDIR /app

# 复制 API 服务器代码
COPY server/package.json server/package-lock.json ./
RUN npm ci --production

COPY server/server.js ./

# 最终阶段 - 运行环境
FROM node:20-alpine

WORKDIR /app

# 复制 API 服务器
COPY --from=api-builder /app .

# 复制前端构建产物
COPY --from=frontend-builder /app/dist ./public

# 复制启动脚本
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 创建 data 目录
RUN mkdir -p /app/data

# 暴露端口
EXPOSE 80

# 使用自定义启动脚本
ENTRYPOINT ["/docker-entrypoint.sh"]