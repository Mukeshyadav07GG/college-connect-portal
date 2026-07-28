const { makeSchema, mongoose } = require("./baseSchema");

const announcementSchema = makeSchema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  category: { type: String, default: "General" },
  created_by: { type: String, default: null },
});
const Announcement = mongoose.model("Announcement", announcementSchema, "announcements");

const eventSchema = makeSchema({
  title: { type: String, required: true },
  description: { type: String, default: null },
  event_date: { type: String, required: true },
  location: { type: String, default: null },
  category: { type: String, default: "Academic" },
});
const Event = mongoose.model("Event", eventSchema, "events");

module.exports = { Announcement, Event };
