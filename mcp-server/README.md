# Popup MCP Server

**30초 만에 웹페이지를 만들고 AI로 편집하세요.** 로그인 불필요, 링크 하나로 공유.

Popup MCP Server를 Claude에 연결하면 대화만으로 웹페이지를 생성·편집·삭제할 수 있습니다.

---

## 설치 방법

### Claude Desktop (권장)

`~/Library/Application Support/Claude/claude_desktop_config.json` 파일에 추가:

```json
{
  "mcpServers": {
    "popup": {
      "command": "npx",
      "args": ["-y", "@popup-ai/mcp-server"],
      "env": {
        "MCP_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

> **API 키 발급**: https://leaf-bluewhale2025.vercel.app/admin 관리자 대시보드에서 발급

---

## 사용 가능한 도구 (9개)

| 도구 | 설명 | 읽기 전용 |
|------|------|----------|
| `create_page` | 블록 배열로 새 페이지 생성 | ❌ |
| `get_page` | 페이지 콘텐츠·메타데이터 조회 | ✅ |
| `update_page_blocks` | 페이지 전체 블록 교체 | ❌ |
| `edit_page_blocks` | 부분 편집 (insert/update/delete/move) | ❌ |
| `delete_page` | 페이지 삭제 (소프트 딜리트) | ❌ ⚠️ |
| `list_my_pages` | 내 페이지 목록 조회 | ✅ |
| `list_templates` | 사용 가능한 템플릿 목록 | ✅ |
| `create_page_from_template` | 템플릿으로 페이지 생성 | ❌ |
| `upload_image` | 이미지 업로드 URL 요청 | ❌ |

---

## 사용 예시

### 예시 1: 이벤트 초대 페이지 만들기

```
"다음 내용으로 이벤트 초대 페이지를 만들어줘:
- 제목: 2025 봄 세미나
- 날짜: 4월 20일 오후 2시
- 장소: 제주 ICC
- 참가 신청 버튼 → https://forms.example.com"
```

Claude가 `create_page` 도구를 호출해 즉시 공유 링크를 반환합니다.

---

### 예시 2: 링크인바이오 페이지를 템플릿으로 생성

```
"link-in-bio 템플릿으로 페이지를 만들고,
제목을 'Richard의 링크 모음'으로 바꿔줘"
```

Claude가 `create_page_from_template`으로 생성 후 `edit_page_blocks`으로 제목 수정.

---

### 예시 3: 기존 페이지 수정

```
"abc123 페이지의 첫 번째 제목을 '업데이트된 제목'으로 바꾸고,
맨 아래에 '자세히 보기' 버튼을 추가해줘"
```

Claude가 `get_page`로 현재 상태 확인 후 `edit_page_blocks`으로 정확히 수정.

---

## 블록 타입

| 타입 | 설명 |
|------|------|
| `h1` | 대제목 |
| `h2` | 소제목 |
| `text` | 본문 텍스트 |
| `image` | 이미지 (URL 또는 업로드) |
| `button` | 링크 버튼 |
| `divider` | 구분선 |
| `youtube` | 유튜브 영상 |
| `link` | 링크 카드 (OG 미리보기) |

---

## 환경변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `MCP_API_KEY` | ✅ | Popup API 키 (`lf_live_...` 형식) |
| `POPUP_BASE_URL` | ❌ | 커스텀 서버 URL (기본값: `https://leaf-bluewhale2025.vercel.app`) |

---

## 개인정보처리방침

https://leaf-bluewhale2025.vercel.app/privacy

---

## 지원

- 이메일: blueslap@naver.com
- 운영시간: 평일 09:00–18:00 (KST)
- 서비스: https://leaf-bluewhale2025.vercel.app
