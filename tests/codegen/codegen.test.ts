import { describe, expect, it } from "vitest";
import { generateCode } from "../../src/codegen/index.js";
import { parse } from "../../src/parser/index.js";

describe("KueCodeGenerator", () => {
  describe("変数宣言コメント", () => {
    it("should generate comment for single variable", () => {
      const result = parse("var counter @ 0x180");
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
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

      const code = generateCode(result.ast!);
      expect(code).toContain("* var counter @ 0x180");
      expect(code).toContain("* var limit @ 0x181");
      expect(code).toContain("* var result @ 0x182");
    });

    it("should format decimal address as hex", () => {
      const result = parse("var foo @ 256");
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toContain("* var foo @ 0x100");
    });

    it("should separate variables from code with empty line", () => {
      const source = `
        var counter @ 0x180
        halt
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
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

      const code = generateCode(result.ast!);
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

      const code = generateCode(result.ast!);
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

      const code = generateCode(result.ast!);
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

      const code = generateCode(result.ast!);
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

      const code = generateCode(result.ast!);
      expect(code).toBe("HLT");
    });

    it("should generate NOP for nop", () => {
      const result = parse("nop");
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toBe("NOP");
    });

    it("should generate IN for input", () => {
      const result = parse("input");
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toBe("IN");
    });

    it("should generate OUT for output", () => {
      const result = parse("output");
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toBe("OUT");
    });

    it("should generate SCF for set_carry_flag", () => {
      const result = parse("set_carry_flag");
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toBe("SCF");
    });

    it("should generate RCF for reset_carry_flag", () => {
      const result = parse("reset_carry_flag");
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
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

      const code = generateCode(result.ast!);
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

      const code = generateCode(result.ast!);
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

      const code = generateCode(result.ast!);
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

      const code = generateCode(result.ast!);

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

      const code = generateCode(result.ast!);
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

      expect(() => generateCode(result.ast!)).toThrow("Undefined variable: bar");
    });

    it("should throw error for undefined variable in rvalue", () => {
      const source = `
        var foo @ 0x180
        foo = bar
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      expect(() => generateCode(result.ast!)).toThrow("Undefined variable: bar");
    });
  });

  describe("二項演算コード生成", () => {
    it("should generate code for addition with variables", () => {
      const source = `
        var a @ 0x180
        var b @ 0x181
        var result @ 0x182
        result = a + b
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toContain("LD ACC, (180H)");
      expect(code).toContain("ADD ACC, (181H)");
      expect(code).toContain("ST ACC, (182H)");
    });

    it("should generate code for addition with literal", () => {
      const source = `
        var result @ 0x180
        var a @ 0x181
        result = a + 5
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toContain("LD ACC, (181H)");
      expect(code).toContain("ADD ACC, 5");
      expect(code).toContain("ST ACC, (180H)");
    });

    it("should generate code for addition with carry", () => {
      const source = `
        var result @ 0x180
        result = 10 +c 20
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toContain("LD ACC, 10");
      expect(code).toContain("ADC ACC, 20");
      expect(code).toContain("ST ACC, (180H)");
    });

    it("should generate code for subtraction", () => {
      const source = `
        var result @ 0x180
        var a @ 0x181
        result = a - 1
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toContain("LD ACC, (181H)");
      expect(code).toContain("SUB ACC, 1");
      expect(code).toContain("ST ACC, (180H)");
    });

    it("should generate code for subtraction with carry", () => {
      const source = `
        var result @ 0x180
        result = 100 -c 50
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toContain("LD ACC, 100");
      expect(code).toContain("SBC ACC, 50");
    });

    it("should generate code for logical AND", () => {
      const source = `
        var result @ 0x180
        var a @ 0x181
        var b @ 0x182
        result = a & b
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toContain("LD ACC, (181H)");
      expect(code).toContain("AND ACC, (182H)");
      expect(code).toContain("ST ACC, (180H)");
    });

    it("should generate code for logical OR", () => {
      const source = `
        var result @ 0x180
        result = 0xFF | 0x0F
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toContain("LD ACC, 255");
      expect(code).toContain("OR ACC, 15");
    });

    it("should generate code for logical XOR", () => {
      const source = `
        var result @ 0x180
        var a @ 0x181
        result = a ^ 0xFF
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toContain("LD ACC, (181H)");
      expect(code).toContain("EOR ACC, 255");
    });

    it("should generate code for left shift", () => {
      const source = `
        var result @ 0x180
        var a @ 0x181
        result = a << 1
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toContain("LD ACC, (181H)");
      expect(code).toContain("SLL ACC, 1");
    });

    it("should generate code for arithmetic left shift", () => {
      const source = `
        var result @ 0x180
        result = 4 <<a 2
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toContain("LD ACC, 4");
      expect(code).toContain("SLA ACC, 2");
    });

    it("should generate code for right shift", () => {
      const source = `
        var result @ 0x180
        result = 8 >> 2
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toContain("LD ACC, 8");
      expect(code).toContain("SRL ACC, 2");
    });

    it("should generate code for arithmetic right shift", () => {
      const source = `
        var result @ 0x180
        var a @ 0x181
        result = a >>a 1
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toContain("LD ACC, (181H)");
      expect(code).toContain("SRA ACC, 1");
    });

    it("should generate code for left rotate", () => {
      const source = `
        var result @ 0x180
        result = 0x80 <<< 1
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toContain("LD ACC, 128");
      expect(code).toContain("RLL ACC, 1");
    });

    it("should generate code for right rotate", () => {
      const source = `
        var result @ 0x180
        var a @ 0x181
        result = a >>> 1
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toContain("LD ACC, (181H)");
      expect(code).toContain("RRL ACC, 1");
    });

    it("should generate code for multiple binary operations", () => {
      const source = `
        var a @ 0x180
        var b @ 0x181
        var c @ 0x182
        a = b + 1
        b = a - 2
        c = a & b
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      const lines = code.split("\n").filter((line) => line && !line.startsWith("*"));

      // a = b + 1
      expect(lines[0]).toBe("LD ACC, (181H)");
      expect(lines[1]).toBe("ADD ACC, 1");
      expect(lines[2]).toBe("ST ACC, (180H)");

      // b = a - 2
      expect(lines[3]).toBe("LD ACC, (180H)");
      expect(lines[4]).toBe("SUB ACC, 2");
      expect(lines[5]).toBe("ST ACC, (181H)");

      // c = a & b
      expect(lines[6]).toBe("LD ACC, (180H)");
      expect(lines[7]).toBe("AND ACC, (181H)");
      expect(lines[8]).toBe("ST ACC, (182H)");
    });

    it("should throw error for undefined variable in binary operation", () => {
      const source = `
        var result @ 0x180
        result = foo + 5
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      expect(() => generateCode(result.ast!)).toThrow("Undefined variable: foo");
    });
  });

  describe("比較文コード生成", () => {
    it("should generate code for equals comparison", () => {
      const source = `
        var a @ 0x180
        var b @ 0x181
        a == b
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toContain("LD ACC, (180H)");
      expect(code).toContain("CMP ACC, (181H)");
    });

    it("should generate code for comparison with literal", () => {
      const source = `
        var counter @ 0x180
        counter == 10
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toContain("LD ACC, (180H)");
      expect(code).toContain("CMP ACC, 10");
    });

    it("should generate code for comparison with hex literal", () => {
      const source = `
        var value @ 0x180
        value != 0xFF
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toContain("LD ACC, (180H)");
      expect(code).toContain("CMP ACC, 255");
    });
  });

  describe("loop文コード生成", () => {
    it("should generate code for empty loop", () => {
      const source = `loop { }`;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toMatch(/LOOP_START_\d+:/);
      expect(code).toMatch(/JMP LOOP_START_\d+/);
      expect(code).toMatch(/LOOP_END_\d+:/);
    });

    it("should generate code for loop with statements", () => {
      const source = `
        var counter @ 0x180
        loop {
          counter = counter + 1
          output
        }
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toMatch(/LOOP_START_\d+:/);
      expect(code).toContain("LD ACC, (180H)");
      expect(code).toContain("ADD ACC, 1");
      expect(code).toContain("OUT");
      expect(code).toMatch(/JMP LOOP_START_\d+/);
      expect(code).toMatch(/LOOP_END_\d+:/);
    });

    it("should generate code for nested loops with unique labels", () => {
      const source = `
        loop {
          loop {
            nop
          }
        }
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      // Should have 2 different LOOP_START labels
      const startMatches = code.match(/LOOP_START_\d+:/g);
      expect(startMatches).toHaveLength(2);
      // Should have 2 different LOOP_END labels
      const endMatches = code.match(/LOOP_END_\d+:/g);
      expect(endMatches).toHaveLength(2);
    });
  });

  describe("if文コード生成", () => {
    it("should generate code for if with ZERO condition", () => {
      const source = `
        if ZERO {
          halt
        }
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toMatch(/JNZ END_IF_\d+/);
      expect(code).toContain("HLT");
      expect(code).toMatch(/END_IF_\d+:/);
    });

    it("should generate code for if with NOT_ZERO condition", () => {
      const source = `if NOT_ZERO { output }`;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toMatch(/JZ END_IF_\d+/);
      expect(code).toContain("OUT");
    });

    it("should generate code for if with NEGATIVE condition", () => {
      const source = `if NEGATIVE { nop }`;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toMatch(/JP END_IF_\d+/);
      expect(code).toContain("NOP");
    });

    it("should generate code for if with complex body", () => {
      const source = `
        var a @ 0x180
        if CARRY {
          a = 10
          output
          halt
        }
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toMatch(/JNC END_IF_\d+/);
      expect(code).toContain("LD ACC, 10");
      expect(code).toContain("ST ACC, (180H)");
      expect(code).toContain("OUT");
      expect(code).toContain("HLT");
      expect(code).toMatch(/END_IF_\d+:/);
    });
  });

  describe("break/continue文コード生成", () => {
    it("should generate code for break statement", () => {
      const source = `
        loop {
          break
        }
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toMatch(/LOOP_START_\d+:/);
      expect(code).toMatch(/JMP LOOP_END_\d+/);
      expect(code).toMatch(/LOOP_END_\d+:/);
    });

    it("should generate code for continue statement", () => {
      const source = `
        loop {
          continue
        }
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toMatch(/LOOP_START_\d+:/);
      // Should have JMP LOOP_START twice (continue + loop end)
      const jmpMatches = code.match(/JMP LOOP_START_\d+/g);
      expect(jmpMatches).toHaveLength(2);
    });

    it("should throw error for break outside loop", () => {
      const source = `break`;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      expect(() => generateCode(result.ast!)).toThrow("break statement outside of loop");
    });

    it("should throw error for continue outside loop", () => {
      const source = `continue`;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      expect(() => generateCode(result.ast!)).toThrow("continue statement outside of loop");
    });
  });

  describe("複雑な制御フローコード生成", () => {
    it("should generate code for loop with conditional break", () => {
      const source = `
        var counter @ 0x180
        loop {
          counter = counter + 1
          counter == 10
          if ZERO {
            break
          }
          output
        }
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      expect(code).toMatch(/LOOP_START_\d+:/);
      expect(code).toContain("ADD ACC, 1");
      expect(code).toContain("CMP ACC, 10");
      expect(code).toMatch(/JNZ END_IF_\d+/);
      expect(code).toMatch(/JMP LOOP_END_\d+/); // break
      expect(code).toMatch(/END_IF_\d+:/);
      expect(code).toContain("OUT");
      expect(code).toMatch(/LOOP_END_\d+:/);
    });

    it("should generate code for nested control flow", () => {
      const source = `
        var counter @ 0x180
        loop {
          if ZERO {
            loop {
              break
            }
          }
          continue
        }
      `;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast!);
      // Should have 2 loops (outer and inner)
      const loopStartMatches = code.match(/LOOP_START_\d+:/g);
      expect(loopStartMatches).toHaveLength(2);
      const loopEndMatches = code.match(/LOOP_END_\d+:/g);
      expect(loopEndMatches).toHaveLength(2);
      // Should have an if statement
      expect(code).toMatch(/JNZ END_IF_\d+/);
      expect(code).toMatch(/END_IF_\d+:/);
    });

    it("should reset label counter between programs", () => {
      // 最初のプログラム
      const source1 = `loop { }`;
      const result1 = parse(source1);
      const code1 = generateCode(result1.ast!);
      expect(code1).toContain("LOOP_START_0:");

      // 2番目のプログラム - ラベルカウンタはリセットされる
      const source2 = `loop { }`;
      const result2 = parse(source2);
      const code2 = generateCode(result2.ast!);
      expect(code2).toContain("LOOP_START_0:");
    });
  });
});
