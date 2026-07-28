const mongoose = require("mongoose");
const { models } = require("../models");
const { readFilter, assertWrite } = require("../middleware/policy");
const { asyncHandler, HttpError } = require("../middleware/error");
const { emitChange } = require("../realtime");

const OID = mongoose.Types.ObjectId;

const toId = (value) => (OID.isValid(String(value)) ? new OID(String(value)) : value);

/** Maps the public column name to the stored one. */
const col = (name) => (name === "id" ? "_id" : name);

function castValue(column, value) {
  if (column === "id" || column.endsWith("_id_oid")) return toId(value);
  return value;
}

function buildCondition(op, column, value) {
  const field = col(column);
  const v = column === "id" ? toId(value) : value;
  switch (op) {
    case "eq":
      return { [field]: v };
    case "neq":
      return { [field]: { $ne: v } };
    case "gt":
      return { [field]: { $gt: v } };
    case "gte":
      return { [field]: { $gte: v } };
    case "lt":
      return { [field]: { $lt: v } };
    case "lte":
      return { [field]: { $lte: v } };
    case "in":
      return { [field]: { $in: (Array.isArray(v) ? v : [v]).map((x) => castValue(column, x)) } };
    case "is":
      return { [field]: v === null ? { $in: [null, undefined] } : v };
    case "like":
      return { [field]: new RegExp(String(v).replace(/%/g, ".*")) };
    case "ilike":
      return { [field]: new RegExp(String(v).replace(/%/g, ".*"), "i") };
    default:
      throw new HttpError(400, `Unsupported filter operator "${op}"`);
  }
}

/** Parses PostgREST-style `or` strings, e.g. and(a.eq.1,b.eq.2),c.eq.3 */
function parseOr(expression) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of expression) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);

  return {
    $or: parts.map((part) => {
      const trimmed = part.trim();
      if (trimmed.startsWith("and(")) {
        const inner = trimmed.slice(4, -1);
        return { $and: parseOr(inner).$or };
      }
      const [column, op, ...rest] = trimmed.split(".");
      return buildCondition(op, column, rest.join("."));
    }),
  };
}

function buildFilter(filters = []) {
  const conditions = filters.map((f) =>
    f.op === "or" ? parseOr(f.value) : buildCondition(f.op, f.column, f.value),
  );
  return conditions.length ? { $and: conditions } : {};
}

function buildProjection(columns) {
  if (!columns || columns === "*" || columns.includes("*")) return null;
  const projection = {};
  columns
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .forEach((c) => {
      projection[col(c)] = 1;
    });
  return projection;
}

const serialize = (doc) => {
  if (!doc) return doc;
  const obj = doc.toJSON ? doc.toJSON() : { ...doc };
  if (obj._id !== undefined) {
    obj.id = String(obj._id);
    delete obj._id;
  }
  return obj;
};

function getModel(table) {
  const model = models[table];
  if (!model) throw new HttpError(404, `Unknown table "${table}"`);
  return model;
}

/**
 * Single generic data endpoint used by the frontend data client.
 * Every request is scoped by the access policy for the table.
 */
const runQuery = asyncHandler(async (req, res) => {
  const {
    table,
    action = "select",
    columns = "*",
    filters = [],
    order = [],
    limit,
    single,
    count,
    head,
    values,
    onConflict,
  } = req.body || {};

  const Model = getModel(table);
  const requested = buildFilter(filters);

  if (action === "select") {
    const scope = await readFilter(table, req.user);
    const where = { $and: [requested, scope].filter((c) => Object.keys(c).length) };
    const finalWhere = where.$and.length ? where : {};

    if (head && count) {
      const total = await Model.countDocuments(finalWhere);
      return res.json({ data: null, count: total, error: null });
    }

    let query = Model.find(finalWhere, buildProjection(columns));
    if (order.length) {
      const sort = {};
      order.forEach((o) => {
        sort[col(o.column)] = o.ascending === false ? -1 : 1;
      });
      query = query.sort(sort);
    }
    if (limit) query = query.limit(Number(limit));
    if (single) query = query.limit(single === "maybe" ? 1 : 2);

    const docs = await query.lean();
    const rows = docs.map(serialize);

    if (single) {
      if (rows.length === 0) {
        if (single === "maybe") return res.json({ data: null, error: null });
        throw new HttpError(406, "No rows found");
      }
      return res.json({ data: rows[0], error: null });
    }

    const total = count ? await Model.countDocuments(finalWhere) : undefined;
    return res.json({ data: rows, count: total, error: null });
  }

  if (action === "insert" || action === "upsert") {
    const rows = Array.isArray(values) ? values : [values];
    for (const row of rows) await assertWrite(table, req.user, "insert", row);

    let inserted;
    if (action === "upsert" && onConflict) {
      const keys = onConflict.split(",").map((k) => k.trim());
      inserted = [];
      for (const row of rows) {
        const match = {};
        keys.forEach((k) => {
          match[col(k)] = row[k];
        });
        const doc = await Model.findOneAndUpdate(
          match,
          { $set: row },
          { new: true, upsert: true, setDefaultsOnInsert: true },
        ).lean();
        inserted.push(serialize(doc));
      }
    } else {
      const docs = await Model.insertMany(rows);
      inserted = docs.map(serialize);
    }

    emitChange(table, "INSERT", inserted);
    return res.json({ data: single ? inserted[0] : inserted, error: null });
  }

  if (action === "update") {
    await assertWrite(table, req.user, "update", { ...values, __match: flatten(requested) });
    const scope = await readFilter(table, req.user);
    const where = { $and: [requested, scope].filter((c) => Object.keys(c).length) };
    await Model.updateMany(where.$and.length ? where : {}, { $set: values });
    const docs = await Model.find(where.$and.length ? where : {}).lean();
    const rows = docs.map(serialize);
    emitChange(table, "UPDATE", rows);
    return res.json({ data: single ? (rows[0] ?? null) : rows, error: null });
  }

  if (action === "delete") {
    await assertWrite(table, req.user, "delete", { __match: flatten(requested) });
    const scope = await readFilter(table, req.user);
    const where = { $and: [requested, scope].filter((c) => Object.keys(c).length) };
    const finalWhere = where.$and.length ? where : {};
    const docs = await Model.find(finalWhere).lean();
    await Model.deleteMany(finalWhere);
    const rows = docs.map(serialize);
    emitChange(table, "DELETE", rows);
    return res.json({ data: rows, error: null });
  }

  throw new HttpError(400, `Unsupported action "${action}"`);
});

/** Flattens a { $and: [{a:1}] } filter into { a: 1 } for policy checks. */
function flatten(filter) {
  const out = {};
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      if (key === "$and" && Array.isArray(value)) value.forEach(walk);
      else if (!key.startsWith("$")) out[key === "_id" ? "id" : key] = value;
    }
  };
  walk(filter);
  return out;
}

module.exports = { runQuery, getModel, serialize, buildFilter, buildProjection };
