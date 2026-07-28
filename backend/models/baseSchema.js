const { mongoose } = require("../config/db");

/**
 * Shared schema factory.
 * - `id` is exposed as a string (mirrors the previous uuid primary keys)
 * - createdAt/updatedAt are mapped to created_at/updated_at
 */
function makeSchema(definition, options = {}) {
  const schema = new mongoose.Schema(definition, {
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
  });
  return schema;
}

module.exports = { makeSchema, mongoose };
