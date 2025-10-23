/**
 * KUE-DSL コード生成器
 * ASTからKUE-CHIP2アセンブリコードを生成
 */

import type {
  ArrayAccess,
  AsmBlock,
  AssignmentStatement,
  BinaryOperationStatement,
  BuiltinStatement,
  ComparisonStatement,
  FlagCondition,
  IfStatement,
  LoopStatement,
  LValue,
  MacroCallStatement,
  MacroDeclaration,
  Operand,
  Program,
  RValue,
  Statement,
  VariableDeclaration,
} from "../ast/index.js";

/**
 * ラベル生成用のカウンタ
 */
let labelCounter = 0;

/**
 * ユニークなラベルを生成
 */
function generateLabel(prefix: string): string {
  return `${prefix}_${labelCounter++}`;
}

/**
 * ラベルカウンタをリセット
 */
function resetLabelCounter(): void {
  labelCounter = 0;
}

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

/**
 * コード生成コンテキスト
 */
interface CodeGenContext {
  symbolTable: Map<string, number>;
  loopStack: LoopLabels[];
  macroTable: Map<string, MacroDeclaration>;
}

/**
 * ループのラベル情報
 */
interface LoopLabels {
  startLabel: string;
  endLabel: string;
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
 * マクロテーブルを構築
 */
function buildMacroTable(statements: Statement[]): Map<string, MacroDeclaration> {
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
function generateStatement(statement: Statement, context: CodeGenContext): string {
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
    // 配列アクセス: array[index]
    return generateArrayLoad(rvalue, symbolTable);
  } else if (rvalue.type === "Register") {
    // レジスタ: LD ACC, IX または LD ACC, ACC（無操作）
    if (rvalue.name === "IX") {
      return `LD ACC, IX`;
    }
    // ACC = ACC は無操作だが、コメントとして出力
    return `* ACC = ACC (no operation)`;
  }
  const _exhaustive: never = rvalue;
  return _exhaustive;
}

/**
 * 左辺値のストア命令を生成
 * NOTE: レジスタへのストアはST命令では不可能（仕様上、STの第2オペランドはメモリアドレスのみ）
 *       レジスタへの代入は、LD命令または直接演算で行う
 */
function generateStore(lvalue: LValue, symbolTable: Map<string, number>): string {
  if (lvalue.type === "Variable") {
    // 変数: ST ACC, (<address>)
    const address = getVariableAddress(lvalue.name, symbolTable);
    return `ST ACC, ${formatDataAddress(address)}`;
  } else if (lvalue.type === "ArrayAccess") {
    // 配列アクセス: array[index]
    return generateArrayStore(lvalue, symbolTable);
  } else if (lvalue.type === "Register") {
    // レジスタへのストアは、ST命令では実現できない
    // この関数が呼ばれる場合は、プログラミングエラー
    throw new Error(
      `Cannot use ST instruction to store to register ${lvalue.name}. ` +
      `Register operations should be handled by direct register instructions (LD, ADD, etc).`
    );
  }
  const _exhaustive: never = lvalue;
  return _exhaustive;
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
      symbolTable
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
 * レジスタへのロード命令を生成
 * 特定のレジスタ(ACC or IX)にオペランドをロード
 */
function generateRegisterLoad(operand: Operand, targetReg: string, symbolTable: Map<string, number>): string {
  if (operand.type === "Literal") {
    return `LD ${targetReg}, ${operand.value}`;
  } else if (operand.type === "Variable") {
    const address = getVariableAddress(operand.name, symbolTable);
    return `LD ${targetReg}, ${formatDataAddress(address)}`;
  } else if (operand.type === "ArrayAccess") {
    // 配列アクセスの場合、ACCにロードしてからターゲットレジスタに転送
    // ただし、ターゲットがACCならそのままロード
    if (targetReg === "ACC") {
      return generateArrayLoad(operand, symbolTable);
    }
    // IXの場合は、ACCを経由する必要がある（配列アクセスの結果はACCにロードされる）
    const lines: string[] = [];
    lines.push(generateArrayLoad(operand, symbolTable));
    lines.push(`LD ${targetReg}, ACC`);
    return lines.join("\n");
  } else if (operand.type === "Register") {
    if (operand.name === targetReg) {
      return `* ${targetReg} = ${targetReg} (no operation)`;
    }
    return `LD ${targetReg}, ${operand.name}`;
  }
  const _exhaustive: never = operand;
  return _exhaustive;
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
 * オペランドのロード命令を生成
 */
function generateOperandLoad(operand: Operand, symbolTable: Map<string, number>): string {
  if (operand.type === "Literal") {
    // リテラル: LD ACC, <value>
    return `LD ACC, ${operand.value}`;
  } else if (operand.type === "Variable") {
    // 変数: LD ACC, (<address>)
    const address = getVariableAddress(operand.name, symbolTable);
    return `LD ACC, ${formatDataAddress(address)}`;
  } else if (operand.type === "ArrayAccess") {
    // 配列アクセス: array[index]
    return generateArrayLoad(operand, symbolTable);
  } else if (operand.type === "Register") {
    // レジスタ: LD ACC, IX または LD ACC, ACC（無操作）
    if (operand.name === "IX") {
      return `LD ACC, IX`;
    }
    // ACC = ACC は無操作だが、コメントとして出力
    return `* ACC = ACC (no operation)`;
  }
  const _exhaustive: never = operand;
  return _exhaustive;
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
 * オペランドをアセンブリ形式の文字列にフォーマット
 */
function formatOperand(operand: Operand, symbolTable: Map<string, number>): string {
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
 * 変数のアドレスを取得
 */
function getVariableAddress(name: string, symbolTable: Map<string, number>): number {
  const address = symbolTable.get(name);
  if (address === undefined) {
    throw new Error(`Undefined variable: ${name}`);
  }
  return address;
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
 * 配列アクセスのロード命令を生成
 *
 * 定数添字の場合:
 *   foo = bar[2]  →  LD ACC, (183H)  // bar + 2のアドレス
 *
 * 変数添字の場合:
 *   foo = bar[i]  →  LD IX, (182H)     // iの値をIXにロード
 *                    LD ACC, (IX+181H)  // bar[i]をACCにロード
 */
function generateArrayLoad(arrayAccess: ArrayAccess, symbolTable: Map<string, number>): string {
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
function generateArrayStore(arrayAccess: ArrayAccess, symbolTable: Map<string, number>): string {
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
