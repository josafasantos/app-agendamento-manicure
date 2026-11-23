import { describe, it, expect } from "vitest";
import { calculateFinanceMetrics } from "./finance";
import type { Transaction } from "../types";

describe("Finance - Métricas Financeiras e Caixa", () => {
  it("deve retornar métricas zeradas quando não houver transações", () => {
    const metrics = calculateFinanceMetrics([], "2026-11-23");
    expect(metrics).toEqual({
      todayIncome: 0,
      monthIncome: 0,
      monthExpense: 0,
      netProfit: 0,
      pixTotal: 0,
      cardTotal: 0,
      cashTotal: 0
    });
  });

  it("deve somar faturamento de hoje, do mês e calcular lucro líquido", () => {
    const transactions: Transaction[] = [
      {
        id: "t1",
        date: "2026-11-23", // Hoje
        type: "income",
        amount: 160,
        category: "servico",
        paymentMethod: "pix",
        description: "Alongamento Fibra"
      },
      {
        id: "t2",
        date: "2026-11-23", // Hoje
        type: "income",
        amount: 90,
        category: "servico",
        paymentMethod: "cartao",
        description: "Banho de Gel"
      },
      {
        id: "t3",
        date: "2026-11-22", // Ontem (mesmo mês)
        type: "income",
        amount: 110,
        category: "servico",
        paymentMethod: "dinheiro",
        description: "Manutenção"
      },
      {
        id: "t4",
        date: "2026-11-20", // Despesa
        type: "expense",
        amount: 70,
        category: "insumo",
        paymentMethod: "pix",
        description: "Compra de lixas e géis"
      }
    ];

    const metrics = calculateFinanceMetrics(transactions, "2026-11-23");

    // Receita de hoje: 160 + 90 = 250
    expect(metrics.todayIncome).toBe(250);

    // Receita total do mês: 160 + 90 + 110 = 360
    expect(metrics.monthIncome).toBe(360);

    // Despesas do mês: 70
    expect(metrics.monthExpense).toBe(70);

    // Lucro líquido: 360 - 70 = 290
    expect(metrics.netProfit).toBe(290);

    // Distribuição por método de pagamento (apenas entradas):
    expect(metrics.pixTotal).toBe(160);
    expect(metrics.cardTotal).toBe(90);
    expect(metrics.cashTotal).toBe(110);
  });
});
