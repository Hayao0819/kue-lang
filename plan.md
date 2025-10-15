# KUE-DSL トランスパイラ実装計画

KUE-CHIP2アセンブリへトランスパイルする教育用DSLの実装計画

## プロジェクト概要

- **目的**: KUE-DSLからKUE-CHIP2アセンブリへのトランスパイラを実装
- **対象**: KUE-CHIP2教育用ボード（8ビットアキュムレータアーキテクチャ）
- **言語設計**: 文ファースト、三番地コード、明示的メモリ管理

---

## 📊 現在の進捗状況（2025-10-16更新）

### 完了済み ✅

**フェーズ1: 基盤構築**
- ✅ レキサー（字句解析器）の実装 - 完全に動作（34テスト通過）
- ✅ パーサー（構文解析器）の骨組み - 完全に動作

**フェーズ2: 基本機能（MVP完成！🎉）**
- ✅ 変数宣言のパース - 完全に動作（6テスト通過）
- ✅ 基本文のパース - 代入文と組み込み命令（11テスト通過）
- ✅ コード生成器の基礎実装 - 完全に動作（21テスト通過）

**フェーズ3: 演算と制御構造（実用版v1完成！🎉）**
- ✅ **二項演算文の実装**（フェーズ3.1）- 完全に動作（14パーサーテスト + 16コード生成テスト通過）
  - 算術演算（+, -, +c, -c）
  - 論理演算（&, |, ^）
  - シフト・ローテート（<<, <<a, >>, >>a, <<<, >>>）

- ✅ **比較文の実装**（フェーズ3.2）- 完全に動作（7パーサーテスト + 3コード生成テスト通過）
  - 比較演算子（==, !=, <, >, <=, >=）
  - CMP命令の生成

- ✅ **制御構造の実装**（フェーズ3.3）- 完全に動作（10パーサーテスト + 12コード生成テスト通過）
  - loop文（無限ループ）
  - if文（15種類のフラグ条件対応）
  - break/continue文
  - ラベル管理とジャンプ命令生成

**合計**: 147テスト通過（lexer: 34、parser: 59、codegen: 54）

### 次のタスク 🎯

**実用版v1完成！** ✅

KUE-DSLの主要機能が実装され、実用的なプログラムを書けるようになりました：
- 変数宣言と代入文
- 二項演算（算術、論理、シフト、ローテート）
- 比較演算とフラグ制御
- ループと条件分岐
- 組み込み命令
- CLI実行環境

**サンプルプログラム**:
- `examples/hello.kue` - 基本的なプログラム
- `examples/simple.kue` - 変数と代入
- `examples/arithmetic.kue` - 算術演算
- `examples/logic.kue` - 論理演算
- `examples/shift.kue` - シフト・ローテート
- `examples/comparison.kue` - 比較演算
- `examples/loop.kue` - ループ処理
- `examples/conditional.kue` - 条件分岐

**次のフェーズ（完全版v2へ）**
1. **配列アクセスの実装**（フェーズ4.1）
   - 配列添字のパース
   - IX レジスタを使った間接アドレッシング

2. **マクロシステムの実装**（フェーズ4.2）
   - マクロ定義とインライン展開

3. **インラインアセンブリ**（フェーズ4.3）
   - asmブロックのサポート

### 未実装の機能 📝

**フェーズ4: 高度な機能**（完全版v2のため）
- 配列アクセス（array[index]）
- マクロシステム
- インラインアセンブリ（asm { ... }）

**フェーズ5-6: エラー処理とツール**（プロダクション版v3のため）
- エラー処理の強化
- テストとドキュメント拡充
- CLI機能拡張

---

## フェーズ1: 基盤構築

### 1.1 レキサー（字句解析器）の実装 ✅ **完了**

**目標**: ソースコードをトークン列に分解

- [x] トークナイザーの基本構造
  - 識別子の認識（`[a-zA-Z_][a-zA-Z0-9_]*`）
  - リテラルの認識（10進数、16進数 `0x` プレフィックス）
  - 演算子の認識（`+`, `-`, `&`, `|`, `^`, `<<`, `>>`, etc.）
  - 区切り文字の認識（`{}`, `[]`, `()`, `@`, `=`, `!`, `:`, `,`）
  - 予約語の認識

- [x] コメント処理
  - 行コメント（`//` から行末まで）
  - ブロックコメント（`/* ... */`）

