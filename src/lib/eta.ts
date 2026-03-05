type EtaInput = {
  etaDays: number;
  etaTargetDate: Date | null;
};

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * MILLISECONDS_PER_DAY);
}

export function getEtaDeltaDays(order: EtaInput): number {
  if (!order.etaTargetDate) {
    return order.etaDays;
  }

  return Math.ceil(
    (order.etaTargetDate.getTime() - Date.now()) / MILLISECONDS_PER_DAY,
  );
}

export function getRemainingEtaDays(order: EtaInput): number {
  return Math.max(0, getEtaDeltaDays(order));
}
