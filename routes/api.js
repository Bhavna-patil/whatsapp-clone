const express = require("express");
const fs = require("fs");
const path = require("path");
const Message = require("../models/message");
const router = express.Router();

router.get("/process", async (req, res) => {
  try {
    const payloadDir = path.join(__dirname, "..", "payloads");
    const files = fs.readdirSync(payloadDir);

    for (let file of files) {
      const filePath = path.join(payloadDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const json = JSON.parse(content);

      const entry = json.metaData?.entry?.[0]?.changes?.[0]?.value;

      if (!entry?.messages && !entry?.statuses) continue;

      // Process messages
      if (entry.messages) {
        for (let msg of entry.messages) {
          await Message.findOneAndUpdate(
            { msg_id: msg.id },
            {
              wa_id: entry.contacts?.[0]?.wa_id || "unknown",
              user_name: entry.contacts?.[0]?.profile?.name || "Unknown",
              message: msg.text?.body || "Media/Unsupported",
              timestamp: new Date(msg.timestamp * 1000),
              status: "sent",
              msg_id: msg.id,
            },
            { upsert: true, new: true }
          );
        }
      }

      // Process status updates
      if (entry.statuses) {
        for (let stat of entry.statuses) {
          const msgId = stat.id || stat.meta?.message_id;
          await Message.findOneAndUpdate(
            { msg_id: msgId },
            { status: stat.status }
          );
        }
      }
    }

    res.send("✅ All payloads processed and stored/updated in MongoDB.");
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).send("Server error.");
  }
});


// List all conversations grouped by wa_id
router.get("/", async (req, res) => {
  const chats = await Message.aggregate([
    {
      $group: {
        _id: "$wa_id",
        name: { $first: "$user_name" },
        lastMessage: { $last: "$message" },
        lastTimestamp: { $last: "$timestamp" }
      }
    },
    { $sort: { lastTimestamp: -1 } }
  ]);

  res.render("index", { chats });
});

// Chat view for a specific user
router.get("/chat/:wa_id", async (req, res) => {
  const wa_id = req.params.wa_id;
  const messages = await Message.find({ wa_id }).sort({ timestamp: 1 });
  const user = messages[0];

  res.render("chat", {
    userName: user?.user_name || "Unknown",
    wa_id,
    messages
  });
});

router.post("/send/:wa_id", async (req, res) => {
  const wa_id = req.params.wa_id;
  const { message } = req.body;

  if (!message || message.trim() === "") {
    return res.redirect(`/chat/${wa_id}`);
  }

  const newMessage = await Message.create({
    wa_id,
    user_name: "You", // or "Me", for local-sent messages
    message,
    timestamp: new Date(),
    status: "sent",
    msg_id: `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  });

  req.io.to(wa_id).emit("newMessage", newMessage);

  res.redirect(`/chat/${wa_id}`);
});

module.exports = router;