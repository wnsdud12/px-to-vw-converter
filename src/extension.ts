// VS Code 확장 API 전체를 vscode 네임스페이스로 가져옵니다.
import * as vscode from "vscode";
import { convertLines, buildMediaBlock, ConvertDirection } from "./converter";
// package.json 기본값과 동일한 "제거할 속성" 목록 (설정이 없을 때 fallback으로 사용)
import { removePropsList } from "./removePropsList";

/**
 * px ↔ vw 변환 명령의 공통 실행 흐름입니다.
 * 1. 기준 해상도 입력 → 2. removeProps 선택 → 3. 변환 → 4. 출력 방식 선택 → 5. 적용
 */
async function runConversion(direction: ConvertDirection): Promise<void> {
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

  const config = vscode.workspace.getConfiguration("pxToVwConverter");
  const decimalPlaces = config.get<number>("decimalPlaces", 2);
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
      placeHolder: "media query 내 불필요한 속성(display 등)을 제거할까요?",
    }
  );
  if (!removePropsAnswer) {
    return;
  }
  const shouldRemoveProps = removePropsAnswer === "예";

  const convertedLines = convertLines(
    selectedText,
    direction,
    baseWidth,
    shouldRemoveProps,
    defaultRemoveProps,
    decimalPlaces
  );

  if (convertedLines.length === 0) {
    vscode.window.showInformationMessage("변환할 유효한 CSS가 없습니다.");
    return;
  }

  // 변환 완료 후 맨 마지막에 출력 방식을 선택합니다.
  const outputAnswer = await vscode.window.showQuickPick(
    ["선택 영역 치환", "파일 맨 아래에 @media 추가"],
    { placeHolder: "변환 결과를 어떻게 적용할까요?" }
  );
  if (!outputAnswer) {
    return;
  }
  const isReplace = outputAnswer === "선택 영역 치환";

  if (isReplace) {
    // 선택 영역을 변환된 CSS로 통째로 교체합니다 (@media 래핑 없음).
    await editor.edit((editBuilder) => {
      editBuilder.replace(selection, convertedLines.join("\n"));
    });

    const message =
      direction === "pxToVw"
        ? "선택 영역 px → vw 치환 완료!"
        : "선택 영역 vw → px 치환 완료!";
    vscode.window.showInformationMessage(message);
    return;
  }

  // 파일 맨 아래에 @media 블록을 삽입합니다 (기존 동작).
  const mediaBlock = buildMediaBlock(convertedLines, baseWidth);
  const lastLine = editor.document.lineAt(editor.document.lineCount - 1)
    .range.end;

  await editor.edit((editBuilder) => {
    editBuilder.insert(lastLine, mediaBlock);
  });

  const message =
    direction === "pxToVw"
      ? "px → vw 변환 및 media query 추가 완료!"
      : "vw → px 변환 및 media query 추가 완료!";
  vscode.window.showInformationMessage(message);
}

/**
 * VS Code 확장이 활성화될 때 호출되는 진입점입니다.
 * package.json의 contributes.commands에 등록된 명령어를 실제 동작과 연결합니다.
 */
export function activate(context: vscode.ExtensionContext) {
  const convertDisposable = vscode.commands.registerCommand(
    "px-to-vw-converter.convert",
    () => runConversion("pxToVw")
  );

  const reverseConvertDisposable = vscode.commands.registerCommand(
    "px-to-vw-converter.reverseConvert",
    () => runConversion("vwToPx")
  );

  context.subscriptions.push(convertDisposable, reverseConvertDisposable);
}

/**
 * VS Code 확장이 비활성화될 때 호출됩니다.
 * subscriptions에 등록한 리소스는 VS Code가 자동으로 정리하므로 별도 작업이 필요 없습니다.
 */
export function deactivate() {}
