import type { IToken } from "chevrotain";
import type {
  AssignmentStatement,
  BuiltinInstruction,
  BuiltinStatement,
  Literal,
  LValue,
  Program,
  RValue,
  Statement,
  Variable,
  VariableDeclaration,
} from "../ast/index.js";
import type {
  AssignmentStatementCst,
  BuiltinStatementCst,
  LiteralCst,
  LValueCst,
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
  lvalue(ctx: LValueCst["children"]): Variable {
    const token = ctx.Identifier[0];
    if (!token) {
      throw new Error("Missing identifier in lvalue");
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
