# 使用多阶段构建
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

# 设置构建参数
ARG TARGETPLATFORM
ARG BUILDPLATFORM
ARG GEMINI_API_KEY
ARG API_BASE_URL

# 设置环境变量用于构建
ENV GEMINI_API_KEY=$GEMINI_API_KEY
ENV API_BASE_URL=$API_BASE_URL

WORKDIR /app

# 复制 package 文件
COPY package.json package-lock.json ./

# 安装依赖（包含 devDependencies 用于构建）
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM nginx:alpine

# 复制构建产物到 nginx 静态文件目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置（如果需要自定义）
# COPY nginx.conf /etc/nginx/nginx.conf

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]