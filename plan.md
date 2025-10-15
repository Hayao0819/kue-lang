# KUE-DSL トランスパイラ実装計画

KUE-CHIP2アセンブリへトランスパイルする教育用DSLの実装計画

## プロジェクト概要

- **目的**: KUE-DSLからKUE-CHIP2アセンブリへのトランスパイラを実装
- **対象**: KUE-CHIP2教育用ボード（8ビットアキュムレータアーキテクチャ）
- **言語設計**: 文ファースト、三番地コード、明示的メモリ管理

---

## フェーズ1: 基盤構築

### 1.1 レキサー（字句解析器）の実装

**目標**: ソースコードをトークン列に分解

- [ ] トークナイザーの基本構造
  - 識別子の認識（`[a-zA-Z_][a-zA-Z0-9_]*`）
  - リテラルの認識（10進数、16進数 `0x` プレフィックス）
  - 演算子の認識（`+`, `-`, `&`, `|`, `^`, `<<`, `>>`, etc.）
  - 区切り文字の認識（`{}`, `[]`, `()`, `@`, `=`, `!`, `:`, `,`）
  - 予約語の認識

- [ ] コメント処理
  - 行コメント（`//` から行末まで）
  - ブロックコメント（`/* ... */`）

- [ ] リテラルパース
  - 10進数（0-255）
  - 16進数（0x00-0xFF）
  - 範囲チェック（8ビット範囲内）

- [ ] エラー情報の管理
  - 行番号・列番号の追跡
  - トークン位置情報の保持

**成果物**: `lexer.ts` または `lexer.js`

---

### 1.2 パーサー（構文解析器）の骨組み

**目標**: トークン列をASTに変換する基礎を構築

