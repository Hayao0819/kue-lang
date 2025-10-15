import { createToken, Lexer } from "chevrotain";

// ========================================
// 識別子（キーワードより先に定義）
// ========================================

export const Identifier = createToken({
  name: "Identifier",
  pattern: /[a-zA-Z_][a-zA-Z0-9_]*/,
});

// ========================================
// キーワード
// ========================================

export const Var = createToken({ name: "Var", pattern: /var\b/, longer_alt: Identifier });
export const Loop = createToken({ name: "Loop", pattern: /loop\b/, longer_alt: Identifier });
export const If = createToken({ name: "If", pattern: /if\b/, longer_alt: Identifier });
export const Break = createToken({ name: "Break", pattern: /break\b/, longer_alt: Identifier });
export const Continue = createToken({
  name: "Continue",
  pattern: /continue\b/,
  longer_alt: Identifier,
});
export const Macro = createToken({ name: "Macro", pattern: /macro\b/, longer_alt: Identifier });
export const Asm = createToken({ name: "Asm", pattern: /asm\b/, longer_alt: Identifier });

// ========================================
// 組み込み命令
// ========================================

export const Halt = createToken({ name: "Halt", pattern: /halt\b/, longer_alt: Identifier });
export const Nop = createToken({ name: "Nop", pattern: /nop\b/, longer_alt: Identifier });
export const Input = createToken({ name: "Input", pattern: /input\b/, longer_alt: Identifier });
export const Output = createToken({ name: "Output", pattern: /output\b/, longer_alt: Identifier });
export const SetCarryFlag = createToken({
  name: "SetCarryFlag",
  pattern: /set_carry_flag\b/,
  longer_alt: Identifier,
});
export const ResetCarryFlag = createToken({
  name: "ResetCarryFlag",
  pattern: /reset_carry_flag\b/,
  longer_alt: Identifier,
});

// ========================================
// レジスタ
// ========================================

export const ACC = createToken({ name: "ACC", pattern: /ACC\b/, longer_alt: Identifier });
export const IX = createToken({ name: "IX", pattern: /IX\b/, longer_alt: Identifier });

// ========================================
// フラグ条件
// ========================================

export const Zero = createToken({ name: "Zero", pattern: /ZERO\b/, longer_alt: Identifier });
export const NotZero = createToken({
  name: "NotZero",
  pattern: /NOT_ZERO\b/,
  longer_alt: Identifier,
});
export const Negative = createToken({
  name: "Negative",
  pattern: /NEGATIVE\b/,
  longer_alt: Identifier,
});
export const Positive = createToken({
  name: "Positive",
  pattern: /POSITIVE\b/,
  longer_alt: Identifier,
});
export const Carry = createToken({ name: "Carry", pattern: /CARRY\b/, longer_alt: Identifier });
export const NotCarry = createToken({
  name: "NotCarry",
  pattern: /NOT_CARRY\b/,
  longer_alt: Identifier,
});
export const Overflow = createToken({
  name: "Overflow",
  pattern: /OVERFLOW\b/,
  longer_alt: Identifier,
});
export const ZeroOrPositive = createToken({
  name: "ZeroOrPositive",
  pattern: /ZERO_OR_POSITIVE\b/,
  longer_alt: Identifier,
});
export const ZeroOrNegative = createToken({
  name: "ZeroOrNegative",
  pattern: /ZERO_OR_NEGATIVE\b/,
  longer_alt: Identifier,
});
export const Gte = createToken({ name: "Gte", pattern: /GTE\b/, longer_alt: Identifier });
export const Lt = createToken({ name: "Lt", pattern: /LT\b/, longer_alt: Identifier });
export const Gt = createToken({ name: "Gt", pattern: /GT\b/, longer_alt: Identifier });
export const Lte = createToken({ name: "Lte", pattern: /LTE\b/, longer_alt: Identifier });
export const NoInput = createToken({
  name: "NoInput",
  pattern: /NO_INPUT\b/,
  longer_alt: Identifier,
});
export const NoOutput = createToken({
  name: "NoOutput",
  pattern: /NO_OUTPUT\b/,
  longer_alt: Identifier,
});

// ========================================
// リテラル
// ========================================

export const HexLiteral = createToken({
  name: "HexLiteral",
  pattern: /0[xX][0-9a-fA-F]+/,
});

export const DecimalLiteral = createToken({
  name: "DecimalLiteral",
  pattern: /[0-9]+/,
});

// ========================================
// 演算子
// ========================================

