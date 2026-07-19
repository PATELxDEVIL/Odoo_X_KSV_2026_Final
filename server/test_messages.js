const mongoose = require('mongoose');
const Message = require('./models/Message');
const User = require('./models/User');
require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const msgs = await Message.find().populate('senderId', 'firstName lastName avatar').limit(1);
  if (msgs.length > 0) {
    console.log("senderId object:", JSON.stringify(msgs[0].senderId));
    console.log("m.senderId._id type:", typeof msgs[0].senderId._id);
    console.log("JSON.stringify output of _id:", JSON.stringify(msgs[0].senderId._id));
  } else {
    console.log("No messages");
  }
  process.exit(0);
}

test().catch(console.error);
