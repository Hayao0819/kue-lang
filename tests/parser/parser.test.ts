import { describe, expect, it } from "vitest";
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
      expect((stmt as any).left.type).toBe("Variable");
      expect((stmt as any).left.name).toBe("foo");
      expect((stmt as any).right.type).toBe("Literal");
      expect((stmt as any).right.value).toBe(42);
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
      expect((stmt as any).left.name).toBe("foo");
      expect((stmt as any).right.type).toBe("Variable");
      expect((stmt as any).right.name).toBe("bar");
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
      expect((stmt as any).right.value).toBe(0xff);
      expect((stmt as any).right.raw).toBe("0xFF");
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

      expect((result.ast?.body[0] as any).left.name).toBe("a");
      expect((result.ast?.body[1] as any).left.name).toBe("b");
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
      expect((stmt as any).instruction).toBe("halt");
    });

    it("should parse nop instruction", () => {
      const result = parse("nop");
      const stmt = result.ast?.body[0];
      expect((stmt as any).instruction).toBe("nop");
    });

    it("should parse input instruction", () => {
      const result = parse("input");
      const stmt = result.ast?.body[0];
      expect((stmt as any).instruction).toBe("input");
    });

    it("should parse output instruction", () => {
      const result = parse("output");
      const stmt = result.ast?.body[0];
      expect((stmt as any).instruction).toBe("output");
    });

    it("should parse set_carry_flag instruction", () => {
      const result = parse("set_carry_flag");
      const stmt = result.ast?.body[0];
      expect((stmt as any).instruction).toBe("set_carry_flag");
    });

    it("should parse reset_carry_flag instruction", () => {
      const result = parse("reset_carry_flag");
      const stmt = result.ast?.body[0];
      expect((stmt as any).instruction).toBe("reset_carry_flag");
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
});
