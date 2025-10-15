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
  LBracket,
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
  RBracket,
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
      maxLookahead: 8, // 配列アクセスと二項演算文/比較文を区別するために必要
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
        // 配列アクセスを考慮して比較演算子を探す
        // identifier[expr] == operand の場合、最初の7トークンをスキャン
        GATE: () => {
          // オペランドの後の最初の演算子を探す (最大8トークン先まで)
          for (let i = 2; i <= 8; i++) {
            const token = this.LA(i);
            // 比較演算子が見つかった
            if (
              token.tokenType === Equals ||
              token.tokenType === NotEquals ||
              token.tokenType === LessThan ||
              token.tokenType === LessThanOrEqual ||
              token.tokenType === GreaterThan ||
              token.tokenType === GreaterThanOrEqual
            ) {
              return true;
            }
            // 他の演算子や文の終わりが見つかったら比較文ではない
            if (
              token.tokenType === Plus ||
              token.tokenType === PlusWithCarry ||
              token.tokenType === Minus ||
              token.tokenType === MinusWithCarry ||
              token.tokenType === And ||
              token.tokenType === Or ||
              token.tokenType === Xor ||
              token.tokenType === LeftShift ||
              token.tokenType === LeftShiftArithmetic ||
              token.tokenType === RightShift ||
              token.tokenType === RightShiftArithmetic ||
              token.tokenType === LeftRotate ||
              token.tokenType === RightRotate ||
              token.tokenType === LBrace ||
              token.tokenType === RBrace ||
              token.tokenType === Assign
            ) {
              return false;
            }
          }
          return false;
        },
        ALT: () => this.SUBRULE(this.comparisonStatement),
      },
      {
        // 二項演算文: lvalue = operand operator operand
        // 配列アクセスを考慮して二項演算子を探す
        GATE: () => {
          const token1 = this.LA(1);
          if (token1.tokenType !== Identifier) {
            return false;
          }

          // lvalue (identifier または identifier[index]) をスキップ
          let pos = 2;
          const token2 = this.LA(pos);
          // 配列アクセスの場合は ] まで進む
          if (token2.tokenType === LBracket) {
            pos++;
            // indexExpression をスキップ (identifier または literal)
            pos++;
            // RBracket をスキップ
            const closeBracket = this.LA(pos);
            if (closeBracket.tokenType === RBracket) {
              pos++;
            }
          }

          // = をチェック
          const assignToken = this.LA(pos);
          if (assignToken.tokenType !== Assign) {
            return false;
          }
          pos++;

          // 最初のオペランド (identifier, identifier[index], literal) をスキップ
          const operandToken = this.LA(pos);
          if (operandToken.tokenType === Identifier) {
            pos++;
            const maybeOpenBracket = this.LA(pos);
            if (maybeOpenBracket.tokenType === LBracket) {
              pos++;
              pos++; // indexExpression
              const maybeCloseBracket = this.LA(pos);
              if (maybeCloseBracket.tokenType === RBracket) {
                pos++;
              }
            }
          } else if (operandToken.tokenType === HexLiteral || operandToken.tokenType === DecimalLiteral) {
            pos++;
          } else {
            return false;
          }

          // 二項演算子をチェック
          const opToken = this.LA(pos);
          return (
            opToken.tokenType === Plus ||
            opToken.tokenType === PlusWithCarry ||
            opToken.tokenType === Minus ||
            opToken.tokenType === MinusWithCarry ||
            opToken.tokenType === And ||
            opToken.tokenType === Or ||
            opToken.tokenType === Xor ||
            opToken.tokenType === LeftShift ||
            opToken.tokenType === LeftShiftArithmetic ||
            opToken.tokenType === RightShift ||
            opToken.tokenType === RightShiftArithmetic ||
            opToken.tokenType === LeftRotate ||
            opToken.tokenType === RightRotate
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
   * identifier | identifier[index]
   */
  private lvalue = this.RULE("lvalue", () => {
    this.CONSUME(Identifier);
    this.OPTION(() => {
      this.CONSUME(LBracket);
      this.SUBRULE(this.indexExpression);
      this.CONSUME(RBracket);
    });
  });

  /**
   * 右辺値 (rvalue)
   *
   * identifier | identifier[index] | literal
   */
  private rvalue = this.RULE("rvalue", () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(Identifier);
          this.OPTION(() => {
            this.CONSUME(LBracket);
            this.SUBRULE(this.indexExpression);
            this.CONSUME(RBracket);
          });
        },
      },
      { ALT: () => this.SUBRULE(this.literal) },
    ]);
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
   * 配列の添字式
   *
   * identifier | literal
   */
  private indexExpression = this.RULE("indexExpression", () => {
    this.OR([{ ALT: () => this.CONSUME(Identifier) }, { ALT: () => this.SUBRULE(this.literal) }]);
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
   * identifier | identifier[index] | literal
   */
  private operand = this.RULE("operand", () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(Identifier);
          this.OPTION(() => {
            this.CONSUME(LBracket);
            this.SUBRULE(this.indexExpression);
            this.CONSUME(RBracket);
          });
        },
      },
      { ALT: () => this.SUBRULE(this.literal) },
    ]);
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
