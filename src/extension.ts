import * as vscode from "vscode";
import { removePropsList } from "./removePropsList";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "px-to-vw-converter.convert",
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

      // 설정값 읽기
      const config = vscode.workspace.getConfiguration("pxToVwConverter");
      const decimalPlaces = config.get<number>("decimalPlaces", 2);
      const defaultRemoveProps = config.get<string[]>("removeProps", removePropsList);

      // 기준 해상도 입력
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

      // 불필요한 속성 제거 여부
      const removePropsAnswer = await vscode.window.showQuickPick(
        ["예", "아니오"],
        {
          placeHolder: "media query 내 불필요한 속성(display 등)을 제거할까요?",
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
              return ""; // 속성 제거
            }
          }

          return line.replace(/(\d+(\.\d+)?)px/g, (_, px) => {
            const value = parseFloat(px);
            const vw = (value / baseWidth) * 100;
            return `${vw.toFixed(decimalPlaces)}vw`;
          });
        })
        .filter(Boolean); // 빈 줄 제거

      if (convertedLines.length === 0) {
        vscode.window.showInformationMessage("변환할 유효한 CSS가 없습니다.");
        return;
      }

      // media query 블록 생성
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
        "px → vw 변환 및 media query 추가 완료!"
      );
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}


//test