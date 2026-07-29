import { getModel } from "../models/index.js";
import { HttpError } from "../middleware/error.js";
import { readScope, assertWrite, stripSensitive } from "../middleware/policy.js";
import { emitChange } from "../realtime.js";

const OPS = {
  eq: (v) => v,
  neq: (v) => ({ $ne: v }),
  gt: (v) => ({ $gt: v }),
  gte: (v) => ({ $gte: v }),
  lt: (v) => ({ $lt: v }),
  lte: (v) => ({ $lte: v }),
  in: (v) => ({ $in: Array.isArray(v) ? v : [v] }),
  like: (v) => ({ $regex: String(v).replace(/%/g, ".*") }),
  ilike: (v) => ({ $regex: String(v).replace(/%/g, ".*"), $options: "i" }),
  is: (v) => (v === null ? null : v),
  not: (v) => ({ $ne: v }),
};

const buildFilter = (filters = []) => {
  const query = {};
  const and = [];
  for (const f of filters) {
    if (f.op === "or") {
      // f.value: [{ column, op, value }, ...]
      and.push({ $or: f.value.map((c) => buildFilter([c])) });
      continue;
    }
    const fn = OPS[f.op] || OPS.eq;
    query[f.column] = fn(f.value);
  }
  if (and.length) query.$and = and;
  return query;
};

const projection = (columns) => {
  if (!columns || columns === "*") return undefined;
  const cols = String(columns)
    .split(",")
    .map((c) => c.trim().split(":")[0])
    .filter((c) => c && c !== "*" && !c.includes("("));
  if (!cols.length) return undefined;
  return cols.reduce((acc, c) => ({ ...acc, [c]: 1 }), { _id: 0 });
};

export const runQuery = async (req, res, next) => {
  try {
    const {
      table,
      action = "select",
      columns,
      filters = [],
      order = [],
      limit,
      range,
      values,
      single,
      onConflict,
      count,
    } = req.body || {};

    const Model = getModel(table);
    if (!Model) throw new HttpError(400, `Unknown table "${table}"`, "400");

    const user = req.user;
    let where = buildFilter(filters);

    if (action === "select") {
      const scope = readScope(table, user);
      where = { ...where, ...scope };
      let q = Model.find(where, projection(columns)).lean();
      for (const o of order) q = q.sort({ [o.column]: o.ascending === false ? -1 : 1 });
      if (range) q = q.skip(range[0]).limit(range[1] - range[0] + 1);
      else if (limit) q = q.limit(limit);
      let rows = await q.exec();
      rows = stripSensitive(table, user, rows);
      const total = count ? await Model.countDocuments(where) : null;
      if (single === "one" && rows.length !== 1)
        throw new HttpError(406, "Expected exactly one row", "PGRST116");
      const data = single ? rows[0] ?? null : rows;
      return res.json({ data, count: total });
    }

    const payloads = Array.isArray(values) ? values : [values];

    if (action === "insert" || action === "upsert") {
      assertWrite(table, user, action, payloads[0]);
      const out = [];
      for (const p of payloads) {
        if (action === "upsert" && onConflict) {
          const keys = String(onConflict).split(",").map((k) => k.trim());
          const key = keys.reduce((acc, k) => ({ ...acc, [k]: p[k] }), {});
          const doc = await Model.findOneAndUpdate(
            key,
            { $set: p },
            { new: true, upsert: true, setDefaultsOnInsert: true }
          ).lean();
          out.push(doc);
          emitChange(table, "UPDATE", doc);
        } else {
          const doc = (await Model.create(p)).toJSON();
          out.push(doc);
          emitChange(table, "INSERT", doc);
        }
      }
      return res.json({ data: single ? out[0] ?? null : out });
    }

    if (action === "update") {
      assertWrite(table, user, action, payloads[0]);
      const scope = readScope(table, user);
      const target = { ...where, ...scope };
      await Model.updateMany(target, { $set: payloads[0] });
      const rows = await Model.find(target).lean();
      rows.forEach((r) => emitChange(table, "UPDATE", r));
      return res.json({ data: single ? rows[0] ?? null : rows });
    }

    if (action === "delete") {
      assertWrite(table, user, action, null);
      const scope = readScope(table, user);
      const target = { ...where, ...scope };
      const rows = await Model.find(target).lean();
      await Model.deleteMany(target);
      rows.forEach((r) => emitChange(table, "DELETE", null, r));
      return res.json({ data: rows });
    }

    throw new HttpError(400, `Unknown action "${action}"`, "400");
  } catch (err) {
    next(err);
  }
};
