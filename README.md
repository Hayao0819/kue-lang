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

### フェーズ1: 基盤構築 🚧

- [ ] レキサー（字句解析器）
- [ ] パーサー（構文解析器）の骨組み

### フェーズ2: 基本機能 ⏳

- [ ] 変数宣言のパース
- [ ] 基本文のパース
- [ ] コード生成器の基礎

### フェーズ3: 演算と制御構造 ⏳

- [ ] 二項演算文
- [ ] 比較文
- [ ] 制御構造（loop, if, break, continue）

### フェーズ4: 高度な機能 ⏳

- [ ] 配列アクセス
- [ ] マクロシステム
- [ ] インラインアセンブリ

### フェーズ5: エラー処理と最適化 ⏳

- [ ] エラー処理の強化
- [ ] テストとドキュメント

### フェーズ6: ツール整備 ⏳

- [ ] CLI 実装
- [ ] 追加機能（デバッグ情報、最適化など）

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
