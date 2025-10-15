/**
 * KUE-DSL 抽象構文木（AST）の型定義
 */

// ========================================
// プログラム全体
// ========================================

export interface Program {
  type: "Program";
  variables: VariableDeclaration[];
  body: Statement[];
}

// ========================================
// 変数宣言
// ========================================

export interface VariableDeclaration {
  type: "VariableDeclaration";
  name: string;
  address: number;
  location?: SourceLocation;
}

// ========================================
// 文
// ========================================

export type Statement =
  | AssignmentStatement
  | ComparisonStatement
  | BinaryOperationStatement
  | IfStatement
  | LoopStatement
  | BreakStatement
  | ContinueStatement
  | BuiltinStatement
  | MacroCallStatement
  | MacroDeclaration
  | AsmBlock;

// 代入文: lvalue = rvalue
export interface AssignmentStatement {
  type: "AssignmentStatement";
  left: LValue;
  right: RValue;
  location?: SourceLocation;
}

// 比較文: operand compare_op operand
export interface ComparisonStatement {
  type: "ComparisonStatement";
  operator: ComparisonOperator;
  left: Operand;
  right: Operand;
  location?: SourceLocation;
}

// 二項演算文: dest = op1 operator op2
export interface BinaryOperationStatement {
  type: "BinaryOperationStatement";
  destination: LValue;
  operator: BinaryOperator;
  left: Operand;
  right: Operand;
  location?: SourceLocation;
}

// if文
export interface IfStatement {
  type: "IfStatement";
  condition: FlagCondition;
  body: Statement[];
  location?: SourceLocation;
}

// loop文
export interface LoopStatement {
  type: "LoopStatement";
  body: Statement[];
  location?: SourceLocation;
}

// break文
export interface BreakStatement {
  type: "BreakStatement";
  location?: SourceLocation;
}

// continue文
export interface ContinueStatement {
  type: "ContinueStatement";
  location?: SourceLocation;
}

// 組み込み命令
export interface BuiltinStatement {
  type: "BuiltinStatement";
  instruction: BuiltinInstruction;
  location?: SourceLocation;
}

// マクロ呼び出し
export interface MacroCallStatement {
  type: "MacroCallStatement";
  name: string;
  location?: SourceLocation;
}

// マクロ宣言
export interface MacroDeclaration {
  type: "MacroDeclaration";
  name: string;
  body: Statement[];
  location?: SourceLocation;
}

// asmブロック
export interface AsmBlock {
  type: "AsmBlock";
  content: string;
  location?: SourceLocation;
}

// ========================================
// 値
// ========================================

// 左辺値（代入先）
export type LValue = Variable | ArrayAccess | Register;

// 右辺値（代入元）
export type RValue = Variable | ArrayAccess | Literal | Register;

// オペランド（演算子の引数）
export type Operand = Variable | ArrayAccess | Literal | Register;

// 変数
export interface Variable {
  type: "Variable";
  name: string;
  location?: SourceLocation;
}

// 配列アクセス
export interface ArrayAccess {
  type: "ArrayAccess";
  array: string;
  index: Variable | Literal;
  location?: SourceLocation;
}

// レジスタ
export interface Register {
  type: "Register";
  name: "ACC" | "IX";
  location?: SourceLocation;
}

// リテラル
export interface Literal {
  type: "Literal";
  value: number;
  raw: string; // 元の表記（10進数or16進数）
  location?: SourceLocation;
}

// ========================================
// 演算子と条件
// ========================================

// 比較演算子
export type ComparisonOperator = "==" | "!=" | "<" | ">" | "<=" | ">=";

// 二項演算子
export type BinaryOperator =
  | "+" // ADD
  | "+c" // ADC
  | "-" // SUB
  | "-c" // SBC
  | "&" // AND
  | "|" // OR
  | "^" // XOR
  | "<<" // SLL
  | "<<a" // SLA
  | ">>" // SRL
  | ">>a" // SRA
  | "<<<" // RLL
  | ">>>"; // RRL

// フラグ条件
export type FlagCondition =
  | "ZERO"
  | "NOT_ZERO"
  | "NEGATIVE"
  | "POSITIVE"
  | "CARRY"
  | "NOT_CARRY"
  | "OVERFLOW"
  | "ZERO_OR_POSITIVE"
  | "ZERO_OR_NEGATIVE"
  | "GTE"
  | "LT"
  | "GT"
  | "LTE"
  | "NO_INPUT"
  | "NO_OUTPUT";

// 組み込み命令
export type BuiltinInstruction = "halt" | "nop" | "input" | "output" | "set_carry_flag" | "reset_carry_flag";

// ========================================
// ソース位置情報
// ========================================

export interface SourceLocation {
  start: Position;
  end: Position;
}

export interface Position {
  line: number;
  column: number;
  offset: number;
}
