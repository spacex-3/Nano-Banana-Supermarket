# 使用多阶段构建
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

# 设置构建参数
ARG TARGETPLATFORM
ARG BUILDPLATFORM

WORKDIR /app

# 复制 package 文件
COPY package.json package-lock.json ./

# 安装依赖（包含 devDependencies 用于构建）
RUN npm ci

# 复制源代码
COPY . .

# 构建应用（不注入环境变量，使用运行时配置）
RUN npm run build

# 生产阶段
FROM nginx:alpine

# 复制构建产物到 nginx 静态文件目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制启动脚本
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 暴露端口
EXPOSE 80

# 使用自定义启动脚本
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]