- [x] リテラルパース
  - 10進数（0-255）
  - 16進数（0x00-0xFF）
  - 範囲チェック（8ビット範囲内）

- [x] エラー情報の管理
  - 行番号・列番号の追跡
  - トークン位置情報の保持

**成果物**: `src/lexer/tokens.ts`, `src/lexer/lexer.ts`, `src/lexer/index.ts`
**テスト**: `tests/lexer/lexer.test.ts` (34テスト通過)

---

### 1.2 パーサー（構文解析器）の骨組み ✅ **完了**

**目標**: トークン列をASTに変換する基礎を構築

- [x] AST（抽象構文木）のデータ構造定義

  ```typescript
  // 完全な型定義を実装済み
  type Program = {
    variables: VariableDecl[],
    statements: Statement[],
    macros: MacroDecl[]
  }

  type VariableDecl = {
    name: string,
    address: number
  }

  type Statement =
    | AssignmentStmt
    | ComparisonStmt
    | BinaryOpStmt
    | IfStmt
    | LoopStmt
    | BreakStmt
    | ContinueStmt
    | BuiltinStmt
    | MacroCallStmt
    | AsmBlockStmt
  ```

- [x] プログラム構造のパース
  - 変数宣言セクション（ファイル先頭）
  - コードセクション（マクロ定義 + 文）
  - セクション順序の検証

- [x] パーサーの基本インフラ
  - トークンストリームの管理（Chevrotainが提供）
  - 先読み（lookahead）機能（Chevrotainが提供）
  - エラーリカバリの基礎（Chevrotainの回復機能を有効化）

**成果物**: `src/parser/parser.ts`, `src/parser/visitor.ts`, `src/parser/cst-types.ts`, `src/ast/types.ts`, `src/ast/index.ts`

---

## フェーズ2: 基本機能

### 2.1 変数宣言のパース ✅ **完了**

**目標**: `var identifier @ address` をパース

- [x] 変数宣言構文の解析
  - `var` キーワードの認識
  - 識別子の取得
  - `@` 記号の確認
  - アドレス値の取得（10進数・16進数）

- [x] シンボルテーブルの構築
  - 変数名 → アドレスのマッピング（AST内に保持）
  - 変数の検索・登録機能（パーサーでパース、コード生成時に使用予定）

- [ ] バリデーション
  - 変数名の重複チェック（オプション）
  - アドレス範囲の確認（0x000-0x1FF）
  - ファイル先頭以外での宣言を検出

**成果物**: `src/parser/parser.ts`（variableDeclaration）、`src/parser/visitor.ts`（variableDeclaration）
**テスト**: `tests/parser/parser.test.ts` (変数宣言セクション: 6テスト通過)

---

### 2.2 基本文のパース ✅ **完了**

**目標**: 単純な代入文と組み込み命令をパース

- [x] 単純な代入文のパース
  - `identifier = identifier`
  - `identifier = literal`
  - 配列添字なし

- [x] 組み込み命令のパース
  - `halt` → HLT
  - `nop` → NOP
  - `input` → IN
  - `output` → OUT
  - `set_carry_flag` → SCF
  - `reset_carry_flag` → RCF

**成果物**: `src/parser/parser.ts`（assignmentStatement, builtinStatement, lvalue, rvalue, literal）
**テスト**: `tests/parser/parser.test.ts` (代入文: 4テスト、組み込み命令: 7テスト通過)

---

### 2.3 コード生成器の基礎 ✅ **完了**

**目標**: ASTからKUE-CHIP2アセンブリを生成

- [x] コード生成器の基本構造
  - ASTノードの走査
  - アセンブリ文字列の構築

- [x] 変数宣言のコメント出力

  ```asm
  * var counter @ 0x180
  * var limit @ 0x181
  ```

- [x] 単純な代入文のコード生成

  ```
  foo = 42    →  LD ACC, 42
                 ST ACC, (180H)

  foo = bar   →  LD ACC, (181H)
                 ST ACC, (180H)
  ```

- [x] 組み込み命令の1対1変換

  ```
  halt   → HLT
  input  → IN
  output → OUT
  ```

- [x] アドレスフォーマット変換
  - 10進数 → 16進数（例: 256 → 100H）
  - データ領域は `(addr)` 形式
  - プログラム領域は `[addr]` 形式

