import { CstParser } from "chevrotain";
import {
  Assign,
  At,
  allTokens,
  DecimalLiteral,
  Halt,
  HexLiteral,
  Identifier,
  Input,
  Nop,
  Output,
  ResetCarryFlag,
  SetCarryFlag,
  Var,
} from "../lexer/index.js";

/**
 * KUE-DSL パーサー
 *
 * トークン列をASTに変換します。
 */
export class KueParser extends CstParser {
  constructor() {
    super(allTokens, {
      recoveryEnabled: true,
      nodeLocationTracking: "full",
    });

    this.performSelfAnalysis();
  }

  /**
   * プログラム全体のパース
   *
   * program := variable_section code_section
   */
  public program = this.RULE("program", () => {
    // Note: We don't build the AST here, just the CST.
    // The visitor will handle AST construction with proper types.
    this.MANY(() => {
      this.SUBRULE(this.variableDeclaration);
    });

    // コードセクション
    this.MANY2(() => {
      this.SUBRULE(this.statement);
    });
  });

  /**
   * 文
   *
   * statement := assignment | builtin_instruction
   */
  private statement = this.RULE("statement", () => {
    return this.OR([
      { ALT: () => this.SUBRULE(this.assignmentStatement) },
      { ALT: () => this.SUBRULE(this.builtinStatement) },
    ]);
  });

  /**
   * 変数宣言
   *
   * var identifier @ address
   */
  private variableDeclaration = this.RULE("variableDeclaration", () => {
    this.CONSUME(Var);
    this.CONSUME(Identifier);
    this.CONSUME(At);
    this.OR([{ ALT: () => this.CONSUME(HexLiteral) }, { ALT: () => this.CONSUME(DecimalLiteral) }]);
  });

  /**
   * 代入文
   *
   * lvalue = rvalue
   */
  private assignmentStatement = this.RULE("assignmentStatement", () => {
    this.SUBRULE(this.lvalue);
    this.CONSUME(Assign);
    this.SUBRULE(this.rvalue);
  });

  /**
   * 左辺値 (lvalue)
   *
   * identifier
   */
  private lvalue = this.RULE("lvalue", () => {
    this.CONSUME(Identifier);
  });

  /**
   * 右辺値 (rvalue)
   *
   * identifier | literal
   */
  private rvalue = this.RULE("rvalue", () => {
    this.OR([{ ALT: () => this.CONSUME(Identifier) }, { ALT: () => this.SUBRULE(this.literal) }]);
  });

  /**
   * リテラル
   *
   * decimal | hex
   */
  private literal = this.RULE("literal", () => {
    this.OR([{ ALT: () => this.CONSUME(HexLiteral) }, { ALT: () => this.CONSUME(DecimalLiteral) }]);
  });

  /**
   * 組み込み命令
   *
   * halt | nop | input | output | set_carry_flag | reset_carry_flag
   */
  private builtinStatement = this.RULE("builtinStatement", () => {
    this.OR([
      { ALT: () => this.CONSUME(Halt) },
      { ALT: () => this.CONSUME(Nop) },
      { ALT: () => this.CONSUME(Input) },
      { ALT: () => this.CONSUME(Output) },
      { ALT: () => this.CONSUME(SetCarryFlag) },
      { ALT: () => this.CONSUME(ResetCarryFlag) },
    ]);
  });
}

// デフォルトのパーサーインスタンス
export const kueParser = new KueParser();
