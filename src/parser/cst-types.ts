/**
 * Chevrotain CST (Concrete Syntax Tree) の型定義
 */

import type { CstNode, IToken } from "chevrotain";

/**
 * プログラム全体のCST
 */
export interface ProgramCst extends CstNode {
  name: "program";
  children: {
    variableDeclaration?: VariableDeclarationCst[];
    statement?: StatementCst[];
  };
}

/**
 * 変数宣言のCST
 */
export interface VariableDeclarationCst extends CstNode {
  name: "variableDeclaration";
  children: {
    Var: IToken[];
    Identifier: IToken[];
    At: IToken[];
    HexLiteral?: IToken[];
    DecimalLiteral?: IToken[];
  };
}

/**
 * 文のCST
 */
export interface StatementCst extends CstNode {
  name: "statement";
  children: {
    loopStatement?: LoopStatementCst[];
    ifStatement?: IfStatementCst[];
    breakStatement?: BreakStatementCst[];
    continueStatement?: ContinueStatementCst[];
    comparisonStatement?: ComparisonStatementCst[];
    binaryOperationStatement?: BinaryOperationStatementCst[];
    assignmentStatement?: AssignmentStatementCst[];
    builtinStatement?: BuiltinStatementCst[];
  };
}

/**
 * 代入文のCST
 */
export interface AssignmentStatementCst extends CstNode {
  name: "assignmentStatement";
  children: {
    lvalue: LValueCst[];
    Assign: IToken[];
    rvalue: RValueCst[];
  };
}

/**
 * 左辺値のCST
 */
export interface LValueCst extends CstNode {
  name: "lvalue";
  children: {
    Identifier: IToken[];
    LBracket?: IToken[];
    indexExpression?: IndexExpressionCst[];
    RBracket?: IToken[];
  };
}

/**
 * 右辺値のCST
 */
export interface RValueCst extends CstNode {
  name: "rvalue";
  children: {
    Identifier?: IToken[];
    LBracket?: IToken[];
    indexExpression?: IndexExpressionCst[];
    RBracket?: IToken[];
    literal?: LiteralCst[];
  };
}

/**
 * リテラルのCST
 */
export interface LiteralCst extends CstNode {
  name: "literal";
  children: {
    HexLiteral?: IToken[];
    DecimalLiteral?: IToken[];
  };
}

/**
 * 配列の添字式のCST
 */
export interface IndexExpressionCst extends CstNode {
  name: "indexExpression";
  children: {
    Identifier?: IToken[];
    literal?: LiteralCst[];
  };
}

/**
 * 二項演算文のCST
 */
export interface BinaryOperationStatementCst extends CstNode {
  name: "binaryOperationStatement";
  children: {
    lvalue: LValueCst[];
    Assign: IToken[];
    left: OperandCst[];
    binaryOperator: BinaryOperatorCst[];
    right: OperandCst[];
  };
}

/**
 * 二項演算子のCST
 */
export interface BinaryOperatorCst extends CstNode {
  name: "binaryOperator";
  children: {
    Plus?: IToken[];
    PlusWithCarry?: IToken[];
    Minus?: IToken[];
    MinusWithCarry?: IToken[];
    And?: IToken[];
    Or?: IToken[];
    Xor?: IToken[];
    LeftShift?: IToken[];
    LeftShiftArithmetic?: IToken[];
    RightShift?: IToken[];
    RightShiftArithmetic?: IToken[];
    LeftRotate?: IToken[];
    RightRotate?: IToken[];
  };
}

/**
 * オペランドのCST
 */
export interface OperandCst extends CstNode {
  name: "operand";
  children: {
    Identifier?: IToken[];
    LBracket?: IToken[];
    indexExpression?: IndexExpressionCst[];
    RBracket?: IToken[];
    literal?: LiteralCst[];
  };
}

/**
 * 比較文のCST
 */
export interface ComparisonStatementCst extends CstNode {
  name: "comparisonStatement";
  children: {
    left: OperandCst[];
    comparisonOperator: ComparisonOperatorCst[];
    right: OperandCst[];
  };
}

/**
 * 比較演算子のCST
 */
export interface ComparisonOperatorCst extends CstNode {
  name: "comparisonOperator";
  children: {
    Equals?: IToken[];
    NotEquals?: IToken[];
    LessThan?: IToken[];
    LessThanOrEqual?: IToken[];
    GreaterThan?: IToken[];
    GreaterThanOrEqual?: IToken[];
  };
}

/**
 * loop文のCST
 */
export interface LoopStatementCst extends CstNode {
  name: "loopStatement";
  children: {
    Loop: IToken[];
    LBrace: IToken[];
    statement?: StatementCst[];
    RBrace: IToken[];
  };
}

/**
 * if文のCST
 */
export interface IfStatementCst extends CstNode {
  name: "ifStatement";
  children: {
    If: IToken[];
    flagCondition: FlagConditionCst[];
    LBrace: IToken[];
    statement?: StatementCst[];
    RBrace: IToken[];
  };
}

/**
 * break文のCST
 */
export interface BreakStatementCst extends CstNode {
  name: "breakStatement";
  children: {
    Break: IToken[];
  };
}

/**
 * continue文のCST
 */
export interface ContinueStatementCst extends CstNode {
  name: "continueStatement";
  children: {
    Continue: IToken[];
  };
}

/**
 * フラグ条件のCST
 */
export interface FlagConditionCst extends CstNode {
  name: "flagCondition";
  children: {
    Zero?: IToken[];
    NotZero?: IToken[];
    Negative?: IToken[];
    Positive?: IToken[];
    Carry?: IToken[];
    NotCarry?: IToken[];
    Overflow?: IToken[];
    ZeroOrPositive?: IToken[];
    ZeroOrNegative?: IToken[];
    Gte?: IToken[];
    Lt?: IToken[];
    Gt?: IToken[];
    Lte?: IToken[];
    NoInput?: IToken[];
    NoOutput?: IToken[];
  };
}

/**
 * 組み込み命令のCST
 */
export interface BuiltinStatementCst extends CstNode {
  name: "builtinStatement";
  children: {
    Halt?: IToken[];
    Nop?: IToken[];
    Input?: IToken[];
    Output?: IToken[];
    SetCarryFlag?: IToken[];
    ResetCarryFlag?: IToken[];
  };
}
