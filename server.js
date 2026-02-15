const express = require("express");
const cors = require("cors");
const fs = require("fs-extra");

const app = express();

app.use(cors());
app.use(express.json());

const DB_FILE = "commands.json";

// Ensure DB file exists
if (!fs.existsSync(DB_FILE)) fs.writeJsonSync(DB_FILE, []);

app.post("/command", async (req, res) => {
    const { command } = req.body;

    let action = "Command not recognized";

    if (command.includes("open")) action = "Prosthetic Hand Opening";
    else if (command.includes("close")) action = "Prosthetic Hand Closing";

    // Save command history
    const history = await fs.readJson(DB_FILE);
    history.push(command + " - " + new Date().toLocaleTimeString());
    await fs.writeJson(DB_FILE, history);

    res.json({ action });
});

app.get("/history", async (req, res) => {
    const history = await fs.readJson(DB_FILE);
    res.json(history);
});

app.listen(5001, () => console.log("Server running on port 5001"));