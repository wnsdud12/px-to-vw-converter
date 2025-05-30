# px-to-vw-converter

CSS에서 `px` 단위를 `vw`로 자동 변환해주는 VSCode Extension입니다.  
미디어쿼리 형태로 삽입되며, 기준 해상도와 소수점 자릿수 설정, 불필요한 속성 제거 여부도 설정할 수 있습니다.

## Features

- px → vw 단위 변환
- 선택된 CSS만 변환
- 기준 해상도 입력
- 미디어쿼리로 삽입
- display, position 등 제거 옵션
- 소수점 자릿수 설정 가능

## 사용 방법

1. 변환할 CSS를 선택
2. 명령어 팔레트 (Cmd+Shift+P) → `px to vw convert` 실행
3. 설정값 입력 후 자동 삽입

## Extension Settings

- `pxToVwConverter.decimalPlaces`: 변환 시 소수점 자릿수
- `pxToVwConverter.removeProps`: 제거할 CSS 속성 배열

## Release Notes

### 0.1.0

- 초기 배포
