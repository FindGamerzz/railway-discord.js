require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    REST,
    Routes
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const commands = [];
const commandFiles = fs
    .readdirSync(path.join(__dirname, "commands"))
    .filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);

    if ("data" in command && "execute" in command) {
        commands.push(command);
    } else {
        console.log(`[WARNING] ${file} is missing data or execute.`);
    }
}

client.once("clientReady", async () => {
    console.log(`Logged in as ${client.user.tag}`);

    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

    try {
        console.log(`Registering ${commands.length} slash commands...`);

        await rest.put(
            Routes.applicationCommands(client.user.id),
            {
                body: commands.map(command => command.data.toJSON())
            }
        );

        console.log("Slash commands registered successfully.");
    } catch (error) {
        console.error(error);
    }
});

client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.find(
        command => command.data.name === interaction.commandName
    );

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: "❌ Something went wrong while running this command.",
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: "❌ Something went wrong while running this command.",
                ephemeral: true
            });
        }
    }
});

if (!process.env.TOKEN) {
    console.error("Error: Discord bot token is not defined.");
    process.exit(1);
}

client.login(process.env.TOKEN);
