import type { ILexingError, IRecognitionException } from "chevrotain";
import type { Program } from "../ast/index.js";
import { kueLexer } from "../lexer/index.js";
import { kueParser } from "./parser.js";
import { astBuilder } from "./visitor.js";

export * from "./parser.js";
export * from "./visitor.js";

/**
 * KUE-DSLソースコードをパースしてASTを生成
 *
 * @param sourceCode - パースするソースコード
 * @returns パース結果（AST、レキサーエラー、パーサーエラー）
 */
export function parse(sourceCode: string): ParseResult {
  // レキシング（字句解析）
  const lexingResult = kueLexer.tokenize(sourceCode);

  if (lexingResult.errors.length > 0) {
    return {
      ast: null,
      lexerErrors: lexingResult.errors,
      parserErrors: [],
    };
  }

  // パージング（構文解析）
  kueParser.input = lexingResult.tokens;
  const cst = kueParser.program();

  if (kueParser.errors.length > 0) {
    return {
      ast: null,
      lexerErrors: [],
      parserErrors: kueParser.errors,
    };
  }

  // CST → AST変換
  const ast = astBuilder.visit(cst) as Program;

  return {
    ast,
    lexerErrors: [],
    parserErrors: [],
  };
}

/**
 * パース結果
 */
export interface ParseResult {
  ast: Program | null;
  lexerErrors: ILexingError[];
  parserErrors: IRecognitionException[];
}
