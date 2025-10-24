import { describe, expect, it } from "vitest";
import { generateCode } from "../../src/codegen/index.js";
import { parse } from "../../src/parser/index.js";

describe("制御フローコード生成", () => {
  describe("loop文コード生成", () => {
    it("should generate code for empty loop", () => {
      const source = `loop { }`;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast);
      expect(code).toMatch(/LOOP_START_\d+:/);
      expect(code).toMatch(/BA LOOP_START_\d+/);
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

      const code = generateCode(result.ast);
      expect(code).toMatch(/LOOP_START_\d+:/);
      expect(code).toContain("LD ACC, (180H)");
      expect(code).toContain("ADD ACC, 1");
      expect(code).toContain("OUT");
      expect(code).toMatch(/BA LOOP_START_\d+/);
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

      const code = generateCode(result.ast);
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

      const code = generateCode(result.ast);
      expect(code).toMatch(/BNZ END_IF_\d+/);
      expect(code).toContain("HLT");
      expect(code).toMatch(/END_IF_\d+:/);
    });

    it("should generate code for if with NOT_ZERO condition", () => {
      const source = `if NOT_ZERO { output }`;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast);
      expect(code).toMatch(/BZ END_IF_\d+/);
      expect(code).toContain("OUT");
    });

    it("should generate code for if with NEGATIVE condition", () => {
      const source = `if NEGATIVE { nop }`;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const code = generateCode(result.ast);
      expect(code).toMatch(/BP END_IF_\d+/);
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

      const code = generateCode(result.ast);
      expect(code).toMatch(/BNC END_IF_\d+/);
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

      const code = generateCode(result.ast);
      expect(code).toMatch(/LOOP_START_\d+:/);
      expect(code).toMatch(/BA LOOP_END_\d+/);
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

      const code = generateCode(result.ast);
      expect(code).toMatch(/LOOP_START_\d+:/);
      // Should have BA LOOP_START twice (continue + loop end)
      const baMatches = code.match(/BA LOOP_START_\d+/g);
      expect(baMatches).toHaveLength(2);
    });

    it("should throw error for break outside loop", () => {
      const source = `break`;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      expect(() => generateCode(result.ast)).toThrow("break statement outside of loop");
    });

    it("should throw error for continue outside loop", () => {
      const source = `continue`;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      expect(() => generateCode(result.ast)).toThrow("continue statement outside of loop");
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

      const code = generateCode(result.ast);
      expect(code).toMatch(/LOOP_START_\d+:/);
      expect(code).toContain("ADD ACC, 1");
      expect(code).toContain("CMP ACC, 10");
      expect(code).toMatch(/BNZ END_IF_\d+/);
      expect(code).toMatch(/BA LOOP_END_\d+/); // break
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

      const code = generateCode(result.ast);
      // Should have 2 loops (outer and inner)
      const loopStartMatches = code.match(/LOOP_START_\d+:/g);
      expect(loopStartMatches).toHaveLength(2);
      const loopEndMatches = code.match(/LOOP_END_\d+:/g);
      expect(loopEndMatches).toHaveLength(2);
      // Should have an if statement
      expect(code).toMatch(/BNZ END_IF_\d+/);
      expect(code).toMatch(/END_IF_\d+:/);
    });

    it("should reset label counter between programs", () => {
      // 最初のプログラム
      const source1 = `loop { }`;
      const result1 = parse(source1);
      const code1 = generateCode(result1.ast);
      expect(code1).toContain("LOOP_START_0:");

      // 2番目のプログラム - ラベルカウンタはリセットされる
      const source2 = `loop { }`;
      const result2 = parse(source2);
      const code2 = generateCode(result2.ast);
      expect(code2).toContain("LOOP_START_0:");
    });
  });
});
