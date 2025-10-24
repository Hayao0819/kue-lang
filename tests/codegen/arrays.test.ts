import { describe, expect, it } from "vitest";
import { generateCode } from "../../src/codegen/index.js";
import { parse } from "../../src/parser/index.js";

describe("配列アクセスコード生成", () => {
  it("should generate code for array read with constant index", () => {
    const source = `
      var arr @ 0x180
      var result @ 0x190
      result = arr[5]
    `;

    const result = parse(source);
    expect(result.ast).not.toBeNull();

    const code = generateCode(result.ast);
    // arr[5] = arr + 5 = 0x180 + 5 = 0x185
    expect(code).toContain("LD ACC, (185H)");
    expect(code).toContain("ST ACC, (190H)");
  });

  it("should generate code for array read with variable index", () => {
    const source = `
      var arr @ 0x180
      var i @ 0x190
      var result @ 0x191
      result = arr[i]
    `;

    const result = parse(source);
    expect(result.ast).not.toBeNull();

    const code = generateCode(result.ast);
    expect(code).toContain("LD IX, (190H)"); // Load index
    expect(code).toContain("LD ACC, (IX+180H)"); // Load arr[i]
    expect(code).toContain("ST ACC, (191H)"); // Store result
  });

  it("should generate code for array write with constant index", () => {
    const source = `
      var arr @ 0x180
      var value @ 0x190
      arr[3] = value
    `;

    const result = parse(source);
    expect(result.ast).not.toBeNull();

    const code = generateCode(result.ast);
    expect(code).toContain("LD ACC, (190H)"); // Load value
    // arr[3] = arr + 3 = 0x180 + 3 = 0x183
    expect(code).toContain("ST ACC, (183H)"); // Store to arr[3]
  });

  it("should generate code for array write with variable index", () => {
    const source = `
      var arr @ 0x180
      var i @ 0x190
      var value @ 0x191
      arr[i] = value
    `;

    const result = parse(source);
    expect(result.ast).not.toBeNull();

    const code = generateCode(result.ast);
    expect(code).toContain("LD ACC, (191H)"); // Load value
    expect(code).toContain("LD IX, (190H)"); // Load index
    expect(code).toContain("ST ACC, (IX+180H)"); // Store to arr[i]
  });

  it("should generate code for array to array copy with variable indices", () => {
    const source = `
      var src @ 0x180
      var dst @ 0x190
      var i @ 0x1A0
      var j @ 0x1A1
      dst[i] = src[j]
    `;

    const result = parse(source);
    expect(result.ast).not.toBeNull();

    const code = generateCode(result.ast);
    // 特殊ケース: 両方が変数添字
    expect(code).toContain("LD IX, (1A1H)"); // Load j
    expect(code).toContain("LD ACC, (IX+180H)"); // Load src[j]
    expect(code).toContain("LD IX, (1A0H)"); // Load i
    expect(code).toContain("ST ACC, (IX+190H)"); // Store to dst[i]
  });

  it("should generate code for array access in binary operation", () => {
    const source = `
      var arr @ 0x180
      var result @ 0x190
      result = arr[2] + 10
    `;

    const result = parse(source);
    expect(result.ast).not.toBeNull();

    const code = generateCode(result.ast);
    // arr[2] = arr + 2 = 0x180 + 2 = 0x182
    expect(code).toContain("LD ACC, (182H)");
    expect(code).toContain("ADD ACC, 10");
    expect(code).toContain("ST ACC, (190H)");
  });

  it("should generate code for array access with variable index in binary operation", () => {
    const source = `
      var arr @ 0x180
      var i @ 0x190
      var result @ 0x191
      result = arr[i] + 5
    `;

    const result = parse(source);
    expect(result.ast).not.toBeNull();

    const code = generateCode(result.ast);
    expect(code).toContain("LD IX, (190H)");
    expect(code).toContain("LD ACC, (IX+180H)");
    expect(code).toContain("ADD ACC, 5");
    expect(code).toContain("ST ACC, (191H)");
  });

  it("should generate code for array access in comparison", () => {
    const source = `
      var arr @ 0x180
      var i @ 0x190
      arr[i] == 0
    `;

    const result = parse(source);
    expect(result.ast).not.toBeNull();

    const code = generateCode(result.ast);
    expect(code).toContain("LD IX, (190H)");
    expect(code).toContain("LD ACC, (IX+180H)");
    expect(code).toContain("CMP ACC, 0");
  });

  it("should generate code for array access with hex literal index", () => {
    const source = `
      var arr @ 0x180
      var result @ 0x190
      result = arr[0x0A]
    `;

    const result = parse(source);
    expect(result.ast).not.toBeNull();

    const code = generateCode(result.ast);
    // arr[0x0A] = arr + 10 = 0x180 + 0x0A = 0x18A
    expect(code).toContain("LD ACC, (18AH)");
    expect(code).toContain("ST ACC, (190H)");
  });

  it("should throw error for undefined array variable", () => {
    const source = `
      var result @ 0x190
      result = foo[0]
    `;

    const result = parse(source);
    expect(result.ast).not.toBeNull();

    expect(() => generateCode(result.ast)).toThrow("Undefined variable: foo");
  });

  it("should throw error for undefined index variable", () => {
    const source = `
      var arr @ 0x180
      var result @ 0x190
      result = arr[i]
    `;

    const result = parse(source);
    expect(result.ast).not.toBeNull();

    expect(() => generateCode(result.ast)).toThrow("Undefined variable: i");
  });
});
