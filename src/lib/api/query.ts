import { request } from "./http";

type Filter = { op: string; column?: string; value: any };
type Order = { column: string; ascending: boolean };

interface QueryState {
  table: string;
  action: "select" | "insert" | "update" | "delete" | "upsert";
  columns: string;
  filters: Filter[];
  order: Order[];
  limit?: number;
  single?: "one" | "maybe";
  count?: boolean;
  head?: boolean;
  values?: any;
  onConflict?: string;
}

/**
 * Chainable, awaitable query builder that talks to POST /api/query.
 * Mirrors the subset of the previous client's surface used by the app,
 * so no component code needs to change.
 */
class QueryBuilder implements PromiseLike<any> {
  private state: QueryState;

  constructor(table: string) {
    this.state = { table, action: "select", columns: "*", filters: [], order: [] };
  }

  select(columns = "*", options?: { count?: "exact"; head?: boolean }) {
    if (this.state.action === "select") this.state.columns = columns;
    if (options?.count) this.state.count = true;
    if (options?.head) this.state.head = true;
    return this;
  }

  insert(values: any) {
    this.state.action = "insert";
    this.state.values = values;
    return this;
  }

  upsert(values: any, options?: { onConflict?: string }) {
    this.state.action = "upsert";
    this.state.values = values;
    this.state.onConflict = options?.onConflict;
    return this;
  }

  update(values: any) {
    this.state.action = "update";
    this.state.values = values;
    return this;
  }

  delete() {
    this.state.action = "delete";
    return this;
  }

  eq(column: string, value: any) {
    this.state.filters.push({ op: "eq", column, value });
    return this;
  }
  neq(column: string, value: any) {
    this.state.filters.push({ op: "neq", column, value });
    return this;
  }
  gt(column: string, value: any) {
    this.state.filters.push({ op: "gt", column, value });
    return this;
  }
  gte(column: string, value: any) {
    this.state.filters.push({ op: "gte", column, value });
    return this;
  }
  lt(column: string, value: any) {
    this.state.filters.push({ op: "lt", column, value });
    return this;
  }
  lte(column: string, value: any) {
    this.state.filters.push({ op: "lte", column, value });
    return this;
  }
  in(column: string, values: any[]) {
    this.state.filters.push({ op: "in", column, value: values });
    return this;
  }
  is(column: string, value: any) {
    this.state.filters.push({ op: "is", column, value });
    return this;
  }
  like(column: string, value: string) {
    this.state.filters.push({ op: "like", column, value });
    return this;
  }
  ilike(column: string, value: string) {
    this.state.filters.push({ op: "ilike", column, value });
    return this;
  }
  or(expression: string) {
    this.state.filters.push({ op: "or", value: expression });
    return this;
  }
  match(criteria: Record<string, any>) {
    Object.entries(criteria).forEach(([column, value]) =>
      this.state.filters.push({ op: "eq", column, value }),
    );
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.state.order.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  limit(value: number) {
    this.state.limit = value;
    return this;
  }

  single() {
    this.state.single = "one";
    return this;
  }

  maybeSingle() {
    this.state.single = "maybe";
    return this;
  }

  private run() {
    return request("/api/query", { method: "POST", body: this.state });
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.run().then(onfulfilled as any, onrejected as any);
  }

  catch(onrejected?: (reason: any) => any) {
    return this.run().catch(onrejected);
  }

  finally(onfinally?: () => void) {
    return this.run().finally(onfinally);
  }
}

export const from = (table: string) => new QueryBuilder(table);

/** Server-side procedure call (replaces the old database functions). */
export const rpc = (name: string, args?: Record<string, any>) =>
  request(`/api/rpc/${name}`, { method: "POST", body: args || {} });
