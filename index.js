const { Client, GatewayIntentBits, Partials, Events } = require('discord.js');
const { JSONTable } = require("good.db");
const db = new JSONTable('tables')
let wordTable = db.table('words', true, '..')


const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.AutoModerationConfiguration,
        GatewayIntentBits.AutoModerationExecution,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.GuildMember,
        Partials.Reaction,
        Partials.GuildScheduledEvent,
        Partials.User,
        Partials.ThreadMember
    ],
    shards: "auto",
});

const prefix = '!';


client
    .on(Events.ClientReady, () => {
        console.log(`Logged in as ${client.user.tag}!`);
    })

    .on(Events.MessageCreate, async message => {
        if (!message.content.startsWith(prefix) || message.author.bot) return;
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        if (command == 'addword') {
            let msg1 = await message.reply({
                content: 'Send the message you want to associate with a word.'
            });
        
            const collectorFilter = m => m.author.id === message.author.id;
            const messageCollector = message.channel.createMessageCollector({ filter: collectorFilter, time: 60000 });
        
            let messageToSend = '';
            let replyMessage = '';
        
            messageCollector.on('collect', async collectedMessage => {
                if (!messageToSend) {
                    messageToSend = collectedMessage.content;
                    await msg1.edit({
                        content: 'Send the reply message for the word.'
                    });
                } else if (!replyMessage) {
                    replyMessage = collectedMessage.content;
                    messageCollector.stop();
                    msg1.edit({
                        content: 'Done setting the reply.'
                    });
                    
                    // Store the word and reply in your wordTable
                    wordTable.set(`${message.guild.id}..${messageToSend}`, replyMessage);
                }
                collectedMessage.delete();
            });
        
            messageCollector.on('end', collected => {
                // Collector ended
                if (collected.size === 0) {
                    msg1.edit({
                        content: 'No response received. The process has been cancelled.'
                    });
                }
            });
        }
        
        if (command == 'delete') {
            let words = wordTable.get(message.guild.id);
            let wordKeys = Object.keys(words);
            let startIndex = 0; 
            let wordsPerPage = 25;
    
           
            const updateDisplay = async () => {
                let displayedWords = wordKeys.slice(startIndex, startIndex + wordsPerPage).map((word) => (
                    {
                        label: word.toString(),
                        value: word.toString(),
                    }
                ));

                if (msg) {
                    await msg.edit({
                        content: 'Please enter a number of words you want to delete.',
                        components: [
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 3,
                                        custom_id: 'delete_word',
                                        options: displayedWords // Displayed words for selection
                                    }
                                ]
                            },
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 2,
                                        style: 2,
                                        label: '⬅️',
                                        custom_id: 'back',
                                        disabled: startIndex === 0 // Disable if at the beginning
                                    },
                                    {
                                        type: 2,
                                        style: 2,
                                        label: '➡️',
                                        custom_id: 'front',
                                        disabled: startIndex + wordsPerPage >= wordKeys.length // Disable if at the end
                                    }
                                ]
                            }
                        ]
                    });
                } else {
                    msg = await message.reply({
                        content: 'Please enter a number of words you want to delete.',
                        components: [
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 3,
                                        custom_id: 'delete_word',
                                        options: displayedWords // Displayed words for selection
                                    }
                                ]
                            },
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 2,
                                        style: 2,
                                        label: '⬅️',
                                        custom_id: 'back',
                                        disabled: startIndex === 0 // Disable if at the beginning
                                    },
                                    {
                                        type: 2,
                                        style: 2,
                                        label: '➡️',
                                        custom_id: 'front',
                                        disabled: startIndex + wordsPerPage >= wordKeys.length // Disable if at the end
                                    }
                                ]
                            }
                        ]
                    });
                }
            };

            let msg;

            await updateDisplay()

            const collector = msg.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.user.id === message.author.id) {
                    if (i.customId === 'back') {
                        startIndex = Math.max(startIndex - wordsPerPage, 0);
                        await updateDisplay();
                    } else if (i.customId === 'front') {
                        startIndex = Math.min(startIndex + wordsPerPage, wordKeys.length);
                        await updateDisplay();
                    }else if (i.customId === 'delete_word'){
                        wordTable.delete(`${message.guild.id}..${i.values[0]}`)
                        msg.delete()
                    }
                } else {
                    i.reply({ content: `This buttons not for you.`, ephemeral: true });
                }
            });
        }
    })
    .on(Events.MessageCreate, async message => {
        if (message.content.startsWith(prefix) || message.author.bot) return;
        if (wordTable.has(`${message.guild.id}..${message.content}`)) {
            message.reply(wordTable.get(`${message.guild.id}..${message.content}`)).catch()
        }
    })
    .login(process.env.token);
