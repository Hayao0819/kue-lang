import { type ILexerDefinitionError, type ILexingError, type IToken, Lexer } from "chevrotain";
import { allTokens } from "./tokens.js";

/**
 * KUE-DSL レキサー
 *
 * ソースコードをトークン列に変換します。
 */
export class KueLexer {
  private lexer: Lexer;

  constructor() {
    this.lexer = new Lexer(allTokens, {
      // 位置情報を保持
      positionTracking: "full",
      // エラーリカバリを有効化
      recoveryEnabled: true,
    });
  }

  /**
   * ソースコードをトークン化
   *
   * @param text - トークン化するソースコード
   * @returns トークン化の結果
   */
  tokenize(text: string): LexingResult {
    const result = this.lexer.tokenize(text);

    return {
      tokens: result.tokens,
      errors: result.errors,
      groups: result.groups,
    };
  }

  /**
   * レキサーのエラー情報を取得
   */
  getLexerErrors(): ILexerDefinitionError[] {
    return this.lexer.lexerDefinitionErrors;
  }
}

/**
 * レキシング結果
 */
export interface LexingResult {
  tokens: IToken[];
  errors: ILexingError[];
  groups: Record<string, IToken[]>;
}

// デフォルトのレキサーインスタンスをエクスポート
export const kueLexer = new KueLexer();
