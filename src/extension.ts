// VS Code 확장 API 전체를 vscode 네임스페이스로 가져옵니다.
import * as vscode from "vscode";
// package.json 기본값과 동일한 "제거할 속성" 목록 (설정이 없을 때 fallback으로 사용)
import { removePropsList } from "./removePropsList";

/**
 * VS Code 확장이 활성화될 때 호출되는 진입점입니다.
 * package.json의 contributes.commands에 등록된 명령어를 실제 동작과 연결합니다.
 */
export function activate(context: vscode.ExtensionContext) {
  // ──────────────────────────────────────────────
  // 명령 1: px → vw 변환
  // 선택한 CSS의 px 값을 vw로 바꾸고, 파일 맨 아래에 @media 블록으로 삽입합니다.
  // ──────────────────────────────────────────────

  // registerCommand: 명령어를 등록하고, 반환값(Disposable)은 나중에 해제할 때 사용합니다.
  // 첫 번째 인자 "px-to-vw-converter.convert"는 package.json의 command id와 동일해야 합니다.
  // 두 번째 인자는 명령 팔레트에서 실행될 때 호출되는 콜백 함수입니다.
  const convertDisposable = vscode.commands.registerCommand(
    "px-to-vw-converter.convert",
    async () => {
      // activeTextEditor: 현재 열려 있고 커서가 있는 에디터 탭
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      // selection: 사용자가 드래그로 선택한 텍스트 범위 (시작/끝 위치)
      const selection = editor.selection;
      if (selection.isEmpty) {
        vscode.window.showInformationMessage("선택된 영역이 없습니다.");
        return;
      }

      // document.getText(selection): 선택 범위에 해당하는 문자열을 추출합니다.
      const selectedText = editor.document.getText(selection);

      // ── VS Code 설정 읽기 ──
      // getConfiguration("pxToVwConverter"):
      //   package.json의 "pxToVwConverter.decimalPlaces", "pxToVwConverter.removeProps" 설정 묶음을 가져옵니다.
      //   사용자가 설정(UI 또는 settings.json)에서 값을 바꾸면 여기서 읽힙니다.
      const config = vscode.workspace.getConfiguration("pxToVwConverter");

      // config.get("decimalPlaces", 2):
      //   "pxToVwConverter.decimalPlaces" 값을 읽습니다. 없으면 두 번째 인자 2를 사용합니다.
      const decimalPlaces = config.get<number>("decimalPlaces", 2);

      // config.get("removeProps", removePropsList):
      //   media query에서 제거할 CSS 속성 목록. 설정이 없으면 removePropsList를 사용합니다.
      const defaultRemoveProps = config.get<string[]>(
        "removeProps",
        removePropsList
      );

      // ── 기준 해상도 입력 ──
      // showInputBox: 상단에 입력창을 띄워 사용자 입력을 받습니다. await로 입력 완료까지 대기합니다.
      // validateInput: 숫자가 아니면 에러 메시지를 반환해 입력을 막습니다.
      const baseWidthInput = await vscode.window.showInputBox({
        prompt: "기준 해상도(px)를 입력하세요 (예: 1920)",
        value: "1920",
        validateInput: (value) =>
          isNaN(Number(value)) ? "숫자를 입력하세요" : null,
      });
      // 사용자가 취소하면 baseWidthInput이 undefined → ?? 연산자로 기본값 1920 사용
      const baseWidth = parseFloat(baseWidthInput ?? "1920");
      if (!baseWidth || isNaN(baseWidth)) {
        vscode.window.showErrorMessage("유효하지 않은 해상도입니다.");
        return;
      }

      // showQuickPick: 선택지 목록을 띄워 사용자가 하나를 고르게 합니다.
      const removePropsAnswer = await vscode.window.showQuickPick(
        ["예", "아니오"],
        {
          placeHolder: "media query 내 불필요한 속성(display 등)을 제거할까요?",
        }
      );
      const shouldRemoveProps = removePropsAnswer === "예";

      // ── 줄 단위 변환 ──
      const convertedLines = selectedText
        .split("\n")
        .map((line) => {
          const trimmed = line.trim();

          // 제거 대상 속성(display, position 등)으로 시작하는 줄은 빈 문자열로 만듭니다.
          if (shouldRemoveProps) {
            const shouldRemove = defaultRemoveProps.some((prop) =>
              trimmed.startsWith(prop)
            );
            if (shouldRemove) {
              return "";
            }
          }

          // replace + 정규식: 줄 안의 모든 "숫자px" 패턴을 찾아 vw로 치환합니다.
          //   (\d+(\.\d+)?)px  →  정수 또는 소수 + "px" (예: 16px, 10.5px)
          //   g 플래그         →  한 줄에 px가 여러 개여도 모두 변환
          //   (_, px)          →  매칭된 px 숫자 부분만 추출
          // 공식: vw = (px값 / 기준해상도) × 100
          return line.replace(/(\d+(\.\d+)?)px/g, (_, px) => {
            const value = parseFloat(px);
            const vw = (value / baseWidth) * 100;
            return `${vw.toFixed(decimalPlaces)}vw`;
          });
        })
        // filter(Boolean): 빈 문자열("")을 제거해 변환된 줄만 남깁니다.
        .filter(Boolean);

      if (convertedLines.length === 0) {
        vscode.window.showInformationMessage("변환할 유효한 CSS가 없습니다.");
        return;
      }

      // 변환된 줄 앞에 들여쓰기(공백 2칸)를 붙여 @media 블록 문자열을 조립합니다.
      const mediaBlock = [
        "",
        `@media screen and (max-width: ${baseWidth}px) {`,
        ...convertedLines.map((line) => `  ${line}`),
        "}",
        "",
      ].join("\n");

      // ── 파일에 삽입 ──
      // lineAt(마지막 줄).range.end: 문서 맨 아래 줄의 끝 위치(커서 좌표)
      const lastLine = editor.document.lineAt(editor.document.lineCount - 1)
        .range.end;

      // editor.edit: 에디터 내용을 수정하는 API. 콜백 안에서 editBuilder로 변경을 적용합니다.
      // editBuilder.insert(위치, 텍스트): 해당 위치에 문자열을 삽입합니다.
      editor.edit((editBuilder) => {
        editBuilder.insert(lastLine, mediaBlock);
      });

      vscode.window.showInformationMessage(
        "px → vw 변환 및 media query 추가 완료!"
      );
    }
  );

  // ──────────────────────────────────────────────
  // 명령 2: vw → px 변환 (역변환)
  // 선택한 CSS의 vw 값을 px로 바꾸고, 파일 맨 아래에 @media 블록으로 삽입합니다.
  // ──────────────────────────────────────────────
  const reverseConvertDisposable = vscode.commands.registerCommand(
    "px-to-vw-converter.reverseConvert",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const selection = editor.selection;
      if (selection.isEmpty) {
        vscode.window.showInformationMessage("선택된 영역이 없습니다.");
        return;
      }

      const selectedText = editor.document.getText(selection);

      // px → vw와 동일하게 설정을 읽습니다. (역변환은 decimalPlaces를 사용하지 않음)
      const config = vscode.workspace.getConfiguration("pxToVwConverter");
      const defaultRemoveProps = config.get<string[]>(
        "removeProps",
        removePropsList
      );

      const baseWidthInput = await vscode.window.showInputBox({
        prompt: "기준 해상도(px)를 입력하세요 (예: 1920)",
        value: "1920",
        validateInput: (value) =>
          isNaN(Number(value)) ? "숫자를 입력하세요" : null,
      });
      const baseWidth = parseFloat(baseWidthInput ?? "1920");
      if (!baseWidth || isNaN(baseWidth)) {
        vscode.window.showErrorMessage("유효하지 않은 해상도입니다.");
        return;
      }

      const removePropsAnswer = await vscode.window.showQuickPick(
        ["예", "아니오"],
        {
          placeHolder: "불필요한 속성(display 등)을 제거할까요?",
        }
      );
      const shouldRemoveProps = removePropsAnswer === "예";

      const convertedLines = selectedText
        .split("\n")
        .map((line) => {
          const trimmed = line.trim();
          if (shouldRemoveProps) {
            const shouldRemove = defaultRemoveProps.some((prop) =>
              trimmed.startsWith(prop)
            );
            if (shouldRemove) {
              return "";
            }
          }

          // replace + 정규식: 줄 안의 모든 "숫자vw" 패턴을 찾아 px로 치환합니다.
          // 공식: px = (vw값 × 기준해상도) / 100 → Math.round로 정수 px 반환
          return line.replace(/(\d+(\.\d+)?)vw/g, (_, vw) => {
            const value = parseFloat(vw);
            const px = Math.round((value * baseWidth) / 100);
            return `${px}px`;
          });
        })
        .filter(Boolean);

      if (convertedLines.length === 0) {
        vscode.window.showInformationMessage("변환할 유효한 CSS가 없습니다.");
        return;
      }

      const mediaBlock = [
        "",
        `@media screen and (max-width: ${baseWidth}px) {`,
        ...convertedLines.map((line) => `  ${line}`),
        "}",
        "",
      ].join("\n");

      const lastLine = editor.document.lineAt(editor.document.lineCount - 1)
        .range.end;

      editor.edit((editBuilder) => {
        editBuilder.insert(lastLine, mediaBlock);
      });

      vscode.window.showInformationMessage(
        "vw → px 변환 및 media query 추가 완료!"
      );
    }
  );

  // subscriptions: 확장이 꺼질 때 등록한 명령·리스너를 VS Code가 자동으로 정리합니다.
  context.subscriptions.push(convertDisposable, reverseConvertDisposable);
}

/**
 * VS Code 확장이 비활성화될 때 호출됩니다.
 * subscriptions에 등록한 리소스는 VS Code가 자동으로 정리하므로 별도 작업이 필요 없습니다.
 */
export function deactivate() {}
