const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { distubeOptions } = require('./config/config.js');
const fs = require('fs');
const path = require('path');
const DisTube = require('distube');
const connectDB = require('./database');
const PlayerManager = require('./player/PlayerManager');
const { printWatermark } = require('./config/type.js');
const express = require('express');

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize other components
connectDB(); // Connect to the database
printWatermark(); // Print custom watermark or information

client.commands = new Collection();
client.playerManager = new PlayerManager(client, distubeOptions);
client.playerManager.distube.setMaxListeners(20);

// Load commands dynamically
const commandsPath = path.join(__dirname, './commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (!command.data || !command.data.name) {
    console.error(`⚠️ Skipping invalid command file: ${file}`);
    continue;
  }
  client.commands.set(command.data.name, command);
  console.log(`✅ Loaded command: ${command.data.name}`);
}

// Load events dynamically
const eventsPath = path.join(__dirname, './events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
  console.log(`✅ Loaded event: ${event.name}`);
}

// Setup Express server for status or other functionality
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Index file not found.');
  }
});

app.listen(port, () => {
  console.log(`🔗 Express server running at: http://localhost:${port}`);
});

// Login to Discord
if (!process.env.TOKEN) {
  console.error('❌ Bot token is not set in environment variables!');
  process.exit(1);
}

client.login(process.env.TOKEN).then(() => {
  console.log('✅ Bot logged in successfully.');
}).catch(err => {
  console.error('❌ Failed to log in:', err);
  process.exit(1);
});