- [ ] AST（抽象構文木）のデータ構造定義

  ```typescript
  // 例:
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

- [ ] プログラム構造のパース
  - 変数宣言セクション（ファイル先頭）
  - コードセクション（マクロ定義 + 文）
  - セクション順序の検証

- [ ] パーサーの基本インフラ
  - トークンストリームの管理
  - 先読み（lookahead）機能
  - エラーリカバリの基礎

**成果物**: `parser.ts`, `ast.ts`

---

## フェーズ2: 基本機能

### 2.1 変数宣言のパース

**目標**: `var identifier @ address` をパース

- [ ] 変数宣言構文の解析
  - `var` キーワードの認識
  - 識別子の取得
  - `@` 記号の確認
  - アドレス値の取得（10進数・16進数）

- [ ] シンボルテーブルの構築
  - 変数名 → アドレスのマッピング
  - 変数の検索・登録機能

- [ ] バリデーション
  - 変数名の重複チェック（オプション）
  - アドレス範囲の確認（0x000-0x1FF）
  - ファイル先頭以外での宣言を検出

**成果物**: シンボルテーブル機能、変数宣言パース

---

### 2.2 基本文のパース

**目標**: 単純な代入文と組み込み命令をパース

- [ ] 単純な代入文のパース
  - `identifier = identifier`
  - `identifier = literal`
  - 配列添字なし

- [ ] 組み込み命令のパース
  - `halt` → HLT
  - `nop` → NOP
  - `input` → IN
  - `output` → OUT
  - `set_carry_flag` → SCF
  - `reset_carry_flag` → RCF

**成果物**: 基本文のASTノード

---

### 2.3 コード生成器の基礎

**目標**: ASTからKUE-CHIP2アセンブリを生成

- [ ] コード生成器の基本構造
  - ASTノードの走査（visitor パターンなど）
  - アセンブリ文字列の構築

- [ ] 変数宣言のコメント出力

  ```asm
  * var counter @ 0x180
  * var limit @ 0x181
  ```

- [ ] 単純な代入文のコード生成

  ```
  foo = 42    →  LD ACC, 42
                 ST ACC, (180H)

  foo = bar   →  LD ACC, (181H)
                 ST ACC, (180H)
  ```

- [ ] 組み込み命令の1対1変換

  ```
  halt   → HLT
  input  → IN
  output → OUT
  ```

- [ ] アドレスフォーマット変換
  - 10進数 → 16進数（例: 256 → 100H）
  - データ領域は `(addr)` 形式
  - プログラム領域は `[addr]` 形式

**成果物**: `codegen.ts`

---

## フェーズ3: 演算と制御構造

### 3.1 二項演算文の実装

**目標**: `dest = op1 operator op2` をサポート

- [ ] 二項演算のパース
  - 左辺値（lvalue）の解析
  - 右辺の演算式の解析（op1, operator, op2）

- [ ] 算術演算のサポート
  - `+` → ADD
  - `+c` → ADC
  - `-` → SUB
  - `-c` → SBC

- [ ] 論理演算のサポート
  - `&` → AND
  - `|` → OR
  - `^` → EOR

- [ ] シフト・ローテートのサポート
  - `<<` → SLL（論理左シフト）
  - `<<a` → SLA（算術左シフト）
  - `>>` → SRL（論理右シフト）
  - `>>a` → SRA（算術右シフト）
  - `<<<` → RLL（左ローテート）
  - `>>>` → RRL（右ローテート）

- [ ] コード生成
  ```
  result = foo + bar  →  LD ACC, (180H)
                         ADD ACC, (181H)
                         ST ACC, (182H)
  ```

**成果物**: 二項演算のパース＆コード生成

---

### 3.2 比較文の実装

**目標**: 比較演算子とCMP命令の生成

- [ ] 比較文のパース
  - `operand compare_op operand`
  - 比較演算子: `==`, `!=`, `<`, `>`, `<=`, `>=`

- [ ] コード生成

  ```
  foo == bar  →  LD ACC, (180H)
                 CMP ACC, (181H)

  foo < 10    →  LD ACC, (180H)
                 CMP ACC, 10
  ```

- [ ] フラグ条件の対応表（参照用）

  | 比較 | 真の時のフラグ | 偽の時のフラグ |
  |------|---------------|---------------|
  | `a == b` | `ZERO` | `NOT_ZERO` |
  | `a != b` | `NOT_ZERO` | `ZERO` |
  | `a < b` | `NEGATIVE` | `ZERO_OR_POSITIVE` |
  | `a <= b` | `ZERO_OR_NEGATIVE` | `POSITIVE` |
  | `a > b` | `POSITIVE` | `ZERO_OR_NEGATIVE` |
  | `a >= b` | `ZERO_OR_POSITIVE` | `NEGATIVE` |

**成果物**: 比較文のパース＆コード生成

---

### 3.3 制御構造の実装

**目標**: loop, if, break, continue をサポート

- [ ] loop文のパース

  ```
  loop {
      statements
  }
  ```

- [ ] if文のパース

  ```
  if FLAG_CONDITION {
      statements
  }
  ```

- [ ] フラグ条件の認識
  - `ZERO`, `NOT_ZERO`, `NEGATIVE`, `POSITIVE`
  - `CARRY`, `NOT_CARRY`, `OVERFLOW`
  - `ZERO_OR_POSITIVE`, `ZERO_OR_NEGATIVE`
  - `GTE`, `LT`, `GT`, `LTE`
  - `NO_INPUT`, `NO_OUTPUT`

- [ ] break/continue文のパース
  - ループコンテキストの追跡
  - ループ外での使用を検出

- [ ] ラベル生成管理
  - ラベルカウンターの管理
  - `__loop_start_N`, `__loop_end_N`
  - `__if_end_N`

- [ ] コード生成

  ```
  loop {              →  __loop_start_1:
      // 処理               // 処理のコード
      break           →     BA __loop_end_1
  }                   →     BA __loop_start_1
                         __loop_end_1:

  if ZERO {           →  BNZ __if_end_1
      // 処理               // 処理のコード
  }                   →  __if_end_1:
  ```

- [ ] 分岐命令の対応表

  | フラグ条件 | 否定時の命令 |
  |-----------|-------------|
  | `ZERO` | `BNZ` |
  | `NOT_ZERO` | `BZ` |
  | `NEGATIVE` | `BP` |
  | `POSITIVE` | `BN` |
  | `CARRY` | `BNC` |
  | `NOT_CARRY` | `BC` |
  | etc. | ... |

**成果物**: 制御構造のパース＆コード生成

---

## フェーズ4: 高度な機能

### 4.1 配列アクセスの実装

**目標**: `array[index]` をサポート

- [ ] 配列添字のパース
  - 定数添字: `array[5]`
  - 変数添字: `array[i]`

- [ ] lvalue（左辺値）での配列アクセス
  - `foo[3] = bar`
  - `foo[i] = bar`

- [ ] rvalue（右辺値）での配列アクセス
  - `foo = bar[2]`
  - `foo = bar[j]`

- [ ] 両方が配列の場合
  - `foo[i] = bar[j]`

- [ ] コード生成

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

- [ ] マクロ定義のパース

  ```
  macro identifier {
      statements
  }
  ```

- [ ] マクロテーブルの構築
  - マクロ名 → AST のマッピング
  - マクロの登録・検索

- [ ] マクロ呼び出しのパース

  ```
  identifier!
  ```

- [ ] インライン展開の実装
  - マクロ本体のASTをコピー
  - 呼び出し位置に展開
  - ネストした呼び出しのサポート

- [ ] 順序制約のチェック
  - マクロは使用前に定義されている必要がある
  - 未定義マクロの検出

**成果物**: マクロシステム

---

### 4.3 インラインアセンブリ

**目標**: `asm { ... }` ブロックをサポート

- [ ] asmブロックのパース

  ```
  asm {
      任意のテキスト
  }
  ```

- [ ] 生テキストの保持
  - 内容を検証せずそのまま保持
  - 空白・改行も維持

- [ ] コード生成
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

| マイルストーン | 内容 | 期間目安 |
|--------------|------|---------|
| M1: MVP | 変数宣言と代入文が動く | 1-2週 |
| M2: 実用版v1 | 演算・制御構造が動く | 2-3週 |
| M3: 完全版v2 | 全機能実装 | 3-4週 |
| M4: プロダクション版v3 | ツール整備完了 | 4-6週 |

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
