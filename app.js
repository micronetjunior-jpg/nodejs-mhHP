import express from "express";
import fetch from "node-fetch";
import { initMediasoup, createAnswerFromOffer } from "mediasoup.js";
import "dotenv/config";

const app = express();
app.use(express.json());

await initMediasoup(process.env.PUBLIC_IP);

app.post("/webhook", async (req, res) => {
  try {
    const change = req.body.entry?.[0]?.changes?.[0]?.value;
    const call = change?.calls?.[0];

    if (!call || call.event !== "connect") {
      return res.sendStatus(200);
    }

    console.log("📞 Incoming call", call.id);

    const sdpOffer = call.session.sdp;

    const sdpAnswer = await createAnswerFromOffer(
      sdpOffer,
      process.env.PUBLIC_IP
    );

    const url = `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/calls/${call.id}`;

    const metaResp = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.META_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        sdp_type: "answer",
        sdp: sdpAnswer
      })
    });

    const text = await metaResp.text();
    console.log("📡 Meta response:", text);

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error:", err);
    res.sendStatus(500);
  }
});

app.listen(process.env.PORT, () => {
  console.log("🚀 Server listening on", process.env.PORT);
});