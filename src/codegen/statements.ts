/**
 * 文のコード生成
 */

import type {
  AsmBlock,
  AssignmentStatement,
  BinaryOperationStatement,
  BuiltinStatement,
  ComparisonStatement,
  FlagCondition,
  IfStatement,
  LoopStatement,
  MacroCallStatement,
  Operand,
  Statement,
} from "../ast/index.js";
import { generateLoad, generateOperandLoad, generateRegisterLoad, generateStore } from "./expressions.js";
import type { CodeGenContext } from "./types.js";
import { formatDataAddress, formatOperand, generateLabel, getVariableAddress } from "./utils.js";

/**
 * 文のコード生成
 */
export function generateStatement(statement: Statement, context: CodeGenContext): string {
  switch (statement.type) {
    case "AssignmentStatement":
      return generateAssignment(statement, context.symbolTable);
    case "BinaryOperationStatement":
      return generateBinaryOperation(statement, context.symbolTable);
    case "ComparisonStatement":
      return generateComparison(statement, context.symbolTable);
    case "BuiltinStatement":
      return generateBuiltin(statement);
    case "LoopStatement":
      return generateLoop(statement, context);
    case "IfStatement":
      return generateIf(statement, context);
    case "BreakStatement":
      return generateBreak(context);
    case "ContinueStatement":
      return generateContinue(context);
    case "MacroCallStatement":
      return generateMacroCall(statement, context);
    case "MacroDeclaration":
      // マクロ宣言はコード生成しない（定義のみ）
      return "";
    case "AsmBlock":
      return generateAsm(statement);
    default: {
      // TypeScriptの網羅性チェック
      const _exhaustive: never = statement;
      return _exhaustive;
    }
  }
}

/**
 * 代入文のコード生成
 * foo = 42    → LD ACC, 42
 *                ST ACC, (80H)
 * foo = bar   → LD ACC, (81H)
 *                ST ACC, (80H)
 * ACC = ACC + foo → LD ACC, (180H)
 *                   ADD ACC, (180H)
 *                   (ストア不要)
 * IX = IX + 1 → LD IX, 1
 *               ADD IX, 1
 *               (ストア不要)
 * foo[i] = bar[j]  → 両方が変数添字配列の場合は特別処理
 */
function generateAssignment(statement: AssignmentStatement, symbolTable: Map<string, number>): string {
  const lines: string[] = [];

  // 特殊ケース1: 左辺がACCの場合
  // ACCへの代入は常にLD命令を使用（ST命令は使えない）
  if (statement.left.type === "Register" && statement.left.name === "ACC") {
    // 右辺もACCなら無操作
    if (statement.right.type === "Register" && statement.right.name === "ACC") {
      return `* ACC = ACC (no operation)`;
    }
    // それ以外は、LD ACC, <source>で実現
    const loadInstr = generateLoad(statement.right, symbolTable);
    return loadInstr;
  }

  // 特殊ケース2: 左辺がIXで右辺がレジスタの場合
  if (statement.left.type === "Register" && statement.left.name === "IX") {
    if (statement.right.type === "Register") {
      // IX = IX → 無操作
      if (statement.right.name === "IX") {
        return `* IX = IX (no operation)`;
      }
      // IX = ACC → LD IX, ACC
      return `LD IX, ACC`;
    }
    // IX = <non-register> → LD IX, <source>
    if (statement.right.type === "Literal") {
      return `LD IX, ${statement.right.value}`;
    } else if (statement.right.type === "Variable") {
      const address = getVariableAddress(statement.right.name, symbolTable);
      return `LD IX, ${formatDataAddress(address)}`;
    }
    // IX = array[...] → ACCを経由する必要がある
    const loadToACC = generateLoad(statement.right, symbolTable);
    const lines: string[] = [];
    lines.push(loadToACC);
    lines.push(`LD IX, ACC`);
    return lines.join("\n");
  }

  // 特殊ケース: 両方が変数添字の配列アクセスの場合
  // foo[i] = bar[j]  →  LD IX, (jのアドレス)
  //                     LD ACC, (IX+barのアドレス)
  //                     LD IX, (iのアドレス)
  //                     ST ACC, (IX+fooのアドレス)
  if (
    statement.left.type === "ArrayAccess" &&
    statement.left.index.type === "Variable" &&
    statement.right.type === "ArrayAccess" &&
    statement.right.index.type === "Variable"
  ) {
    // 右辺の配列アクセスをロード
    const rightBaseAddr = getVariableAddress(statement.right.array, symbolTable);
    const rightIndexAddr = getVariableAddress(statement.right.index.name, symbolTable);
    lines.push(`LD IX, ${formatDataAddress(rightIndexAddr)}`);
    lines.push(`LD ACC, (IX+${rightBaseAddr.toString(16).toUpperCase()}H)`);

    // 左辺の配列アクセスにストア
    const leftBaseAddr = getVariableAddress(statement.left.array, symbolTable);
    const leftIndexAddr = getVariableAddress(statement.left.index.name, symbolTable);
    lines.push(`LD IX, ${formatDataAddress(leftIndexAddr)}`);
    lines.push(`ST ACC, (IX+${leftBaseAddr.toString(16).toUpperCase()}H)`);

    return lines.join("\n");
  }

  // 通常ケース
  // 右辺値をアキュムレータにロード
  const loadInstr = generateLoad(statement.right, symbolTable);
  if (loadInstr && !loadInstr.startsWith("*")) {
    lines.push(loadInstr);
  }

  // 左辺値にストア
  const storeInstr = generateStore(statement.left, symbolTable);
  if (storeInstr && !storeInstr.startsWith("*")) {
    lines.push(storeInstr);
  }

  // コメントのみの場合は無操作として出力
  if (lines.length === 0) {
    return `* ${statement.left.type === "Register" ? statement.left.name : "variable"} = ${statement.right.type === "Register" ? statement.right.name : "value"} (no operation)`;
  }

  return lines.join("\n");
}

