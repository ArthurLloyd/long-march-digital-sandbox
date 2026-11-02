/** Minimal navigation clock input. It carries no publication or review claims. */
export interface ClockPhase {
  phaseId: string;
  topicId: string;
  sequence: number;
}
export interface PhaseClockModel {
  topics: readonly { topicId: string }[];
  orders: ReadonlyMap<string, readonly ClockPhase[]>;
  key: string;
  error: string | null;
}