**成果物**: `src/codegen/codegen.ts`, `src/codegen/index.ts`, `src/cli.ts`
**テスト**: `tests/codegen/codegen.test.ts` (21テスト通過)
**サンプル**: `examples/*.kue` (hello.kue, simple.kue, io.kue)

---

## フェーズ3: 演算と制御構造

### 3.1 二項演算文の実装 ✅ **完了**

**目標**: `dest = op1 operator op2` をサポート

- [x] 二項演算のパース
  - 左辺値（lvalue）の解析
  - 右辺の演算式の解析（op1, operator, op2）
  - GATE機能による代入文との曖昧性解決（maxLookahead: 4）

- [x] 算術演算のサポート
  - `+` → ADD
  - `+c` → ADC
  - `-` → SUB
  - `-c` → SBC

- [x] 論理演算のサポート
  - `&` → AND
  - `|` → OR
  - `^` → EOR

- [x] シフト・ローテートのサポート
  - `<<` → SLL（論理左シフト）
  - `<<a` → SLA（算術左シフト）
  - `>>` → SRL（論理右シフト）
  - `>>a` → SRA（算術右シフト）
  - `<<<` → RLL（左ローテート）
  - `>>>` → RRL（右ローテート）

- [x] コード生成
  ```
  result = foo + bar  →  LD ACC, (180H)
                         ADD ACC, (181H)
                         ST ACC, (182H)
  ```

**成果物**: 二項演算のパース＆コード生成（14パーサーテスト + 16コード生成テスト）
**サンプル**: `examples/arithmetic.kue`, `examples/logic.kue`, `examples/shift.kue`

---

### 3.2 比較文の実装 ✅ **完了**

**目標**: 比較演算子とCMP命令の生成

- [x] 比較文のパース
  - `operand compare_op operand`
  - 比較演算子: `==`, `!=`, `<`, `>`, `<=`, `>=`
  - GATE機能による二項演算文との曖昧性解決

- [x] コード生成

  ```
  foo == bar  →  LD ACC, (180H)
                 CMP ACC, (181H)

  foo < 10    →  LD ACC, (180H)
                 CMP ACC, 10
  ```

- [x] フラグ条件の対応表（参照用）

  | 比較 | 真の時のフラグ | 偽の時のフラグ |
  |------|---------------|---------------|
  | `a == b` | `ZERO` | `NOT_ZERO` |
  | `a != b` | `NOT_ZERO` | `ZERO` |
  | `a < b` | `NEGATIVE` | `ZERO_OR_POSITIVE` |
  | `a <= b` | `ZERO_OR_NEGATIVE` | `POSITIVE` |
  | `a > b` | `POSITIVE` | `ZERO_OR_NEGATIVE` |
  | `a >= b` | `ZERO_OR_POSITIVE` | `NEGATIVE` |

**成果物**: 比較文のパース＆コード生成（7パーサーテスト + 3コード生成テスト）
**サンプル**: `examples/comparison.kue`

---

### 3.3 制御構造の実装 ✅ **完了**

**目標**: loop, if, break, continue をサポート

- [x] loop文のパース

  ```
  loop {
      statements
  }
  ```

- [x] if文のパース

  ```
  if FLAG_CONDITION {
      statements
  }
  ```

- [x] フラグ条件の認識
  - `ZERO`, `NOT_ZERO`, `NEGATIVE`, `POSITIVE`
  - `CARRY`, `NOT_CARRY`, `OVERFLOW`
  - `ZERO_OR_POSITIVE`, `ZERO_OR_NEGATIVE`
  - `GTE`, `LT`, `GT`, `LTE`
  - `NO_INPUT`, `NO_OUTPUT`

- [x] break/continue文のパース
  - ループコンテキストの追跡（ループスタック）
  - ループ外での使用を検出

- [x] ラベル生成管理
  - ラベルカウンターの管理（自動リセット機能付き）
  - `LOOP_START_N`, `LOOP_END_N`
  - `END_IF_N`

- [x] コード生成

  ```
  loop {              →  LOOP_START_0:
      // 処理               // 処理のコード
      break           →     JMP LOOP_END_0
  }                   →     JMP LOOP_START_0
                         LOOP_END_0:

  if ZERO {           →  JNZ END_IF_0
      // 処理               // 処理のコード
  }                   →  END_IF_0:
  ```