/**
 * 二項演算文のコード生成
 * result = foo + bar  →  LD ACC, (180H)
 *                        ADD ACC, (181H)
 *                        ST ACC, (182H)
 * ACC = ACC + 1      →  ADD ACC, 1
 *                        (ロード・ストア不要)
 * IX = IX + 1        →  ADD IX, 1
 *                        (ロード・ストア不要、IXレジスタで直接演算)
 */
function generateBinaryOperation(statement: BinaryOperationStatement, symbolTable: Map<string, number>): string {
  const lines: string[] = [];

  // 特殊ケース: デスティネーションがレジスタの場合、そのレジスタで直接演算
  if (statement.destination.type === "Register") {
    const targetReg = statement.destination.name;

    // 左オペランドがデスティネーションと同じレジスタかチェック
    const leftIsTarget = statement.left.type === "Register" && statement.left.name === targetReg;

    if (!leftIsTarget) {
      // 左オペランドをターゲットレジスタにロード
      const loadInstr = generateRegisterLoad(statement.left, targetReg, symbolTable);
      if (loadInstr && !loadInstr.startsWith("*")) {
        lines.push(loadInstr);
      }
    }

    // ターゲットレジスタで直接演算
    const opInstr = generateBinaryOperationInstructionForRegister(
      targetReg,
      statement.operator,
      statement.right,
      symbolTable,
    );
    lines.push(opInstr);

    return lines.join("\n");
  }

  // 通常ケース: デスティネーションが変数または配列
  // 左オペランドをアキュムレータにロード
  const loadInstr = generateOperandLoad(statement.left, symbolTable);
  if (loadInstr && !loadInstr.startsWith("*")) {
    lines.push(loadInstr);
  }

  // 演算命令を生成
  const opInstr = generateBinaryOperationInstruction(statement.operator, statement.right, symbolTable);
  lines.push(opInstr);

  // 結果をデスティネーションにストア
  const storeInstr = generateStore(statement.destination, symbolTable);
  if (storeInstr && !storeInstr.startsWith("*")) {
    lines.push(storeInstr);
  }

  return lines.join("\n");
}

/**
 * レジスタに対する二項演算命令を生成
 * 指定されたレジスタで直接演算を実行
 */
