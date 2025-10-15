#!/usr/bin/env node

/**
 * KUE-DSL コンパイラ CLI
 * KUE-DSLソースコードをKUE-CHIP2アセンブリにコンパイル
 */

import { readFileSync } from "node:fs";
import { parse } from "./parser/index.js";
import { generateCode } from "./codegen/index.js";

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: kue-dsl <input-file>");
    process.exit(1);
  }

  const inputFile = args[0];

  try {
    // ソースコードを読み込み
    const sourceCode = readFileSync(inputFile, "utf-8");

    // パース
    const parseResult = parse(sourceCode);

    // レキサーエラー
    if (parseResult.lexerErrors.length > 0) {
      console.error("Lexer errors:");
      for (const error of parseResult.lexerErrors) {
        console.error(`  Line ${error.line}: ${error.message}`);
      }
      process.exit(1);
    }

    // パーサーエラー
    if (parseResult.parserErrors.length > 0) {
      console.error("Parser errors:");
      for (const error of parseResult.parserErrors) {
        console.error(`  ${error.message}`);
      }
      process.exit(1);
    }

    if (!parseResult.ast) {
      console.error("Failed to generate AST");
      process.exit(1);
    }

    // コード生成
    const assemblyCode = generateCode(parseResult.ast);

    // 出力
    console.log(assemblyCode);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
