export const IGV = 0.18;

export function redondear(valor: number): number {
  return Number(valor.toFixed(2));
}

export function calcularTotales(subtotal: number): { subtotal: number; igv: number; total: number } {
  const sub = redondear(subtotal);
  const igv = redondear(sub * IGV);
  return { subtotal: sub, igv, total: redondear(sub + igv) };
}
