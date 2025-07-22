require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, REST, Routes } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');

// Configuration Express pour Render
const app = express();
app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

const listener = app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
  console.log('Your app is listening on port ' + listener.address().port);
});

// Configuration Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ID du propriétaire
const OWNER_ID = process.env.OWNER_ID || 'TON_USER_ID_ICI';

// Fichiers de base de données
const SHOPS_FILE = 'shops.json';
const ACCOUNTS_FILE = 'accounts.json';
const CART_FILE = 'cart.json';
const SHOP_MESSAGES_FILE = 'shopMessages.json';
const STOCK_MESSAGES_FILE = 'stockMessages.json';
const TICKETS_FILE = 'tickets.json';

// ID des catégories
const CART_CATEGORY_ID = '1396197905244753941';
const TICKET_CATEGORY_ID = '1396197751083241533';

// Durées d'expiration
const CART_EXPIRATION_MS = 12 * 60 * 60 * 1000; // 12 heures
const TICKET_EXPIRATION_MS = 5 * 24 * 60 * 60 * 1000; // 5 jours
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Map pour stocker les timeouts des interactions
const interactionTimeouts = new Map();

// Utilitaires de fichiers
function loadData(filename) {
  try {
    if (!fs.existsSync(filename)) {
      fs.writeFileSync(filename, '{}');
    }
    const data = fs.readFileSync(filename, 'utf8');
    return JSON.parse(data || '{}');
  } catch (error) {
    console.error(`Error loading ${filename}:`, error);
    return {};
  }
}

