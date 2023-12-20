require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const processDataRoutes = require("./routes/process-data");
const connectToMongo = require("./config/mongo");
const { cronJobProcess, runProcessWithName } = require("./controllers/cronjob");
const telegramBot = require("./controllers/telegram-bot");
const app = express();
const cron = require("node-cron");
const { ProcessDataModel } = require("./models/process-data");
const { ProcessLogModel } = require("./models/process-log");

async function startApp() {
  const connection = await connectToMongo(process.env.MONGO_URI);
  
  const processLogModel = ProcessLogModel(connection);
  const data = await processLogModel.create({ createdAt: new Date() });
  console.log(data._id.toString(), "4adfkj");


  app.listen(process.env.PORT, () => {
    console.log(`Server running at http://localhost:${process.env.PORT}`);
  });

  app.use(express.static("public"));
  //app.use(express.static(path.join(__dirname, 'public')));
  app.get("/detail/:id", (req, res) => {
    const detailId = req.params.id;
    console.log(detailId, "detailId");
    // Render your HTML file with the detailId
    res.sendFile(path.join(__dirname, "public", "detail.html"));
  });
  app.get("/api/detail/:id", async (req, res) => {
    const detailId = req.params.id;

    const processLogModel = ProcessLogModel(connection);
    const data = await processLogModel.find({ _id: detailId });
    console.log(data, "39ruafhaksdh");

    res.json(data);
  });

  app.get("/api/data", async (req, res) => {
    try {
      res.json({});
    } catch (error) {
      res.status(404).json({ error: "Không thể lấy dữ liệu từ API" });
    }
  });

  app.use(bodyParser.json());

  app.use("/api/process", processDataRoutes);

  // Init telegram bot
  const bot = await telegramBot.init();
  bot.on("message", async (ctx) => {
    console.log(ctx?.update?.message?.chat?.id, "ctxctx");
    const ProcessDataModelWithConnection = ProcessDataModel(connection);
    // Check command run process
    const msg = ctx?.update?.message?.text;
    if (msg?.trim() === "/runall") {
      cronJobProcess(connection);
    } else if (msg?.substring(0, 5) == "/run:") {
      runProcessWithName(msg?.substring(5).trim(), connection);
    } else if (msg?.substring(0, 5) === "/list") {
      const allProcessData = await ProcessDataModelWithConnection.find({});
      const processNames = allProcessData.map((item) => item.name);
      const emoji = "⚙️";
      const replyMessage = processNames
        .map((name) => emoji + " " + name)
        .join("\n");
      await ctx.replyWithHTML(replyMessage);
    } else if (msg?.substring(0, 5) === "/help") {
      const emojiList = "📊";
      const emojiRun = "🚀";
      const emojiHelp = "👽";
      const replyMessage = `<b>List of available commands:</b>\n\n`;
      const listCommand = `${emojiList} <b>/list:</b> Display all available processes\n`;
      const runCommand = `${emojiRun} <b>/run:{process}</b> Run a specific process\n`;
      const helpCommand = `${emojiHelp} <b>/help:</b> Show available commands and their usage\n`;

      await ctx.replyWithHTML(
        replyMessage + listCommand + runCommand + helpCommand
      );
    }
  });

  //  await test();
  cron.schedule("*/15 * * * *", async () => {
    // await cronJobProcess(connection);
  });
}

module.exports = { startApp };
