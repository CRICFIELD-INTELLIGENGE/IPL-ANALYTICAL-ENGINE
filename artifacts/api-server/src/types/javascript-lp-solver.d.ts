declare module "javascript-lp-solver" {
  export interface LpConstraint {
    min?: number;
    max?: number;
    equal?: number;
  }
  export interface LpModel {
    optimize: string;
    opType: "max" | "min";
    constraints: Record<string, LpConstraint>;
    variables: Record<string, Record<string, number>>;
    ints?: Record<string, 1>;
    binaries?: Record<string, 1>;
    options?: { timeout?: number; tolerance?: number };
  }
  export interface LpResult {
    feasible: boolean;
    bounded?: boolean;
    result: number;
    [variable: string]: number | boolean | undefined;
  }
  const solver: { Solve(model: LpModel): LpResult };
  export default solver;
}
