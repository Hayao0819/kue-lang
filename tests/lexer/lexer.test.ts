import { describe, expect, it } from "vitest";
import { kueLexer } from "../../src/lexer/lexer.js";
import {
  And,
  Assign,
  At,
  Break,
  Continue,
  DecimalLiteral,
  Equals,
  GreaterThan,
  Halt,
  HexLiteral,
  Identifier,
  If,
  Input,
  LBrace,
  LBracket,
  LeftRotate,
  LeftShift,
  LessThan,
  Loop,
  Macro,
  Minus,
  MinusWithCarry,
  Negative,
  NotEquals,
  NotZero,
  Or,
  Output,
  Plus,
  PlusWithCarry,
  RBrace,
  RBracket,
  RightRotate,
  RightShift,
  Var,
  Xor,
  Zero,
} from "../../src/lexer/tokens.js";

describe("KueLexer", () => {
  describe("キーワード", () => {
    it("should tokenize var keyword", () => {
      const result = kueLexer.tokenize("var");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]?.tokenType).toBe(Var);
    });

    it("should tokenize loop keyword", () => {
      const result = kueLexer.tokenize("loop");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens[0]?.tokenType).toBe(Loop);
    });

    it("should tokenize if keyword", () => {
      const result = kueLexer.tokenize("if");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens[0]?.tokenType).toBe(If);
    });

    it("should tokenize break keyword", () => {
      const result = kueLexer.tokenize("break");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens[0]?.tokenType).toBe(Break);
    });

    it("should tokenize continue keyword", () => {
      const result = kueLexer.tokenize("continue");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens[0]?.tokenType).toBe(Continue);
    });

    it("should tokenize macro keyword", () => {
      const result = kueLexer.tokenize("macro");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens[0]?.tokenType).toBe(Macro);
    });
  });

  describe("組み込み命令", () => {
    it("should tokenize halt", () => {
      const result = kueLexer.tokenize("halt");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens[0]?.tokenType).toBe(Halt);
    });

    it("should tokenize input", () => {
      const result = kueLexer.tokenize("input");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens[0]?.tokenType).toBe(Input);
    });

    it("should tokenize output", () => {
      const result = kueLexer.tokenize("output");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens[0]?.tokenType).toBe(Output);
    });
  });

  describe("フラグ条件", () => {
    it("should tokenize ZERO", () => {
      const result = kueLexer.tokenize("ZERO");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens[0]?.tokenType).toBe(Zero);
    });

    it("should tokenize NOT_ZERO", () => {
      const result = kueLexer.tokenize("NOT_ZERO");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens[0]?.tokenType).toBe(NotZero);
    });

    it("should tokenize NEGATIVE", () => {
      const result = kueLexer.tokenize("NEGATIVE");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens[0]?.tokenType).toBe(Negative);
    });
  });

  describe("識別子", () => {
    it("should tokenize identifier", () => {
      const result = kueLexer.tokenize("counter");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens[0]?.tokenType).toBe(Identifier);
      expect(result.tokens[0]?.image).toBe("counter");
    });

    it("should tokenize identifier with underscore", () => {
      const result = kueLexer.tokenize("_foo_bar");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens[0]?.tokenType).toBe(Identifier);
      expect(result.tokens[0]?.image).toBe("_foo_bar");
    });

    it("should tokenize identifier with numbers", () => {
      const result = kueLexer.tokenize("var123");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens[0]?.tokenType).toBe(Identifier);
      expect(result.tokens[0]?.image).toBe("var123");
    });
  });

  describe("リテラル", () => {
    it("should tokenize decimal literal", () => {
      const result = kueLexer.tokenize("42");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens[0]?.tokenType).toBe(DecimalLiteral);
      expect(result.tokens[0]?.image).toBe("42");
    });

    it("should tokenize hex literal with lowercase x", () => {
      const result = kueLexer.tokenize("0x180");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens[0]?.tokenType).toBe(HexLiteral);
      expect(result.tokens[0]?.image).toBe("0x180");
    });

    it("should tokenize hex literal with uppercase X", () => {
      const result = kueLexer.tokenize("0xFF");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens[0]?.tokenType).toBe(HexLiteral);
      expect(result.tokens[0]?.image).toBe("0xFF");
    });
  });

  describe("演算子", () => {
    it("should tokenize arithmetic operators", () => {
      const result = kueLexer.tokenize("+ - +c -c");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens[0]?.tokenType).toBe(Plus);
      expect(result.tokens[1]?.tokenType).toBe(Minus);
      expect(result.tokens[2]?.tokenType).toBe(PlusWithCarry);
      expect(result.tokens[3]?.tokenType).toBe(MinusWithCarry);
    });

    it("should tokenize logical operators", () => {
      const result = kueLexer.tokenize("& | ^");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens[0]?.tokenType).toBe(And);
      expect(result.tokens[1]?.tokenType).toBe(Or);
      expect(result.tokens[2]?.tokenType).toBe(Xor);
    });

    it("should tokenize comparison operators", () => {
      const result = kueLexer.tokenize("== != < >");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens[0]?.tokenType).toBe(Equals);
      expect(result.tokens[1]?.tokenType).toBe(NotEquals);
      expect(result.tokens[2]?.tokenType).toBe(LessThan);
      expect(result.tokens[3]?.tokenType).toBe(GreaterThan);
    });

    it("should tokenize shift operators", () => {
      const result = kueLexer.tokenize("<< >>");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens[0]?.tokenType).toBe(LeftShift);
      expect(result.tokens[1]?.tokenType).toBe(RightShift);
    });

    it("should tokenize rotate operators", () => {
      const result = kueLexer.tokenize("<<< >>>");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens[0]?.tokenType).toBe(LeftRotate);
      expect(result.tokens[1]?.tokenType).toBe(RightRotate);
    });
  });

  describe("区切り文字", () => {
    it("should tokenize braces", () => {
      const result = kueLexer.tokenize("{ }");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens[0]?.tokenType).toBe(LBrace);
      expect(result.tokens[1]?.tokenType).toBe(RBrace);
    });

    it("should tokenize brackets", () => {
      const result = kueLexer.tokenize("[ ]");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens[0]?.tokenType).toBe(LBracket);
      expect(result.tokens[1]?.tokenType).toBe(RBracket);
    });

    it("should tokenize assignment and at symbol", () => {
      const result = kueLexer.tokenize("= @");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens[0]?.tokenType).toBe(Assign);
      expect(result.tokens[1]?.tokenType).toBe(At);
    });
  });

  describe("コメント", () => {
    it("should skip line comments", () => {
      const result = kueLexer.tokenize("var // this is a comment\ncounter");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(2);
      expect(result.tokens[0]?.tokenType).toBe(Var);
      expect(result.tokens[1]?.tokenType).toBe(Identifier);
    });

    it("should skip block comments", () => {
      const result = kueLexer.tokenize("var /* comment */ counter");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(2);
      expect(result.tokens[0]?.tokenType).toBe(Var);
      expect(result.tokens[1]?.tokenType).toBe(Identifier);
    });

    it("should skip multiline block comments", () => {
      const result = kueLexer.tokenize(`var /*
        multiline
        comment
      */ counter`);
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(2);
      expect(result.tokens[0]?.tokenType).toBe(Var);
      expect(result.tokens[1]?.tokenType).toBe(Identifier);
    });
  });

  describe("複雑な例", () => {
    it("should tokenize variable declaration", () => {
      const result = kueLexer.tokenize("var counter @ 0x180");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(4);
      expect(result.tokens[0]?.tokenType).toBe(Var);
      expect(result.tokens[1]?.tokenType).toBe(Identifier);
      expect(result.tokens[2]?.tokenType).toBe(At);
      expect(result.tokens[3]?.tokenType).toBe(HexLiteral);
    });

    it("should tokenize assignment with operation", () => {
      const result = kueLexer.tokenize("result = foo + bar");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(5);
      expect(result.tokens[0]?.tokenType).toBe(Identifier);
      expect(result.tokens[1]?.tokenType).toBe(Assign);
      expect(result.tokens[2]?.tokenType).toBe(Identifier);
      expect(result.tokens[3]?.tokenType).toBe(Plus);
      expect(result.tokens[4]?.tokenType).toBe(Identifier);
    });

    it("should tokenize array access", () => {
      const result = kueLexer.tokenize("array[5]");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(4);
      expect(result.tokens[0]?.tokenType).toBe(Identifier);
      expect(result.tokens[1]?.tokenType).toBe(LBracket);
      expect(result.tokens[2]?.tokenType).toBe(DecimalLiteral);
      expect(result.tokens[3]?.tokenType).toBe(RBracket);
    });

    it("should tokenize loop with if statement", () => {
      const result = kueLexer.tokenize(`loop {
        counter = counter + 1
        counter == 10
        if ZERO {
          break
        }
      }`);
      expect(result.errors).toHaveLength(0);
      // トークンの数を確認（空白とコメントは除外される）
      expect(result.tokens.length).toBeGreaterThan(0);
    });
  });

  describe("位置情報", () => {
    it("should track line and column numbers", () => {
      const result = kueLexer.tokenize("var\ncounter");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens[0]?.startLine).toBe(1);
      expect(result.tokens[0]?.startColumn).toBe(1);
      expect(result.tokens[1]?.startLine).toBe(2);
      expect(result.tokens[1]?.startColumn).toBe(1);
    });
  });
});
