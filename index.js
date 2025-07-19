const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const express = require('express');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(port, () => console.log(`App listening on port ${port}`));

const shopsFile = './shops.json';
const cartFile = './cart.json';
const shopMessagesFile = './shopMessages.json';
const stockMessagesFile = './stockMessages.json';

const loadJSON = (file) => {
  try {
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : {};
  } catch (error) {
    console.error(`Error loading ${file}:`, error);
    return {};
  }
};

const saveJSON = (file, data) => {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error saving ${file}:`, error);
  }
};

let shops = loadJSON(shopsFile);
let cart = loadJSON(cartFile);
let shopMessages = loadJSON(shopMessagesFile);
let stockMessages = loadJSON(stockMessagesFile);

client.once('ready', () => {
  console.log(`Bot connected as ${client.user.tag}!`);
  console.log('Registering slash commands...');
  const commands = [
    new SlashCommandBuilder()
      .setName('createshop')
      .setDescription('Create a new shop')
      .addStringOption(option =>
        option.setName('name')
          .setDescription('Name of the shop')
          .setRequired(true)),
    new SlashCommandBuilder()
      .setName('addaccount')
      .setDescription('Add an account to a shop')
      .addStringOption(option =>
        option.setName('shop')
          .setDescription('Name of the shop')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('name')
          .setDescription('Name of the account')
          .setRequired(true))
      .addNumberOption(option =>
        option.setName('price')
          .setDescription('Price of the account')
          .setRequired(true))
      .addIntegerOption(option =>
        option.setName('quantity')
          .setDescription('Quantity available')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('description')
          .setDescription('Description of the account')
          .setRequired(true)),
    new SlashCommandBuilder()
      .setName('removeaccount')
      .setDescription('Remove an account from a shop')
      .addStringOption(option =>
        option.setName('shop')
          .setDescription('Name of the shop')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('name')
          .setDescription('Name of the account to remove')
          .setRequired(true)),
    new SlashCommandBuilder()
      .setName('shop')
      .setDescription('Display shop items and accounts')
      .addStringOption(option =>
        option.setName('name')
          .setDescription('Name of the shop')
          .setRequired(true)),
    new SlashCommandBuilder()
      .setName('cart')
      .setDescription('View your cart'),
  ];

  const rest = require('discord.js').REST;
  const routes = require('discord.js').Routes;
  const restClient = new rest({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  (async () => {
    try {
      await restClient.put(
        routes.applicationCommands(client.user.id),
        { body: commands }
      );
      console.log('Slash commands registered successfully!');
    } catch (error) {
      console.error('Error registering slash commands:', error);
    }
  })();
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand() && !interaction.isStringSelectMenu() && !interaction.isButton()) return;

  const userId = interaction.user.id;
  if (interaction.isCommand()) {
    const { commandName } = interaction;

    if (commandName === 'createshop') {
      const shopName = interaction.options.getString('name');
      if (shops[shopName]) {
        await interaction.reply({ content: `Shop "${shopName}" already exists!`, ephemeral: true });
        return;
      }
      shops[shopName] = { items: [], accounts: [] };
      saveJSON(shopsFile, shops);
      await interaction.reply({ content: `Shop "${shopName}" created successfully!`, ephemeral: true });
    }

    if (commandName === 'addaccount') {
      const shopName = interaction.options.getString('shop');
      const accountName = interaction.options.getString('name');
      const price = interaction.options.getNumber('price');
      const quantity = interaction.options.getInteger('quantity');
      const description = interaction.options.getString('description');

      if (!shops[shopName]) {
        await interaction.reply({ content: `Shop "${shopName}" does not exist!`, ephemeral: true });
        return;
      }

      shops[shopName].accounts.push({ name: accountName, price, quantity, description });
      saveJSON(shopsFile, shops);
      await interaction.reply({ content: `Account "${accountName}" added to "${shopName}"!`, ephemeral: true });
    }

    if (commandName === 'removeaccount') {
      const shopName = interaction.options.getString('shop');
      const accountName = interaction.options.getString('name');

      if (!shops[shopName]) {
        await interaction.reply({ content: `Shop "${shopName}" does not exist!`, ephemeral: true });
        return;
      }

      const accountIndex = shops[shopName].accounts.findIndex(acc => acc.name === accountName);
      if (accountIndex === -1) {
        await interaction.reply({ content: `Account "${accountName}" not found in "${shopName}"!`, ephemeral: true });
        return;
      }

      shops[shopName].accounts.splice(accountIndex, 1);
      saveJSON(shopsFile, shops);
      await interaction.reply({ content: `Account "${accountName}" removed from "${shopName}"!`, ephemeral: true });
    }

    if (commandName === 'shop') {
      const shopName = interaction.options.getString('name');
      if (!shops[shopName]) {
        await interaction.reply({ content: `Shop "${shopName}" does not exist!`, ephemeral: true });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`🛒 ${shopName}`)
        .setDescription('Browse items and accounts available in this shop.')
        .setColor('#0099ff');

      const itemOptions = shops[shopName].items.map(item => ({
        label: item.name,
        description: item.description || 'No description',
        value: `item_${item.name}`,
      }));

      const accountOptions = shops[shopName].accounts.map(account => ({
        label: account.name,
        description: `Price: $${account.price}, Stock: ${account.quantity}`,
        value: `account_${account.name}`,
      }));

      if (itemOptions.length > 0) {
        embed.addFields({ name: '📦 Available Items', value: itemOptions.map(opt => `- ${opt.label}`).join('\n') || 'None' });
      }
      if (accountOptions.length > 0) {
        embed.addFields({ name: '🏦 Available Accounts', value: accountOptions.map(opt => `- ${opt.label} ($${opt.description.split(', ')[0].split(': ')[1]})`).join('\n') || 'None' });
      }

      const components = [];
      if (itemOptions.length > 0) {
        components.push(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('select_item')
              .setPlaceholder('Select an item...')
              .addOptions(itemOptions)
          )
        );
      }
      if (accountOptions.length > 0) {
        components.push(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('select_account')
              .setPlaceholder('Select an account...')
              .addOptions(accountOptions)
          )
        );
      }

      components.push(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`add_to_cart_${shopName}`)
            .setLabel('Add to Cart')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`back_${shopName}`)
            .setLabel('Back')
            .setStyle(ButtonStyle.Secondary)
        )
      );

      const reply = await interaction.reply({ embeds: [embed], components, fetchReply: true });
      shopMessages[reply.id] = { shopName, userId };
      saveJSON(shopMessagesFile, shopMessages);

      setTimeout(async () => {
        try {
          await reply.edit({ components: [] });
          delete shopMessages[reply.id];
          saveJSON(shopMessagesFile, shopMessages);
        } catch (error) {
          console.error('Error disabling components:', error);
        }
      }, 30000);
    }

    if (commandName === 'cart') {
      const userCart = cart[userId] || [];
      const embed = new EmbedBuilder()
        .setTitle('🛍️ Your Cart')
        .setDescription(userCart.length > 0 ? userCart.map(item => `🏦 ${item.name} ($${item.price})`).join('\n') : 'Your cart is empty!')
        .setColor('#ff9900');

      const components = userCart.length > 0 ? [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('purchase')
            .setLabel('Purchase')
            .setStyle(ButtonStyle.Success)
        )
      ] : [];

      await interaction.reply({ embeds: [embed], components, ephemeral: true });
    }
  }

  if (interaction.isStringSelectMenu()) {
    const { customId, values } = interaction;
    const shopName = shopMessages[interaction.message.id]?.shopName;
    if (!shopName) {
      await interaction.reply({ content: 'This shop message is invalid or expired!', ephemeral: true });
      return;
    }

    if (customId === 'select_item' || customId === 'select_account') {
      const selectedValue = values[0];
      const isAccount = customId === 'select_account';
      const source = isAccount ? shops[shopName].accounts : shops[shopName].items;
      const item = source.find(i => `item_${i.name}` === selectedValue || `account_${i.name}` === selectedValue);

      if (!item) {
        await interaction.reply({ content: 'Item or account not found!', ephemeral: true });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`${isAccount ? '🏦' : '📦'} ${item.name}`)
        .setDescription(item.description || 'No description')
        .addFields(
          { name: 'Price', value: `$${item.price}`, inline: true },
          { name: 'Stock', value: `${item.quantity}`, inline: true }
        )
        .setColor(isAccount ? '#ff5555' : '#55ff55');

      const components = [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`add_to_cart_${shopName}_${item.name}_${isAccount ? 'account' : 'item'}`)
            .setLabel('Add to Cart')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`back_${shopName}`)
            .setLabel('Back')
            .setStyle(ButtonStyle.Secondary)
        )
      ];

      const reply = await interaction.update({ embeds: [embed], components, fetchReply: true });
      stockMessages[reply.id] = { shopName, userId, itemName: item.name, isAccount };
      saveJSON(stockMessagesFile, stockMessages);

      setTimeout(async () => {
        try {
          await reply.edit({ components: [] });
          delete stockMessages[reply.id];
          saveJSON(stockMessagesFile, stockMessages);
        } catch (error) {
          console.error('Error disabling components:', error);
        }
      }, 30000);
    }
  }

  if (interaction.isButton()) {
    const { customId } = interaction;
    if (customId.startsWith('add_to_cart_')) {
      const [, , shopName, itemName, type] = customId.split('_');
      const isAccount = type === 'account';
      const source = isAccount ? shops[shopName].accounts : shops[shopName].items;
      const item = source.find(i => i.name === itemName);

      if (!item || item.quantity <= 0) {
        await interaction.reply({ content: 'Item or account not available!', ephemeral: true });
        return;
      }

      if (!cart[userId]) cart[userId] = [];
      cart[userId].push({ name: item.name, price: item.price, shopName, isAccount });
      item.quantity -= 1;
      saveJSON(shopsFile, shops);
      saveJSON(cartFile, cart);
      await interaction.reply({ content: `${isAccount ? 'Account' : 'Item'} "${item.name}" added to your cart!`, ephemeral: true });
    }

    if (customId.startsWith('back_')) {
      const shopName = customId.split('_')[1];
      if (!shops[shopName]) {
        await interaction.reply({ content: `Shop "${shopName}" does not exist!`, ephemeral: true });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`🛒 ${shopName}`)
        .setDescription('Browse items and accounts available in this shop.')
        .setColor('#0099ff');

      const itemOptions = shops[shopName].items.map(item => ({
        label: item.name,
        description: item.description || 'No description',
        value: `item_${item.name}`,
      }));

      const accountOptions = shops[shopName].accounts.map(account => ({
        label: account.name,
        description: `Price: $${account.price}, Stock: ${account.quantity}`,
        value: `account_${account.name}`,
      }));

      if (itemOptions.length > 0) {
        embed.addFields({ name: '📦 Available Items', value: itemOptions.map(opt => `- ${opt.label}`).join('\n') || 'None' });
      }
      if (accountOptions.length > 0) {
        embed.addFields({ name: '🏦 Available Accounts', value: accountOptions.map(opt => `- ${opt.label} ($${opt.description.split(', ')[0].split(': ')[1]})`).join('\n') || 'None' });
      }

      const components = [];
      if (itemOptions.length > 0) {
        components.push(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('select_item')
              .setPlaceholder('Select an item...')
              .addOptions(itemOptions)
          )
        );
      }
      if (accountOptions.length > 0) {
        components.push(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('select_account')
              .setPlaceholder('Select an account...')
              .addOptions(accountOptions)
          )
        );
      }

      components.push(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`add_to_cart_${shopName}`)
            .setLabel('Add to Cart')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`back_${shopName}`)
            .setLabel('Back')
            .setStyle(ButtonStyle.Secondary)
        )
      );

      await interaction.update({ embeds: [embed], components });
    }

    if (customId === 'purchase') {
      const userCart = cart[userId] || [];
      if (userCart.length === 0) {
        await interaction.reply({ content: 'Your cart is empty!', ephemeral: true });
        return;
      }

      cart[userId] = [];
      saveJSON(cartFile, cart);
      await interaction.reply({ content: 'Purchase completed! Your cart has been cleared.', ephemeral: true });
    }
  }
});

if (!process.env.DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN is not defined in .env file');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
