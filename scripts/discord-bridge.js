
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

// --- configuration ---
const BOT_TOKEN = process.env.DISCORD_TOKEN || '';
const TARGET_CHANNEL_ID = process.env.TARGET_CHANNEL_ID || '1466141847914025022';
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/minecraft-events';
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.on('ready', () => {
    console.log(`[Bridge] Logged in as ${client.user.tag}!`);
});

async function forward(payload) {
    try {
        await axios.post(N8N_WEBHOOK_URL, payload);
        console.log(`[Bridge] Forwarded ${payload.type}: ${payload.player || payload.username || 'event'}`);
    } catch (err) {
        console.error('[Bridge] Forward failed:', err.message);
    }
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channelId !== TARGET_CHANNEL_ID) return;

    await forward({
        type: 'chat',
        player: message.author.username,
        message: message.content,
        timestamp: message.createdAt.toISOString(),
        online: true
    });
});

client.on('guildMemberAdd', async (member) => {
    await forward({
        type: 'join',
        player: member.user.username,
        message: 'joined the discord server',
        timestamp: new Date().toISOString(),
        online: true
    });
});

client.on('guildMemberRemove', async (member) => {
    await forward({
        type: 'leave',
        player: member.user.username,
        message: 'left the discord server',
        timestamp: new Date().toISOString(),
        online: true
    });
});

if (!BOT_TOKEN) {
    console.error('[Bridge] DISCORD_TOKEN not set in environment; cannot login');
    process.exit(1);
}

client.login(BOT_TOKEN);