function saveData(filename, data) {
  try {
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error saving ${filename}:`, error);
  }
}

// Vérification des expirations de panier
async function checkCartExpiration(guild) {
  const carts = loadData(CART_FILE);
  const shops = loadData(SHOPS_FILE);
  const accounts = loadData(ACCOUNTS_FILE);
  const currentTime = Date.now();

  for (const [userId, cart] of Object.entries(carts)) {
    if (!cart || !Array.isArray(cart) || cart.length === 0) continue;

    const timestamp = cart.timestamp || 0;
    if (currentTime - timestamp > CART_EXPIRATION_MS) {
      console.log(`Cart for user ${userId} has expired at ${new Date(currentTime).toLocaleString()}`);

      for (const item of cart) {
        if (item.type === 'account') {
          if (accounts[item.shop]?.[item.name]) {
            accounts[item.shop][item.name].quantity += item.quantity;
            console.log(`Restored ${item.quantity} to account stock for ${item.name} in ${item.shop}`);
          }
        } else {
          if (shops[item.shop]?.items[item.name]) {
            shops[item.shop].items[item.name].quantity += item.quantity;
            console.log(`Restored ${item.quantity} to item stock for ${item.name} in ${item.shop}`);
          }
        }
      }

      carts[userId] = [];
      saveData(CART_FILE, carts);
      saveData(SHOPS_FILE, shops);
      saveData(ACCOUNTS_FILE, accounts);

      const cartChannel = guild.channels.cache.find(ch => ch.name === `cart-${userId}`);
      if (cartChannel) {
        await updateCartDisplay(cartChannel, userId);
      }

      try {
        const user = await client.users.fetch(userId);
        await user.send(`❌ Your cart has been removed due to inactivity (12 hours) at ${new Date(currentTime).toLocaleString()}. Please add items again if needed.`);
        console.log(`Sent expiration DM to user ${userId} at ${new Date().toLocaleString()}`);
      } catch (error) {
        console.error(`Failed to send DM to user ${userId}:`, error);
      }
    }
  }
}

// Vérification des expirations de ticket
async function checkTicketExpiration(guild) {
  const tickets = loadData(TICKETS_FILE);
  const carts = loadData(CART_FILE);
  const shops = loadData(SHOPS_FILE);
  const accounts = loadData(ACCOUNTS_FILE);
  const currentTime = Date.now();

  for (const [userId, ticket] of Object.entries(tickets)) {
    const timestamp = ticket.timestamp || 0;
    if (currentTime - timestamp > TICKET_EXPIRATION_MS) {
      console.log(`Ticket for user ${userId} has expired at ${new Date(currentTime).toLocaleString()}`);

      const userCart = carts[userId] || [];
      for (const item of userCart) {
        if (item.type === 'account') {
          if (accounts[item.shop]?.[item.name]) {
            accounts[item.shop][item.name].quantity += item.quantity;
            console.log(`Restored ${item.quantity} to account stock for ${item.name} in ${item.shop}`);
          }
        } else {
          if (shops[item.shop]?.items[item.name]) {
            shops[item.shop].items[item.name].quantity += item.quantity;
            console.log(`Restored ${item.quantity} to item stock for ${item.name} in ${item.shop}`);
          }
        }
      }

      carts[userId] = [];
      saveData(CART_FILE, carts);
      saveData(SHOPS_FILE, shops);
      saveData(ACCOUNTS_FILE, accounts);

      const ticketChannel = guild.channels.cache.find(ch => ch.name === `ticket-${userId}`);
      if (ticketChannel) {
        await ticketChannel.delete().catch(error => console.error(`Error deleting ticket channel for ${userId}:`, error));
        console.log(`Ticket channel deleted for user ${userId} at ${new Date().toLocaleString()}`);
      }

      delete tickets[userId];
      saveData(TICKETS_FILE, tickets);

      const cartChannel = guild.channels.cache.find(ch => ch.name === `cart-${userId}`);
      if (cartChannel) {
        await updateCartDisplay(cartChannel, userId);
      }

      try {
        const user = await client.users.fetch(userId);
        await user.send(`❌ Your ticket has been closed due to inactivity (5 days) at ${new Date(currentTime).toLocaleString()}. Please create a new order if needed.`);
        console.log(`Sent ticket expiration DM to user ${userId} at ${new Date().toLocaleString()}`);
      } catch (error) {
        console.error(`Failed to send DM to user ${userId}:`, error);
      }
    }
  }
}

// Commandes slash
const commands = [
  new SlashCommandBuilder()
    .setName('createshop')
    .setDescription('Create a shop')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Shop name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('image')
        .setDescription('Shop image URL')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('deleteshop')
    .setDescription('Delete a shop')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Shop name')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('shoplist')
    .setDescription('List all shops'),

  new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Display a shop')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Shop name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('imageatthetop')
        .setDescription('Banner image URL for the top')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('additem')
    .setDescription('Add an item to a shop')
    .addStringOption(option =>
      option.setName('shop')
        .setDescription('Shop name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Item name')
        .setRequired(true))
    .addNumberOption(option =>
      option.setName('price')
        .setDescription('Item price')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('quantity')
        .setDescription('Stock quantity')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('image')
        .setDescription('Item image URL')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('addaccount')
    .setDescription('Add an account to a shop')
    .addStringOption(option =>
      option.setName('shop')
        .setDescription('Shop name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Account name')
        .setRequired(true))
    .addNumberOption(option =>
      option.setName('price')
        .setDescription('Account price')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('quantity')
        .setDescription('Stock quantity')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Account description')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('image1')
        .setDescription('Inventory image 1 URL (optional)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image2')
        .setDescription('Inventory image 2 URL (optional)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image3')
        .setDescription('Inventory image 3 URL (optional)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image4')
        .setDescription('Inventory image 4 URL (optional)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image5')
        .setDescription('Inventory image 5 URL (optional)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image6')
        .setDescription('Inventory image 6 URL (optional)')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('edititem')
    .setDescription('Edit an item')
    .addStringOption(option =>
      option.setName('shop')
        .setDescription('Shop name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Item name')
        .setRequired(true))
    .addNumberOption(option =>
      option.setName('price')
        .setDescription('New price')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('quantity')
        .setDescription('New quantity')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image')
        .setDescription('New image URL')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('removeitem')
    .setDescription('Remove an item')
    .addStringOption(option =>
      option.setName('shop')
        .setDescription('Shop name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Item name')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('deleteitem')
    .setDescription('Remove an item (alias)')
    .addStringOption(option =>
      option.setName('shop')
        .setDescription('Shop name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Item name')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('removeaccount')
    .setDescription('Remove an account')
    .addStringOption(option =>
      option.setName('shop')
        .setDescription('Shop name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Account name')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('itemstock')
    .setDescription('View stock overview'),

  new SlashCommandBuilder()
    .setName('accountstock')
    .setDescription('View account stock overview'),

  new SlashCommandBuilder()
    .setName('cart')
    .setDescription('Manage your cart'),

  new SlashCommandBuilder()
    .setName('setglobalimage')
    .setDescription('Set a global image for all shops')
    .addStringOption(option =>
      option.setName('image')
        .setDescription('Global image URL')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('editeditshop')
    .setDescription('Edit shop details')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Shop name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('image')
        .setDescription('New shop image URL')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('editaccount')
    .setDescription('Edit an account')
    .addStringOption(option =>
      option.setName('shop')
        .setDescription('Shop name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Account name')
        .setRequired(true))
    .addNumberOption(option =>
      option.setName('price')
        .setDescription('New price')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('quantity')
        .setDescription('New quantity')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('description')
        .setDescription('New description')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image1')
        .setDescription('New inventory image 1 URL')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image2')
        .setDescription('New inventory image 2 URL')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image3')
        .setDescription('New inventory image 3 URL')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image4')
        .setDescription('New inventory image 4 URL')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image5')
        .setDescription('New inventory image 5 URL')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image6')
        .setDescription('New inventory image 6 URL')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('deleteaccount')
    .setDescription('Delete an account')
    .addStringOption(option =>
      option.setName('shop')
        .setDescription('Shop name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Account name')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('purgeoutofstock')
    .setDescription('Purge all out of stock items and accounts')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
];

// Vérification des permissions
function isOwner(userId) {
  return userId === OWNER_ID;
}

// Génération des embeds
function generateShopEmbed(shopName, shopData) {
  const embed = new EmbedBuilder()
    .setTitle(`🛍️ **${shopName.toUpperCase()}**`)
    .setColor(0x00AE86);

  const shops = loadData(SHOPS_FILE);
  const globalImage = shops.globalImage;

  if (shopData.image) {
    embed.setImage(shopData.image);
  } else if (globalImage) {
    embed.setImage(globalImage);
  }

  const availableItems = Object.entries(shopData.items || {})
    .filter(([_, item]) => item.quantity > 0);

  if (availableItems.length > 0) {
    for (let i = 0; i < availableItems.length; i += 5) {
      const chunk = availableItems.slice(i, i + 5);
      chunk.forEach(([name, item]) => {
        embed.addFields({
          name: `📦 ${name}`,
          value: `Price: $${item.price.toFixed(2)}\nStock: ${item.quantity}`,
          inline: true
        });
      });
    }
  } else {
    embed.addFields({ name: 'Available Items', value: 'No items in stock', inline: false });
  }

  const accounts = loadData(ACCOUNTS_FILE);
  const shopAccounts = accounts[shopName] || {};
  const availableAccounts = Object.entries(shopAccounts)
    .filter(([_, account]) => account.quantity > 0);

  if (availableAccounts.length > 0) {
    for (let i = 0; i < availableAccounts.length; i += 5) {
      const chunk = availableAccounts.slice(i, i + 5);
      chunk.forEach(([name, account]) => {
        embed.addFields({
          name: `🏦 ${name}`,
          value: `Price: $${account.price.toFixed(2)}\nStock: ${account.quantity}`,
          inline: true
        });
      });
    }
  }

  embed.setFooter({ text: 'LorieSellShopBot | Happy Shopping!' });
  return embed;
}

function generateBannerEmbed(bannerImage) {
  const embed = new EmbedBuilder()
    .setColor(0x00AE86)
    .setImage(bannerImage || null);

  return embed;
}

function generateSelectMenu(shopName, shopData) {
  const options = [];
  
  for (const [itemName, item] of Object.entries(shopData.items || {})) {
    const isOutOfStock = item.quantity <= 0;
    options.push({
      label: isOutOfStock ? `${itemName} (Out of Stock)` : itemName,
      description: `Price: $${item.price.toFixed(2)} | Stock: ${item.quantity}`,
      value: `item:${shopName}:${itemName}`,
      emoji: isOutOfStock ? '❌' : '📦'
    });
  }

  if (options.length === 0) {
    options.push({
      label: 'No items available',
      description: 'This shop has no items',
      value: 'no_items',
      emoji: '🚫'
    });
  }

  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_item')
        .setPlaceholder('Select an item to view details')
        .addOptions(options)
    );
}

function generateAccountSelectMenu(shopName) {
  const accounts = loadData(ACCOUNTS_FILE);
  const shopAccounts = accounts[shopName] || {};
  const options = [];
  
  for (const [accountName, account] of Object.entries(shopAccounts)) {
    const isOutOfStock = account.quantity <= 0;
    options.push({
      label: isOutOfStock ? `${accountName} (Out of Stock)` : accountName,
      description: `Price: $${account.price.toFixed(2)} | Stock: ${account.quantity}`,
      value: `account:${shopName}:${accountName}`,
      emoji: isOutOfStock ? '❌' : '🏦'
    });
  }

  if (options.length === 0) {
    options.push({
      label: 'No accounts available',
      description: 'This shop has no accounts',
      value: 'no_accounts',
      emoji: '🚫'
    });
  }

  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_account')
        .setPlaceholder('Select an account to view details')
        .setDisabled(options.length === 1 && options[0].value === 'no_accounts')
        .addOptions(options)
    );
}

function generateItemEmbed(shopName, itemName, itemData) {
  const embed = new EmbedBuilder()
    .setTitle(`**${itemName}**`)
    .setColor(0xFF6B35)
    .addFields(
      { name: '💰 Price', value: `$${itemData.price.toFixed(2)}`, inline: true },
      { name: '📦 Stock', value: `${itemData.quantity}`, inline: true }
    )
    .setFooter({ text: 'LorieSellShopBot | Happy Shopping!' });

  if (itemData.quantity <= 0) {
    embed.addFields({ name: 'Status', value: '❌ Out of Stock', inline: true });
  }

  if (itemData.image) {
    embed.setImage(itemData.image);
    embed.setThumbnail(itemData.image);
  }

  return embed;
}

function generateAccountEmbed(shopName, accountName, accountData) {
  const embed = new EmbedBuilder()
    .setTitle(`🏦 **${accountName}**`)
    .setColor(0x9B59B6)
    .addFields(
      { name: '💰 Price', value: `$${accountData.price.toFixed(2)}`, inline: true },
      { name: '📦 Stock', value: `${accountData.quantity}`, inline: true }
    )
    .setDescription(accountData.description || 'No description available')
    .setFooter({ text: 'LorieSellShopBot | Happy Shopping!' });

  if (accountData.quantity <= 0) {
    embed.addFields({ name: 'Status', value: '❌ Out of Stock', inline: true });
  }

  const images = [];
  for (let i = 1; i <= 6; i++) {
    if (accountData[`image${i}`]) {
      images.push(accountData[`image${i}`]);
    }
  }

  if (images.length > 0) {
    embed.setImage(images[0]);
    let imageText = '';
    images.forEach((img, index) => {
      imageText += `[Image ${index + 1}](${img}) `;
    });
    if (imageText) {
      embed.addFields({
        name: '🖼️ Inventory Images',
        value: imageText,
        inline: false
      });
    }
  }

  return embed;
}

// Gestion des canaux
async function getOrCreateCartChannel(guild, userId) {
  const channelName = `cart-${userId}`;
  let channel = guild.channels.cache.find(ch => ch.name === channelName);
  
  if (!channel) {
    console.log(`Creating cart channel ${channelName} in category ${CART_CATEGORY_ID} at ${new Date().toLocaleString()}`);
    channel = await guild.channels.create({
      name: channelName,
      type: 0,
      parent: CART_CATEGORY_ID,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: userId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        {
          id: OWNER_ID,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels]
        }
      ]
    });
    console.log(`Cart channel ${channelName} created successfully at ${new Date().toLocaleString()}`);
  }
  
  return channel;
}

async function createTicketChannel(guild, userId, cartData) {
  const channelName = `ticket-${userId}`;
  let channel = guild.channels.cache.find(ch => ch.name === channelName);
  
  if (channel) {
    console.log(`Deleting existing ticket channel ${channelName} at ${new Date().toLocaleString()}`);
    await channel.delete().catch(error => console.error(`Error deleting existing ticket channel:`, error));
  }

  console.log(`Creating ticket channel ${channelName} in category ${TICKET_CATEGORY_ID} at ${new Date().toLocaleString()}`);
  channel = await guild.channels.create({
    name: channelName,
    type: 0,
    parent: TICKET_CATEGORY_ID,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: userId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      },
      {
        id: OWNER_ID,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels]
      }
    ]
  });
  console.log(`Ticket channel ${channelName} created successfully at ${new Date().toLocaleString()}`);

  const tickets = loadData(TICKETS_FILE);
  tickets[userId] = { timestamp: Date.now() };
  saveData(TICKETS_FILE, tickets);

  await channel.send({ content: `<@${userId}>` });
  await updateTicketDisplay(channel, userId);
  return channel;
}

async function updateCartDisplay(channel, userId) {
  const carts = loadData(CART_FILE);
  const userCart = carts[userId] || [];
  const shops = loadData(SHOPS_FILE);
  const globalImage = shops.globalImage;

  const embed = new EmbedBuilder()
    .setTitle('🛒 Your Cart')
    .setColor(0x00AE86)
    .setFooter({ text: `LorieSellShopBot | Items in cart will be removed after 12 hours. Last updated: ${new Date().toLocaleString()}` });

  if (globalImage) {
    embed.setThumbnail(globalImage);
  }

  if (userCart.length === 0) {
    embed.setDescription('Your cart is empty.');
  } else {
    for (let i = 0; i < userCart.length; i += 3) {
      const chunk = userCart.slice(i, i + 3);
      chunk.forEach(item => {
        const subtotal = item.price * item.quantity;
        embed.addFields({
          name: `${item.type === 'account' ? '🏦' : '📦'} ${item.name}`,
          value: `Price: $${item.price.toFixed(2)}\nQty: ${item.quantity}\nSubtotal: $${subtotal.toFixed(2)}`,
          inline: true
        });
      });
    }

    const total = userCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    embed.addFields({
      name: '💸 Total',
      value: `$${total.toFixed(2)}`,
      inline: false
    });
  }

  const buttons = userCart.map(item =>
    new ButtonBuilder()
      .setCustomId(`remove_item:${item.shop}:${item.name}`)
      .setLabel(`Remove ${item.name}`)
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🗑️')
  );

  if (userCart.length > 0) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId('buy_cart')
        .setLabel('Purchase')
        .setStyle(ButtonStyle.Success)
        .setEmoji('💳')
    );
  }

  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    const row = new ActionRowBuilder()
      .addComponents(buttons.slice(i, i + 5));
    rows.push(row);
  }

  const messages = await channel.messages.fetch({ limit: 100 });
  const botMessage = messages.find(msg => msg.author.id === client.user.id && !msg.content.includes('<@'));

  if (botMessage) {
    await botMessage.edit({ embeds: [embed], components: rows });
  } else {
    await channel.send({ embeds: [embed], components: rows });
  }
}

async function updateTicketDisplay(channel, userId, status = 'pending') {
  const carts = loadData(CART_FILE);
  const userCart = carts[userId] || [];
  const shops = loadData(SHOPS_FILE);
  const globalImage = shops.globalImage;

  const embed = new EmbedBuilder()
    .setTitle('📋 Order Details')
    .setColor(status === 'sold' ? 0x00FF00 : 0xFF6B35)
    .setFooter({ text: `LorieSellShopBot | Last updated: ${new Date().toLocaleString()}` });

  if (globalImage) {
    embed.setThumbnail(globalImage);
  }

  let description = '';
  let total = 0;

  for (const item of userCart) {
    const subtotal = item.price * item.quantity;
    total += subtotal;
    description += `${item.type === 'account' ? '🏦' : '📦'} ${item.name} (Shop: ${item.shop})\n`;
    description += `Quantity: ${item.quantity}\n`;
    description += `Price: $${item.price.toFixed(2)}\n`;
    description += `Subtotal: $${subtotal.toFixed(2)}\n\n`;
  }

  description += `__💸 Total: $${total.toFixed(2)}__`;
  embed.setDescription(description);

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('cancel_order')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(status === 'sold'),
      new ButtonBuilder()
        .setCustomId('mark_sold')
        .setLabel('Mark as Sold')
        .setStyle(ButtonStyle.Success)
        .setDisabled(status === 'sold')
    );

  if (status === 'sold') {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_order')
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Success)
    );
  }

  const messages = await channel.messages.fetch({ limit: 100 });
  const botMessage = messages.find(msg => 
    msg.author.id === client.user.id && 
    !msg.content.includes('<@') && 
    !msg.content.includes('Please wait, your order is being prepared.')
  );

  if (botMessage) {
    await botMessage.edit({ embeds: [embed], components: [row] });
  } else {
    await channel.send({ embeds: [embed], components: [row] });
  }
}

// Fonction pour mettre à jour les messages de shop en temps réel
async function updateShopMessages(shopName) {
  const shopMessages = loadData(SHOP_MESSAGES_FILE);
  const shops = loadData(SHOPS_FILE);
  const accounts = loadData(ACCOUNTS_FILE);
  for (const [messageId, storedShopName] of Object.entries(shopMessages)) {
    if (storedShopName === shopName) {
      const channel = await client.channels.fetch(shopMessages.channelId).catch(() => null);
      if (channel) {
        const message = await channel.messages.fetch(messageId).catch(() => null);
        if (message) {
          const shop = shops[shopName];
          const embed = generateShopEmbed(shopName, shop);
          const selectMenu = generateSelectMenu(shopName, shop);
          const accountSelectMenu = generateAccountSelectMenu(shopName);
          const refreshButton = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`refresh_shop:${shopName}`)
                .setLabel('Refresh')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔄')
            );
          await message.edit({ embeds: [embed], components: [selectMenu, accountSelectMenu, refreshButton] });
          console.log(`Updated shop ${shopName} message ${messageId} at ${new Date().toLocaleString()}`);
        }
      }
    }
  }
}

// Fonction pour purger les items et accounts "out of stock"
async function purgeOutOfStock() {
  const shops = loadData(SHOPS_FILE);
  const accounts = loadData(ACCOUNTS_FILE);

  let itemsPurged = 0;
  let accountsPurged = 0;

  // Purge des items
  for (const [shopName, shop] of Object.entries(shops)) {
    if (shopName === 'globalImage') continue;
    for (const [itemName, item] of Object.entries(shop.items || {})) {
      if (item.quantity <= 0) {
        delete shop.items[itemName];
        itemsPurged++;
      }
    }
    if (Object.keys(shop.items).length === 0) {
      delete shop.items;
    }
  }

  // Purge des accounts
  for (const [shopName, shopAccounts] of Object.entries(accounts)) {
    for (const [accountName, account] of Object.entries(shopAccounts)) {
      if (account.quantity <= 0) {
        delete shopAccounts[accountName];
        accountsPurged++;
      }
    }
    if (Object.keys(shopAccounts).length === 0) {
      delete accounts[shopName];
    }
  }

  saveData(SHOPS_FILE, shops);
  saveData(ACCOUNTS_FILE, accounts);

  return { itemsPurged, accountsPurged };
}

// Event handlers
client.once('ready', async () => {
  console.log(`Bot connected as ${client.user.tag} at ${new Date().toLocaleString()}!`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('Registering slash commands at ${new Date().toLocaleString()}...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('Slash commands registered successfully at ${new Date().toLocaleString()}!');
  } catch (error) {
    console.error('Error registering commands:', error);
  }

  // Démarrage des vérifications en temps réel
  setInterval(async () => {
    try {
      const guild = client.guilds.cache.first();
      if (guild) {
        await checkCartExpiration(guild);
        await checkTicketExpiration(guild);
      }
    } catch (error) {
      console.error('Error in real-time check:', error);
    }
  }, CHECK_INTERVAL_MS);
});

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'select_item') {
        const [type, shopName, itemName] = interaction.values[0].split(':');
        
        if (interaction.values[0] === 'no_items') {
          await interaction.reply({ content: '❌ No items available in this shop.', flags: 64 });
          setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
          return;
        }

        const shops = loadData(SHOPS_FILE);
        const shop = shops[shopName];
        const item = shop?.items[itemName];

        if (!item) {
          await interaction.reply({ content: '❌ This item is no longer available.', flags: 64 });
          setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
          return;
        }

        const itemEmbed = generateItemEmbed(shopName, itemName, item);
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`add_to_cart_item:${shopName}:${itemName}`)
              .setLabel(item.quantity <= 0 ? 'Out of Stock' : 'Add to Cart')
              .setStyle(item.quantity <= 0 ? ButtonStyle.Secondary : ButtonStyle.Success)
              .setEmoji('🛒')
              .setDisabled(item.quantity <= 0),
            new ButtonBuilder()
              .setCustomId(`back_to_shop:${shopName}`)
              .setLabel('Back')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('⬅️')
          );

        await interaction.update({ embeds: [itemEmbed], components: [row] });

        const timeoutId = setTimeout(async () => {
          try {
            if (!interaction.isReplied() && !interaction.isDeferred()) return;
            const shops = loadData(SHOPS_FILE);
            const shop = shops[shopName];
            const embed = generateShopEmbed(shopName, shop);
            const selectMenu = generateSelectMenu(shopName, shop);
            const accountSelectMenu = generateAccountSelectMenu(shopName);
            const refreshButton = new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(`refresh_shop:${shopName}`)
                  .setLabel('Refresh')
                  .setStyle(ButtonStyle.Primary)
                  .setEmoji('🔄')
              );
            await interaction.editReply({ embeds: [embed], components: [selectMenu, accountSelectMenu, refreshButton] });
            interactionTimeouts.delete(interaction.id);
          } catch (error) {
            console.error('Error in auto-back timeout:', error);
          }
        }, 30000);

        interactionTimeouts.set(interaction.id, timeoutId);
      }

      if (interaction.customId === 'select_account') {
        const [type, shopName, accountName] = interaction.values[0].split(':');
        
        if (interaction.values[0] === 'no_accounts') {
          await interaction.reply({ content: '❌ No accounts available in this shop.', flags: 64 });
          setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
          return;
        }

        const accounts = loadData(ACCOUNTS_FILE);
        const account = accounts[shopName]?.[accountName];

        if (!account) {
          await interaction.reply({ content: '❌ This account is no longer available.', flags: 64 });
          setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
          return;
        }

        const accountEmbed = generateAccountEmbed(shopName, accountName, account);
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`add_to_cart_account:${shopName}:${accountName}`)
              .setLabel(account.quantity <= 0 ? 'Out of Stock' : 'Add to Cart')
              .setStyle(account.quantity <= 0 ? ButtonStyle.Secondary : ButtonStyle.Success)
              .setEmoji('🛒')
              .setDisabled(account.quantity <= 0),
            new ButtonBuilder()
              .setCustomId(`back_to_shop:${shopName}`)
              .setLabel('Back')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('⬅️')
          );

        await interaction.update({ embeds: [accountEmbed], components: [row] });

        const timeoutId = setTimeout(async () => {
          try {
            if (!interaction.isReplied() && !interaction.isDeferred()) return;
            const shops = loadData(SHOPS_FILE);
            const shop = shops[shopName];
            const embed = generateShopEmbed(shopName, shop);
            const selectMenu = generateSelectMenu(shopName, shop);
            const accountSelectMenu = generateAccountSelectMenu(shopName);
            const refreshButton = new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(`refresh_shop:${shopName}`)
                  .setLabel('Refresh')
                  .setStyle(ButtonStyle.Primary)
                  .setEmoji('🔄')
              );
            await interaction.editReply({ embeds: [embed], components: [selectMenu, accountSelectMenu, refreshButton] });
            interactionTimeouts.delete(interaction.id);
          } catch (error) {
            console.error('Error in auto-back timeout:', error);
          }
        }, 30000);

        interactionTimeouts.set(interaction.id, timeoutId);
      }
    }

    if (interaction.isButton()) {
      if (interaction.message.interaction && interactionTimeouts.has(interaction.message.interaction.id)) {
        clearTimeout(interactionTimeouts.get(interaction.message.interaction.id));
        interactionTimeouts.delete(interaction.message.interaction.id);
      }

      if (interaction.customId.startsWith('add_to_cart_item:')) {
        await interaction.deferUpdate();
        const [_, shopName, itemName] = interaction.customId.split(':');
        
        const shops = loadData(SHOPS_FILE);
        const shop = shops[shopName];
        const item = shop?.items[itemName];

        if (!item || item.quantity <= 0) {
          await interaction.editReply({ content: '❌ This item is no longer available.', flags: 64 });
          setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
          return;
        }

        const carts = loadData(CART_FILE);
        if (!carts[interaction.user.id]) {
          carts[interaction.user.id] = [];
        }

        const existingItemIndex = carts[interaction.user.id].findIndex(
          cartItem => cartItem.name === itemName && cartItem.shop === shopName && cartItem.type === 'item'
        );

        if (existingItemIndex !== -1) {
          carts[interaction.user.id][existingItemIndex].quantity += 1;
        } else {
          carts[interaction.user.id].push({
            name: itemName,
            shop: shopName,
            price: item.price,
            quantity: 1,
            type: 'item'
          });
        }

        carts[interaction.user.id].timestamp = Date.now();

        shops[shopName].items[itemName].quantity -= 1;
        saveData(SHOPS_FILE, shops);
        saveData(CART_FILE, carts);

        const cartChannel = interaction.guild.channels.cache.find(ch => ch.name === `cart-${interaction.user.id}`);
        if (cartChannel) {
          await updateCartDisplay(cartChannel, interaction.user.id);
        }

        await updateShopMessages(shopName).catch(err => console.error(`Error updating shop messages:`, err));

        await interaction.editReply({ content: `✅ Your item has been added to cart! Use /cart to purchase it.`, flags: 64 });
        setTimeout(() => interaction.deleteReply().catch(() => {}), 6000);
      }

      if (interaction.customId.startsWith('add_to_cart_account:')) {
        await interaction.deferUpdate();
        const [_, shopName, accountName] = interaction.customId.split(':');
        
        const accounts = loadData(ACCOUNTS_FILE);
        const account = accounts[shopName]?.[accountName];

        if (!account || account.quantity <= 0) {
          await interaction.editReply({ content: '❌ This account is no longer available.', flags: 64 });
          setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
          return;
        }

        const carts = loadData(CART_FILE);
        if (!carts[interaction.user.id]) {
          carts[interaction.user.id] = [];
        }

        const existingItemIndex = carts[interaction.user.id].findIndex(
          cartItem => cartItem.name === accountName && cartItem.shop === shopName && cartItem.type === 'account'
        );

        if (existingItemIndex !== -1) {
          carts[interaction.user.id][existingItemIndex].quantity += 1;
        } else {
          carts[interaction.user.id].push({
            name: accountName,
            shop: shopName,
            price: account.price,
            quantity: 1,
            type: 'account'
          });
        }

        carts[interaction.user.id].timestamp = Date.now();

        accounts[shopName][accountName].quantity -= 1;
        saveData(ACCOUNTS_FILE, accounts);
        saveData(CART_FILE, carts);

        const cartChannel = interaction.guild.channels.cache.find(ch => ch.name === `cart-${interaction.user.id}`);
        if (cartChannel) {
          await updateCartDisplay(cartChannel, interaction.user.id);
        }

        await updateShopMessages(shopName).catch(err => console.error(`Error updating shop messages:`, err));

        await interaction.editReply({ content: `✅ Your account has been added to cart! Use /cart to purchase it.`, flags: 64 });
        setTimeout(() => interaction.deleteReply().catch(() => {}), 6000);
      }

      if (interaction.customId.startsWith('back_to_shop:')) {
        await interaction.deferUpdate();
        const [_, shopName] = interaction.customId.split(':');
        const shops = loadData(SHOPS_FILE);
        const shop = shops[shopName];

        if (!shop) {
          await interaction.editReply({ content: '❌ Shop not found.', flags: 64 });
          setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
          return;
        }

        const embed = generateShopEmbed(shopName, shop);
        const selectMenu = generateSelectMenu(shopName, shop);
        const accountSelectMenu = generateAccountSelectMenu(shopName);
        const refreshButton = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`refresh_shop:${shopName}`)
              .setLabel('Refresh')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('🔄')
          );
        await interaction.editReply({ embeds: [embed], components: [selectMenu, accountSelectMenu, refreshButton] });
      }

      if (interaction.customId.startsWith('refresh_shop:')) {
        await interaction.deferUpdate();
        const [_, shopName] = interaction.customId.split(':');
        const shops = loadData(SHOPS_FILE);
        const shop = shops[shopName];

        if (!shop) {
          await interaction.editReply({ content: '❌ Shop not found.', flags: 64 });
          setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
          return;
        }

        const embed = generateShopEmbed(shopName, shop);
        const selectMenu = generateSelectMenu(shopName, shop);
        const accountSelectMenu = generateAccountSelectMenu(shopName);
        const refreshButton = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`refresh_shop:${shopName}`)
              .setLabel('Refresh')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('🔄')
          );
        await interaction.editReply({ embeds: [embed], components: [selectMenu, accountSelectMenu, refreshButton] });
      }

      if (interaction.customId.startsWith('remove_item:')) {
        await interaction.deferUpdate();
        console.log(`Processing remove_item: ${interaction.customId} at ${new Date().toLocaleString()}`);
        const [_, shopName, itemName] = interaction.customId.split(':');
        const carts = loadData(CART_FILE);
        const userCart = carts[interaction.user.id] || [];

        console.log(`User cart:`, userCart);
        const itemIndex = userCart.findIndex(item => 
          item.name === itemName && item.shop === shopName
        );

        if (itemIndex === -1) {
          console.log(`Item ${itemName} not found in cart for user ${interaction.user.id}`);
          await interaction.editReply({ content: `❌ Item ${itemName} not found in cart.`, flags: 64 });
          setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
          return;
        }

        const item = userCart[itemIndex];
        console.log(`Removing item: ${item.name}, quantity: ${item.quantity}, type: ${item.type}`);
        
        if (item.type === 'account') {
          const accounts = loadData(ACCOUNTS_FILE);
          if (accounts[item.shop]?.[item.name]) {
            accounts[item.shop][item.name].quantity += 1;
            saveData(ACCOUNTS_FILE, accounts);
            console.log(`Restored 1 to account stock for ${item.name} in ${item.shop} at ${new Date().toLocaleString()}`);
          }
        } else {
          const shops = loadData(SHOPS_FILE);
          if (shops[item.shop]?.items[item.name]) {
            shops[item.shop].items[item.name].quantity += 1;
            saveData(SHOPS_FILE, shops);
            console.log(`Restored 1 to item stock for ${item.name} in ${item.shop} at ${new Date().toLocaleString()}`);
          }
        }

        if (item.quantity > 1) {
          userCart[itemIndex].quantity -= 1;
        } else {
          userCart.splice(itemIndex, 1);
        }
        
        carts[interaction.user.id].timestamp = Date.now();
        carts[interaction.user.id] = userCart;
        saveData(CART_FILE, carts);

        await updateCartDisplay(interaction.channel, interaction.user.id);
        await updateShopMessages(shopName).catch(err => console.error(`Error updating shop messages:`, err));
        console.log(`Cart updated for user ${interaction.user.id} at ${new Date().toLocaleString()}`);
        
        await interaction.editReply({ content: `✅ Removed one ${itemName} from cart.`, flags: 64 });
        setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
      }

      if (interaction.customId === 'buy_cart') {
        await interaction.deferUpdate();
        console.log(`Processing buy_cart for user ${interaction.user.id} at ${new Date().toLocaleString()}`);
        const carts = loadData(CART_FILE);
        const userCart = carts[interaction.user.id] || [];

        console.log(`User cart for buy_cart:`, userCart);
        if (userCart.length === 0) {
          console.log(`Cart is empty for user ${interaction.user.id}`);
          await interaction.editReply({ content: '❌ Your cart is empty.', flags: 64 });
          setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
          return;
        }

        const ticketChannel = await createTicketChannel(interaction.guild, interaction.user.id, userCart);
        console.log(`Ticket channel created: ${ticketChannel.name} at ${new Date().toLocaleString()}`);
        await interaction.editReply({ content: `✅ Order created in ${ticketChannel}`, flags: 64 });
        setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
      }

      if (interaction.customId === 'cancel_order') {
        await interaction.deferUpdate();
        console.log(`Processing cancel_order for user ${interaction.user.id} at ${new Date().toLocaleString()}`);
        const carts = loadData(CART_FILE);
        const userCart = carts[interaction.user.id] || [];

        const shops = loadData(SHOPS_FILE);
        const accounts = loadData(ACCOUNTS_FILE);
        for (const item of userCart) {
          if (item.type === 'account') {
            if (accounts[item.shop]?.[item.name]) {
              accounts[item.shop][item.name].quantity += item.quantity;
              console.log(`Restored ${item.quantity} to account stock for ${item.name} in ${item.shop} at ${new Date().toLocaleString()}`);
            }
          } else {
            if (shops[item.shop]?.items[item.name]) {
              shops[item.shop].items[item.name].quantity += item.quantity;
              console.log(`Restored ${item.quantity} to item stock for ${item.name} in ${item.shop} at ${new Date().toLocaleString()}`);
            }
          }
        }
        saveData(SHOPS_FILE, shops);
        saveData(ACCOUNTS_FILE, accounts);

        carts[interaction.user.id] = [];
        saveData(CART_FILE, carts);

        const tickets = loadData(TICKETS_FILE);
        delete tickets[interaction.user.id];
        saveData(TICKETS_FILE, tickets);

        await interaction.channel.delete();
        console.log(`Ticket channel deleted for user ${interaction.user.id} at ${new Date().toLocaleString()}`);
      }

      if (interaction.customId === 'mark_sold') {
        await interaction.deferUpdate();
        if (!isOwner(interaction.user.id)) {
          await interaction.editReply({ content: '❌ Only the shop owner can mark an order as sold.', flags: 64 });
          setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
          return;
        }

        const userId = interaction.channel.name.replace('ticket-', '');
        await updateTicketDisplay(interaction.channel, userId, 'sold');
        await interaction.channel.send({ content: 'Please wait, your order is being prepared.' });
        await interaction.editReply({ content: '✅ Order marked as sold.', flags: 64 });
        setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
      }

      if (interaction.customId === 'confirm_order') {
        await interaction.deferUpdate();
        const userId = interaction.channel.name.replace('ticket-', '');
        if (interaction.user.id !== userId) {
          await interaction.editReply({ content: '❌ Only the ticket owner can confirm the order.', flags: 64 });
          setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
          return;
        }

        console.log(`Processing confirm_order for user ${userId} by ${interaction.user.id} at ${new Date().toLocaleString()}`);
        const carts = loadData(CART_FILE);
        carts[userId] = [];
        saveData(CART_FILE, carts);

        const tickets = loadData(TICKETS_FILE);
        delete tickets[userId];
        saveData(TICKETS_FILE, tickets);

        const cartChannel = interaction.guild.channels.cache.find(ch => ch.name === `cart-${userId}`);
        if (cartChannel) {
          await updateCartDisplay(cartChannel, userId);
        }

        await interaction.channel.delete();
        console.log(`Ticket channel deleted for user ${userId} after confirmation at ${new Date().toLocaleString()}`);
      }
    }

    if (interaction.isChatInputCommand()) {
      const { commandName, user } = interaction;

      if (commandName !== 'cart' && !isOwner(user.id) && commandName !== 'purgeoutofstock') {
        await interaction.reply({ content: '❌ Only the shop owner can use this command.', flags: 64 });
        setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
        return;
      }

      const shops = loadData(SHOPS_FILE);

      switch (commandName) {
        case 'createshop': {
          await interaction.deferReply({ ephemeral: true });
          const name = interaction.options.getString('name');
          const image = interaction.options.getString('image');

          if (shops[name]) {
            await interaction.editReply({ content: `❌ Shop ${name} already exists.` });
            return;
          }

          shops[name] = { items: {}, image: image || null };
          saveData(SHOPS_FILE, shops);

          await interaction.editReply({ content: `✅ Shop ${name} created at ${new Date().toLocaleString()}.` });
          break;
        }

        case 'deleteshop': {
          await interaction.deferReply({ ephemeral: true });
          const name = interaction.options.getString('name');

          if (!shops[name]) {
            await interaction.editReply({ content: `❌ Shop ${name} not found.` });
            return;
          }

          delete shops[name];
          saveData(SHOPS_FILE, shops);

          await updateShopMessages(name).catch(err => console.error(`Error updating shop messages:`, err));
          await interaction.editReply({ content: `🗑️ Shop ${name} deleted at ${new Date().toLocaleString()}.` });
          break;
        }

        case 'shoplist': {
          await interaction.deferReply({ ephemeral: true });
          const shopNames = Object.keys(shops).filter(key => key !== 'globalImage');
          if (shopNames.length === 0) {
            await interaction.editReply({ content: '📋 No shops created.' });
          } else {
            await interaction.editReply({ content: `📋 Shops: ${shopNames.join(', ')}` });
          }
          setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
          break;
        }

        case 'shop': {
          await interaction.deferReply();
          const name = interaction.options.getString('name');
          const bannerImage = interaction.options.getString('imageatthetop');
          const shop = shops[name];

          if (!shop) {
            await interaction.editReply({ content: `❌ Shop ${name} not found.`, flags: 64 });
            setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
            return;
          }

          const embeds = [generateShopEmbed(name, shop)];
          if (bannerImage) {
            embeds.unshift(generateBannerEmbed(bannerImage));
          }
          const selectMenu = generateSelectMenu(name, shop);
          const accountSelectMenu = generateAccountSelectMenu(name);
          const refreshButton = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`refresh_shop:${name}`)
                .setLabel('Refresh')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔄')
            );
          const response = await interaction.editReply({ embeds: embeds, components: [selectMenu, accountSelectMenu, refreshButton] });

          // Enregistrer le message pour les mises à jour en temps réel
          const shopMessages = loadData(SHOP_MESSAGES_FILE);
          shopMessages[response.id] = name;
          shopMessages.channelId = interaction.channel.id;
          saveData(SHOP_MESSAGES_FILE, shopMessages);
          break;
        }

        case 'additem': {
          await interaction.deferReply({ ephemeral: true });
          const shopName = interaction.options.getString('shop');
          const itemName = interaction.options.getString('name');
          const price = interaction.options.getNumber('price');
          const quantity = interaction.options.getInteger('quantity');
          const image = interaction.options.getString('image');

          if (!shops[shopName]) {
            await interaction.editReply({ content: `❌ Shop ${shopName} not found.` });
            return;
          }

          shops[shopName].items[itemName] = {
            price: price,
            quantity: quantity,
            image: image || null
          };
          saveData(SHOPS_FILE, shops);

          await updateShopMessages(shopName).catch(err => console.error(`Error updating shop messages:`, err));
          await interaction.editReply({ content: `✅ Item ${itemName} added at ${new Date().toLocaleString()}.` });
          break;
        }

        case 'addaccount': {
          await interaction.deferReply({ ephemeral: true });
          const shopName = interaction.options.getString('shop');
          const accountName = interaction.options.getString('name');
          const price = interaction.options.getNumber('price');
          const quantity = interaction.options.getInteger('quantity');
          const description = interaction.options.getString('description');
          const image1 = interaction.options.getString('image1');
          const image2 = interaction.options.getString('image2');
          const image3 = interaction.options.getString('image3');
          const image4 = interaction.options.getString('image4');
          const image5 = interaction.options.getString('image5');
          const image6 = interaction.options.getString('image6');

          const accounts = loadData(ACCOUNTS_FILE);
          if (!accounts[shopName]) {
            accounts[shopName] = {};
          }

          if (accounts[shopName][accountName]) {
            await interaction.editReply({ content: `❌ Account ${accountName} already exists in ${shopName}.` });
            return;
          }

          accounts[shopName][accountName] = {
            price: price,
            quantity: quantity,
            description: description,
            image1: image1 || null,
            image2: image2 || null,
            image3: image3 || null,
            image4: image4 || null,
            image5: image5 || null,
            image6: image6 || null
          };
          saveData(ACCOUNTS_FILE, accounts);

          await updateShopMessages(shopName).catch(err => console.error(`Error updating shop messages:`, err));
          await interaction.editReply({ content: `✅ Account ${accountName} added to ${shopName} at ${new Date().toLocaleString()}.` });
          break;
        }

        case 'edititem': {
          await interaction.deferReply({ ephemeral: true });
          const shopName = interaction.options.getString('shop');
          const itemName = interaction.options.getString('name');
          const price = interaction.options.getNumber('price');
          const quantity = interaction.options.getInteger('quantity');
          const image = interaction.options.getString('image');

          if (!shops[shopName]?.items[itemName]) {
            await interaction.editReply({ content: `❌ Item ${itemName} not found in ${shopName}.` });
            return;
          }

          const item = shops[shopName].items[itemName];
          if (price !== null) item.price = price;
          if (quantity !== null) item.quantity = quantity;
          if (image !== null) item.image = image;

          saveData(SHOPS_FILE, shops);

          await updateShopMessages(shopName).catch(err => console.error(`Error updating shop messages:`, err));
          await interaction.editReply({ content: `✅ Item ${itemName} updated at ${new Date().toLocaleString()}.` });
          break;
        }

        case 'removeitem':
        case 'deleteitem': {
          await interaction.deferReply({ ephemeral: true });
          const shopName = interaction.options.getString('shop');
          const itemName = interaction.options.getString('name');

          if (!shops[shopName]?.items[itemName]) {
            await interaction.editReply({ content: `❌ Item ${itemName} not found in ${shopName}.` });
            return;
          }

          delete shops[shopName].items[itemName];
          saveData(SHOPS_FILE, shops);

          await updateShopMessages(shopName).catch(err => console.error(`Error updating shop messages:`, err));
          await interaction.editReply({ content: `🗑️ Item ${itemName} deleted at ${new Date().toLocaleString()}.` });
          break;
        }

        case 'removeaccount': {
          await interaction.deferReply({ ephemeral: true });
          const shopName = interaction.options.getString('shop');
          const accountName = interaction.options.getString('name');

          const accounts = loadData(ACCOUNTS_FILE);
          if (!accounts[shopName]?.[accountName]) {
            await interaction.editReply({ content: `❌ Account ${accountName} not found in ${shopName}.` });
            return;
          }

          delete accounts[shopName][accountName];
          if (Object.keys(accounts[shopName]).length === 0) {
            delete accounts[shopName];
          }
          saveData(ACCOUNTS_FILE, accounts);

          await updateShopMessages(shopName).catch(err => console.error(`Error updating shop messages:`, err));
          await interaction.editReply({ content: `🗑️ Account ${accountName} removed from ${shopName} at ${new Date().toLocaleString()}.` });
          break;
        }

        case 'itemstock': {
          await interaction.deferReply({ ephemeral: true });
          const embed = new EmbedBuilder()
            .setTitle('📦 Stock Overview')
            .setColor(0x7289DA)
            .setFooter({ text: `LorieSellShopBot | Last updated: ${new Date().toLocaleString()}` });

          let description = '';
          for (const [shopName, shop] of Object.entries(shops)) {
            if (shopName === 'globalImage') continue;
            for (const [itemName, item] of Object.entries(shop.items)) {
              description += `${itemName} (Shop: ${shopName})\n`;
              description += `Stock: ${item.quantity}\n`;
              description += `Price: $${item.price.toFixed(2)}\n\n`;
            }
          }

          if (!description) {
            description = 'No items in any shop.';
          }

          embed.setDescription(description);
          await interaction.editReply({ embeds: [embed] });
          setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
          break;
        }

        case 'accountstock': {
          await interaction.deferReply({ ephemeral: true });
          const embed = new EmbedBuilder()
            .setTitle('📦 Stock Overview')
            .setColor(0x7289DA)
            .setFooter({ text: `LorieSellShopBot | Last updated: ${new Date().toLocaleString()}` });

          let description = '';
          const accounts = loadData(ACCOUNTS_FILE);
          for (const [shopName, shopAccounts] of Object.entries(accounts)) {
            for (const [accountName, account] of Object.entries(shopAccounts)) {
              description += `${accountName} (Shop: ${shopName})\n`;
              description += `Stock: ${account.quantity}\n`;
              description += `Price: $${account.price.toFixed(2)}\n\n`;
            }
          }

          if (!description) {
            description = 'No accounts in any shop.';
          }

          embed.setDescription(description);
          await interaction.editReply({ embeds: [embed] });
          setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
          break;
        }

        case 'cart': {
          await interaction.deferReply({ ephemeral: true });
          try {
            console.log(`User ${user.id} is attempting to use /cart at ${new Date().toLocaleString()}`);
            const cartChannel = await getOrCreateCartChannel(interaction.guild, interaction.user.id);
            await updateCartDisplay(cartChannel, interaction.user.id);
            
            await interaction.editReply({ content: `✅ Your cart has been created here ${cartChannel} <@${interaction.user.id}>` });
            console.log(`Cart channel ${cartChannel.name} created or accessed for user ${user.id} at ${new Date().toLocaleString()}`);
            setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
          } catch (error) {
            console.error(`Error processing /cart for user ${user.id}:`, error);
            await interaction.editReply({ content: '❌ An error occurred while accessing your cart.' });
            setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
          }
          break;
        }

        case 'setglobalimage': {
          await interaction.deferReply({ ephemeral: true });
          const image = interaction.options.getString('image');
          shops.globalImage = image;
          saveData(SHOPS_FILE, shops);

          const shopMessages = loadData(SHOP_MESSAGES_FILE);
          for (const [messageId, shopName] of Object.entries(shopMessages)) {
            const channel = await client.channels.fetch(shopMessages.channelId).catch(() => null);
            if (channel) {
              const message = await channel.messages.fetch(messageId).catch(() => null);
              if (message) {
                const shop = shops[shopName];
                const embed = generateShopEmbed(shopName, shop);
                const selectMenu = generateSelectMenu(shopName, shop);
                const accountSelectMenu = generateAccountSelectMenu(shopName);
                const refreshButton = new ActionRowBuilder()
                  .addComponents(
                    new ButtonBuilder()
                      .setCustomId(`refresh_shop:${shopName}`)
                      .setLabel('Refresh')
                      .setStyle(ButtonStyle.Primary)
                      .setEmoji('🔄')
                  );
                await message.edit({ embeds: [embed], components: [selectMenu, accountSelectMenu, refreshButton] });
              }
            }
          }

          await interaction.editReply({ content: `✅ Global shop image set to ${image} at ${new Date().toLocaleString()}.` });
          setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
          break;
        }

        case 'editeditshop': {
          await interaction.deferReply({ ephemeral: true });
          const name = interaction.options.getString('name');
          const image = interaction.options.getString('image');

          if (!shops[name]) {
            await interaction.editReply({ content: `❌ Shop ${name} not found.` });
            return;
          }

          if (image !== null) shops[name].image = image;
          saveData(SHOPS_FILE, shops);

          await updateShopMessages(name).catch(err => console.error(`Error updating shop messages:`, err));
          await interaction.editReply({ content: `✅ Shop ${name} updated at ${new Date().toLocaleString()}.` });
          break;
        }

        case 'editaccount': {
          await interaction.deferReply({ ephemeral: true });
          const shopName = interaction.options.getString('shop');
          const accountName = interaction.options.getString('name');
          const price = interaction.options.getNumber('price');
          const quantity = interaction.options.getInteger('quantity');
          const description = interaction.options.getString('description');
          const image1 = interaction.options.getString('image1');
          const image2 = interaction.options.getString('image2');
          const image3 = interaction.options.getString('image3');
          const image4 = interaction.options.getString('image4');
          const image5 = interaction.options.getString('image5');
          const image6 = interaction.options.getString('image6');

          const accounts = loadData(ACCOUNTS_FILE);
          if (!accounts[shopName]?.[accountName]) {
            await interaction.editReply({ content: `❌ Account ${accountName} not found in ${shopName}.` });
            return;
          }

          const account = accounts[shopName][accountName];
          if (price !== null) account.price = price;
          if (quantity !== null) account.quantity = quantity;
          if (description !== null) account.description = description;
          if (image1 !== null) account.image1 = image1;
          if (image2 !== null) account.image2 = image2;
          if (image3 !== null) account.image3 = image3;
          if (image4 !== null) account.image4 = image4;
          if (image5 !== null) account.image5 = image5;
          if (image6 !== null) account.image6 = image6;

          saveData(ACCOUNTS_FILE, accounts);

          await updateShopMessages(shopName).catch(err => console.error(`Error updating shop messages:`, err));
          await interaction.editReply({ content: `✅ Account ${accountName} updated at ${new Date().toLocaleString()}.` });
          break;
        }

        case 'deleteaccount': {
          await interaction.deferReply({ ephemeral: true });
          const shopName = interaction.options.getString('shop');
          const accountName = interaction.options.getString('name');

          const accounts = loadData(ACCOUNTS_FILE);
          if (!accounts[shopName]?.[accountName]) {
            await interaction.editReply({ content: `❌ Account ${accountName} not found in ${shopName}.` });
            return;
          }

          delete accounts[shopName][accountName];
          if (Object.keys(accounts[shopName]).length === 0) {
            delete accounts[shopName];
          }
          saveData(ACCOUNTS_FILE, accounts);

          await updateShopMessages(shopName).catch(err => console.error(`Error updating shop messages:`, err));
          await interaction.editReply({ content: `🗑️ Account ${accountName} deleted from ${shopName} at ${new Date().toLocaleString()}.` });
          break;
        }

        case 'purgeoutofstock': {
          await interaction.deferReply({ ephemeral: true });
          const { itemsPurged, accountsPurged } = await purgeOutOfStock();
          const shopMessages = loadData(SHOP_MESSAGES_FILE);
          for (const shopName of Object.keys(shopMessages)) {
            await updateShopMessages(shopName).catch(err => console.error(`Error updating shop messages:`, err));
          }
          await interaction.editReply({ content: `✅ Purged ${itemsPurged} out of stock items and ${accountsPurged} out of stock accounts at ${new Date().toLocaleString()}.` });
          setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
          break;
        }
      }
    }
  } catch (error) {
    console.error('Error processing interaction at ${new Date().toLocaleString()}:', error, {
      interactionType: interaction.type,
      customId: interaction.isButton() ? interaction.customId : null,
      commandName: interaction.isChatInputCommand() ? interaction.commandName : null,
      userId: interaction.user.id
    });
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ An error occurred.', flags: 64 }).catch(() => {});
    } else if (interaction.deferred) {
      await interaction.editReply({ content: '❌ An error occurred.' }).catch(() => {});
    }
  }
});

// Vérification du token avant la connexion
if (!process.env.DISCORD_TOKEN) {
  console.error('Error: DISCORD_TOKEN not defined in .env at ${new Date().toLocaleString()}');
  process.exit(1);
}

// Connexion du bot
client.login(process.env.DISCORD_TOKEN);
