const express = require("express");
const bodyParser = require("body-parser");
const processDataRoutes = require("./routes/process-data");
const connectToMongo = require("./config/mongo");
const { cronJobProcess, runProcessWithName } = require("./controllers/cronjob");
const telegramBot = require("./controllers/telegram-bot");
const app = express();
const cron = require("node-cron");
const { ProcessDataModel } = require("./models/process-data");

async function startApp() {
  await connectToMongo();

  app.listen(process.env.PORT, () => {
    console.log(`Server running at http://localhost:${process.env.PORT}`);
  });

  app.use(bodyParser.json());

  app.use("/api/process", processDataRoutes);

  // Init telegram bot
  const bot = await telegramBot.init();
  bot.on("message", async (ctx) => {
    // Check not response if using from other group
    if (
      String(ctx?.update?.message?.chat?.id) !== process.env.TELEGRAM_GROUP_ID
    ) {
      return;
    }

    // Check command run process
    const msg = ctx?.update?.message?.text;
    if (msg.substring(0, 4) == "run:") {
      await runProcessWithName(msg.substring(4));
    } else if (msg.substring(0, 5) === "list:") {
      const allProcessData = await ProcessDataModel.find({});
      const processNames = allProcessData.map((item) => item.name);
      const emoji = "⚙️";
      const replyMessage = processNames.map((name) => emoji + " " + name).join("\n");
      await ctx.replyWithHTML(replyMessage);
    } else if (msg.substring(0, 5) === "help:") {
      const emojiList = "📊";
      const emojiRun = "🚀";
      const emojiHelp = "👽";
      const replyMessage = `<b>List of available commands:</b>\n\n`;
      const listCommand = `${emojiList} <b>list:</b> Display all available processes\n`;
      const runCommand = `${emojiRun} <b>run:{process}</b> Run a specific process\n`;
      const helpCommand = `${emojiHelp} <b>help:</b> Show available commands and their usage\n`;
    
      await ctx.replyWithHTML(replyMessage + listCommand + runCommand + helpCommand);
    }
  });

  //  await test();
  cron.schedule("* * * * *", async () => {
    //await cronJobProcess();
  });
}

module.exports = { startApp };