- [x] 分岐命令の対応表

  | フラグ条件 | 否定時の命令 |
  |-----------|-------------|
  | `ZERO` | `JNZ` |
  | `NOT_ZERO` | `JZ` |
  | `NEGATIVE` | `JP` |
  | `POSITIVE` | `JN` |
  | `CARRY` | `JNC` |
  | `NOT_CARRY` | `JC` |
  | `OVERFLOW` | `JNO` |
  | `ZERO_OR_POSITIVE` | `JN` |
  | `ZERO_OR_NEGATIVE` | `JP` |
  | `GTE` | `JLT` |
  | `LT` | `JGE` |
  | `GT` | `JLE` |
  | `LTE` | `JGT` |
  | `NO_INPUT` | `JIN` |
  | `NO_OUTPUT` | `JOUT` |

**成果物**: 制御構造のパース＆コード生成（10パーサーテスト + 12コード生成テスト）
**サンプル**: `examples/loop.kue`, `examples/conditional.kue`

---

## フェーズ4: 高度な機能

### 4.1 配列アクセスの実装　✅ **完了**

**目標**: `array[index]` をサポート

- [x] 配列添字のパース
  - 定数添字: `array[5]`
  - 変数添字: `array[i]`

- [x] lvalue（左辺値）での配列アクセス
  - `foo[3] = bar`
  - `foo[i] = bar`

- [x] rvalue（右辺値）での配列アクセス
  - `foo = bar[2]`
  - `foo = bar[j]`

- [x] 両方が配列の場合
  - `foo[i] = bar[j]`

- [x] コード生成

  ```
  // 定数添字
  foo = bar[2]    →  LD ACC, (183H)        // bar + 2
                     ST ACC, (180H)

  // 変数添字（右辺）
  foo = bar[j]    →  LD IX, (183H)         // j
                     LD ACC, (IX+181H)     // bar[j]
                     ST ACC, (180H)        // foo

  // 変数添字（左辺）
  foo[i] = bar    →  LD ACC, (181H)        // bar
                     LD IX, (182H)         // i
                     ST ACC, (IX+180H)     // foo[i]

  // 両方が配列
  foo[i] = bar[j] →  LD IX, (183H)         // j
                     LD ACC, (IX+181H)     // bar[j]
                     LD IX, (182H)         // i
                     ST ACC, (IX+180H)     // foo[i]
  ```

**成果物**: 配列アクセスのパース＆コード生成

---

### 4.2 マクロシステムの実装

**目標**: マクロ定義とインライン展開

- [x] マクロ定義のパース

  ```
  macro identifier {
      statements
  }
  ```

- [x] マクロテーブルの構築
  - マクロ名 → AST のマッピング
  - マクロの登録・検索

- [x] マクロ呼び出しのパース

  ```
  identifier!
  ```

- [x] インライン展開の実装
  - マクロ本体のASTをコピー
  - 呼び出し位置に展開
  - ネストした呼び出しのサポート

- [x] 順序制約のチェック
  - マクロは使用前に定義されている必要がある
  - 未定義マクロの検出

**成果物**: マクロシステム

---

### 4.3 インラインアセンブリ

**目標**: `asm { ... }` ブロックをサポート

- [x] asmブロックのパース

  ```
  asm {
      任意のテキスト
  }
  ```

- [x] 生テキストの保持
  - 内容を検証せずそのまま保持
  - 空白・改行も維持

- [x] コード生成
  - ブロック内容をそのまま出力

**成果物**: インラインアセンブリ機能

---

## フェーズ5: エラー処理と最適化

### 5.1 エラー処理の強化

**目標**: 分かりやすいエラーメッセージ

- [ ] セマンティックチェック
  - 未定義変数の使用検出
  - 変数宣言の位置チェック
  - 未定義マクロの呼び出し検出
  - ループ外での break/continue 検出

- [ ] エラーメッセージの改善

  ```
  Error: Undefined variable 'foo' at line 10, column 5
  Error: Variable declaration must be at the beginning of file (line 15)
  Error: 'break' statement outside of loop at line 20
  Error: Unexpected token '=' at line 5, column 10
  ```

- [ ] エラーリカバリ
  - 複数のエラーを一度に報告
  - パニックモードリカバリ

**成果物**: 堅牢なエラー処理

---

### 5.2 テストとドキュメント

**目標**: 品質保証と使いやすさ

- [ ] ユニットテストの作成
  - レキサーのテスト
  - パーサーのテスト
  - コード生成のテスト