function generateBinaryOperationInstructionForRegister(
  targetReg: string,
  operator: string,
  rightOperand: Operand,
  symbolTable: Map<string, number>,
): string {
  // 右オペランドの表現を取得
  const rightOperandStr = formatOperand(rightOperand, symbolTable);

  // 演算子に応じた命令を生成
  switch (operator) {
    // 算術演算
    case "+":
      return `ADD ${targetReg}, ${rightOperandStr}`;
    case "+c":
      return `ADC ${targetReg}, ${rightOperandStr}`;
    case "-":
      return `SUB ${targetReg}, ${rightOperandStr}`;
    case "-c":
      return `SBC ${targetReg}, ${rightOperandStr}`;
    // 論理演算
    case "&":
      return `AND ${targetReg}, ${rightOperandStr}`;
    case "|":
      return `OR ${targetReg}, ${rightOperandStr}`;
    case "^":
      return `EOR ${targetReg}, ${rightOperandStr}`;
    // シフト演算（オペランドなし、常に1ビットシフト）
    case "<<":
      return `SLL ${targetReg}`;
    case "<<a":
      return `SLA ${targetReg}`;
    case ">>":
      return `SRL ${targetReg}`;
    case ">>a":
      return `SRA ${targetReg}`;
    // ローテート演算（オペランドなし、常に1ビット）
    case "<<<":
      return `RLL ${targetReg}`;
    case ">>>":
      return `RRL ${targetReg}`;
    default:
      throw new Error(`Unknown binary operator: ${operator}`);
  }
}

/**
 * 二項演算命令を生成
 */
function generateBinaryOperationInstruction(
  operator: string,
  rightOperand: Operand,
  symbolTable: Map<string, number>,
): string {
  // 右オペランドの表現を取得
  const rightOperandStr = formatOperand(rightOperand, symbolTable);

  // 演算子に応じた命令を生成
  switch (operator) {
    // 算術演算
    case "+":
      return `ADD ACC, ${rightOperandStr}`;
    case "+c":
      return `ADC ACC, ${rightOperandStr}`;
    case "-":
      return `SUB ACC, ${rightOperandStr}`;
    case "-c":
      return `SBC ACC, ${rightOperandStr}`;
    // 論理演算
    case "&":
      return `AND ACC, ${rightOperandStr}`;
    case "|":
      return `OR ACC, ${rightOperandStr}`;
    case "^":
      return `EOR ACC, ${rightOperandStr}`;
    // シフト演算（オペランドなし、常に1ビットシフト）
    case "<<":
      return `SLL ACC`;
    case "<<a":
      return `SLA ACC`;
    case ">>":
      return `SRL ACC`;
    case ">>a":
      return `SRA ACC`;
    // ローテート演算（オペランドなし、常に1ビット）
    case "<<<":
      return `RLL ACC`;
    case ">>>":
      return `RRL ACC`;
    default:
      throw new Error(`Unknown binary operator: ${operator}`);
  }
}

/**
 * 比較文のコード生成
 * foo == bar  →  LD ACC, (180H)
 *                CMP ACC, (181H)
 */
function generateComparison(statement: ComparisonStatement, symbolTable: Map<string, number>): string {
  const lines: string[] = [];

  // 左オペランドをアキュムレータにロード
  const loadInstr = generateOperandLoad(statement.left, symbolTable);
  lines.push(loadInstr);

  // 右オペランドをCMP命令で比較
  const rightOperandStr = formatOperand(statement.right, symbolTable);
  lines.push(`CMP ACC, ${rightOperandStr}`);

  return lines.join("\n");
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
    default: {
      const _exhaustive: never = statement.instruction;
      throw new Error(`Unknown builtin instruction: ${_exhaustive}`);
    }
  }
}

/**
 * loop文のコード生成
 * loop { ... }  →  LOOP_START_0:
 *                   ...
 *                   JMP LOOP_START_0
 *                   LOOP_END_0:
 */
function generateLoop(statement: LoopStatement, context: CodeGenContext): string {
  const lines: string[] = [];
  const startLabel = generateLabel("LOOP_START");
  const endLabel = generateLabel("LOOP_END");

  // ループスタックにラベルをプッシュ（break/continue用）
  context.loopStack.push({ startLabel, endLabel });

  // ループ開始ラベル
  lines.push(`${startLabel}:`);

  // ループ本体のコードを生成
  for (const stmt of statement.body) {
    const code = generateStatement(stmt, context);
    if (code) {
      lines.push(code);
    }
  }

  // ループの先頭に戻る
  lines.push(`BA ${startLabel}`);

  // ループ終了ラベル
  lines.push(`${endLabel}:`);

  // ループスタックからポップ
  context.loopStack.pop();

  return lines.join("\n");
}

