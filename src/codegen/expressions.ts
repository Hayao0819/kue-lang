/**
 * 式（右辺値、オペランド）のコード生成
 */

import type { LValue, Operand, RValue } from "../ast/index.js";
import { formatDataAddress, generateArrayLoad, generateArrayStore, getVariableAddress } from "./utils.js";

/**
 * 右辺値のロード命令を生成
 */
export function generateLoad(rvalue: RValue, symbolTable: Map<string, number>): string {
  if (rvalue.type === "Literal") {
    // リテラル: LD ACC, <value>
    return `LD ACC, ${rvalue.value}`;
  } else if (rvalue.type === "Variable") {
    // 変数: LD ACC, (<address>)
    const address = getVariableAddress(rvalue.name, symbolTable);
    return `LD ACC, ${formatDataAddress(address)}`;
  } else if (rvalue.type === "ArrayAccess") {
    // 配列アクセス: array[index]
    return generateArrayLoad(rvalue, symbolTable);
  } else if (rvalue.type === "Register") {
    // レジスタ: LD ACC, IX または LD ACC, ACC（無操作）
    if (rvalue.name === "IX") {
      return `LD ACC, IX`;
    }
    // ACC = ACC は無操作だが、コメントとして出力
    return `* ACC = ACC (no operation)`;
  }
  const _exhaustive: never = rvalue;
  return _exhaustive;
}

/**
 * 左辺値のストア命令を生成
 * NOTE: レジスタへのストアはST命令では不可能（仕様上、STの第2オペランドはメモリアドレスのみ）
 *       レジスタへの代入は、LD命令または直接演算で行う
 */
export function generateStore(lvalue: LValue, symbolTable: Map<string, number>): string {
  if (lvalue.type === "Variable") {
    // 変数: ST ACC, (<address>)
    const address = getVariableAddress(lvalue.name, symbolTable);
    return `ST ACC, ${formatDataAddress(address)}`;
  } else if (lvalue.type === "ArrayAccess") {
    // 配列アクセス: array[index]
    return generateArrayStore(lvalue, symbolTable);
  } else if (lvalue.type === "Register") {
    // レジスタへのストアは、ST命令では実現できない
    // この関数が呼ばれる場合は、プログラミングエラー
    throw new Error(
      `Cannot use ST instruction to store to register ${lvalue.name}. ` +
        `Register operations should be handled by direct register instructions (LD, ADD, etc).`,
    );
  }
  const _exhaustive: never = lvalue;
  return _exhaustive;
}

/**
 * レジスタへのロード命令を生成
 * 特定のレジスタ(ACC or IX)にオペランドをロード
 */
export function generateRegisterLoad(operand: Operand, targetReg: string, symbolTable: Map<string, number>): string {
  if (operand.type === "Literal") {
    return `LD ${targetReg}, ${operand.value}`;
  } else if (operand.type === "Variable") {
    const address = getVariableAddress(operand.name, symbolTable);
    return `LD ${targetReg}, ${formatDataAddress(address)}`;
  } else if (operand.type === "ArrayAccess") {
    // 配列アクセスの場合、ACCにロードしてからターゲットレジスタに転送
    // ただし、ターゲットがACCならそのままロード
    if (targetReg === "ACC") {
      return generateArrayLoad(operand, symbolTable);
    }
    // IXの場合は、ACCを経由する必要がある（配列アクセスの結果はACCにロードされる）
    const lines: string[] = [];
    lines.push(generateArrayLoad(operand, symbolTable));
    lines.push(`LD ${targetReg}, ACC`);
    return lines.join("\n");
  } else if (operand.type === "Register") {
    if (operand.name === targetReg) {
      return `* ${targetReg} = ${targetReg} (no operation)`;
    }
    return `LD ${targetReg}, ${operand.name}`;
  }
  const _exhaustive: never = operand;
  return _exhaustive;
}

/**
 * オペランドのロード命令を生成
 */
export function generateOperandLoad(operand: Operand, symbolTable: Map<string, number>): string {
  if (operand.type === "Literal") {
    // リテラル: LD ACC, <value>
    return `LD ACC, ${operand.value}`;
  } else if (operand.type === "Variable") {
    // 変数: LD ACC, (<address>)
    const address = getVariableAddress(operand.name, symbolTable);
    return `LD ACC, ${formatDataAddress(address)}`;
  } else if (operand.type === "ArrayAccess") {
    // 配列アクセス: array[index]
    return generateArrayLoad(operand, symbolTable);
  } else if (operand.type === "Register") {
    // レジスタ: LD ACC, IX または LD ACC, ACC（無操作）
    if (operand.name === "IX") {
      return `LD ACC, IX`;
    }
    // ACC = ACC は無操作だが、コメントとして出力
    return `* ACC = ACC (no operation)`;
  }
  const _exhaustive: never = operand;
  return _exhaustive;
}
