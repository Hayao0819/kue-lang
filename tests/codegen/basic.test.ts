import { describe, expect, it } from "vitest";
import { generateCode } from "../../src/codegen/index.js";
import { parse } from "../../src/parser/index.js";

describe("基本的なコード生成", () => {
  describe("変数宣言コメント", () => {
    it("should generate comment for single variable", () => {
      const result = parse("var counter @ 0x180");
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast);
      expect(code).toContain("* var counter @ 0x180");
    });

    it("should generate comments for multiple variables", () => {
      const source = `
        var counter @ 0x180
        var limit @ 0x181
        var result @ 0x182
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast);
      expect(code).toContain("* var counter @ 0x180");
      expect(code).toContain("* var limit @ 0x181");
      expect(code).toContain("* var result @ 0x182");
    });

    it("should format decimal address as hex", () => {
      const result = parse("var foo @ 256");
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast);
      expect(code).toContain("* var foo @ 0x100");
    });

    it("should separate variables from code with empty line", () => {
      const source = `
        var counter @ 0x180
        halt
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast);
      const lines = code.split("\n");
      expect(lines[0]).toBe("* var counter @ 0x180");
      expect(lines[1]).toBe("");
      expect(lines[2]).toBe("HLT");
    });
  });

  describe("代入文コード生成", () => {
    it("should generate code for assignment with literal", () => {
      const source = `
        var foo @ 0x180
        foo = 42
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast);
      expect(code).toContain("LD ACC, 42");
      expect(code).toContain("ST ACC, (180H)");
    });

    it("should generate code for assignment with variable", () => {
      const source = `
        var foo @ 0x180
        var bar @ 0x181
        foo = bar
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast);
      expect(code).toContain("LD ACC, (181H)");
      expect(code).toContain("ST ACC, (180H)");
    });

    it("should generate code for assignment with hex literal", () => {
      const source = `
        var result @ 0x180
        result = 0xFF
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast);
      expect(code).toContain("LD ACC, 255");
      expect(code).toContain("ST ACC, (180H)");
    });

    it("should generate code for multiple assignments", () => {
      const source = `
        var a @ 0x180
        var b @ 0x181
        a = 10
        b = a
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast);
      const lines = code.split("\n").filter((line) => line && !line.startsWith("*"));

      // 最初の代入: a = 10
      expect(lines[0]).toBe("LD ACC, 10");
      expect(lines[1]).toBe("ST ACC, (180H)");

      // 2番目の代入: b = a
      expect(lines[2]).toBe("LD ACC, (180H)");
      expect(lines[3]).toBe("ST ACC, (181H)");
    });
  });

  describe("組み込み命令コード生成", () => {
    it("should generate HLT for halt", () => {
      const result = parse("halt");
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast);
      expect(code).toBe("HLT");
    });

    it("should generate NOP for nop", () => {
      const result = parse("nop");
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast);
      expect(code).toBe("NOP");
    });

    it("should generate IN for input", () => {
      const result = parse("input");
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast);
      expect(code).toBe("IN");
    });

    it("should generate OUT for output", () => {
      const result = parse("output");
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast);
      expect(code).toBe("OUT");
    });

    it("should generate SCF for set_carry_flag", () => {
      const result = parse("set_carry_flag");
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast);
      expect(code).toBe("SCF");
    });

    it("should generate RCF for reset_carry_flag", () => {
      const result = parse("reset_carry_flag");
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast);
      expect(code).toBe("RCF");
    });

    it("should generate code for multiple builtin instructions", () => {
      const source = `
        input
        output
        halt
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast);
      const lines = code.split("\n");
      expect(lines[0]).toBe("IN");
      expect(lines[1]).toBe("OUT");
      expect(lines[2]).toBe("HLT");
    });
  });

  describe("アドレスフォーマット", () => {
    it("should format address in data region format", () => {
      const source = `
        var foo @ 0x080
        var bar @ 0x100
        foo = bar
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast);
      expect(code).toContain("(100H)");
      expect(code).toContain("(80H)");
    });

    it("should handle single digit hex address", () => {
      const source = `
        var foo @ 0x005
        foo = 42
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast);
      expect(code).toContain("(5H)");
    });
  });

  describe("複合プログラム", () => {
    it("should generate complete program", () => {
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
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast);

      // 変数宣言コメント
      expect(code).toContain("* var counter @ 0x180");
      expect(code).toContain("* var limit @ 0x181");

      // 代入文
      expect(code).toContain("LD ACC, 0");
      expect(code).toContain("ST ACC, (180H)");
      expect(code).toContain("LD ACC, 10");
      expect(code).toContain("ST ACC, (181H)");

      // 組み込み命令
      expect(code).toContain("IN");
      expect(code).toContain("OUT");
      expect(code).toContain("HLT");
    });

    it("should generate correctly formatted output", () => {
      const source = `
        var x @ 0x100
        x = 5
        output
        halt
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast);
      const expected = `* var x @ 0x100

LD ACC, 5
ST ACC, (100H)
OUT
HLT`;

      expect(code).toBe(expected);
    });
  });

  describe("エラー処理", () => {
    it("should throw error for undefined variable in assignment", () => {
      const source = `
        var foo @ 0x180
        bar = 42
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      expect(() => generateCode(result.ast)).toThrow("Undefined variable: bar");
    });

    it("should throw error for undefined variable in rvalue", () => {
      const source = `
        var foo @ 0x180
        foo = bar
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      expect(() => generateCode(result.ast)).toThrow("Undefined variable: bar");
    });
  });
});
