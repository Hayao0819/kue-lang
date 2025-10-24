/**
 * コード生成ユーティリティ関数
 */

import type { ArrayAccess, MacroDeclaration, Operand, Statement, VariableDeclaration } from "../ast/index.js";

/**
 * ラベル生成用のカウンタ
 */
let labelCounter = 0;

/**
 * ユニークなラベルを生成
 */
export function generateLabel(prefix: string): string {
  return `${prefix}_${labelCounter++}`;
}

/**
 * ラベルカウンタをリセット
 */
export function resetLabelCounter(): void {
  labelCounter = 0;
}

/**
 * シンボルテーブルを構築
 */
export function buildSymbolTable(variables: VariableDeclaration[]): Map<string, number> {
  const table = new Map<string, number>();
  for (const variable of variables) {
    table.set(variable.name, variable.address);
  }
  return table;
}

/**
 * マクロテーブルを構築
 */
export function buildMacroTable(statements: Statement[]): Map<string, MacroDeclaration> {
  const table = new Map<string, MacroDeclaration>();
  for (const statement of statements) {
    if (statement.type === "MacroDeclaration") {
      table.set(statement.name, statement);
    }
  }
  return table;
}

/**
 * 変数宣言をコメントとして出力
 */
export function generateVariableComment(variable: VariableDeclaration): string {
  return `* var ${variable.name} @ ${formatAddress(variable.address)}`;
}

/**
 * アドレスを16進数フォーマットに変換
 * 例: 128 → 0x080, 256 → 0x100
 */
export function formatAddress(address: number): string {
  return `0x${address.toString(16).padStart(3, "0").toUpperCase()}`;
}

/**
 * アドレスをアセンブリ形式に変換（データ領域用）
 * 例: 128 → (80H), 256 → (100H)
 */
export function formatDataAddress(address: number): string {
  const hex = address.toString(16).toUpperCase();
  return `(${hex}H)`;
}

/**
 * 変数のアドレスを取得
 */
export function getVariableAddress(name: string, symbolTable: Map<string, number>): number {
  const address = symbolTable.get(name);
  if (address === undefined) {
    throw new Error(`Undefined variable: ${name}`);
  }
  return address;
}

/**
 * オペランドをアセンブリ形式の文字列にフォーマット
 */
export function formatOperand(operand: Operand, symbolTable: Map<string, number>): string {
  if (operand.type === "Literal") {
    return `${operand.value}`;
  } else if (operand.type === "Variable") {
    const address = getVariableAddress(operand.name, symbolTable);
    return formatDataAddress(address);
  } else if (operand.type === "ArrayAccess") {
    // 配列アクセスの場合、定数添字のみ直接フォーマット可能
    // 変数添字の場合はformatOperandは使えないためエラー
    if (operand.index.type === "Literal") {
      const baseAddr = getVariableAddress(operand.array, symbolTable);
      const finalAddr = baseAddr + operand.index.value;
      return formatDataAddress(finalAddr);
    }
    throw new Error("Variable index array access cannot be formatted as operand string");
  } else if (operand.type === "Register") {
    // レジスタをオペランドとして直接使用
    return operand.name;
  }
  const _exhaustive: never = operand;
  return _exhaustive;
}

/**
 * 配列アクセスのロード命令を生成
 *
 * 定数添字の場合:
 *   foo = bar[2]  →  LD ACC, (183H)  // bar + 2のアドレス
 *
 * 変数添字の場合:
 *   foo = bar[i]  →  LD IX, (182H)     // iの値をIXにロード
 *                    LD ACC, (IX+181H)  // bar[i]をACCにロード
 */
export function generateArrayLoad(arrayAccess: ArrayAccess, symbolTable: Map<string, number>): string {
  const baseAddr = getVariableAddress(arrayAccess.array, symbolTable);

  if (arrayAccess.index.type === "Literal") {
    // 定数添字: 直接アドレスを計算
    const offset = arrayAccess.index.value;
    const finalAddr = baseAddr + offset;
    return `LD ACC, ${formatDataAddress(finalAddr)}`;
  } else if (arrayAccess.index.type === "Variable") {
    // 変数添字: IXレジスタを使った間接アドレッシング
    const indexAddr = getVariableAddress(arrayAccess.index.name, symbolTable);
    const lines: string[] = [];
    lines.push(`LD IX, ${formatDataAddress(indexAddr)}`);
    lines.push(`LD ACC, (IX+${baseAddr.toString(16).toUpperCase()}H)`);
    return lines.join("\n");
  }
  const _exhaustive: never = arrayAccess.index;
  return _exhaustive;
}

/**
 * 配列アクセスのストア命令を生成
 *
 * 定数添字の場合:
 *   foo[2] = bar  →  ST ACC, (183H)  // foo + 2のアドレス
 *
 * 変数添字の場合:
 *   foo[i] = bar  →  LD IX, (182H)     // iの値をIXにロード
 *                    ST ACC, (IX+180H)  // foo[i]にACCをストア
 */
export function generateArrayStore(arrayAccess: ArrayAccess, symbolTable: Map<string, number>): string {
  const baseAddr = getVariableAddress(arrayAccess.array, symbolTable);

  if (arrayAccess.index.type === "Literal") {
    // 定数添字: 直接アドレスを計算
    const offset = arrayAccess.index.value;
    const finalAddr = baseAddr + offset;
    return `ST ACC, ${formatDataAddress(finalAddr)}`;
  } else if (arrayAccess.index.type === "Variable") {
    // 変数添字: IXレジスタを使った間接アドレッシング
    const indexAddr = getVariableAddress(arrayAccess.index.name, symbolTable);
    const lines: string[] = [];
    lines.push(`LD IX, ${formatDataAddress(indexAddr)}`);
    lines.push(`ST ACC, (IX+${baseAddr.toString(16).toUpperCase()}H)`);
    return lines.join("\n");
  }
  const _exhaustive: never = arrayAccess.index;
  return _exhaustive;
}
