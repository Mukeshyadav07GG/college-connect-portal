const crypto = require("crypto");
const { mongoose } = require("../config/db");

/**
 * Shared schema factory.
 * - `id` is exposed as a string (mirrors the previous uuid primary keys)
 * - createdAt/updatedAt are mapped to created_at/updated_at
 */
function makeSchema(definition, options = {}) {
  const schema = new mongoose.Schema(
    {
      // UUID string primary keys keep parity with the previous database,
      // so every existing foreign key value migrates unchanged.
      _id: { type: String, default: () => crypto.randomUUID() },
      ...definition,
    },
    {
      timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
      versionKey: false,
      toJSON: {
        virtuals: true,
        transform(_doc, ret) {
          ret.id = String(ret._id);
          delete ret._id;
          return ret;
        },
      },
      toObject: { virtuals: true },
      ...options,
    },
  );
  return schema;
}

module.exports = { makeSchema, mongoose };
