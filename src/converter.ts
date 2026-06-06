// 변환 방향: px → vw 또는 vw → px
export type ConvertDirection = "pxToVw" | "vwToPx";

/**
 * 선택한 CSS 텍스트를 줄 단위로 변환합니다.
 * shouldRemoveProps가 true이면 removeProps 목록에 해당하는 줄은 제거합니다.
 */
export function convertLines(
  selectedText: string,
  direction: ConvertDirection,
  baseWidth: number,
  shouldRemoveProps: boolean,
  removeProps: string[],
  decimalPlaces: number
): string[] {
  return selectedText
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();

      if (shouldRemoveProps) {
        const shouldRemove = removeProps.some((prop) =>
          trimmed.startsWith(prop)
        );
        if (shouldRemove) {
          return "";
        }
      }

      if (direction === "pxToVw") {
        return line.replace(/(\d+(\.\d+)?)px/g, (_, px) => {
          const value = parseFloat(px);
          const vw = (value / baseWidth) * 100;
          return `${vw.toFixed(decimalPlaces)}vw`;
        });
      }

      return line.replace(/(\d+(\.\d+)?)vw/g, (_, vw) => {
        const value = parseFloat(vw);
        const px = Math.round((value * baseWidth) / 100);
        return `${px}px`;
      });
    })
    .filter(Boolean);
}

/**
 * 변환된 줄을 @media 블록 문자열로 조립합니다.
 */
export function buildMediaBlock(
  convertedLines: string[],
  baseWidth: number
): string {
  return [
    "",
    `@media screen and (max-width: ${baseWidth}px) {`,
    ...convertedLines.map((line) => `  ${line}`),
    "}",
    "",
  ].join("\n");
}
