/**
 * KUE-DSL コード生成器
 * ASTからKUE-CHIP2アセンブリコードを生成
 */

import type {
  Program,
  Statement,
  VariableDeclaration,
  AssignmentStatement,
  BuiltinStatement,
  LValue,
  RValue,
  Variable,
  Literal,
} from "../ast/index.js";

/**
 * ASTからアセンブリコードを生成
 */
export function generateCode(program: Program): string {
  const output: string[] = [];
  const symbolTable = buildSymbolTable(program.variables);

  // 変数宣言をコメントとして出力
  for (const variable of program.variables) {
    output.push(generateVariableComment(variable));
  }

  // 変数宣言がある場合は空行を追加
  if (program.variables.length > 0) {
    output.push("");
  }

  // 各文のコードを生成
  for (const statement of program.body) {
    const code = generateStatement(statement, symbolTable);
    if (code) {
      output.push(code);
    }
  }

  return output.join("\n");
}

/**
 * シンボルテーブルを構築
 */
function buildSymbolTable(variables: VariableDeclaration[]): Map<string, number> {
  const table = new Map<string, number>();
  for (const variable of variables) {
    table.set(variable.name, variable.address);
  }
  return table;
}

/**
 * 変数宣言をコメントとして出力
 */
function generateVariableComment(variable: VariableDeclaration): string {
  return `* var ${variable.name} @ ${formatAddress(variable.address)}`;
}

/**
 * アドレスを16進数フォーマットに変換
 * 例: 128 → 0x080, 256 → 0x100
 */
function formatAddress(address: number): string {
  return `0x${address.toString(16).padStart(3, "0").toUpperCase()}`;
}

/**
 * アドレスをアセンブリ形式に変換（データ領域用）
 * 例: 128 → (80H), 256 → (100H)
 */
function formatDataAddress(address: number): string {
  const hex = address.toString(16).toUpperCase();
  return `(${hex}H)`;
}

/**
 * 文のコード生成
 */
function generateStatement(statement: Statement, symbolTable: Map<string, number>): string {
  switch (statement.type) {
    case "AssignmentStatement":
      return generateAssignment(statement, symbolTable);
    case "BuiltinStatement":
      return generateBuiltin(statement);
    // 他の文は未実装（フェーズ3以降）
    case "ComparisonStatement":
    case "BinaryOperationStatement":
    case "IfStatement":
    case "LoopStatement":
    case "BreakStatement":
    case "ContinueStatement":
    case "MacroCallStatement":
    case "MacroDeclaration":
    case "AsmBlock":
      throw new Error(`Unsupported statement type: ${statement.type}`);
    default:
      // TypeScriptの網羅性チェック
      const _exhaustive: never = statement;
      throw new Error(`Unknown statement type: ${(_exhaustive as any).type}`);
  }
}

/**
 * 代入文のコード生成
 * foo = 42    → LD ACC, 42
 *                ST ACC, (80H)
 * foo = bar   → LD ACC, (81H)
 *                ST ACC, (80H)
 */
function generateAssignment(statement: AssignmentStatement, symbolTable: Map<string, number>): string {
  const lines: string[] = [];

  // 右辺値をアキュムレータにロード
  const loadInstr = generateLoad(statement.right, symbolTable);
  lines.push(loadInstr);

  // 左辺値にストア
  const storeInstr = generateStore(statement.left, symbolTable);
  lines.push(storeInstr);

  return lines.join("\n");
}

/**
 * 右辺値のロード命令を生成
 */
function generateLoad(rvalue: RValue, symbolTable: Map<string, number>): string {
  if (rvalue.type === "Literal") {
    // リテラル: LD ACC, <value>
    return `LD ACC, ${rvalue.value}`;
  } else if (rvalue.type === "Variable") {
    // 変数: LD ACC, (<address>)
    const address = getVariableAddress(rvalue.name, symbolTable);
    return `LD ACC, ${formatDataAddress(address)}`;
  } else if (rvalue.type === "ArrayAccess") {
    // 配列アクセスは未実装（フェーズ4）
    throw new Error("Array access is not implemented yet");
  } else {
    const _exhaustive: never = rvalue;
    throw new Error(`Unknown RValue type: ${(_exhaustive as any).type}`);
  }
}

/**
 * 左辺値のストア命令を生成
 */
function generateStore(lvalue: LValue, symbolTable: Map<string, number>): string {
  if (lvalue.type === "Variable") {
    // 変数: ST ACC, (<address>)
    const address = getVariableAddress(lvalue.name, symbolTable);
    return `ST ACC, ${formatDataAddress(address)}`;
  } else if (lvalue.type === "ArrayAccess") {
    // 配列アクセスは未実装（フェーズ4）
    throw new Error("Array access is not implemented yet");
  } else {
    const _exhaustive: never = lvalue;
    throw new Error(`Unknown LValue type: ${(_exhaustive as any).type}`);
  }
}

/**
 * 組み込み命令のコード生成（1対1変換）
 */
function generateBuiltin(statement: BuiltinStatement): string {
  switch (statement.instruction) {
    case "halt":
      return "HLT";
    case "nop":
      return "NOP";
    case "input":
      return "IN";
    case "output":
      return "OUT";
    case "set_carry_flag":
      return "SCF";
    case "reset_carry_flag":
      return "RCF";
    default:
      const _exhaustive: never = statement.instruction;
      throw new Error(`Unknown builtin instruction: ${_exhaustive}`);
  }
}

/**
 * 変数のアドレスを取得
 */
function getVariableAddress(name: string, symbolTable: Map<string, number>): number {
  const address = symbolTable.get(name);
  if (address === undefined) {
    throw new Error(`Undefined variable: ${name}`);
  }
  return address;
}
