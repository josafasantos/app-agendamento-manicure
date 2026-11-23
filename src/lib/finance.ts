import type { Transaction } from "../types";

export interface FinanceMetrics {
  todayIncome: number;
  monthIncome: number;
  monthExpense: number;
  netProfit: number;
  pixTotal: number;
  cardTotal: number;
  cashTotal: number;
}

export function calculateFinanceMetrics(
  transactions: Transaction[],
  todayStr: string
): FinanceMetrics {
  const todayTrans = transactions.filter((t) => t.date === todayStr);
  const todayIncome = todayTrans
    .filter((t) => t.type === "income")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const monthIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const monthExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const pixTotal = transactions
    .filter((t) => t.paymentMethod === "pix" && t.type === "income")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const cardTotal = transactions
    .filter((t) => (t.paymentMethod === "cartao" || (t.paymentMethod as string) === "card") && t.type === "income")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const cashTotal = transactions
    .filter((t) => (t.paymentMethod === "dinheiro" || (t.paymentMethod as string) === "cash") && t.type === "income")
    .reduce((acc, curr) => acc + curr.amount, 0);

  return {
    todayIncome,
    monthIncome,
    monthExpense,
    netProfit: monthIncome - monthExpense,
    pixTotal,
    cardTotal,
    cashTotal
  };
}
