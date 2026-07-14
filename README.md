# 북촌(BookVillage) 프론트엔드 — React (스토어프론트 + 관리자)

> **⚠️ 경고: 본 프로젝트는 모의해킹 실습을 목적으로 취약점을 의도적으로 삽입한 학습용 애플리케이션입니다.** 실제 운영 환경에 그대로 배포하지 마십시오.

`오늘모해` 팀(GitHub Organization: [SecuR00T](https://github.com/SecuR00T))이 구축한 온라인 서점 서비스 **북촌(BookVillage)**의 **프론트엔드** 저장소입니다. 일반 사용자용 스토어프론트(`bookvillage`)와 관리자 페이지(`admin`) 두 개의 독립된 React SPA, 그리고 이 둘을 하나의 Nginx로 서빙하는 리버스 프록시 설정으로 구성되어 있습니다.

전체 프로젝트 개요, 서비스 소개, 시스템 아키텍처, AWS 배포 구성은 [book-back README](https://github.com/SecuR00T/book-back#readme)를 참고하세요. 이 프로젝트는 3개의 저장소로 분리되어 있습니다.

| 저장소 | 역할 |
| --- | --- |
| [book-back](https://github.com/SecuR00T/book-back) | Spring Boot 백엔드 API + 프로젝트 전체 개요 |
| **[book-front](https://github.com/SecuR00T/book-front)** (본 저장소) | React 프론트엔드 (스토어프론트 + 관리자 페이지) |
| [book-android](https://github.com/SecuR00T/book-android) | Android WebView 하이브리드 앱 |

## 목차

- [1. 프로젝트 소개](#1-프로젝트-소개)
- [2. 아키텍처](#2-아키텍처)
- [3. 기술 스택](#3-기술-스택)
- [4. 프로젝트 구조](#4-프로젝트-구조)
- [5. 주요 기능](#5-주요-기능)
- [6. 주요 취약점](#6-주요-취약점)
- [7. 빌드 및 실행 방법](#7-빌드-및-실행-방법)
- [8. 관련 문서](#8-관련-문서)

---

## 1. 프로젝트 소개

`bookvillage`(일반 사용자용 스토어프론트)와 `admin`(관리자 페이지)은 각각 독립적으로 빌드되는 Vite + React SPA이며, 하나의 Nginx가 두 정적 빌드 산출물을 서빙하면서 `/api`, `/admin/api` 요청을 백엔드로 프록시합니다. 두 앱 모두 모의해킹 실습을 위해 XSS, 취약한 토큰 저장, 클라이언트 전용 권한 판단 등의 취약점이 의도적으로 삽입되어 있습니다.

## 2. 아키텍처

- **두 개의 독립 SPA**: `bookvillage/`(스토어프론트), `admin/`(관리자 페이지) — 각자 별도의 `package.json`, `vite.config.js`를 가짐
- **상태 관리**: Redux 없이 React Context(`bookvillage`: `AuthContext` + `CartContext`, `admin`: `AuthContext`) + `@tanstack/react-query`
- **라우팅**: 두 앱 모두 React Router v6. `admin`은 `import.meta.env.BASE_URL`(`/admin/`) 기반 `basename` 사용
- **API 통신**:
  - `bookvillage/src/api/client.js` — `fetch` 래퍼, `API_BASE = "/api"`. 세션 토큰(`bookvillage_session_token`)을 **sessionStorage**에 저장하고 `X-Session-Token` 헤더로 전송(쿠키와 중복 전송)
  - `admin/src/api/client.js` — `BASE_URL = import.meta.env.VITE_API_BASE_URL || "/admin/api"`. 토큰(`accessToken`)을 "로그인 상태 유지" 체크박스에 따라 **localStorage 또는 sessionStorage**에 저장, `Authorization: Bearer` 헤더로 전송
- **Nginx**(`nginx/default.conf.template`): 하나의 오리진에서 `/` → bookvillage 정적 파일, `/admin/` → admin 정적 파일, `/api/` `/admin/api/` → 백엔드 프록시(`${BV_BACKEND_HOST}:${BV_BACKEND_PORT}`, `${ADMIN_BACKEND_HOST}:${ADMIN_BACKEND_PORT}`)를 처리

## 3. 기술 스택

| 구분 | 기술 |
| --- | --- |
| 프레임워크 | React 18.3 |
| 라우팅 | React Router DOM 6.30 |
| 서버 상태 | @tanstack/react-query 5.83 |
| 빌드 도구 | Vite 5.4 |
| 웹 서버 | Nginx 1.27(alpine) |
| 컨테이너 | Docker(멀티스테이지: Node 20-alpine 빌드 → Nginx 런타임) |
| 테스트 | Vitest |

## 4. 프로젝트 구조

```
book-front/  (저장소 루트)
├── bookvillage/                 일반 사용자용 스토어프론트
│   ├── src/
│   │   ├── api/client.js        fetch 래퍼, 세션 토큰 헤더 처리
│   │   ├── context/              AuthContext, CartContext
│   │   ├── components/           Header, PopupModal 등
│   │   └── pages/                Index, BookDetail, Cart, Checkout, Orders,
│   │                             CustomerService, Board, Security(취약점 실습 랩) 등
│   ├── vite.config.js
│   └── Dockerfile
├── admin/                        관리자 페이지
│   ├── src/
│   │   ├── api/client.js         Bearer 토큰 기반 API 클라이언트
│   │   ├── contexts/AuthContext.jsx
│   │   └── pages/                Dashboard, Products, Orders, Customers,
│   │                             Notices, Popups, Payments, CustomerService 등
│   ├── vite.config.js
│   └── Dockerfile
├── nginx/default.conf.template   리버스 프록시 설정 (envsubst로 백엔드 호스트 주입)
├── Dockerfile                    루트: bookvillage + admin + nginx 통합 빌드
├── docker-compose-local.yml / docker-compose-ope.yml
├── .env.example
└── PENTEST_SCENARIOS.md          모의해킹 시나리오 상세 문서
```

## 5. 주요 기능

### bookvillage (스토어프론트)

홈/도서 목록(`Index`, `BookSearch`), 도서 상세·리뷰·"책 미리보기"(`BookDetail`), 장바구니(`Cart`), 결제(`Checkout`), 주문/주문상세(`Orders`, `OrderDetail`), 비회원 주문 조회, 마이페이지(계정/활동/포인트), 고객센터(공지·FAQ·1:1 문의 탭, `CustomerService`), 문의 목록/상세(`CustomerInquiryList`, `CustomerInquiryDetail`), 회원 게시판(글/댓글/첨부, `Board`, `BoardDetail`, `BoardWrite`), 계정 복구, 약관/개인정보처리방침, 업데이트/광고 팝업(`PopupModal`), 그리고 48개 취약점 실습 시나리오를 다루는 `Security` 랩 페이지.

### admin (관리자 페이지)

대시보드, 상품(도서) CRUD 및 이미지 업로더, 주문 목록/상세, 고객 목록/상세, 재고 관리, 고객센터(1:1 문의 답변), 모니터링, 쿠폰, 리뷰 관리, **공지사항**(파일 업로드 포함), **팝업 관리**(이미지 업로드 + 링크 URL — 앱에 노출되는 "업데이트" 팝업을 여기서 등록), 결제 관리, 설정.

## 6. 주요 취약점

> 백엔드/모바일 취약점은 [book-back README](https://github.com/SecuR00T/book-back#8-주요-취약점), [book-android README](https://github.com/SecuR00T/book-android#5-주요-취약점)를 참고하세요. 각 취약점이 실제 공격 시나리오로 이어지는 흐름은 [PENTEST_SCENARIOS.md](PENTEST_SCENARIOS.md)에서 다룹니다.

| 분류 | 위치 | 설명 |
| --- | --- | --- |
| Stored/반사형 XSS | `admin/src/pages/CustomerService.jsx:129`(1:1 문의 내용), `bookvillage/src/pages/CustomerInquiryDetail.jsx:118`(관리자 답변), `bookvillage/src/pages/BookDetail.jsx:407,471-472`(리뷰), `BoardDetail.jsx:383,512`(게시글/댓글), `Board.jsx:143` / `BookSearch.jsx:254`(검색어 반사) | `dangerouslySetInnerHTML`로 사용자 입력을 그대로 렌더링, DOMPurify 등 새니타이징 라이브러리 미사용 |
| 취약한 토큰 저장 | `bookvillage/src/api/client.js`(sessionStorage), `admin/src/contexts/AuthContext.jsx:39-41,129-142`(localStorage/sessionStorage 선택형) | XSS 발생 시 스크립트로 토큰 탈취 가능(특히 admin의 localStorage 영속 토큰) |
| 비-HttpOnly 쿠키 자동 로그인 | `admin/src/contexts/AuthContext.jsx:44-47,97-100`, `admin/src/api/auth.js:10-22` | `SESSION_TOKEN` 쿠키를 `document.cookie`로 직접 읽어 관리자 자동 로그인(`/admin/api/auth/session-login`) 처리 |
| URL 쿼리로 토큰 주입 | `admin/src/contexts/AuthContext.jsx:78-85` | `?accessToken=` 쿼리 파라미터를 그대로 sessionStorage에 저장("Android 앱 딥링크 연동" 목적) |
| 관리자 접근 시 IP 검증 우회 경로 | `bookvillage/src/components/Header.jsx:18-33` | 쿠키+IP 이중 검증(`/api/auth/cookie-login`)을 우회하는 공격 흐름이 주석으로 명시됨. Nginx가 `X-Forwarded-For`를 그대로 백엔드로 전달해 스푸핑 가능 |
| SSRF 트리거 UI | `bookvillage/src/pages/BookDetail.jsx:217-235`(`openImagePreview`) | "책 미리보기" 기능이 내부 `url` 파라미터를 `GET /api/books/{id}/image-proxy?url=`로 그대로 백엔드에 전달 |
| 업로드 확장자 미검증 | `admin/src/pages/Notices.jsx:100-107`, `bookvillage/src/pages/BoardWrite.jsx:183-191`, `BoardDetail.jsx:393-402` | `<input type="file">`에 `accept` 제한이 없어 임의 확장자 업로드 가능(클라이언트 검증에 불과) |
| 클라이언트 전용 권한 표시 | `bookvillage/src/context/AuthContext.jsx:84` | `isAdmin` 판단이 세션 캐시 값(`user.role`)에만 의존, 실질적 강제는 서버 몫 |
| 시크릿이 포함된 빌드 산출물 | 루트 `Dockerfile:31-36` | 이미지 빌드 시 `/backup/`에 DB 계정·AWS 키·JWT 시크릿·관리자 비밀번호 파일(`db_config.bak`, `config.xml.old`, `notes.txt`) 생성 |
| Nginx 설정 취약점 | `nginx/default.conf.template` | `/backup/`, `/uploads/`에 `autoindex on`(디렉터리 리스팅 활성화), CSP/X-Frame-Options 등 보안 헤더 전무, `robots.txt`가 `/admin/`, `/backup/`, `/uploads/` 등 민감 경로를 오히려 나열 |
| 팝업 기반 피싱 다운로드 연동 | `bookvillage/src/components/PopupModal.jsx` | 관리자가 등록한 임의 `linkUrl`(APK 등)을 검증 없이 다운로드/실행 유도(Android WebView 연동 포함) |

## 7. 빌드 및 실행 방법

요구사항: Node.js 20

```bash
# bookvillage(스토어프론트) 개발 서버
cd bookvillage
npm ci
npm run dev      # http://localhost:3000, /api 등은 vite dev proxy로 백엔드(8080)에 연결

# admin(관리자 페이지) 개발 서버
cd ../admin
npm ci
npm run dev
```

- `.env.example`(루트)을 참고해 `VITE_BACKEND_TARGET`(dev proxy 대상), `BV_BACKEND_HOST/PORT`, `ADMIN_BACKEND_HOST/PORT` 등을 설정하세요.
- 주요 npm 스크립트(양쪽 앱 동일한 형태): `dev`, `build`, `build:dev`(`--mode development`), `lint`, `preview`, `test`/`test:watch`(vitest)

**컨테이너로 전체 실행(Nginx가 두 SPA 정적 파일 + API 프록시를 한 번에 서빙):**

```bash
docker compose -f docker-compose-local.yml up -d --build
# http://localhost:${FRONTEND_PORT:-80}/       → bookvillage
# http://localhost:${FRONTEND_PORT:-80}/admin/ → admin
```

루트 `Dockerfile`이 `bookvillage`/`admin`을 각각 빌드(`npm ci && npm run build`)한 뒤 `nginx:1.27-alpine` 위에 `bookvillage`의 `dist`를 `/usr/share/nginx/html`에, `admin`의 `dist`를 `/usr/share/nginx/html/admin`에 배치하고, `nginx/default.conf.template`을 통해 `/api`, `/admin/api`, `/uploads`를 백엔드로 프록시합니다. `docker-compose-ope.yml`은 운영(EC2) 배포 시 백엔드 호스트를 프라이빗 IP/내부 ALB DNS로 지정하는 구성입니다.

각 앱을 개별 컨테이너로 빌드하려면 `bookvillage/Dockerfile`, `admin/Dockerfile`을 각각 사용할 수도 있습니다.

## 8. 관련 문서

- [PENTEST_SCENARIOS.md](PENTEST_SCENARIOS.md) — 모의해킹 시나리오 상세(공격 흐름, 근거 코드)
- [book-back README](https://github.com/SecuR00T/book-back#readme) — 전체 프로젝트 개요, 서비스 소개, AWS 배포 구성, 백엔드 API 명세/DB 설정
- [book-android README](https://github.com/SecuR00T/book-android#readme) — 모바일 앱 전용 문서
