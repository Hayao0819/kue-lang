import type { IToken } from "chevrotain";
import type {
  AssignmentStatement,
  BinaryOperationStatement,
  BinaryOperator,
  BreakStatement,
  BuiltinInstruction,
  BuiltinStatement,
  ComparisonOperator,
  ComparisonStatement,
  ContinueStatement,
  FlagCondition,
  IfStatement,
  Literal,
  LoopStatement,
  LValue,
  Operand,
  Program,
  RValue,
  Statement,
  Variable,
  VariableDeclaration,
} from "../ast/index.js";
import type {
  AssignmentStatementCst,
  BinaryOperationStatementCst,
  BinaryOperatorCst,
  BreakStatementCst,
  BuiltinStatementCst,
  ComparisonOperatorCst,
  ComparisonStatementCst,
  ContinueStatementCst,
  FlagConditionCst,
  IfStatementCst,
  IndexExpressionCst,
  LiteralCst,
  LoopStatementCst,
  LValueCst,
  OperandCst,
  ProgramCst,
  RValueCst,
  StatementCst,
  VariableDeclarationCst,
} from "./cst-types.js";
import { kueParser } from "./parser.js";

/**
 * CST（Concrete Syntax Tree）をAST（Abstract Syntax Tree）に変換するビジター
 */
const BaseCstVisitor = kueParser.getBaseCstVisitorConstructor();

export class KueAstBuilder extends BaseCstVisitor {
  constructor() {
    super();
    this.validateVisitor();
  }

  /**
   * プログラム全体を訪問
   */
  program(ctx: ProgramCst["children"]): Program {
    const variables: VariableDeclaration[] = [];

    if (ctx.variableDeclaration) {
      for (const varDeclCst of ctx.variableDeclaration) {
        const varDecl = this.visit(varDeclCst) as VariableDeclaration;
        variables.push(varDecl);
      }
    }

    const body: Statement[] = [];
    if (ctx.statement) {
      for (const stmtCst of ctx.statement) {
        const stmt = this.visit(stmtCst) as Statement;
        body.push(stmt);
      }
    }

    return {
      type: "Program",
      variables,
      body,
    };
  }

  /**
   * 文を訪問
   */
  statement(ctx: StatementCst["children"]): Statement {
    if (ctx.loopStatement) {
      return this.visit(ctx.loopStatement) as LoopStatement;
    }
    if (ctx.ifStatement) {
      return this.visit(ctx.ifStatement) as IfStatement;
    }
    if (ctx.breakStatement) {
      return this.visit(ctx.breakStatement) as BreakStatement;
    }
    if (ctx.continueStatement) {
      return this.visit(ctx.continueStatement) as ContinueStatement;
    }
    if (ctx.comparisonStatement) {
      return this.visit(ctx.comparisonStatement) as ComparisonStatement;
    }
    if (ctx.binaryOperationStatement) {
      return this.visit(ctx.binaryOperationStatement) as BinaryOperationStatement;
    }
    if (ctx.assignmentStatement) {
      return this.visit(ctx.assignmentStatement) as AssignmentStatement;
    }
    if (ctx.builtinStatement) {
      return this.visit(ctx.builtinStatement) as BuiltinStatement;
    }
    throw new Error("Unknown statement type");
  }

  /**
   * 代入文を訪問
   */
  assignmentStatement(ctx: AssignmentStatementCst["children"]): AssignmentStatement {
    const left = this.visit(ctx.lvalue) as LValue;
    const right = this.visit(ctx.rvalue) as RValue;

    return {
      type: "AssignmentStatement",
      left,
      right,
    };
  }

