# KUE-DSL Transpiler

KUE-DSL から KUE-CHIP2 アセンブリへのトランスパイラ

## 概要

KUE-DSL は、KUE-CHIP2 教育用 8 ビットマイクロプロセッサのための高級言語です。
このトランスパイラは、KUE-DSL のソースコードを KUE-CHIP2 アセンブリコードに変換します。

## 特徴

- **文ファースト設計**: 式ではなく文による構造化プログラミング
- **三番地コード**: `dest = op1 operator op2` 形式の明示的な演算
- **明示的メモリ管理**: プログラマがメモリアドレスを直接指定
- **マクロシステム**: インライン展開によるコード再利用
- **インラインアセンブリ**: バッククォート構文で生のアセンブリを埋め込み可能
- **TypeScript 実装**: 型安全で保守性の高い実装
- **Chevrotain パーサー**: 優れたエラーリカバリとデバッグ機能

## インストール

```bash
npm install
```

## 使い方

### CLI

```bash
# ファイルをコンパイル
npm run dev input.kue -o output.asm

# 標準出力に出力
npm run dev input.kue

# ヘルプを表示
npm run dev -- --help
```

### プログラム例

#### 基本的な例

```kue-dsl
// 変数宣言
var counter @ 0x180
var limit @ 0x181
var result @ 0x182

// 初期化
counter = 0
limit = 10

// ループ
loop {
    result = counter + 1
    counter = result

    counter == limit
    if ZERO {
        break
    }
}

halt
```

#### インラインアセンブリの例

```kue-dsl
var value @ 0x180

// 単一行のアセンブリ
asm `NOP`

// 複数行のアセンブリ（インデント・コメント保持）
asm `
    ; 直接アセンブリで記述
    LD ACC, (180H)
    ADD ACC, 1
    ST ACC, (180H)
`

// KUE-DSLとの混在
value == 0
if NOT_ZERO {
    asm `OUT`
}

halt
```

## 開発

### ビルド

```bash
npm run build
```

### テスト

```bash
# テスト実行
npm test

# ウォッチモード
npm run test:watch

# カバレッジ
npm run test:coverage
```

### リント・フォーマット

```bash
# リント
npm run lint

# フォーマット
npm run format

# 型チェック
npm run typecheck
```

## プロジェクト構造

```
kue-lang/
├── src/
│   ├── lexer/          # 字句解析器
│   ├── parser/         # 構文解析器
│   ├── ast/            # AST 定義
│   ├── codegen/        # コード生成器
│   ├── utils/          # ユーティリティ
│   └── cli.ts          # CLI エントリーポイント
├── tests/
│   ├── lexer/
│   ├── parser/
│   ├── codegen/
│   └── e2e/            # エンドツーエンドテスト
├── examples/           # サンプルプログラム
├── docs/               # ドキュメント
│   ├── kue_lang_spec.md    # 言語仕様
│   └── kue_asm_spec.md     # アセンブリ仕様
└── plan.md            # 実装計画

```

## 実装ステータス

### フェーズ1: 基盤構築 ✅

- [x] レキサー（字句解析器）- 34テスト
- [x] パーサー（構文解析器）の骨組み

### フェーズ2: 基本機能（MVP） ✅

- [x] 変数宣言のパース - 6テスト
- [x] 基本文のパース - 11テスト
- [x] コード生成器の基礎 - 21テスト

### フェーズ3: 演算と制御構造（実用版v1） ✅

- [x] 二項演算文 - 30テスト
- [x] 比較文 - 10テスト
- [x] 制御構造（loop, if, break, continue） - 22テスト

### フェーズ4: 高度な機能 🚧

- [x] 配列アクセス - 動作確認済み
- [x] マクロシステム - 動作確認済み
- [x] **インラインアセンブリ** - 15テスト（新規実装！）

### フェーズ5: エラー処理と最適化 ⏳

- [ ] エラー処理の強化
- [ ] テストとドキュメント

### フェーズ6: ツール整備 ⏳

- [x] CLI 実装（基本機能）
- [ ] 追加機能（デバッグ情報、最適化など）

**合計テスト数**: 195テスト（全て通過）

## 技術スタック

- **言語**: TypeScript
- **パーサー**: Chevrotain
- **テスト**: Vitest
- **CLI**: Commander.js
- **ビルド**: TypeScript Compiler (tsc)

## ドキュメント

- [言語仕様](docs/kue_lang_spec.md)
- [アセンブリ仕様](docs/kue_asm_spec.md)
- [実装計画](plan.md)

## ライセンス

MIT

## 参考資料

- KUE-CHIP2 教育用ボード リファレンスマニュアル（京都高度技術研究所, 1993年）
- KUE-CHIP2 設計ドキュメント（神原弘之他, 1993年）
