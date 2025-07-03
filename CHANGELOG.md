# Change Log

All notable changes to the "px-to-vw-converter" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [0.3.0] - 2025-05-30

### 추가
- vw → px 변환 기능 추가
- 변환 시 불필요한 속성 제거 및 media query 생성 로직 동일하게 반영

### 변경
- engines.vscode를 ^1.84.0으로 상향하여 Cursor 에디터에서 호환되도록 조정
- @types/vscode 버전을 1.84.0에 맞춰 변경

### 기타
- GitHub Actions를 통한 자동 배포 및 릴리스 노트 생성 워크플로 설정 완료
- 릴리스용 브랜치 보호 및 CODEOWNERS 설정

## [0.2.0] - 2025-05-30

### 추가
- 변환 시 불필요한 속성 제거 기능 (`removeProps`) 설정 추가
- 미디어 쿼리 내부에 변환 CSS를 삽입하는 구조로 변경
- 커스텀 소수점 자리수 설정 가능

## [0.1.0] - 2025-05-30

- Initial release