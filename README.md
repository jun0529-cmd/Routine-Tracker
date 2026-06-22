# 루틴 트래커 PWA

매일 공부·운동·식단 루틴을 체크하고 진행률을 관리하는 PWA 앱입니다.

## 배포 방법 (GitHub Pages)

### 1단계 — 저장소 생성
1. GitHub에서 **New repository** 클릭
2. 이름: `routine-tracker` (아무거나 가능)
3. **Public** 선택 → Create

### 2단계 — 코드 업로드
```bash
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/[내아이디]/routine-tracker.git
git push -u origin main
```

### 3단계 — Pages 활성화
1. 저장소 → **Settings** → **Pages**
2. Source: **GitHub Actions** 선택
3. 저장하면 자동으로 배포 시작 (1~2분)

### 4단계 — 앱 설치
배포 완료 후 주소: `https://[내아이디].github.io/routine-tracker`

**Android**
- Chrome에서 주소 열기 → 주소창 오른쪽 설치 아이콘 탭

**iOS (iPhone)**
- Safari에서 주소 열기 → 공유 버튼 → "홈 화면에 추가"

---

## 로컬 실행
```bash
npm install
npm run dev
```
