import { CstParser } from "chevrotain";
import {
  And,
  Assign,
  At,
  allTokens,
  Break,
  Carry,
  Continue,
  DecimalLiteral,
  Equals,
  GreaterThan,
  GreaterThanOrEqual,
  Gt,
  Gte,
  Halt,
  HexLiteral,
  Identifier,
  If,
  Input,
  LBrace,
  LeftRotate,
  LeftShift,
  LeftShiftArithmetic,
  LessThan,
  LessThanOrEqual,
  Loop,
  Lt,
  Lte,
  Minus,
  MinusWithCarry,
  Negative,
  NoInput,
  NoOutput,
  Nop,
  NotCarry,
  NotEquals,
  NotZero,
  Or,
  Output,
  Overflow,
  Plus,
  PlusWithCarry,
  Positive,
  RBrace,
  ResetCarryFlag,
  RightRotate,
  RightShift,
  RightShiftArithmetic,
  SetCarryFlag,
  Var,
  Xor,
  Zero,
  ZeroOrNegative,
  ZeroOrPositive,
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
      maxLookahead: 4, // 二項演算文と代入文を区別するために必要
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
   * statement := loop | if | break | continue | comparison | binary_operation | assignment | builtin
   *
   * Note: 各文の形式を区別するためにlookaheadを使用しています。
   */
  private statement = this.RULE("statement", () => {
    return this.OR([
      // loop文
      { ALT: () => this.SUBRULE(this.loopStatement) },
      // if文
      { ALT: () => this.SUBRULE(this.ifStatement) },
      // break文
      { ALT: () => this.SUBRULE(this.breakStatement) },
      // continue文
      { ALT: () => this.SUBRULE(this.continueStatement) },
      {
        // 比較文: operand compare_op operand
        // 2番目のトークンが比較演算子であれば比較文
        GATE: () => {
          const token2 = this.LA(2);
          return (
            token2.tokenType === Equals ||
            token2.tokenType === NotEquals ||
            token2.tokenType === LessThan ||
            token2.tokenType === LessThanOrEqual ||
            token2.tokenType === GreaterThan ||
            token2.tokenType === GreaterThanOrEqual
          );
        },
        ALT: () => this.SUBRULE(this.comparisonStatement),
      },
      {
        // 二項演算文: identifier = operand operator ...
        // identifier = の後、4番目が二項演算子であれば二項演算文
        GATE: () => {
          const token1 = this.LA(1);
          const token2 = this.LA(2);
          const token3 = this.LA(3);
          const token4 = this.LA(4);

          // identifier = の形式であることを確認
          if (token1.tokenType !== Identifier || token2.tokenType !== Assign) {
            return false;
          }

          // 3番目はオペランド（identifier または literal）
          const isToken3Operand =
            token3.tokenType === Identifier || token3.tokenType === HexLiteral || token3.tokenType === DecimalLiteral;

          if (!isToken3Operand) {
            return false;
          }

          // 4番目が二項演算子であればtrue
          return (
            token4.tokenType === Plus ||
            token4.tokenType === PlusWithCarry ||
            token4.tokenType === Minus ||
            token4.tokenType === MinusWithCarry ||
            token4.tokenType === And ||
            token4.tokenType === Or ||
            token4.tokenType === Xor ||
            token4.tokenType === LeftShift ||
            token4.tokenType === LeftShiftArithmetic ||
            token4.tokenType === RightShift ||
            token4.tokenType === RightShiftArithmetic ||
            token4.tokenType === LeftRotate ||
            token4.tokenType === RightRotate
          );
        },
        ALT: () => this.SUBRULE(this.binaryOperationStatement),
      },
      {
        // 代入文: identifier = rvalue
        ALT: () => this.SUBRULE(this.assignmentStatement),
      },
      {
        // 組み込み命令
        ALT: () => this.SUBRULE(this.builtinStatement),
      },
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
   * 二項演算文
   *
   * lvalue = operand operator operand
   */
  private binaryOperationStatement = this.RULE("binaryOperationStatement", () => {
    this.SUBRULE(this.lvalue);
    this.CONSUME(Assign);
    this.SUBRULE(this.operand, { LABEL: "left" });
    this.SUBRULE(this.binaryOperator);
    this.SUBRULE2(this.operand, { LABEL: "right" });
  });

  /**
   * 二項演算子
   */
  private binaryOperator = this.RULE("binaryOperator", () => {
    this.OR([
      // 算術演算子（長いものから先に）
      { ALT: () => this.CONSUME(PlusWithCarry) },
      { ALT: () => this.CONSUME(Plus) },
      { ALT: () => this.CONSUME(MinusWithCarry) },
      { ALT: () => this.CONSUME(Minus) },
      // 論理演算子
      { ALT: () => this.CONSUME(And) },
      { ALT: () => this.CONSUME(Or) },
      { ALT: () => this.CONSUME(Xor) },
      // シフト・ローテート（長いものから先に）
      { ALT: () => this.CONSUME(LeftRotate) },
      { ALT: () => this.CONSUME(RightRotate) },
      { ALT: () => this.CONSUME(LeftShiftArithmetic) },
      { ALT: () => this.CONSUME(RightShiftArithmetic) },
      { ALT: () => this.CONSUME(LeftShift) },
      { ALT: () => this.CONSUME(RightShift) },
    ]);
  });

  /**
   * オペランド
   *
   * identifier | literal
   */
  private operand = this.RULE("operand", () => {
    this.OR([{ ALT: () => this.CONSUME(Identifier) }, { ALT: () => this.SUBRULE(this.literal) }]);
  });

  /**
   * 比較文
   *
   * operand compare_op operand
   */
  private comparisonStatement = this.RULE("comparisonStatement", () => {
    this.SUBRULE(this.operand, { LABEL: "left" });
    this.SUBRULE(this.comparisonOperator);
    this.SUBRULE2(this.operand, { LABEL: "right" });
  });

  /**
   * 比較演算子
   */
  private comparisonOperator = this.RULE("comparisonOperator", () => {
    this.OR([
      { ALT: () => this.CONSUME(Equals) },
      { ALT: () => this.CONSUME(NotEquals) },
      { ALT: () => this.CONSUME(LessThanOrEqual) },
      { ALT: () => this.CONSUME(GreaterThanOrEqual) },
      { ALT: () => this.CONSUME(LessThan) },
      { ALT: () => this.CONSUME(GreaterThan) },
    ]);
  });

  /**
   * loop文
   *
   * loop { statements }
   */
  private loopStatement = this.RULE("loopStatement", () => {
    this.CONSUME(Loop);
    this.CONSUME(LBrace);
    this.MANY(() => {
      this.SUBRULE(this.statement);
    });
    this.CONSUME(RBrace);
  });

  /**
   * if文
   *
   * if FLAG_CONDITION { statements }
   */
  private ifStatement = this.RULE("ifStatement", () => {
    this.CONSUME(If);
    this.SUBRULE(this.flagCondition);
    this.CONSUME(LBrace);
    this.MANY(() => {
      this.SUBRULE(this.statement);
    });
    this.CONSUME(RBrace);
  });

  /**
   * break文
   */
  private breakStatement = this.RULE("breakStatement", () => {
    this.CONSUME(Break);
  });

  /**
   * continue文
   */
  private continueStatement = this.RULE("continueStatement", () => {
    this.CONSUME(Continue);
  });

  /**
   * フラグ条件
   */
  private flagCondition = this.RULE("flagCondition", () => {
    this.OR([
      { ALT: () => this.CONSUME(ZeroOrPositive) },
      { ALT: () => this.CONSUME(ZeroOrNegative) },
      { ALT: () => this.CONSUME(NotZero) },
      { ALT: () => this.CONSUME(NotCarry) },
      { ALT: () => this.CONSUME(NoInput) },
      { ALT: () => this.CONSUME(NoOutput) },
      { ALT: () => this.CONSUME(Zero) },
      { ALT: () => this.CONSUME(Negative) },
      { ALT: () => this.CONSUME(Positive) },
      { ALT: () => this.CONSUME(Carry) },
      { ALT: () => this.CONSUME(Overflow) },
      { ALT: () => this.CONSUME(Gte) },
      { ALT: () => this.CONSUME(Lte) },
      { ALT: () => this.CONSUME(Lt) },
      { ALT: () => this.CONSUME(Gt) },
    ]);
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
