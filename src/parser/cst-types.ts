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
  };
}

/**
 * 右辺値のCST
 */
export interface RValueCst extends CstNode {
  name: "rvalue";
  children: {
    Identifier?: IToken[];
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
