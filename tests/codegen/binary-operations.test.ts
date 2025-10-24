import { describe, expect, it } from "vitest";
import { generateCode } from "../../src/codegen/index.js";
import { parse } from "../../src/parser/index.js";

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

    const code = generateCode(result.ast);
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

    const code = generateCode(result.ast);
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

    const code = generateCode(result.ast);
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

    const code = generateCode(result.ast);
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

    const code = generateCode(result.ast);
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

    const code = generateCode(result.ast);
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

    const code = generateCode(result.ast);
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

    const code = generateCode(result.ast);
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

    const code = generateCode(result.ast);
    expect(code).toContain("LD ACC, (181H)");
    expect(code).toContain("SLL ACC");
  });

  it("should generate code for arithmetic left shift", () => {
    const source = `
      var result @ 0x180
      result = 4 <<a 2
    `;

    const result = parse(source);
    expect(result.ast).not.toBeNull();

    const code = generateCode(result.ast);
    expect(code).toContain("LD ACC, 4");
    expect(code).toContain("SLA ACC");
  });

  it("should generate code for right shift", () => {
    const source = `
      var result @ 0x180
      result = 8 >> 2
    `;

    const result = parse(source);
    expect(result.ast).not.toBeNull();

    const code = generateCode(result.ast);
    expect(code).toContain("LD ACC, 8");
    expect(code).toContain("SRL ACC");
  });

  it("should generate code for arithmetic right shift", () => {
    const source = `
      var result @ 0x180
      var a @ 0x181
      result = a >>a 1
    `;

    const result = parse(source);
    expect(result.ast).not.toBeNull();

    const code = generateCode(result.ast);
    expect(code).toContain("LD ACC, (181H)");
    expect(code).toContain("SRA ACC");
  });

  it("should generate code for left rotate", () => {
    const source = `
      var result @ 0x180
      result = 0x80 <<< 1
    `;

    const result = parse(source);
    expect(result.ast).not.toBeNull();

    const code = generateCode(result.ast);
    expect(code).toContain("LD ACC, 128");
    expect(code).toContain("RLL ACC");
  });

  it("should generate code for right rotate", () => {
    const source = `
      var result @ 0x180
      var a @ 0x181
      result = a >>> 1
    `;

    const result = parse(source);
    expect(result.ast).not.toBeNull();

    const code = generateCode(result.ast);
    expect(code).toContain("LD ACC, (181H)");
    expect(code).toContain("RRL ACC");
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

    const code = generateCode(result.ast);
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

    expect(() => generateCode(result.ast)).toThrow("Undefined variable: foo");
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

    const code = generateCode(result.ast);
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

    const code = generateCode(result.ast);
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

    const code = generateCode(result.ast);
    expect(code).toContain("LD ACC, (180H)");
    expect(code).toContain("CMP ACC, 255");
  });
});