  /**
   * 左辺値を訪問
   */
  lvalue(ctx: LValueCst["children"]): LValue {
    const token = ctx.Identifier[0];
    if (!token) {
      throw new Error("Missing identifier in lvalue");
    }

    // 配列アクセスかどうかをチェック
    if (ctx.indexExpression && ctx.indexExpression.length > 0) {
      const indexExpr = ctx.indexExpression[0];
      if (!indexExpr) {
        throw new Error("Missing index expression");
      }
      const index = this.visit(indexExpr) as Variable | Literal;
      return {
        type: "ArrayAccess",
        array: token.image,
        index,
        location: this.getLocation(token),
      };
    }

    return {
      type: "Variable",
      name: token.image,
      location: this.getLocation(token),
    };
  }

  /**
   * 右辺値を訪問
   */
  rvalue(ctx: RValueCst["children"]): RValue {
    if (ctx.Identifier) {
      const token = ctx.Identifier[0];
      if (!token) {
        throw new Error("Missing identifier in rvalue");
      }

      // 配列アクセスかどうかをチェック
      if (ctx.indexExpression && ctx.indexExpression.length > 0) {
        const indexExpr = ctx.indexExpression[0];
        if (!indexExpr) {
          throw new Error("Missing index expression");
        }
        const index = this.visit(indexExpr) as Variable | Literal;
        return {
          type: "ArrayAccess",
          array: token.image,
          index,
          location: this.getLocation(token),
        };
      }

      return {
        type: "Variable",
        name: token.image,
        location: this.getLocation(token),
      };
    }
    if (ctx.literal) {
      return this.visit(ctx.literal) as Literal;
    }
    throw new Error("Unknown rvalue type");
  }

  /**
   * リテラルを訪問
   */
  literal(ctx: LiteralCst["children"]): Literal {
    const token = ctx.HexLiteral?.[0] ?? ctx.DecimalLiteral?.[0];
    if (!token) {
      throw new Error("Missing literal token");
    }

    const raw = token.image;
    let value: number;
    if (raw.startsWith("0x") || raw.startsWith("0X")) {
      value = Number.parseInt(raw, 16);
    } else {
      value = Number.parseInt(raw, 10);
    }

    return {
      type: "Literal",
      value,
      raw,
      location: this.getLocation(token),
    };
  }

  /**
   * 配列の添字式を訪問
   */
  indexExpression(ctx: IndexExpressionCst["children"]): Variable | Literal {
    if (ctx.Identifier) {
      const token = ctx.Identifier[0];
      if (!token) {
        throw new Error("Missing identifier in index expression");
      }
      return {
        type: "Variable",
        name: token.image,
        location: this.getLocation(token),
      };
    }
    if (ctx.literal) {
      return this.visit(ctx.literal) as Literal;
    }
    throw new Error("Unknown index expression type");
  }

  /**
   * 二項演算文を訪問
   */
  binaryOperationStatement(ctx: BinaryOperationStatementCst["children"]): BinaryOperationStatement {
    const destination = this.visit(ctx.lvalue) as LValue;
    const operator = this.visit(ctx.binaryOperator) as BinaryOperator;
    const left = this.visit(ctx.left) as Operand;
    const right = this.visit(ctx.right) as Operand;

    return {
      type: "BinaryOperationStatement",
      destination,
      operator,
      left,
      right,
    };
  }

  /**
   * 二項演算子を訪問
   */
  binaryOperator(ctx: BinaryOperatorCst["children"]): BinaryOperator {
    if (ctx.Plus?.[0]) return "+";
    if (ctx.PlusWithCarry?.[0]) return "+c";
    if (ctx.Minus?.[0]) return "-";
    if (ctx.MinusWithCarry?.[0]) return "-c";
    if (ctx.And?.[0]) return "&";
    if (ctx.Or?.[0]) return "|";
    if (ctx.Xor?.[0]) return "^";
    if (ctx.LeftShift?.[0]) return "<<";
    if (ctx.LeftShiftArithmetic?.[0]) return "<<a";
    if (ctx.RightShift?.[0]) return ">>";
    if (ctx.RightShiftArithmetic?.[0]) return ">>a";
    if (ctx.LeftRotate?.[0]) return "<<<";
    if (ctx.RightRotate?.[0]) return ">>>";
    throw new Error("Unknown binary operator");
  }

