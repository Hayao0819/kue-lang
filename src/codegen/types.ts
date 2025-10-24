/**
 * コード生成器の型定義
 */

import type { MacroDeclaration } from "../ast/index.js";

/**
 * コード生成コンテキスト
 */
export interface CodeGenContext {
  symbolTable: Map<string, number>;
  loopStack: LoopLabels[];
  macroTable: Map<string, MacroDeclaration>;
}

/**
 * ループのラベル情報
 */
export interface LoopLabels {
  startLabel: string;
  endLabel: string;
}
