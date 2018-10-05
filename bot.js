const Discord = require("discord.js");
const fs = require("fs");
const config = require("./config.json");

const currentConfigVersion = 2;

const client = new Discord.Client();
client.commands = new Discord.Collection();
client.responses = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const responseFiles = fs.readdirSync('./responses').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

for (const file of responseFiles) {
    const response = require(`./responses/${file}`);
    for (const trigger of response.triggers) {
        client.responses.set(trigger, response);
    }
    client.responses.sort(function(a, b) {
        if (a.priority < b.priority) {
            return 1;
        } else if (a.priority === b.priority) {
            return 0;
        } else {
            return -1;
        }
    });
}

if (config.configVersion !== currentConfigVersion) {
    console.error("Config out of date! Please update and try again!");
    process.exit(1);
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity(config.prefix + 'help for a list of commands!');
});

client.on('message', message => {
    if (message.author.bot) return;

    const args = message.content.slice(config.prefix.length).split(/ +/);
    const commandName = args.shift().toLowerCase();

    let responded = false;
    client.responses.forEach(function(value, key) {
        if (message.content.toLowerCase().includes(key) && !responded) {
            if (Math.random() <= value.chance / 100) {
                value.execute(message);
                responded = true;
            }
        }
    });


    if (!message.content.startsWith(config.prefix)) return;

    const command = client.commands.get(commandName)
                || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    if (!command) return;

    if (command.args && !args.length) {
        return message.channel.send(`You didn't provide any arguments, ${message.author}`);
    }

    try {
        command.execute(message, args);
        if (message.guild !== null) {
            message.delete()
        }
    } catch (error) {
        console.error(error);
        message.reply('there was an error trying to execute that command!');
    }
});

client.on('voiceStateUpdate', (before, after) => {
    if (config.enableChatResponseFeatures) {
        let oldChannel = before.voiceChannelID;
        let newChannel = after.voiceChannelID;

        if (newChannel === config.voiceChannel) {
            try {
                after.addRole(config.textChannelRole);
            } catch (error) {
                if (config.debug) {
                    console.error(`An error occurred when adding the Text Channel Role to ${after.user.tag}`, error);
                } else {
                    console.error(`An error occurred when adding the Text Channel Role to ${after.user.tag}`);
                }
            }
        } else if (oldChannel === config.voiceChannel && newChannel !== config.voiceChannel) {
            try {
                after.removeRole(config.textChannelRole);
            } catch (error) {
                if (config.debug) {
                    console.error(`An error occurred when removing the Text Channel Role from ${after.user.tag}`, error);
                } else {
                    console.error(`An error occurred when adding the Text Channel Role from ${after.user.tag}`);
                }
            }
        }
    }
});

client.login(config.token);