/**
 * if文のコード生成
 * if ZERO { ... }  →  JMP/COND END_IF_0
 *                      ...
 *                      END_IF_0:
 */
function generateIf(statement: IfStatement, context: CodeGenContext): string {
  const lines: string[] = [];
  const endLabel = generateLabel("END_IF");

  // フラグ条件の逆条件でジャンプ（条件が偽ならスキップ）
  const jumpInstr = generateConditionalJump(statement.condition, endLabel, true);
  lines.push(jumpInstr);

  // if本体のコードを生成
  for (const stmt of statement.body) {
    const code = generateStatement(stmt, context);
    if (code) {
      lines.push(code);
    }
  }

  // 終了ラベル
  lines.push(`${endLabel}:`);

  return lines.join("\n");
}

/**
 * break文のコード生成
 * break  →  JMP LOOP_END_N
 */
function generateBreak(context: CodeGenContext): string {
  if (context.loopStack.length === 0) {
    throw new Error("break statement outside of loop");
  }
  const currentLoop = context.loopStack[context.loopStack.length - 1];
  if (!currentLoop) {
    throw new Error("break statement outside of loop");
  }
  return `BA ${currentLoop.endLabel}`;
}

/**
 * continue文のコード生成
 * continue  →  JMP LOOP_START_N
 */
function generateContinue(context: CodeGenContext): string {
  if (context.loopStack.length === 0) {
    throw new Error("continue statement outside of loop");
  }
  const currentLoop = context.loopStack[context.loopStack.length - 1];
  if (!currentLoop) {
    throw new Error("continue statement outside of loop");
  }
  return `BA ${currentLoop.startLabel}`;
}

/**
 * フラグ条件に基づいた条件ジャンプ命令を生成
 * @param condition フラグ条件
 * @param label ジャンプ先ラベル
 * @param negate true の場合、条件を反転（条件が偽の場合にジャンプ）
 */
function generateConditionalJump(condition: FlagCondition, label: string, negate: boolean): string {
  // 条件を反転する場合のマッピング
  const negatedConditionMap: Record<FlagCondition, string> = {
    ZERO: "BNZ",
    NOT_ZERO: "BZ",
    NEGATIVE: "BP",
    POSITIVE: "BN",
    CARRY: "BNC",
    NOT_CARRY: "BC",
    OVERFLOW: "BNO",
    ZERO_OR_POSITIVE: "BN",
    ZERO_OR_NEGATIVE: "BP",
    GTE: "BLT",
    LT: "BGE",
    GT: "BLE",
    LTE: "BGT",
    NO_INPUT: "BIN",
    NO_OUTPUT: "BOUT",
  };

  // 条件をそのまま使う場合のマッピング
  const conditionMap: Record<FlagCondition, string> = {
    ZERO: "BZ",
    NOT_ZERO: "BNZ",
    NEGATIVE: "BN",
    POSITIVE: "BP",
    CARRY: "BC",
    NOT_CARRY: "BNC",
    OVERFLOW: "BO",
    ZERO_OR_POSITIVE: "BP",
    ZERO_OR_NEGATIVE: "BN",
    GTE: "BGE",
    LT: "BLT",
    GT: "BGT",
    LTE: "BLE",
    NO_INPUT: "BNIN",
    NO_OUTPUT: "BNOUT",
  };

  const jumpInstruction = negate ? negatedConditionMap[condition] : conditionMap[condition];
  return `${jumpInstruction} ${label}`;
}

/**
 * マクロ呼び出しのコード生成（インライン展開）
 * identifier!  →  マクロ本体の文をインライン展開
 */
function generateMacroCall(statement: MacroCallStatement, context: CodeGenContext): string {
  const macroDecl = context.macroTable.get(statement.name);
  if (!macroDecl) {
    throw new Error(`Undefined macro: ${statement.name}`);
  }

  // マクロ本体の各文をコード生成
  const lines: string[] = [];
  for (const stmt of macroDecl.body) {
    const code = generateStatement(stmt, context);
    if (code && code.trim() !== "") {
      lines.push(code);
    }
  }

  return lines.join("\n");
}

/**
 * asmブロックのコード生成
 * asm `...`  →  バッククォート内のテキストをそのまま出力
 */
function generateAsm(statement: AsmBlock): string {
  // バッククォート内のテキストをそのまま返す
  // 改行やインデントも含めて保持
  return statement.content;
}
