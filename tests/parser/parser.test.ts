import { describe, expect, it } from "vitest";
import type {
  ArrayAccess,
  AssignmentStatement,
  BinaryOperationStatement,
  BuiltinStatement,
  ComparisonStatement,
  IfStatement,
  Literal,
  LoopStatement,
  MacroCallStatement,
  MacroDeclaration,
  Variable,
} from "../../src/ast/types.js";
import { parse } from "../../src/parser/index.js";

describe("KueParser", () => {
  describe("変数宣言", () => {
    it("should parse single variable declaration with hex address", () => {
      const result = parse("var counter @ 0x180");

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast).not.toBeNull();
      expect(result.ast?.type).toBe("Program");
      expect(result.ast?.variables).toHaveLength(1);

      const varDecl = result.ast?.variables[0];
      expect(varDecl?.type).toBe("VariableDeclaration");
      expect(varDecl?.name).toBe("counter");
      expect(varDecl?.address).toBe(0x180);
    });

    it("should parse single variable declaration with decimal address", () => {
      const result = parse("var limit @ 256");

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast).not.toBeNull();

      const varDecl = result.ast?.variables[0];
      expect(varDecl?.name).toBe("limit");
      expect(varDecl?.address).toBe(256);
    });

    it("should parse multiple variable declarations", () => {
      const source = `
        var counter @ 0x180
        var limit @ 0x181
        var result @ 0x182
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast).not.toBeNull();
      expect(result.ast?.variables).toHaveLength(3);

      expect(result.ast?.variables[0]?.name).toBe("counter");
      expect(result.ast?.variables[0]?.address).toBe(0x180);

      expect(result.ast?.variables[1]?.name).toBe("limit");
      expect(result.ast?.variables[1]?.address).toBe(0x181);

      expect(result.ast?.variables[2]?.name).toBe("result");
      expect(result.ast?.variables[2]?.address).toBe(0x182);
    });

    it("should parse variable with uppercase hex", () => {
      const result = parse("var foo @ 0xFF");

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const varDecl = result.ast?.variables[0];
      expect(varDecl?.name).toBe("foo");
      expect(varDecl?.address).toBe(0xff);
    });

    it("should parse variable with underscore in name", () => {
      const result = parse("var _my_var @ 0x100");

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const varDecl = result.ast?.variables[0];
      expect(varDecl?.name).toBe("_my_var");
      expect(varDecl?.address).toBe(0x100);
    });

    it("should handle variable declarations with comments", () => {
      const source = `
        // Variables section
        var counter @ 0x180  // Counter variable
        /* This is the limit */
        var limit @ 0x181
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.variables).toHaveLength(2);
    });
  });

  describe("空のプログラム", () => {
    it("should parse empty program", () => {
      const result = parse("");

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast).not.toBeNull();
      expect(result.ast?.type).toBe("Program");
      expect(result.ast?.variables).toHaveLength(0);
      expect(result.ast?.body).toHaveLength(0);
    });

    it("should parse program with only whitespace", () => {
      const result = parse("   \n\n   \t  ");

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.variables).toHaveLength(0);
    });

    it("should parse program with only comments", () => {
      const source = `
        // This is a comment
        /* Another comment */
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.variables).toHaveLength(0);
    });
  });

  describe("エラーハンドリング", () => {
    it("should report error for missing @ symbol", () => {
      const result = parse("var counter 0x180");

      expect(result.parserErrors.length).toBeGreaterThan(0);
    });

    it("should report error for missing address", () => {
      const result = parse("var counter @");

      expect(result.parserErrors.length).toBeGreaterThan(0);
    });

    it("should report error for missing variable name", () => {
      const result = parse("var @ 0x180");

      expect(result.parserErrors.length).toBeGreaterThan(0);
    });
  });

  describe("位置情報", () => {
    it("should track source location", () => {
      const result = parse("var counter @ 0x180");

      const varDecl = result.ast?.variables[0];
      expect(varDecl?.location).toBeDefined();
      expect(varDecl?.location?.start.line).toBe(1);
      expect(varDecl?.location?.start.column).toBeGreaterThan(0);
    });
  });

  describe("代入文", () => {
    it("should parse assignment with literal", () => {
      const source = `
        var foo @ 0x180
        foo = 42
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.body).toHaveLength(1);

      const stmt = result.ast?.body[0];
      expect(stmt?.type).toBe("AssignmentStatement");
      const assignStmt = stmt as AssignmentStatement;
      expect((assignStmt.left as Variable).type).toBe("Variable");
      expect((assignStmt.left as Variable).name).toBe("foo");
      expect((assignStmt.right as Literal).type).toBe("Literal");
      expect((assignStmt.right as Literal).value).toBe(42);
    });

    it("should parse assignment with variable", () => {
      const source = `
        var foo @ 0x180
        var bar @ 0x181
        foo = bar
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.body).toHaveLength(1);

      const stmt = result.ast?.body[0];
      expect(stmt?.type).toBe("AssignmentStatement");
      const assignStmt = stmt as AssignmentStatement;
      expect((assignStmt.left as Variable).name).toBe("foo");
      expect((assignStmt.right as Variable).type).toBe("Variable");
      expect((assignStmt.right as Variable).name).toBe("bar");
    });

    it("should parse assignment with hex literal", () => {
      const source = `
        var result @ 0x180
        result = 0xFF
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      const assignStmt = stmt as AssignmentStatement;
      expect((assignStmt.right as Literal).value).toBe(0xff);
      expect((assignStmt.right as Literal).raw).toBe("0xFF");
    });

    it("should parse multiple assignments", () => {
      const source = `
        var a @ 0x180
        var b @ 0x181
        a = 10
        b = a
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.body).toHaveLength(2);

      expect(((result.ast?.body[0] as AssignmentStatement).left as Variable).name).toBe("a");
      expect(((result.ast?.body[1] as AssignmentStatement).left as Variable).name).toBe("b");
    });
  });

  describe("組み込み命令", () => {
    it("should parse halt instruction", () => {
      const result = parse("halt");

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.body).toHaveLength(1);

      const stmt = result.ast?.body[0];
      expect(stmt?.type).toBe("BuiltinStatement");
      expect((stmt as BuiltinStatement).instruction).toBe("halt");
    });

    it("should parse nop instruction", () => {
      const result = parse("nop");
      const stmt = result.ast?.body[0];
      expect((stmt as BuiltinStatement).instruction).toBe("nop");
    });

    it("should parse input instruction", () => {
      const result = parse("input");
      const stmt = result.ast?.body[0];
      expect((stmt as BuiltinStatement).instruction).toBe("input");
    });

    it("should parse output instruction", () => {
      const result = parse("output");
      const stmt = result.ast?.body[0];
      expect((stmt as BuiltinStatement).instruction).toBe("output");
    });

    it("should parse set_carry_flag instruction", () => {
      const result = parse("set_carry_flag");
      const stmt = result.ast?.body[0];
      expect((stmt as BuiltinStatement).instruction).toBe("set_carry_flag");
    });

    it("should parse reset_carry_flag instruction", () => {
      const result = parse("reset_carry_flag");
      const stmt = result.ast?.body[0];
      expect((stmt as BuiltinStatement).instruction).toBe("reset_carry_flag");
    });

    it("should parse multiple builtin instructions", () => {
      const source = `
        input
        output
        halt
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.body).toHaveLength(3);
    });
  });

  describe("複合プログラム", () => {
    it("should parse program with variables and statements", () => {
      const source = `
        var counter @ 0x180
        var limit @ 0x181

        counter = 0
        limit = 10
        input
        output
        halt
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.variables).toHaveLength(2);
      expect(result.ast?.body).toHaveLength(5);
    });
  });

  describe("二項演算文", () => {
    it("should parse arithmetic addition", () => {
      const source = `
        var a @ 0x180
        var b @ 0x181
        var result @ 0x182
        result = a + b
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.body).toHaveLength(1);

      const stmt = result.ast?.body[0];
      expect(stmt?.type).toBe("BinaryOperationStatement");
      const binOpStmt = stmt as BinaryOperationStatement;
      expect((binOpStmt.destination as Variable).name).toBe("result");
      expect(binOpStmt.operator).toBe("+");
      expect((binOpStmt.left as Variable).name).toBe("a");
      expect((binOpStmt.right as Variable).name).toBe("b");
    });

    it("should parse arithmetic with carry", () => {
      const source = `
        var result @ 0x180
        result = 5 +c 10
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      const binOpStmt = stmt as BinaryOperationStatement;
      expect(binOpStmt.operator).toBe("+c");
      expect((binOpStmt.left as Literal).value).toBe(5);
      expect((binOpStmt.right as Literal).value).toBe(10);
    });

    it("should parse subtraction", () => {
      const source = `
        var result @ 0x180
        var a @ 0x181
        result = a - 1
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      const binOpStmt = stmt as BinaryOperationStatement;
      expect(binOpStmt.operator).toBe("-");
      expect((binOpStmt.left as Variable).name).toBe("a");
      expect((binOpStmt.right as Literal).value).toBe(1);
    });

    it("should parse subtraction with carry", () => {
      const source = `
        var result @ 0x180
        result = 10 -c 5
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      const binOpStmt = stmt as BinaryOperationStatement;
      expect(binOpStmt.operator).toBe("-c");
    });

    it("should parse logical AND", () => {
      const source = `
        var result @ 0x180
        var a @ 0x181
        var b @ 0x182
        result = a & b
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      const binOpStmt = stmt as BinaryOperationStatement;
      expect(binOpStmt.operator).toBe("&");
    });

    it("should parse logical OR", () => {
      const source = `
        var result @ 0x180
        result = 0xFF | 0x0F
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      const binOpStmt = stmt as BinaryOperationStatement;
      expect(binOpStmt.operator).toBe("|");
      expect((binOpStmt.left as Literal).value).toBe(0xff);
      expect((binOpStmt.right as Literal).value).toBe(0x0f);
    });

    it("should parse logical XOR", () => {
      const source = `
        var result @ 0x180
        var a @ 0x181
        result = a ^ 0xFF
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      const binOpStmt = stmt as BinaryOperationStatement;
      expect(binOpStmt.operator).toBe("^");
    });

    it("should parse left shift", () => {
      const source = `
        var result @ 0x180
        var a @ 0x181
        result = a << 1
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      const binOpStmt = stmt as BinaryOperationStatement;
      expect(binOpStmt.operator).toBe("<<");
      expect((binOpStmt.right as Literal).value).toBe(1);
    });

    it("should parse arithmetic left shift", () => {
      const source = `
        var result @ 0x180
        result = 4 <<a 2
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      const binOpStmt = stmt as BinaryOperationStatement;
      expect(binOpStmt.operator).toBe("<<a");
    });

    it("should parse right shift", () => {
      const source = `
        var result @ 0x180
        result = 8 >> 2
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      const binOpStmt = stmt as BinaryOperationStatement;
      expect(binOpStmt.operator).toBe(">>");
    });

    it("should parse arithmetic right shift", () => {
      const source = `
        var result @ 0x180
        var a @ 0x181
        result = a >>a 1
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      const binOpStmt = stmt as BinaryOperationStatement;
      expect(binOpStmt.operator).toBe(">>a");
    });

    it("should parse left rotate", () => {
      const source = `
        var result @ 0x180
        result = 0x80 <<< 1
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      const binOpStmt = stmt as BinaryOperationStatement;
      expect(binOpStmt.operator).toBe("<<<");
    });

    it("should parse right rotate", () => {
      const source = `
        var result @ 0x180
        var a @ 0x181
        result = a >>> 1
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      const binOpStmt = stmt as BinaryOperationStatement;
      expect(binOpStmt.operator).toBe(">>>");
    });

    it("should parse multiple binary operations", () => {
      const source = `
        var a @ 0x180
        var b @ 0x181
        var c @ 0x182
        a = b + 1
        b = a - 2
        c = a & b
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.body).toHaveLength(3);

      expect((result.ast?.body[0] as BinaryOperationStatement).operator).toBe("+");
      expect((result.ast?.body[1] as BinaryOperationStatement).operator).toBe("-");
      expect((result.ast?.body[2] as BinaryOperationStatement).operator).toBe("&");
    });
  });

  describe("比較文", () => {
    it("should parse equals comparison", () => {
      const source = `
        var a @ 0x180
        var b @ 0x181
        a == b
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.body).toHaveLength(1);

      const stmt = result.ast?.body[0];
      expect(stmt?.type).toBe("ComparisonStatement");
      const compStmt = stmt as ComparisonStatement;
      expect(compStmt.operator).toBe("==");
      expect((compStmt.left as Variable).name).toBe("a");
      expect((compStmt.right as Variable).name).toBe("b");
    });

    it("should parse not equals comparison", () => {
      const source = `
        var a @ 0x180
        a != 10
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      const compStmt = stmt as ComparisonStatement;
      expect(compStmt.operator).toBe("!=");
      expect((compStmt.left as Variable).name).toBe("a");
      expect((compStmt.right as Literal).value).toBe(10);
    });

    it("should parse less than comparison", () => {
      const source = `
        var counter @ 0x180
        var limit @ 0x181
        counter < limit
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      const compStmt = stmt as ComparisonStatement;
      expect(compStmt.operator).toBe("<");
    });

    it("should parse less than or equal comparison", () => {
      const source = `5 <= 10`;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      const compStmt = stmt as ComparisonStatement;
      expect(compStmt.operator).toBe("<=");
      expect((compStmt.left as Literal).value).toBe(5);
      expect((compStmt.right as Literal).value).toBe(10);
    });

    it("should parse greater than comparison", () => {
      const source = `10 > 5`;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      const compStmt = stmt as ComparisonStatement;
      expect(compStmt.operator).toBe(">");
    });

    it("should parse greater than or equal comparison", () => {
      const source = `15 >= 10`;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      const compStmt = stmt as ComparisonStatement;
      expect(compStmt.operator).toBe(">=");
    });

    it("should parse multiple comparisons", () => {
      const source = `
        var a @ 0x180
        var b @ 0x181
        a == 0
        b != 0
        a < b
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.body).toHaveLength(3);

      expect((result.ast?.body[0] as ComparisonStatement).operator).toBe("==");
      expect((result.ast?.body[1] as ComparisonStatement).operator).toBe("!=");
      expect((result.ast?.body[2] as ComparisonStatement).operator).toBe("<");
    });
  });

  describe("loop文", () => {
    it("should parse empty loop", () => {
      const source = `loop { }`;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.body).toHaveLength(1);

      const stmt = result.ast?.body[0];
      expect(stmt?.type).toBe("LoopStatement");
      expect((stmt as LoopStatement).body).toHaveLength(0);
    });

    it("should parse loop with statements", () => {
      const source = `
        var counter @ 0x180
        loop {
          counter = counter + 1
          output
        }
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.body).toHaveLength(1);

      const stmt = result.ast?.body[0];
      expect(stmt?.type).toBe("LoopStatement");
      const loopStmt = stmt as LoopStatement;
      expect(loopStmt.body).toHaveLength(2);
      expect(loopStmt.body[0]?.type).toBe("BinaryOperationStatement");
      expect(loopStmt.body[1]?.type).toBe("BuiltinStatement");
    });

    it("should parse nested loops", () => {
      const source = `
        loop {
          loop {
            nop
          }
        }
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.body).toHaveLength(1);

      const outerLoop = result.ast?.body[0];
      expect(outerLoop?.type).toBe("LoopStatement");
      const outerLoopStmt = outerLoop as LoopStatement;
      expect(outerLoopStmt.body).toHaveLength(1);
      expect(outerLoopStmt.body[0]?.type).toBe("LoopStatement");
    });
  });

  describe("if文", () => {
    it("should parse if with ZERO condition", () => {
      const source = `
        if ZERO {
          halt
        }
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.body).toHaveLength(1);

      const stmt = result.ast?.body[0];
      expect(stmt?.type).toBe("IfStatement");
      const ifStmt = stmt as IfStatement;
      expect(ifStmt.condition).toBe("ZERO");
      expect(ifStmt.body).toHaveLength(1);
    });

    it("should parse if with NOT_ZERO condition", () => {
      const source = `if NOT_ZERO { nop }`;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      expect((stmt as IfStatement).condition).toBe("NOT_ZERO");
    });

    it("should parse if with NEGATIVE condition", () => {
      const source = `if NEGATIVE { output }`;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      expect((stmt as IfStatement).condition).toBe("NEGATIVE");
    });

    it("should parse if with CARRY condition", () => {
      const source = `if CARRY { set_carry_flag }`;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      expect((stmt as IfStatement).condition).toBe("CARRY");
    });

    it("should parse if with complex body", () => {
      const source = `
        var a @ 0x180
        if ZERO {
          a = 10
          output
          halt
        }
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      expect(stmt?.type).toBe("IfStatement");
      expect((stmt as IfStatement).body).toHaveLength(3);
    });

    it("should parse nested if statements", () => {
      const source = `
        if ZERO {
          if NOT_ZERO {
            halt
          }
        }
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const outerIf = result.ast?.body[0];
      expect(outerIf?.type).toBe("IfStatement");
      expect((outerIf as IfStatement).body[0]?.type).toBe("IfStatement");
    });
  });

  describe("break/continue文", () => {
    it("should parse break statement", () => {
      const source = `
        loop {
          break
        }
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const loop = result.ast?.body[0];
      expect((loop as LoopStatement).body[0]?.type).toBe("BreakStatement");
    });

    it("should parse continue statement", () => {
      const source = `
        loop {
          continue
        }
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const loop = result.ast?.body[0];
      expect((loop as LoopStatement).body[0]?.type).toBe("ContinueStatement");
    });

    it("should parse loop with break and continue", () => {
      const source = `
        var counter @ 0x180
        loop {
          counter = counter + 1
          if ZERO {
            break
          }
          if NEGATIVE {
            continue
          }
          output
        }
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const loop = result.ast?.body[0];
      const loopStmt = loop as LoopStatement;
      expect(loopStmt.body).toHaveLength(4);
      expect((loopStmt.body[1] as IfStatement).body[0]?.type).toBe("BreakStatement");
      expect((loopStmt.body[2] as IfStatement).body[0]?.type).toBe("ContinueStatement");
    });
  });

  describe("複雑な制御フロー", () => {
    it("should parse complex control flow program", () => {
      const source = `
        var counter @ 0x180
        var limit @ 0x181

        counter = 0
        limit = 10

        loop {
          counter < limit
          if ZERO_OR_POSITIVE {
            counter = counter + 1
            output
          }
          if NOT_ZERO {
            break
          }
        }
        halt
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.variables).toHaveLength(2);
      expect(result.ast?.body).toHaveLength(4); // 2 assignments, 1 loop, 1 halt
    });
  });

  describe("配列アクセス", () => {
    it("should parse array access with constant index in assignment (right)", () => {
      const source = `
        var arr @ 0x180
        var result @ 0x190
        result = arr[5]
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.body).toHaveLength(1);

      const stmt = result.ast?.body[0];
      expect(stmt?.type).toBe("AssignmentStatement");
      const assignStmt = stmt as AssignmentStatement;
      expect((assignStmt.left as Variable).type).toBe("Variable");
      expect((assignStmt.left as Variable).name).toBe("result");
      expect((assignStmt.right as ArrayAccess).type).toBe("ArrayAccess");
      expect((assignStmt.right as ArrayAccess).array).toBe("arr");
      expect(((assignStmt.right as ArrayAccess).index as Literal).type).toBe("Literal");
      expect(((assignStmt.right as ArrayAccess).index as Literal).value).toBe(5);
    });

    it("should parse array access with variable index in assignment (right)", () => {
      const source = `
        var arr @ 0x180
        var i @ 0x190
        var result @ 0x191
        result = arr[i]
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      const assignStmt = stmt as AssignmentStatement;
      expect((assignStmt.right as ArrayAccess).type).toBe("ArrayAccess");
      expect((assignStmt.right as ArrayAccess).array).toBe("arr");
      expect(((assignStmt.right as ArrayAccess).index as Variable).type).toBe("Variable");
      expect(((assignStmt.right as ArrayAccess).index as Variable).name).toBe("i");
    });

    it("should parse array access with constant index in assignment (left)", () => {
      const source = `
        var arr @ 0x180
        var value @ 0x190
        arr[3] = value
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      expect(stmt?.type).toBe("AssignmentStatement");
      const assignStmt = stmt as AssignmentStatement;
      expect((assignStmt.left as ArrayAccess).type).toBe("ArrayAccess");
      expect((assignStmt.left as ArrayAccess).array).toBe("arr");
      expect(((assignStmt.left as ArrayAccess).index as Literal).value).toBe(3);
      expect((assignStmt.right as Variable).type).toBe("Variable");
    });

    it("should parse array access with variable index in assignment (left)", () => {
      const source = `
        var arr @ 0x180
        var i @ 0x190
        var value @ 0x191
        arr[i] = value
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      const assignStmt = stmt as AssignmentStatement;
      expect((assignStmt.left as ArrayAccess).type).toBe("ArrayAccess");
      expect(((assignStmt.left as ArrayAccess).index as Variable).type).toBe("Variable");
      expect(((assignStmt.left as ArrayAccess).index as Variable).name).toBe("i");
    });

    it("should parse array access on both sides of assignment", () => {
      const source = `
        var src @ 0x180
        var dst @ 0x190
        var i @ 0x1A0
        var j @ 0x1A1
        dst[i] = src[j]
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      const assignStmt = stmt as AssignmentStatement;
      expect((assignStmt.left as ArrayAccess).type).toBe("ArrayAccess");
      expect((assignStmt.left as ArrayAccess).array).toBe("dst");
      expect((assignStmt.right as ArrayAccess).type).toBe("ArrayAccess");
      expect((assignStmt.right as ArrayAccess).array).toBe("src");
    });

    it("should parse array access in binary operation (right operand)", () => {
      const source = `
        var arr @ 0x180
        var result @ 0x190
        result = arr[2] + 10
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      expect(stmt?.type).toBe("BinaryOperationStatement");
      const binOpStmt = stmt as BinaryOperationStatement;
      expect((binOpStmt.left as ArrayAccess).type).toBe("ArrayAccess");
      expect((binOpStmt.left as ArrayAccess).array).toBe("arr");
      expect((binOpStmt.right as Literal).value).toBe(10);
    });

    it("should parse array access in comparison", () => {
      const source = `
        var arr @ 0x180
        var i @ 0x190
        arr[i] == 0
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      expect(stmt?.type).toBe("ComparisonStatement");
      const compStmt = stmt as ComparisonStatement;
      expect((compStmt.left as ArrayAccess).type).toBe("ArrayAccess");
      expect((compStmt.left as ArrayAccess).array).toBe("arr");
    });

    it("should parse array access with hex literal index", () => {
      const source = `
        var arr @ 0x180
        var result @ 0x190
        result = arr[0x0A]
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      const assignStmt = stmt as AssignmentStatement;
      expect(((assignStmt.right as ArrayAccess).index as Literal).value).toBe(0x0a);
    });
  });

  describe("マクロ", () => {
    it("should parse macro declaration", () => {
      const source = `
        macro init {
          halt
        }
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.body).toHaveLength(1);

      const stmt = result.ast?.body[0];
      expect(stmt?.type).toBe("MacroDeclaration");
      const macroStmt = stmt as MacroDeclaration;
      expect(macroStmt.name).toBe("init");
      expect(macroStmt.body).toHaveLength(1);
      expect(macroStmt.body[0]?.type).toBe("BuiltinStatement");
    });

    it("should parse empty macro", () => {
      const source = `macro empty { }`;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      const macroStmt = stmt as MacroDeclaration;
      expect(macroStmt.name).toBe("empty");
      expect(macroStmt.body).toHaveLength(0);
    });

    it("should parse macro with multiple statements", () => {
      const source = `
        var counter @ 0x180
        macro increment {
          counter = counter + 1
          output
          nop
        }
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);

      const stmt = result.ast?.body[0];
      expect((stmt as MacroDeclaration).body).toHaveLength(3);
    });

    it("should parse macro call", () => {
      const source = `
        macro test {
          halt
        }
        test!
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.body).toHaveLength(2);

      const macroCall = result.ast?.body[1];
      expect(macroCall?.type).toBe("MacroCallStatement");
      expect((macroCall as MacroCallStatement).name).toBe("test");
    });

    it("should parse nested macro calls", () => {
      const source = `
        macro inner {
          nop
        }
        macro outer {
          inner!
        }
        outer!
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.body).toHaveLength(3);

      const outerMacro = result.ast?.body[1];
      expect(((outerMacro as MacroDeclaration).body[0] as MacroCallStatement).type).toBe("MacroCallStatement");
    });

    it("should parse program with macros and regular statements", () => {
      const source = `
        var counter @ 0x180

        macro inc {
          counter = counter + 1
        }

        counter = 0
        inc!
        inc!
        halt
      `;

      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.variables).toHaveLength(1);
      expect(result.ast?.body).toHaveLength(5); // macro decl, assignment, 2 macro calls, halt
    });
  });

  describe("asm文のパース", () => {
    it("should parse single line asm statement", () => {
      const source = "asm `NOP`";
      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.body).toHaveLength(1);
      expect(result.ast?.body[0]?.type).toBe("AsmBlock");
      if (result.ast?.body[0]?.type === "AsmBlock") {
        expect(result.ast.body[0].content).toBe("NOP");
      }
    });

    it("should parse multiline asm statement", () => {
      const source = `asm \`
    LD ACC, (80H)
    ADD ACC, (81H)
    ST ACC, (82H)
\``;
      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.body).toHaveLength(1);
      expect(result.ast?.body[0]?.type).toBe("AsmBlock");
      if (result.ast?.body[0]?.type === "AsmBlock") {
        expect(result.ast.body[0].content).toContain("LD ACC, (80H)");
        expect(result.ast.body[0].content).toContain("ADD ACC, (81H)");
        expect(result.ast.body[0].content).toContain("ST ACC, (82H)");
      }
    });

    it("should parse asm with assembly comments", () => {
      const source = `asm \`
    ; This is an assembly comment
    NOP
    NOP
\``;
      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.body).toHaveLength(1);
      expect(result.ast?.body[0]?.type).toBe("AsmBlock");
      if (result.ast?.body[0]?.type === "AsmBlock") {
        expect(result.ast.body[0].content).toContain("; This is an assembly comment");
      }
    });

    it("should parse multiple asm statements", () => {
      const source = `
        asm \`NOP\`
        halt
        asm \`HLT\`
      `;
      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.body).toHaveLength(3);
      expect(result.ast?.body[0]?.type).toBe("AsmBlock");
      expect(result.ast?.body[1]?.type).toBe("BuiltinStatement");
      expect(result.ast?.body[2]?.type).toBe("AsmBlock");
    });

    it("should parse asm in loop", () => {
      const source = `
        loop {
          asm \`NOP\`
          break
        }
      `;
      const result = parse(source);

      expect(result.lexerErrors).toHaveLength(0);
      expect(result.parserErrors).toHaveLength(0);
      expect(result.ast?.body).toHaveLength(1);
      expect(result.ast?.body[0]?.type).toBe("LoopStatement");
      if (result.ast?.body[0]?.type === "LoopStatement") {
        expect(result.ast.body[0].body).toHaveLength(2);
        expect(result.ast.body[0].body[0]?.type).toBe("AsmBlock");
      }
    });
  });
});