- [ ] 統合テストの作成
  - サンプルプログラムのコンパイル
  - 出力アセンブリの検証

- [ ] サンプルプログラムの作成
  - 基本的な例
  - 制御構造の例
  - 配列とマクロの例

- [ ] ドキュメントの作成
  - README.md（プロジェクト概要、使い方）
  - CONTRIBUTING.md（開発者向け）
  - examples/ ディレクトリ

**成果物**: テストスイート、ドキュメント

---

## フェーズ6: ツール整備

### 6.1 CLI実装

**目標**: コマンドラインツールとして使える形に

- [ ] CLI基本機能
  - ファイル入出力
  - stdin/stdout サポート

- [ ] コマンドラインオプション

  ```bash
  kue-dsl input.kue -o output.asm    # ファイル指定
  kue-dsl input.kue                  # 標準出力
  kue-dsl --help                     # ヘルプ
  kue-dsl --version                  # バージョン
  ```

- [ ] オプション機能
  - `--debug`: デバッグ情報の出力
  - `--no-comments`: コメントを出力しない
  - `--format`: フォーマット調整

**成果物**: `kue-dsl` CLI ツール

---

### 6.2 追加機能（オプション）

**目標**: 開発体験の向上

- [ ] デバッグ情報の出力
  - ソース位置とアセンブリの対応表
  - シンボルテーブルのダンプ

- [ ] 最適化パス
  - 不要な LD/ST の削減
  - 定数畳み込み

- [ ] LSP（Language Server Protocol）
  - シンタックスハイライト
  - エラー表示
  - オートコンプリート

- [ ] REPL（対話環境）
  - 簡単な実験用

**成果物**: 開発ツール群

---

## 推奨する実装順序

### 最小動作版（MVP）

**目標**: 変数宣言と基本的な代入文だけが動く最小版

- フェーズ1（基盤構築）
- フェーズ2（基本機能）

### 実用版 v1

**目標**: 演算と制御構造が使える実用版

- フェーズ1-3

### 完全版 v2

**目標**: 仕様のすべての機能を実装

- フェーズ1-5

### プロダクション版 v3

**目標**: エラー処理とツールが充実した配布可能版

- フェーズ1-6

---

## 技術スタック（決定）

### 言語

- **TypeScript** ✅
  - 型安全性により堅牢なコード
  - 優れた開発体験とツールサポート
  - Node.js エコシステムの活用

### パーサー

- **Chevrotain** ✅
  - TypeScript製のパーサーライブラリ
  - Embedded DSL方式（コードでパーサーを記述）
  - 優れたエラーリカバリとエラーメッセージ
  - 自動的な構文図生成機能
  - デバッガーとの相性が良い
  - Lookaheadの柔軟な制御

### テスト

- **Vitest**
  - 高速な実行
  - TypeScriptネイティブサポート
  - Jest互換API

### CLI

- **Commander.js**
  - シンプルで直感的なAPI
  - TypeScript型定義が充実
  - Node.js標準的な選択肢

### ビルド・ツール

- **TypeScript Compiler (tsc)**
  - 型チェックとトランスパイル
- **tsx** / **ts-node**
  - 開発時の実行用

---

## マイルストーン

| マイルストーン | 内容 | 期間目安 | 進捗 |
|--------------|------|---------|------|
| M1: MVP | 変数宣言と代入文が動く | 1-2週 | **✅ 100%完了** |
| M2: 実用版v1 | 演算・制御構造が動く | 2-3週 | **✅ 100%完了** |
| M3: 完全版v2 | 全機能実装 | 3-4週 | 0% |
| M4: プロダクション版v3 | ツール整備完了 | 4-6週 | 0% |

**現在地**: M2完成！次はM3（完全版v2）の実装フェーズ。

---

## 参考資料

- `docs/kue_lang_spec.md` - KUE-DSL言語仕様
- `docs/kue_asm_spec.md` - KUE-CHIP2アセンブリ仕様
- KUE-CHIP2 教育用ボード リファレンスマニュアル

---

## 次のステップ

1. ~~技術スタックの決定（言語、パーサー戦略）~~ ✅ **完了**
   - 言語: TypeScript
   - パーサー: Chevrotain
2. プロジェクト構造の作成
   - package.json の作成
   - TypeScript設定
   - ディレクトリ構造の構築
3. フェーズ1の実装開始
   - Chevrotainでのレキサー実装
   - 基本的なトークン定義
