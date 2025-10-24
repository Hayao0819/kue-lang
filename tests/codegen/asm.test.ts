import { describe, expect, it } from "vitest";
import { generateCode } from "../../src/codegen/index.js";
import { parse } from "../../src/parser/index.js";

describe("インラインアセンブリコード生成", () => {
  it("should generate single line asm code", () => {
    const source = "asm `NOP`";
    const result = parse(source);
    expect(result.ast).toBeDefined();

    const code = generateCode(result.ast);
    expect(code).toBe("NOP");
  });

  it("should generate multiline asm code with indentation preserved", () => {
    const source = `asm \`
    LD ACC, (80H)
    ADD ACC, (81H)
    ST ACC, (82H)
\``;
    const result = parse(source);
    expect(result.ast).toBeDefined();

    const code = generateCode(result.ast);
    expect(code).toContain("LD ACC, (80H)");
    expect(code).toContain("ADD ACC, (81H)");
    expect(code).toContain("ST ACC, (82H)");
    // インデントが保持されることを確認
    expect(code).toContain("    LD ACC");
  });

  it("should generate asm with assembly comments", () => {
    const source = `asm \`
    ; Assembly comment
    NOP
    NOP
\``;
    const result = parse(source);
    expect(result.ast).toBeDefined();

    const code = generateCode(result.ast);
    expect(code).toContain("; Assembly comment");
    expect(code).toContain("NOP");
  });

  it("should generate multiple asm blocks", () => {
    const source = `
      asm \`NOP\`
      halt
      asm \`HLT\`
    `;
    const result = parse(source);
    expect(result.ast).toBeDefined();

    const code = generateCode(result.ast);
    const lines = code.split("\n");
    expect(lines[0]).toBe("NOP");
    expect(lines[1]).toBe("HLT");
    expect(lines[2]).toBe("HLT");
  });

  it("should generate asm in loop", () => {
    const source = `
      loop {
        asm \`NOP\`
        break
      }
    `;
    const result = parse(source);
    expect(result.ast).toBeDefined();

    const code = generateCode(result.ast);
    expect(code).toMatch(/LOOP_START_\d+:/);
    expect(code).toContain("NOP");
    expect(code).toMatch(/BA LOOP_END_\d+/); // Branch Always
  });

  it("should generate mixed asm and regular statements", () => {
    const source = `
      var foo @ 0x180

      foo = 10
      asm \`NOP\`
      halt
    `;
    const result = parse(source);
    expect(result.ast).toBeDefined();

    const code = generateCode(result.ast);
    expect(code).toContain("* var foo @ 0x180");
    expect(code).toContain("LD ACC, 10");
    expect(code).toContain("ST ACC, (180H)");
    expect(code).toContain("NOP");
    expect(code).toContain("HLT");
  });
});