  /**
   * オペランドを訪問
   */
  operand(ctx: OperandCst["children"]): Operand {
    if (ctx.Identifier) {
      const token = ctx.Identifier[0];
      if (!token) {
        throw new Error("Missing identifier in operand");
      }

      // 配列アクセスかどうかをチェック
      if (ctx.indexExpression && ctx.indexExpression.length > 0) {
        const indexExpr = ctx.indexExpression[0];
        if (!indexExpr) {
          throw new Error("Missing index expression");
        }
        const index = this.visit(indexExpr) as Variable | Literal;
        return {
          type: "ArrayAccess",
          array: token.image,
          index,
          location: this.getLocation(token),
        };
      }

      return {
        type: "Variable",
        name: token.image,
        location: this.getLocation(token),
      };
    }
    if (ctx.literal) {
      return this.visit(ctx.literal) as Literal;
    }
    throw new Error("Unknown operand type");
  }

  /**
   * 比較文を訪問
   */
  comparisonStatement(ctx: ComparisonStatementCst["children"]): ComparisonStatement {
    const operator = this.visit(ctx.comparisonOperator) as ComparisonOperator;
    const left = this.visit(ctx.left) as Operand;
    const right = this.visit(ctx.right) as Operand;

    return {
      type: "ComparisonStatement",
      operator,
      left,
      right,
    };
  }

  /**
   * 比較演算子を訪問
   */
  comparisonOperator(ctx: ComparisonOperatorCst["children"]): ComparisonOperator {
    if (ctx.Equals?.[0]) return "==";
    if (ctx.NotEquals?.[0]) return "!=";
    if (ctx.LessThan?.[0]) return "<";
    if (ctx.LessThanOrEqual?.[0]) return "<=";
    if (ctx.GreaterThan?.[0]) return ">";
    if (ctx.GreaterThanOrEqual?.[0]) return ">=";
    throw new Error("Unknown comparison operator");
  }

  /**
   * 組み込み命令を訪問
   */
  builtinStatement(ctx: BuiltinStatementCst["children"]): BuiltinStatement {
    type InstructionMapping = {
      instruction: BuiltinInstruction;
      token: IToken;
    };

    let mapping: InstructionMapping;

    if (ctx.Halt?.[0]) {
      mapping = { instruction: "halt", token: ctx.Halt[0] };
    } else if (ctx.Nop?.[0]) {
      mapping = { instruction: "nop", token: ctx.Nop[0] };
    } else if (ctx.Input?.[0]) {
      mapping = { instruction: "input", token: ctx.Input[0] };
    } else if (ctx.Output?.[0]) {
      mapping = { instruction: "output", token: ctx.Output[0] };
    } else if (ctx.SetCarryFlag?.[0]) {
      mapping = { instruction: "set_carry_flag", token: ctx.SetCarryFlag[0] };
    } else if (ctx.ResetCarryFlag?.[0]) {
      mapping = { instruction: "reset_carry_flag", token: ctx.ResetCarryFlag[0] };
    } else {
      throw new Error("Unknown builtin instruction");
    }

    return {
      type: "BuiltinStatement",
      instruction: mapping.instruction,
      location: this.getLocation(mapping.token),
    };
  }

  /**
   * 変数宣言を訪問
   */
  variableDeclaration(ctx: VariableDeclarationCst["children"]): VariableDeclaration {
    const nameToken = ctx.Identifier[0];
    if (!nameToken) {
      throw new Error("Missing identifier in variable declaration");
    }

    const addressToken = ctx.HexLiteral?.[0] ?? ctx.DecimalLiteral?.[0];
    if (!addressToken) {
      throw new Error("Missing address in variable declaration");
    }

    const addressValue = addressToken.image;
    let address: number;
    if (addressValue.startsWith("0x") || addressValue.startsWith("0X")) {
      address = Number.parseInt(addressValue, 16);
    } else {
      address = Number.parseInt(addressValue, 10);
    }

    return {
      type: "VariableDeclaration",
      name: nameToken.image,
      address,
      location: this.getLocation(nameToken),
    };
  }

