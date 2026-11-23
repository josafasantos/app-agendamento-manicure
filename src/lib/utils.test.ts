import { describe, it, expect } from "vitest";
import { formatCurrency, formatPhone, cn } from "./utils";

describe("Utils - Funções Utilitárias", () => {
  describe("formatCurrency", () => {
    it("deve formatar valor numérico para moeda brasileira (BRL)", () => {
      const result = formatCurrency(160);
      // Remove espaços não separáveis comuns no Intl pt-BR
      const normalized = result.replace(/\u00a0/g, " ");
      expect(normalized).toBe("R$ 160,00");
    });

    it("deve formatar valores com centavos corretamente", () => {
      const result = formatCurrency(45.5);
      const normalized = result.replace(/\u00a0/g, " ");
      expect(normalized).toBe("R$ 45,50");
    });

    it("deve formatar zero reais", () => {
      const result = formatCurrency(0);
      const normalized = result.replace(/\u00a0/g, " ");
      expect(normalized).toBe("R$ 0,00");
    });
  });

  describe("formatPhone", () => {
    it("deve formatar telefone celular com 11 dígitos no padrão (DD) 9XXXX-XXXX", () => {
      expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
    });

    it("deve formatar telefone fixo com 10 dígitos no padrão (DD) XXXX-XXXX", () => {
      expect(formatPhone("1133334444")).toBe("(11) 3333-4444");
    });

    it("deve limpar caracteres não numéricos antes de formatar", () => {
      expect(formatPhone("(11) 9 8765-4321")).toBe("(11) 98765-4321");
    });

    it("deve retornar o valor original se não tiver 10 ou 11 dígitos", () => {
      expect(formatPhone("12345")).toBe("12345");
      expect(formatPhone("00000000000")).toBe("(00) 00000-0000");
    });
  });

  describe("cn (tailwind merge + clsx)", () => {
    it("deve mesclar classes condicionais e resolver conflitos do Tailwind", () => {
      const isSelected = true;
      const result = cn(
        "p-4 bg-white",
        isSelected && "bg-rose-50 text-rose-600",
        !isSelected && "bg-slate-50"
      );
      expect(result).toContain("p-4");
      expect(result).toContain("bg-rose-50");
      expect(result).toContain("text-rose-600");
      expect(result).not.toContain("bg-white");
    });
  });
});
