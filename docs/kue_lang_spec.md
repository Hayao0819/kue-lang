# KUE-DSL Language Specification v0.1.0

KUE-CHIP2アセンブリへトランスパイルする教育用DSL

## 目次

1. [概要](#概要)
2. [字句要素](#字句要素)
3. [変数宣言](#変数宣言)
4. [文](#文)
5. [演算子](#演算子)
6. [制御構造](#制御構造)
7. [マクロ](#マクロ)
8. [組み込み命令](#組み込み命令)
9. [インラインアセンブリ](#インラインアセンブリ)
10. [プログラム構造](#プログラム構造)
11. [コード生成規則](#コード生成規則)

---

## 概要

### 設計思想

- **文ファースト**: 式の評価ではなく、文の実行による副作用でプログラムを構成
- **三番地コード**: `dest = op1 operator op2` 形式のみサポート
- **明示的メモリ管理**: 変数のアドレスをプログラマが指定
- **構文糖衣**: KUE-CHIP2アセンブリの薄いラッパー

### 対象

- KUE-CHIP2教育用ボード
- 8ビットアキュムレータアーキテクチャ
- 512バイトメモリ空間（プログラム領域256B + データ領域256B）

---

## 字句要素

### コメント

```
// 行末までのコメント

/*
 * ブロックコメント
 * 複数行可能
 */
```

### 識別子

```
identifier := [a-zA-Z_][a-zA-Z0-9_]*
```

**規則**:

- 英字またはアンダースコアで始まる
- 英数字とアンダースコアを含む
- 予約語は使用不可

### 予約語

```
// キーワード
var loop if break continue macro asm goto

// 組み込み命令
halt nop input output set_carry_flag reset_carry_flag

// フラグ条件
ZERO NOT_ZERO NEGATIVE POSITIVE CARRY NOT_CARRY OVERFLOW
ZERO_OR_POSITIVE ZERO_OR_NEGATIVE
GTE LT GT LTE
NO_INPUT NO_OUTPUT
```

### リテラル

**10進数**:

```
123
0
255
```

**16進数**:

```
0x00
0x180
0xFF
```

**規則**:

- 8ビット範囲（0-255 / 0x00-0xFF）
- 16進数は`0x`プレフィックス必須
- 大文字小文字どちらでも可

### 区切り文字

```
{ } [ ] ( ) @ = ! : , 
```

### 演算子

```
// 算術演算
+ +c - -c

// 論理演算
& | ^

// シフト・ローテート
<< <<a >> >>a <<<a >>>a

// 比較演算
== != < > <= >=
```

---

## 変数宣言

### 構文

```
var <identifier> @ <address>
```

### 規則

1. **ファイル先頭でのみ宣言可能**
2. アドレスは16進数または10進数で指定
3. アドレス範囲:
   - データ領域: `0x100` - `0x1FF` (256-511)
   - プログラム領域での定数: `0x000` - `0x0FF` (0-255)
4. アドレスの重複チェックは**実装しない**（プログラマの責任）

### 例

```
var counter @ 0x180
var limit @ 0x181
var result @ 0x182
var flags @ 383      // 10進数も可（0x17F相当）
```

### 配列的な使用

変数宣言は単一アドレスを指すが、添字アクセスで連続領域を扱える:
```
var array @ 0x180

// 使用時
array[0]  // 0x180
array[1]  // 0x181
array[5]  // 0x185
```

---

## 文

KUE-DSLは以下の文で構成される:

### 代入文

**構文**:
```
<lvalue> = <rvalue>
```

**lvalue**:
```
<identifier>
<identifier> [ <index> ]
```

**rvalue**:
```
<identifier>
<identifier> [ <index> ]
<literal>
```

**index**:
```
<identifier>  // 変数
<literal>     // 定数
```

**例**:
```
foo = 42
foo = bar
foo = bar[2]
foo[3] = bar
foo[i] = bar[j]
```

**コード生成**:
```
foo = 42          →  LD ACC, 42
                     ST ACC, (180H)

foo = bar         →  LD ACC, (181H)
                     ST ACC, (180H)

foo = bar[2]      →  LD ACC, (183H)      // bar + 2
                     ST ACC, (180H)

foo[i] = bar      →  LD ACC, (181H)
                     LD IX, (182H)       // i
                     ST ACC, (IX+180H)   // foo baseアドレス

foo[i] = bar[j]   →  LD IX, (183H)       // j
                     LD ACC, (IX+181H)   // bar[j]
                     LD IX, (182H)       // i
                     ST ACC, (IX+180H)   // foo[i]
```

### 比較文

**構文**:
```
<operand> <comparison_op> <operand>
```

**comparison_op**:
```
==  !=  <  >  <=  >=
```

**operand**:
```
<identifier>
<identifier> [ <index> ]
<literal>
```

**例**:
```
foo == bar
foo < 10
counter >= limit
array[i] != 0
```

**コード生成**:
```
foo == bar        →  LD ACC, (180H)
                     CMP ACC, (181H)

foo < 10          →  LD ACC, (180H)
                     CMP ACC, 10

array[i] != 0     →  LD IX, (182H)       // i
                     LD ACC, (IX+180H)   // array[i]
                     CMP ACC, 0
```

**フラグとの対応**:

| 比較 | 真の時のフラグ | 偽の時のフラグ |
|------|---------------|---------------|
| `a == b` | `ZERO` | `NOT_ZERO` |
| `a != b` | `NOT_ZERO` | `ZERO` |
| `a < b` | `NEGATIVE` | `ZERO_OR_POSITIVE` |
| `a <= b` | `ZERO_OR_NEGATIVE` | `POSITIVE` |
| `a > b` | `POSITIVE` | `ZERO_OR_NEGATIVE` |
| `a >= b` | `ZERO_OR_POSITIVE` | `NEGATIVE` |

### 二項演算文

**構文**:
```
<lvalue> = <operand> <binary_op> <operand>
```

**binary_op**:
```
+     // ADD
+c    // ADC (Add with Carry)
-     // SUB
-c    // SBC (Subtract with Carry)
&     // AND
|     // OR
^     // EOR (XOR)
<<    // SLL (Shift Left Logical)
<<a   // SLA (Shift Left Arithmetic)
>>    // SRL (Shift Right Logical)
>>a   // SRA (Shift Right Arithmetic)
<<<   // RLL (Rotate Left Logical)
>>>   // RRL (Rotate Right Logical)
```

**例**:
```
result = foo + bar
result = foo +c bar    // キャリー付き加算
result = foo - 1
result = foo & 0x0F
result = foo << 1
result = foo >>a 1     // 算術右シフト
result = foo <<< 1     // 左ローテート
```

**コード生成**:
```
result = foo + bar  →  LD ACC, (180H)      // foo
                       ADD ACC, (181H)     // bar
                       ST ACC, (182H)      // result

result = foo +c bar →  LD ACC, (180H)
                       ADC ACC, (181H)
                       ST ACC, (182H)

result = foo << 1   →  LD ACC, (180H)
                       SLL ACC
                       ST ACC, (182H)

result = foo & 0x0F →  LD ACC, (180H)
                       AND ACC, 0FH
                       ST ACC, (182H)
```

**シフト・ローテートの注意**:

- 右オペランドは常に`1`（1ビットシフト）のみサポート
- 複数ビットシフトは複数回の演算で実現

---

## 制御構造

### ループ文

**構文**:
```
loop {
    <statements>
}
```

**規則**:
- 無限ループ
- `break`で脱出
- `continue`で次のイテレーションへ

**例**:
```
loop {
    counter = counter - 1
    counter == 0
    if ZERO {
        break
    }
}
```

**コード生成**:
```
loop {            →  __loop_start_1:
    // 処理           // 処理のコード
    break          →  BA __loop_end_1
}                  →  BA __loop_start_1
                     __loop_end_1:
```

### 条件分岐文

**構文**:
```
if <flag_condition> {
    <statements>
}
```

**flag_condition**:
```
ZERO              // ZF = 1
NOT_ZERO          // ZF = 0
NEGATIVE          // NF = 1
POSITIVE          // NF = 0 かつ ZF = 0
CARRY             // CF = 1
NOT_CARRY         // CF = 0
OVERFLOW          // VF = 1
ZERO_OR_POSITIVE  // NF = 0
ZERO_OR_NEGATIVE  // NF = 1 または ZF = 1
GTE               // NF = VF (Greater Than or Equal, signed)
LT                // NF ≠ VF (Less Than, signed)
GT                // ZF = 0 かつ NF = VF (Greater Than, signed)
LTE               // ZF = 1 または NF ≠ VF (Less Than or Equal, signed)
NO_INPUT          // IBUF_FLAG = 0
NO_OUTPUT         // OBUF_FLAG = 0
```

**例**:
```
foo == bar
if ZERO {
    // 等しい時の処理
}

foo < bar
if NEGATIVE {
    // foo < bar の時の処理
}
```

**コード生成**:
```
if ZERO {         →  BNZ __if_end_1      // NOT ZERO なら飛ばす
    // 処理           // 処理のコード
}                  →  __if_end_1:

if NEGATIVE {     →  BP __if_end_2       // POSITIVE なら飛ばす
    // 処理           // 処理のコード
}                  →  __if_end_2:
```

### break文

**構文**:
```
break
```

**規則**:
- `loop`内でのみ使用可能
- 最も内側のループから脱出

**コード生成**:
```
break  →  BA __loop_end_N  // 現在のループの終了ラベルへジャンプ
```

### continue文（オプション）

**構文**:
```
continue
```

**規則**:
- `loop`内でのみ使用可能
- 最も内側のループの先頭へ

**コード生成**:
```
continue  →  BA __loop_start_N  // 現在のループの開始ラベルへジャンプ
```

---

## マクロ

### 構文

**宣言**:
```
macro <identifier> {
    <statements>
}
```

**呼び出し**:
```
<identifier> !
```

### 規則
1. マクロは使用前に宣言されている必要がある
2. 引数なし
3. インライン展開される
4. スコープなし（全てグローバル）
5. ネストした呼び出し可能

### 例

**宣言**:
```
macro increment_counter {
    counter = counter + 1
}

macro print_and_increment {
    output
    increment_counter!
}
```

**使用**:
```
increment_counter!
print_and_increment!
```

**コード生成**:
```
// インライン展開
increment_counter!  →  LD ACC, (180H)
                       ADD ACC, 1
                       ST ACC, (180H)
```

---

## 組み込み命令

### 命令一覧

```
halt                  // HLT - プログラム停止
nop                   // NOP - 何もしない
input                 // IN  - IBUF → ACC
output                // OUT - ACC → OBUF
set_carry_flag        // SCF - CF = 1
reset_carry_flag      // RCF - CF = 0
```

### 例

```
input
counter = counter + 1
output
halt
```

### コード生成

```
halt              →  HLT
nop               →  NOP
input             →  IN
output            →  OUT
set_carry_flag    →  SCF
reset_carry_flag  →  RCF
```

---

## インラインアセンブリ

### 構文

```
asm {
    <任意のテキスト>
}
```

### 規則

1. ブロック内のテキストは**一切検証せず**そのまま出力
2. 空白・改行もそのまま保持
3. エスケープハッチとして使用

### 例

```
asm {
    LD ACC, (80H)
    ADD ACC, (81H)
    ST ACC, (82H)
}

asm {
    ; これは生のアセンブリコメント
    NOP
    NOP
}
```

### コード生成

```
asm {           →  LD ACC, (80H)
    LD ACC, (80H)  ADD ACC, (81H)
    ADD ACC, (81H) ST ACC, (82H)
    ST ACC, (82H)
}
```

---

## プログラム構造

### ファイル構成

```
<program> ::= <variable_section> <code_section>

<variable_section> ::= <variable_decl>*

<code_section> ::= (<statement> | <macro_decl>)*
```

### 規則

1. **変数宣言は必ずファイル先頭**
2. マクロ宣言と文は任意の順序
3. マクロは使用前に宣言されている必要がある

### 例

```
// ========================================
// 変数宣言セクション
// ========================================
var counter @ 0x180
var limit @ 0x181
var result @ 0x182

// ========================================
// マクロ定義
// ========================================
macro init {
    counter = 0
    limit = 10
}

macro print {
    output
}

// ========================================
// メインプログラム
// ========================================
init!

loop {
    print!
    counter = counter + 1
    
    counter == limit
    if ZERO {
        break
    }
}

halt
```

---

## コード生成規則

### アドレッシングモード

KUE-CHIP2のアドレッシングモードとの対応:

| DSL表記 | 意味 | アセンブリ | 説明 |
|---------|------|-----------|------|
| `foo` | 変数 | `(addr)` | データ領域の絶対アドレス |
| `foo[5]` | 定数添字 | `(addr+5)` | データ領域の絶対アドレス（オフセット付き） |
| `foo[i]` | 変数添字 | `(IX+addr)` | インデックス修飾アドレス |
| `42` | 即値 | `42` | 即値 |
| `0xFF` | 即値（16進） | `0FFH` | 即値（16進） |

### メモリアクセスパターン

**代入文**:
```
dest = src

// src が変数の場合
1. LD ACC, (src_addr)
2. ST ACC, (dest_addr)

// src が即値の場合
1. LD ACC, immediate
2. ST ACC, (dest_addr)

// dest が配列[定数]の場合
1. LD ACC, (src_addr)
2. ST ACC, (dest_addr + offset)

// dest が配列[変数]の場合
1. LD ACC, (src_addr)
2. LD IX, (index_addr)
3. ST ACC, (IX+dest_base_addr)
```

**二項演算**:
```
dest = op1 operator op2

1. LD ACC, (op1_addr)
2. OPERATION ACC, (op2_addr) または immediate
3. ST ACC, (dest_addr)
```

**比較**:
```
op1 compare_op op2

1. LD ACC, (op1_addr)
2. CMP ACC, (op2_addr) または immediate
// フラグがセットされる
```

### ラベル命名規則

自動生成ラベルの命名:
```
__loop_start_<N>   // ループ開始
__loop_end_<N>     // ループ終了
__if_end_<N>       // if文終了
```

- `<N>` は通し番号（1から開始）
- ネストしたループはそれぞれ別の番号を持つ

### アセンブリフォーマット

生成されるアセンブリコードの形式:
```
* 変数宣言（コメントのみ、コード生成なし）
* var counter @ 0x180
* var limit @ 0x181

* メインコード
    LD ACC, 0
    ST ACC, (180H)
    LD ACC, 10
    ST ACC, (181H)

__loop_start_1:
    LD ACC, (180H)
    ADD ACC, 1
    ST ACC, (180H)
    LD ACC, (180H)
    CMP ACC, (181H)
    BZ __loop_end_1
    BA __loop_start_1
__loop_end_1:
    HLT
```

---

## エラー処理

### コンパイル時エラー

実装が検出すべきエラー:

1. **構文エラー**
   - 不正なトークン
   - 文法違反

2. **セマンティックエラー**
   - 未定義変数の使用
   - 変数宣言がファイル先頭にない
   - 未定義マクロの呼び出し
   - `break`/`continue`がループ外

### エラーメッセージ例
```
Error: Undefined variable 'foo' at line 10, column 5
Error: Variable declaration must be at the beginning of file (line 15)
Error: 'break' statement outside of loop at line 20
Error: Unexpected token '=' at line 5, column 10
```

---

## 実装の推奨事項

### フェーズ分割

1. **字句解析 (Lexer)**
   - トークン化
   - コメント除去

2. **構文解析 (Parser)**
   - ASTの構築
   - 文法チェック

3. **意味解析 (Semantic Analyzer)**
   - 変数スコープチェック
   - 型チェック（アドレス範囲など）
   - マクロ展開

4. **コード生成 (Code Generator)**
   - ASTからアセンブリコードへの変換
   - ラベル解決
