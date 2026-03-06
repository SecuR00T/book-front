#!/bin/bash

# .env 파일 없으면 .env.example 복사
if [ ! -f .env ]; then
  cp .env.example .env
  echo ".env 파일이 생성되었습니다. 필요시 값을 수정하세요."
fi

# 공유 네트워크 생성 (이미 있으면 무시)
docker network create book-village-local-net 2>/dev/null || true

# 프론트엔드 실행
docker compose -f docker-compose-local.yml up -d --build

echo "프론트엔드가 시작되었습니다."
echo "  메인: http://localhost"
echo "  관리자: http://localhost/admin"
