import * as assert from "assert";
import * as vscode from "vscode";
import { buildMediaBlock, convertLines } from "../converter";

// 테스트용 제거 속성 목록 (일부만 사용)
const testRemoveProps = ["display", "position"];

suite("convertLines", () => {
  test("px → vw: 기본 변환 (1920px 기준)", () => {
    const input = "  width: 192px;\n  height: 96px;";
    const result = convertLines(input, "pxToVw", 1920, false, [], 2);

    assert.deepStrictEqual(result, [
      "  width: 10.00vw;",
      "  height: 5.00vw;",
    ]);
  });

  test("px → vw: 한 줄에 px 여러 개 변환", () => {
    const input = "  padding: 10px 20px;";
    const result = convertLines(input, "pxToVw", 1920, false, [], 2);

    assert.deepStrictEqual(result, ["  padding: 0.52vw 1.04vw;"]);
  });

  test("px → vw: 소수점 자리수 적용", () => {
    const input = "  width: 100px;";
    const result = convertLines(input, "pxToVw", 1920, false, [], 4);

    assert.deepStrictEqual(result, ["  width: 5.2083vw;"]);
  });

  test("px → vw: removeProps 적용 시 해당 줄 제거", () => {
    const input = [
      "  width: 192px;",
      "  display: flex;",
      "  height: 96px;",
    ].join("\n");
    const result = convertLines(
      input,
      "pxToVw",
      1920,
      true,
      testRemoveProps,
      2
    );

    assert.deepStrictEqual(result, [
      "  width: 10.00vw;",
      "  height: 5.00vw;",
    ]);
  });

  test("px → vw: removeProps만 있으면 빈 배열", () => {
    const input = "  display: flex;\n  position: absolute;";
    const result = convertLines(
      input,
      "pxToVw",
      1920,
      true,
      testRemoveProps,
      2
    );

    assert.deepStrictEqual(result, []);
  });

  test("vw → px: 기본 변환 (1920px 기준)", () => {
    const input = "  width: 10vw;\n  height: 5vw;";
    const result = convertLines(input, "vwToPx", 1920, false, [], 2);

    assert.deepStrictEqual(result, ["  width: 192px;", "  height: 96px;"]);
  });

  test("vw → px: 반올림 적용", () => {
    const input = "  width: 5.21vw;";
    const result = convertLines(input, "vwToPx", 1920, false, [], 2);

    assert.deepStrictEqual(result, ["  width: 100px;"]);
  });

  test("vw → px: removeProps 적용 시 해당 줄 제거", () => {
    const input = [
      "  width: 10vw;",
      "  display: block;",
      "  height: 5vw;",
    ].join("\n");
    const result = convertLines(
      input,
      "vwToPx",
      1920,
      true,
      testRemoveProps,
      2
    );

    assert.deepStrictEqual(result, ["  width: 192px;", "  height: 96px;"]);
  });
});

suite("buildMediaBlock", () => {
  test("@media 블록으로 감싸고 들여쓰기 적용", () => {
    const lines = ["width: 10.00vw;", "height: 5.00vw;"];
    const result = buildMediaBlock(lines, 1920);

    assert.strictEqual(
      result,
      [
        "",
        "@media screen and (max-width: 1920px) {",
        "  width: 10.00vw;",
        "  height: 5.00vw;",
        "}",
        "",
      ].join("\n")
    );
  });
});

suite("Extension Activation", () => {
  test("확장이 활성화되고 명령이 등록되어야 함", async () => {
    const extension = vscode.extensions.getExtension(
      "px-to-vw-converter.px-to-vw-converter"
    );
    assert.ok(extension, "확장이 로드되어야 합니다.");

    await extension?.activate();

    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes("px-to-vw-converter.convert"),
      "convert 명령이 등록되어야 합니다."
    );
    assert.ok(
      commands.includes("px-to-vw-converter.reverseConvert"),
      "reverseConvert 명령이 등록되어야 합니다."
    );
  });
});