  /**
   * loop文を訪問
   */
  loopStatement(ctx: LoopStatementCst["children"]): LoopStatement {
    const loopToken = ctx.Loop[0];
    if (!loopToken) {
      throw new Error("Missing loop token");
    }

    const body: Statement[] = [];
    if (ctx.statement) {
      for (const stmtCst of ctx.statement) {
        const stmt = this.visit(stmtCst) as Statement;
        body.push(stmt);
      }
    }

    return {
      type: "LoopStatement",
      body,
      location: this.getLocation(loopToken),
    };
  }

  /**
   * if文を訪問
   */
  ifStatement(ctx: IfStatementCst["children"]): IfStatement {
    const ifToken = ctx.If[0];
    if (!ifToken) {
      throw new Error("Missing if token");
    }

    const condition = this.visit(ctx.flagCondition) as FlagCondition;

    const body: Statement[] = [];
    if (ctx.statement) {
      for (const stmtCst of ctx.statement) {
        const stmt = this.visit(stmtCst) as Statement;
        body.push(stmt);
      }
    }

    return {
      type: "IfStatement",
      condition,
      body,
      location: this.getLocation(ifToken),
    };
  }

  /**
   * break文を訪問
   */
  breakStatement(ctx: BreakStatementCst["children"]): BreakStatement {
    const breakToken = ctx.Break[0];
    if (!breakToken) {
      throw new Error("Missing break token");
    }

    return {
      type: "BreakStatement",
      location: this.getLocation(breakToken),
    };
  }

  /**
   * continue文を訪問
   */
  continueStatement(ctx: ContinueStatementCst["children"]): ContinueStatement {
    const continueToken = ctx.Continue[0];
    if (!continueToken) {
      throw new Error("Missing continue token");
    }

    return {
      type: "ContinueStatement",
      location: this.getLocation(continueToken),
    };
  }

  /**
   * フラグ条件を訪問
   */
  flagCondition(ctx: FlagConditionCst["children"]): FlagCondition {
    if (ctx.Zero?.[0]) return "ZERO";
    if (ctx.NotZero?.[0]) return "NOT_ZERO";
    if (ctx.Negative?.[0]) return "NEGATIVE";
    if (ctx.Positive?.[0]) return "POSITIVE";
    if (ctx.Carry?.[0]) return "CARRY";
    if (ctx.NotCarry?.[0]) return "NOT_CARRY";
    if (ctx.Overflow?.[0]) return "OVERFLOW";
    if (ctx.ZeroOrPositive?.[0]) return "ZERO_OR_POSITIVE";
    if (ctx.ZeroOrNegative?.[0]) return "ZERO_OR_NEGATIVE";
    if (ctx.Gte?.[0]) return "GTE";
    if (ctx.Lt?.[0]) return "LT";
    if (ctx.Gt?.[0]) return "GT";
    if (ctx.Lte?.[0]) return "LTE";
    if (ctx.NoInput?.[0]) return "NO_INPUT";
    if (ctx.NoOutput?.[0]) return "NO_OUTPUT";
    throw new Error("Unknown flag condition");
  }

  /**
   * トークンから位置情報を取得
   */
  private getLocation(token: IToken) {
    return {
      start: {
        line: token.startLine ?? 0,
        column: token.startColumn ?? 0,
        offset: token.startOffset,
      },
      end: {
        line: token.endLine ?? 0,
        column: token.endColumn ?? 0,
        offset: token.endOffset ?? 0,
      },
    };
  }
}

// デフォルトのビジターインスタンス
export const astBuilder = new KueAstBuilder();
