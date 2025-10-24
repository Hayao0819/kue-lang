import { describe, expect, it } from "vitest";
import { generateCode } from "../../src/codegen/index.js";
import { parse } from "../../src/parser/index.js";

describe("マクロコード生成", () => {
  it("should inline macro call with single statement", () => {
    const source = `
      macro test {
        halt
      }
      test!
    `;

    const result = parse(source);
    expect(result.ast).not.toBeNull();

    const code = generateCode(result.ast);
    expect(code).toBe("HLT");
  });

  it("should inline macro call with multiple statements", () => {
    const source = `
      var counter @ 0x180
      macro increment {
        counter = counter + 1
        output
      }
      increment!
    `;

    const result = parse(source);
    expect(result.ast).not.toBeNull();

    const code = generateCode(result.ast);
    expect(code).toContain("LD ACC, (180H)");
    expect(code).toContain("ADD ACC, 1");
    expect(code).toContain("ST ACC, (180H)");
    expect(code).toContain("OUT");
    // マクロ宣言自体はコードを生成しない
    expect(code.split("\n").filter((line) => !line.startsWith("*") && line.length > 0)).toHaveLength(4);
  });

  it("should inline multiple macro calls", () => {
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
    expect(result.ast).not.toBeNull();

    const code = generateCode(result.ast);
    // counter = 0
    expect(code).toContain("LD ACC, 0");
    expect(code).toContain("ST ACC, (180H)");
    // First inc! - counter = counter + 1
    const lines = code.split("\n").filter((line) => line && !line.startsWith("*"));
    const firstInc = lines.indexOf("LD ACC, (180H)");
    expect(lines[firstInc]).toBe("LD ACC, (180H)");
    expect(lines[firstInc + 1]).toBe("ADD ACC, 1");
    expect(lines[firstInc + 2]).toBe("ST ACC, (180H)");
    // Second inc! - counter = counter + 1
    const secondInc = lines.lastIndexOf("LD ACC, (180H)");
    expect(secondInc).toBeGreaterThan(firstInc);
    expect(lines[secondInc]).toBe("LD ACC, (180H)");
    expect(lines[secondInc + 1]).toBe("ADD ACC, 1");
    expect(lines[secondInc + 2]).toBe("ST ACC, (180H)");
    // halt
    expect(code).toContain("HLT");
  });

  it("should inline nested macro calls", () => {
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
    expect(result.ast).not.toBeNull();

    const code = generateCode(result.ast);
    expect(code).toBe("NOP");
  });

  it("should throw error for undefined macro", () => {
    const source = `
      undefined_macro!
    `;

    const result = parse(source);
    expect(result.ast).not.toBeNull();

    expect(() => generateCode(result.ast)).toThrow("Undefined macro: undefined_macro");
  });

  it("should not generate code for macro declaration itself", () => {
    const source = `
      macro test {
        halt
        output
        nop
      }
    `;

    const result = parse(source);
    expect(result.ast).not.toBeNull();

    const code = generateCode(result.ast);
    expect(code).toBe("");
  });

  it("should inline macro with control flow", () => {
    const source = `
      var counter @ 0x180
      macro check_and_break {
        counter == 10
        if ZERO {
          break
        }
      }
      loop {
        counter = counter + 1
        check_and_break!
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
    expect(code).toContain("OUT");
  });

  it("should work with complex macro example from spec", () => {
    const source = `
      var counter @ 0x180
      var limit @ 0x181

      macro init {
        counter = 0
        limit = 10
      }

      macro print {
        output
      }

      init!

      loop {
        print!
        counter = counter + 1

        counter == limit
        if ZERO {
          break
        }
      }

      halt
    `;

    const result = parse(source);
    expect(result.ast).not.toBeNull();

    const code = generateCode(result.ast);
    // Variable declarations
    expect(code).toContain("* var counter @ 0x180");
    expect(code).toContain("* var limit @ 0x181");
    // init! macro expansion
    expect(code).toContain("LD ACC, 0");
    expect(code).toContain("ST ACC, (180H)");
    expect(code).toContain("LD ACC, 10");
    expect(code).toContain("ST ACC, (181H)");
    // print! macro expansion
    expect(code).toContain("OUT");
    // Loop structure
    expect(code).toMatch(/LOOP_START_\d+:/);
    expect(code).toContain("ADD ACC, 1");
    expect(code).toContain("CMP ACC, (181H)");
    expect(code).toMatch(/LOOP_END_\d+:/);
    // halt
    expect(code).toContain("HLT");
  });
});
