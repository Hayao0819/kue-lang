/**
 * KUE-DSL コード生成器 - メインエントリポイント
 * ASTからKUE-CHIP2アセンブリコードを生成
 */

import type { Program } from "../ast/index.js";
import { generateStatement } from "./statements.js";
import type { CodeGenContext } from "./types.js";
import { buildMacroTable, buildSymbolTable, generateVariableComment, resetLabelCounter } from "./utils.js";

/**
 * ASTからアセンブリコードを生成
 */
export function generateCode(program: Program): string {
  const output: string[] = [];
  const symbolTable = buildSymbolTable(program.variables);
  const macroTable = buildMacroTable(program.body);
  const context: CodeGenContext = {
    symbolTable,
    loopStack: [],
    macroTable,
  };

  // ラベルカウンタをリセット
  resetLabelCounter();

  // 変数宣言をコメントとして出力
  for (const variable of program.variables) {
    output.push(generateVariableComment(variable));
  }

  // 変数宣言がある場合は空行を追加
  if (program.variables.length > 0) {
    output.push("");
  }

  // 各文のコードを生成（マクロ宣言はスキップ）
  for (const statement of program.body) {
    if (statement.type === "MacroDeclaration") {
      // マクロ宣言はコード生成をスキップ（定義のみ）
      continue;
    }
    const code = generateStatement(statement, context);
    if (code) {
      output.push(code);
    }
  }

  return output.join("\n");
}