// シフト・ローテート（長いものから先にマッチ）
export const LeftRotate = createToken({ name: "LeftRotate", pattern: /<<</ });
export const RightRotate = createToken({ name: "RightRotate", pattern: />>>/ });
export const LeftShiftArithmetic = createToken({ name: "LeftShiftArithmetic", pattern: /<<a/ });
export const RightShiftArithmetic = createToken({ name: "RightShiftArithmetic", pattern: />>a/ });
export const LeftShift = createToken({ name: "LeftShift", pattern: /<</ });
export const RightShift = createToken({ name: "RightShift", pattern: />>/ });

// 比較演算子（長いものから先にマッチ）
export const Equals = createToken({ name: "Equals", pattern: /==/ });
export const NotEquals = createToken({ name: "NotEquals", pattern: /!=/ });
export const LessThanOrEqual = createToken({ name: "LessThanOrEqual", pattern: /<=/ });
export const GreaterThanOrEqual = createToken({ name: "GreaterThanOrEqual", pattern: />=/ });
export const LessThan = createToken({ name: "LessThan", pattern: /</ });
export const GreaterThan = createToken({ name: "GreaterThan", pattern: />/ });

// 算術演算子
export const PlusWithCarry = createToken({ name: "PlusWithCarry", pattern: /\+c/ });
export const Plus = createToken({ name: "Plus", pattern: /\+/ });
export const MinusWithCarry = createToken({ name: "MinusWithCarry", pattern: /-c/ });
export const Minus = createToken({ name: "Minus", pattern: /-/ });

// 論理演算子
export const And = createToken({ name: "And", pattern: /&/ });
export const Or = createToken({ name: "Or", pattern: /\|/ });
export const Xor = createToken({ name: "Xor", pattern: /\^/ });

// ========================================
// 区切り文字
// ========================================

export const LBrace = createToken({ name: "LBrace", pattern: /{/ });
export const RBrace = createToken({ name: "RBrace", pattern: /}/ });
export const LBracket = createToken({ name: "LBracket", pattern: /\[/ });
export const RBracket = createToken({ name: "RBracket", pattern: /]/ });
export const LParen = createToken({ name: "LParen", pattern: /\(/ });
export const RParen = createToken({ name: "RParen", pattern: /\)/ });
export const At = createToken({ name: "At", pattern: /@/ });
export const Assign = createToken({ name: "Assign", pattern: /=/ });
export const Exclamation = createToken({ name: "Exclamation", pattern: /!/ });
export const Colon = createToken({ name: "Colon", pattern: /:/ });
export const Comma = createToken({ name: "Comma", pattern: /,/ });

// ========================================
// 空白とコメント
// ========================================

export const WhiteSpace = createToken({
  name: "WhiteSpace",
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});

export const LineComment = createToken({
  name: "LineComment",
  pattern: /\/\/[^\n\r]*/,
  group: Lexer.SKIPPED,
});

export const BlockComment = createToken({
  name: "BlockComment",
  pattern: /\/\*[\s\S]*?\*\//,
  group: Lexer.SKIPPED,
});

// ========================================
// トークン配列（順序重要！）
// ========================================

export const allTokens = [
  // 空白とコメント（最初に処理）
  WhiteSpace,
  LineComment,
  BlockComment,

  // キーワード（識別子より先にマッチさせる）
  Var,
  Loop,
  If,
  Break,
  Continue,
  Macro,
  Asm,

  // 組み込み命令
  Halt,
  Nop,
  Input,
  Output,
  SetCarryFlag,
  ResetCarryFlag,

  // レジスタ
  ACC,
  IX,

  // フラグ条件（長いものから順に）
  ZeroOrPositive,
  ZeroOrNegative,
  NotZero,
  NotCarry,
  NoInput,
  NoOutput,
  Zero,
  Negative,
  Positive,
  Carry,
  Overflow,
  Gte,
  Lte,
  Lt,
  Gt,

  // 演算子（長いものから順に）
  LeftRotate,
  RightRotate,
  LeftShiftArithmetic,
  RightShiftArithmetic,
  LeftShift,
  RightShift,
  Equals,
  NotEquals,
  LessThanOrEqual,
  GreaterThanOrEqual,
  PlusWithCarry,
  MinusWithCarry,

  // 単一文字演算子
  Plus,
  Minus,
  And,
  Or,
  Xor,
  LessThan,
  GreaterThan,

  // 区切り文字
  LBrace,
  RBrace,
  LBracket,
  RBracket,
  LParen,
  RParen,
  At,
  Assign,
  Exclamation,
  Colon,
  Comma,

  // リテラルと識別子（最後に）
  HexLiteral,
  DecimalLiteral,
  Identifier,
];
