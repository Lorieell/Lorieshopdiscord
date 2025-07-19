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
<<<<<<< HEAD
  console.log(`App listening on port ${listener.address().port}`);
=======
  console.log('Your app is listening on port ' + listener.address().port);
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
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
<<<<<<< HEAD
const OWNER_ID = process.env.OWNER_ID || 'YOUR_USER_ID_HERE';
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// Vérification initiale du token
if (!DISCORD_TOKEN) {
  console.error('Error: DISCORD_TOKEN not defined in environment variables');
  process.exit(1);
}
=======
const OWNER_ID = process.env.OWNER_ID || 'TON_USER_ID_ICI';
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f

// Fichiers de base de données
const SHOPS_FILE = 'shops.json';
const CART_FILE = 'cart.json';
const SHOP_MESSAGES_FILE = 'shopMessages.json';
const STOCK_MESSAGES_FILE = 'stockMessages.json';

// Map pour stocker les timeouts des interactions
const interactionTimeouts = new Map();

// Utilitaires de fichiers
function loadData(filename) {
  try {
    if (!fs.existsSync(filename)) {
      fs.writeFileSync(filename, '{}');
<<<<<<< HEAD
      console.log(`Created empty ${filename}`);
=======
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
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
<<<<<<< HEAD
=======

>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
  new SlashCommandBuilder()
    .setName('deleteshop')
    .setDescription('Delete a shop')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Shop name')
        .setRequired(true)),
<<<<<<< HEAD
  new SlashCommandBuilder()
    .setName('shoplist')
    .setDescription('List all shops'),
=======

  new SlashCommandBuilder()
    .setName('shoplist')
    .setDescription('List all shops'),

>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
  new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Display a shop')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Shop name')
        .setRequired(true)),
<<<<<<< HEAD
=======

>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
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
<<<<<<< HEAD
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
        .setDescription('Inventory image 1 (optional)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image2')
        .setDescription('Inventory image 2 (optional)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image3')
        .setDescription('Inventory image 3 (optional)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image4')
        .setDescription('Inventory image 4 (optional)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image5')
        .setDescription('Inventory image 5 (optional)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image6')
        .setDescription('Inventory image 6 (optional)')
        .setRequired(false)),
=======

>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
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
        .setDescription('New image')
        .setRequired(false)),
<<<<<<< HEAD
=======

>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
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
<<<<<<< HEAD
=======

>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
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
<<<<<<< HEAD
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
    .setName('cart')
    .setDescription('Manage your cart'),
=======

  new SlashCommandBuilder()
    .setName('itemstock')
    .setDescription('View stock overview'),

  new SlashCommandBuilder()
    .setName('cart')
    .setDescription('Manage your cart'),

>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
  new SlashCommandBuilder()
    .setName('setglobalimage')
    .setDescription('Set a global image for all shops')
    .addStringOption(option =>
      option.setName('image')
        .setDescription('Global image URL')
        .setRequired(true))
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
    embed.setThumbnail(shopData.image);
  } else if (globalImage) {
    embed.setImage(globalImage);
    embed.setThumbnail(globalImage);
  }

  // Articles disponibles (stock > 0) - 4 par ligne
  const availableItems = Object.entries(shopData.items || {})
    .filter(([_, item]) => item.quantity > 0);

  if (availableItems.length > 0) {
    for (let i = 0; i < availableItems.length; i += 4) {
      const chunk = availableItems.slice(i, i + 4);
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

<<<<<<< HEAD
  // Comptes disponibles (stock > 0) - 4 par ligne
  const availableAccounts = Object.entries(shopData.accounts || {})
    .filter(([_, account]) => account.quantity > 0);

  if (availableAccounts.length > 0) {
    for (let i = 0; i < availableAccounts.length; i += 4) {
      const chunk = availableAccounts.slice(i, i + 4);
      chunk.forEach(([name, account]) => {
        embed.addFields({
          name: `🏦 ${name}`,
          value: `Price: $${account.price.toFixed(2)}\nStock: ${account.quantity}`,
          inline: true
        });
      });
    }
  } else {
    embed.addFields({ name: 'Available Accounts', value: 'No accounts in stock', inline: false });
  }

=======
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
  embed.setFooter({ text: 'LorieSellShopBot | Happy Shopping!' });
  return embed;
}

<<<<<<< HEAD
function generateSelectMenu(shopName, shopData, type = 'items') {
  const options = [];
  
  if (type === 'items') {
    for (const [itemName, item] of Object.entries(shopData.items || {})) {
      const isOutOfStock = item.quantity <= 0;
      options.push({
        label: isOutOfStock ? `${itemName} (Out of Stock)` : itemName,
        description: `Price: $${item.price.toFixed(2)} | Stock: ${item.quantity}`,
        value: `${shopName}:${itemName}:item`,
        emoji: isOutOfStock ? '❌' : '📦'
      });
    }
  } else if (type === 'accounts') {
    for (const [accountName, account] of Object.entries(shopData.accounts || {})) {
      const isOutOfStock = account.quantity <= 0;
      options.push({
        label: isOutOfStock ? `${accountName} (Out of Stock)` : accountName,
        description: `Price: $${account.price.toFixed(2)} | Stock: ${account.quantity}`,
        value: `${shopName}:${accountName}:account`,
        emoji: isOutOfStock ? '❌' : '🏦'
      });
    }
=======
function generateSelectMenu(shopName, shopData) {
  const options = [];
  
  for (const [itemName, item] of Object.entries(shopData.items || {})) {
    const isOutOfStock = item.quantity <= 0;
    options.push({
      label: isOutOfStock ? `${itemName} (Out of Stock)` : itemName,
      description: `Price: $${item.price.toFixed(2)} | Stock: ${item.quantity}`,
      value: `${shopName}:${itemName}`,
      emoji: isOutOfStock ? '❌' : '✅'
    });
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
  }

  if (options.length === 0) {
    options.push({
<<<<<<< HEAD
      label: type === 'items' ? 'No items available' : 'No accounts available',
      description: type === 'items' ? 'This shop has no items' : 'This shop has no accounts',
      value: `no_${type}`,
=======
      label: 'No items available',
      description: 'This shop has no items',
      value: 'no_items',
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
      emoji: '🚫'
    });
  }

  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
<<<<<<< HEAD
        .setCustomId(type === 'items' ? 'select_item' : 'select_account')
        .setPlaceholder(type === 'items' ? 'Select an item to view details' : 'Select an account to view details')
=======
        .setCustomId('select_item')
        .setPlaceholder('Select an item to view details')
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
        .addOptions(options.slice(0, 25))
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

  if (itemData.image) {
    embed.setImage(itemData.image);
    embed.setThumbnail(itemData.image);
  }

  return embed;
}

<<<<<<< HEAD
function generateAccountEmbed(shopName, accountName, accountData) {
  const embed = new EmbedBuilder()
    .setTitle(`🏦 **${accountName}**`)
    .setDescription(accountData.description || 'No description available.')
    .setColor(0x9B59B6)
    .addFields(
      { name: '💰 Price', value: `$${accountData.price.toFixed(2)}`, inline: true },
      { name: '📦 Stock', value: `${accountData.quantity}`, inline: true }
    )
    .setFooter({ text: 'LorieSellShopBot | Happy Shopping!' });

  // Gestion des images
  if (accountData.images && accountData.images.length > 0) {
    embed.setImage(accountData.images[0]);
    if (accountData.images.length > 1) {
      embed.setThumbnail(accountData.images[1]);
      const additionalImages = accountData.images.slice(2).map((url, index) => `[Image ${index + 3}](${url})`).join('\n');
      if (additionalImages) {
        embed.addFields({
          name: '🖼️ Additional Images',
          value: additionalImages,
          inline: false
        });
      }
    }
  }

  return embed;
}

=======
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
// Gestion des canaux
async function getOrCreateCartChannel(guild, userId) {
  const channelName = `cart-${userId}`;
  let channel = guild.channels.cache.find(ch => ch.name === channelName);
  
  if (!channel) {
    channel = await guild.channels.create({
      name: channelName,
      type: 0,
      permissionOverwrites: [
<<<<<<< HEAD
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        { id: OWNER_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] }
=======
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
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
      ]
    });
  }
  
  return channel;
}

async function createTicketChannel(guild, userId, cartData) {
  const channelName = `ticket-${userId}`;
  let channel = guild.channels.cache.find(ch => ch.name === channelName);
  
  if (channel) {
    await channel.delete().catch(error => console.error(`Error deleting existing ticket channel:`, error));
  }

  channel = await guild.channels.create({
    name: channelName,
    type: 0,
    permissionOverwrites: [
<<<<<<< HEAD
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: OWNER_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] }
    ]
  });

  await channel.send({ content: `<@${userId}>` });
=======
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

  // Message de mention
  await channel.send({ content: `<@${userId}>` });
  
  // Créer l'embed de commande initial
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
  await updateTicketDisplay(channel, userId);
  return channel;
}

// Event handlers
client.once('ready', async () => {
  console.log(`Bot connected as ${client.user.tag}!`);
  
<<<<<<< HEAD
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  try {
    console.log('Registering slash commands...');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
=======
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
    console.log('Slash commands registered successfully!');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
});

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isStringSelectMenu()) {
<<<<<<< HEAD
      if (interaction.customId === 'select_item' || interaction.customId === 'select_account') {
        const isAccount = interaction.customId === 'select_account';
        const [shopName, name, type] = interaction.values[0].split(':');
        
        if (interaction.values[0] === `no_${isAccount ? 'accounts' : 'items'}`) {
          const reply = await interaction.reply({ content: `❌ No ${isAccount ? 'accounts' : 'items'} available in this shop.`, ephemeral: true });
=======
      if (interaction.customId === 'select_item') {
        const [shopName, itemName] = interaction.values[0].split(':');
        
        if (interaction.values[0] === 'no_items') {
          const reply = await interaction.reply({ content: '❌ No items available in this shop.', ephemeral: true });
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
          setTimeout(() => reply.delete().catch(() => {}), 3000);
          return;
        }

        const shops = loadData(SHOPS_FILE);
        const shop = shops[shopName];
<<<<<<< HEAD
        const data = isAccount ? shop?.accounts[name] : shop?.items[name];

        if (!data) {
          const reply = await interaction.reply({ content: `❌ This ${isAccount ? 'account' : 'item'} is no longer available.`, ephemeral: true });
=======
        const item = shop?.items[itemName];

        if (!item) {
          const reply = await interaction.reply({ content: '❌ This item is no longer available.', ephemeral: true });
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
          setTimeout(() => reply.delete().catch(() => {}), 3000);
          return;
        }

<<<<<<< HEAD
        const embed = isAccount ? generateAccountEmbed(shopName, name, data) : generateItemEmbed(shopName, name, data);
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`add_to_cart:${shopName}:${name}:${type}`)
              .setLabel('Add to Cart')
              .setStyle(ButtonStyle.Success)
              .setEmoji('🛒')
              .setDisabled(data.quantity <= 0),
=======
        // Afficher l'embed de l'item avec les boutons
        const itemEmbed = generateItemEmbed(shopName, itemName, item);
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`add_to_cart:${shopName}:${itemName}`)
              .setLabel('Add to Cart')
              .setStyle(ButtonStyle.Success)
              .setEmoji('🛒')
              .setDisabled(item.quantity <= 0),
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
            new ButtonBuilder()
              .setCustomId(`back_to_shop:${shopName}`)
              .setLabel('Back')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('⬅️')
          );

<<<<<<< HEAD
        await interaction.update({ embeds: [embed], components: [row] });

        const timeoutId = setTimeout(async () => {
          try {
            if (!interaction.isReplied() && !interaction.isDeferred()) return;
            const shops = loadData(SHOPS_FILE);
            const shop = shops[shopName];
            if (!shop) return;
            const embed = generateShopEmbed(shopName, shop);
            const itemMenu = generateSelectMenu(shopName, shop, 'items');
            const accountMenu = generateSelectMenu(shopName, shop, 'accounts');
            await interaction.editReply({ embeds: [embed], components: [itemMenu, accountMenu] });
=======
        await interaction.update({ embeds: [itemEmbed], components: [row] });

        // Programmer le retour automatique après 30 secondes
        const timeoutId = setTimeout(async () => {
          try {
            if (!interaction.isReplied() && !interaction.isDeferred()) return;
            const embed = generateShopEmbed(shopName, shop);
            const selectMenu = generateSelectMenu(shopName, shop);
            await interaction.editReply({ embeds: [embed], components: [selectMenu] });
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
            interactionTimeouts.delete(interaction.id);
          } catch (error) {
            console.error('Error in auto-back timeout:', error);
          }
        }, 30000);

<<<<<<< HEAD
=======
        // Stocker le timeout pour pouvoir l'annuler
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
        interactionTimeouts.set(interaction.id, timeoutId);
      }
    }

    if (interaction.isButton()) {
<<<<<<< HEAD
=======
      // Annuler le timeout si un bouton est cliqué
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
      if (interaction.message.interaction && interactionTimeouts.has(interaction.message.interaction.id)) {
        clearTimeout(interactionTimeouts.get(interaction.message.interaction.id));
        interactionTimeouts.delete(interaction.message.interaction.id);
      }

      if (interaction.customId.startsWith('add_to_cart:')) {
<<<<<<< HEAD
        const [_, shopName, name, type] = interaction.customId.split(':');
        
        const shops = loadData(SHOPS_FILE);
        const shop = shops[shopName];
        const data = type === 'account' ? shop?.accounts[name] : shop?.items[name];

        if (!data || data.quantity <= 0) {
          const reply = await interaction.reply({ content: `❌ This ${type} is no longer available.`, ephemeral: true });
=======
        const [_, shopName, itemName] = interaction.customId.split(':');
        
        const shops = loadData(SHOPS_FILE);
        const shop = shops[shopName];
        const item = shop?.items[itemName];

        if (!item || item.quantity <= 0) {
          const reply = await interaction.reply({ content: '❌ This item is no longer available.', ephemeral: true });
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
          setTimeout(() => reply.delete().catch(() => {}), 3000);
          return;
        }

<<<<<<< HEAD
=======
        // Ajouter au panier
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
        const carts = loadData(CART_FILE);
        if (!carts[interaction.user.id]) {
          carts[interaction.user.id] = [];
        }

        const existingItemIndex = carts[interaction.user.id].findIndex(
<<<<<<< HEAD
          cartItem => cartItem.name === name && cartItem.shop === shopName && cartItem.type === type
=======
          cartItem => cartItem.name === itemName && cartItem.shop === shopName
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
        );

        if (existingItemIndex !== -1) {
          carts[interaction.user.id][existingItemIndex].quantity += 1;
        } else {
          carts[interaction.user.id].push({
<<<<<<< HEAD
            name: name,
            shop: shopName,
            price: data.price,
            quantity: 1,
            type: type
          });
        }

        if (type === 'account') {
          shops[shopName].accounts[name].quantity -= 1;
        } else {
          shops[shopName].items[name].quantity -= 1;
        }
        saveData(SHOPS_FILE, shops);
        saveData(CART_FILE, carts);

=======
            name: itemName,
            shop: shopName,
            price: item.price,
            quantity: 1
          });
        }

        shops[shopName].items[itemName].quantity -= 1;
        saveData(SHOPS_FILE, shops);
        saveData(CART_FILE, carts);

        // Mettre à jour le cart en temps réel si ouvert
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
        const cartChannel = interaction.guild.channels.cache.find(ch => ch.name === `cart-${interaction.user.id}`);
        if (cartChannel) {
          await updateCartDisplay(cartChannel, interaction.user.id);
        }

        const reply = await interaction.reply({ 
<<<<<<< HEAD
          content: `✅ Your ${type} has been added to cart! Use /cart to purchase it.`, 
=======
          content: `✅ Your item has been added to cart! Use /cart to purchase it.`, 
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
          ephemeral: true 
        });
        setTimeout(() => reply.delete().catch(() => {}), 6000);
      }

      if (interaction.customId.startsWith('back_to_shop:')) {
        const [_, shopName] = interaction.customId.split(':');
        const shops = loadData(SHOPS_FILE);
        const shop = shops[shopName];

        if (!shop) {
          const reply = await interaction.reply({ content: '❌ Shop not found.', ephemeral: true });
          setTimeout(() => reply.delete().catch(() => {}), 3000);
          return;
        }

        const embed = generateShopEmbed(shopName, shop);
<<<<<<< HEAD
        const itemMenu = generateSelectMenu(shopName, shop, 'items');
        const accountMenu = generateSelectMenu(shopName, shop, 'accounts');
        await interaction.update({ embeds: [embed], components: [itemMenu, accountMenu] });
      }

      if (interaction.customId.startsWith('remove_item:')) {
        const [_, shopName, name, type] = interaction.customId.split(':');
        const carts = loadData(CART_FILE);
        const userCart = carts[interaction.user.id] || [];

        const itemIndex = userCart.findIndex(item => 
          item.name === name && item.shop === shopName && item.type === type
        );

        if (itemIndex === -1) {
          const reply = await interaction.reply({ content: `❌ ${type.charAt(0).toUpperCase() + type.slice(1)} ${name} not found in cart.`, ephemeral: true });
=======
        const selectMenu = generateSelectMenu(shopName, shop);
        await interaction.update({ embeds: [embed], components: [selectMenu] });
      }

      if (interaction.customId.startsWith('remove_item:')) {
        console.log(`Processing remove_item: ${interaction.customId}`);
        const [_, shopName, itemName] = interaction.customId.split(':');
        const carts = loadData(CART_FILE);
        const userCart = carts[interaction.user.id] || [];

        console.log(`User cart:`, userCart);
        const itemIndex = userCart.findIndex(item => 
          item.name === itemName && item.shop === shopName
        );

        if (itemIndex === -1) {
          console.log(`Item ${itemName} not found in cart for user ${interaction.user.id}`);
          const reply = await interaction.reply({ content: `❌ Item ${itemName} not found in cart.`, ephemeral: true });
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
          setTimeout(() => reply.delete().catch(() => {}), 3000);
          return;
        }

        const item = userCart[itemIndex];
<<<<<<< HEAD
        const shops = loadData(SHOPS_FILE);
        if (shops[item.shop]?.[type + 's']?.[item.name]) {
          shops[item.shop][type + 's'][item.name].quantity += 1;
          saveData(SHOPS_FILE, shops);
        }

=======
        console.log(`Removing item: ${item.name}, quantity: ${item.quantity}`);
        
        // Restaurer 1 au stock
        const shops = loadData(SHOPS_FILE);
        if (shops[item.shop]?.items[item.name]) {
          shops[item.shop].items[item.name].quantity += 1;
          saveData(SHOPS_FILE, shops);
          console.log(`Restored 1 to stock for ${item.name} in ${item.shop}`);
        } else {
          console.log(`Shop ${item.shop} or item ${item.name} not found in shops.json`);
        }

        // Réduire la quantité ou supprimer
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
        if (item.quantity > 1) {
          userCart[itemIndex].quantity -= 1;
        } else {
          userCart.splice(itemIndex, 1);
        }
        
        carts[interaction.user.id] = userCart;
        saveData(CART_FILE, carts);

<<<<<<< HEAD
        await updateCartDisplay(interaction.channel, interaction.user.id);
        const reply = await interaction.reply({ content: `✅ Removed one ${name} from cart.`, ephemeral: true });
=======
        // Mettre à jour l'affichage
        await updateCartDisplay(interaction.channel, interaction.user.id);
        console.log(`Cart updated for user ${interaction.user.id}`);
        
        const reply = await interaction.reply({ content: `✅ Removed one ${itemName} from cart.`, ephemeral: true });
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
        setTimeout(() => reply.delete().catch(() => {}), 3000);
      }

      if (interaction.customId === 'buy_cart') {
<<<<<<< HEAD
        const carts = loadData(CART_FILE);
        const userCart = carts[interaction.user.id] || [];

        if (userCart.length === 0) {
=======
        console.log(`Processing buy_cart for user ${interaction.user.id}`);
        const carts = loadData(CART_FILE);
        const userCart = carts[interaction.user.id] || [];

        console.log(`User cart for buy_cart:`, userCart);
        if (userCart.length === 0) {
          console.log(`Cart is empty for user ${interaction.user.id}`);
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
          const reply = await interaction.reply({ content: '❌ Your cart is empty.', ephemeral: true });
          setTimeout(() => reply.delete().catch(() => {}), 3000);
          return;
        }

        const ticketChannel = await createTicketChannel(interaction.guild, interaction.user.id, userCart);
<<<<<<< HEAD
=======
        console.log(`Ticket channel created: ${ticketChannel.name}`);
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
        const reply = await interaction.reply({ content: `✅ Order created in ${ticketChannel}`, ephemeral: true });
        setTimeout(() => reply.delete().catch(() => {}), 5000);
      }

      if (interaction.customId === 'cancel_order') {
<<<<<<< HEAD
        const carts = loadData(CART_FILE);
        const userCart = carts[interaction.user.id] || [];
        const shops = loadData(SHOPS_FILE);

        for (const item of userCart) {
          if (shops[item.shop]?.[item.type + 's']?.[item.name]) {
            shops[item.shop][item.type + 's'][item.name].quantity += item.quantity;
=======
        console.log(`Processing cancel_order for user ${interaction.user.id}`);
        const carts = loadData(CART_FILE);
        const userCart = carts[interaction.user.id] || [];

        // Restaurer le stock
        const shops = loadData(SHOPS_FILE);
        for (const item of userCart) {
          if (shops[item.shop]?.items[item.name]) {
            shops[item.shop].items[item.name].quantity += item.quantity;
            console.log(`Restored ${item.quantity} to stock for ${item.name} in ${item.shop}`);
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
          }
        }
        saveData(SHOPS_FILE, shops);

<<<<<<< HEAD
        carts[interaction.user.id] = [];
        saveData(CART_FILE, carts);

        await interaction.channel.delete();
=======
        // Vider le panier
        carts[interaction.user.id] = [];
        saveData(CART_FILE, carts);

        // Supprimer le ticket
        await interaction.channel.delete();
        console.log(`Ticket channel deleted for user ${interaction.user.id}`);
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
      }

      if (interaction.customId === 'mark_sold') {
        if (!isOwner(interaction.user.id)) {
          const reply = await interaction.reply({ content: '❌ Only the shop owner can mark an order as sold.', ephemeral: true });
          setTimeout(() => reply.delete().catch(() => {}), 3000);
          return;
        }

        const userId = interaction.channel.name.replace('ticket-', '');
        await updateTicketDisplay(interaction.channel, userId, 'sold');
        await interaction.channel.send({ content: 'Please wait, your order is being prepared.' });
        const reply = await interaction.reply({ content: '✅ Order marked as sold.', ephemeral: true });
        setTimeout(() => reply.delete().catch(() => {}), 3000);
      }

      if (interaction.customId === 'confirm_order') {
        if (!isOwner(interaction.user.id)) {
<<<<<<< HEAD
          const reply = await interaction.reply({ content: '❅ Only the shop owner can confirm an order.', ephemeral: true });
=======
          const reply = await interaction.reply({ content: '❌ Only the shop owner can confirm an order.', ephemeral: true });
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
          setTimeout(() => reply.delete().catch(() => {}), 3000);
          return;
        }

        const userId = interaction.channel.name.replace('ticket-', '');
<<<<<<< HEAD
=======
        
        // Vider le panier
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
        const carts = loadData(CART_FILE);
        carts[userId] = [];
        saveData(CART_FILE, carts);

<<<<<<< HEAD
=======
        // Mettre à jour le cart channel si ouvert
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
        const cartChannel = interaction.guild.channels.cache.find(ch => ch.name === `cart-${userId}`);
        if (cartChannel) {
          await updateCartDisplay(cartChannel, userId);
        }

<<<<<<< HEAD
=======
        // Supprimer le ticket
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
        await interaction.channel.delete();
      }
    }

    if (interaction.isChatInputCommand()) {
      const { commandName, user } = interaction;

<<<<<<< HEAD
      if (commandName !== 'cart' && !isOwner(user.id)) {
        const reply = await interaction.reply({ content: '❅ Only the shop owner can use this command.', ephemeral: true });
=======
      // Vérification des permissions (sauf pour /cart)
      if (commandName !== 'cart' && !isOwner(user.id)) {
        const reply = await interaction.reply({ content: '❌ Only the shop owner can use this command.', ephemeral: true });
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
        setTimeout(() => reply.delete().catch(() => {}), 5000);
        return;
      }

      const shops = loadData(SHOPS_FILE);

      switch (commandName) {
        case 'createshop': {
          const name = interaction.options.getString('name');
          const image = interaction.options.getString('image');

          if (shops[name]) {
<<<<<<< HEAD
            const reply = await interaction.reply({ content: `❅ Shop ${name} already exists.`, ephemeral: true });
=======
            const reply = await interaction.reply({ content: `❌ Shop ${name} already exists.`, ephemeral: true });
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
            setTimeout(() => reply.delete().catch(() => {}), 5000);
            return;
          }

<<<<<<< HEAD
          shops[name] = { items: {}, accounts: {}, image: image || null };
=======
          shops[name] = { items: {}, image: image || null };
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
          saveData(SHOPS_FILE, shops);

          await interaction.reply({ content: `✅ Shop ${name} created.` });
          break;
        }

        case 'deleteshop': {
          const name = interaction.options.getString('name');

          if (!shops[name]) {
<<<<<<< HEAD
            const reply = await interaction.reply({ content: `❅ Shop ${name} not found.`, ephemeral: true });
=======
            const reply = await interaction.reply({ content: `❌ Shop ${name} not found.`, ephemeral: true });
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
            setTimeout(() => reply.delete().catch(() => {}), 5000);
            return;
          }

          delete shops[name];
          saveData(SHOPS_FILE, shops);

          await interaction.reply({ content: `🗑️ Shop ${name} deleted.` });
          break;
        }

        case 'shoplist': {
          const shopNames = Object.keys(shops).filter(key => key !== 'globalImage');
          if (shopNames.length === 0) {
            const reply = await interaction.reply({ content: '📋 No shops created.', ephemeral: true });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
          } else {
            const reply = await interaction.reply({ content: `📋 Shops: ${shopNames.join(', ')}`, ephemeral: true });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
          }
          break;
        }

        case 'shop': {
          const name = interaction.options.getString('name');
          const shop = shops[name];

          if (!shop) {
<<<<<<< HEAD
            const reply = await interaction.reply({ content: `❅ Shop ${name} not found.`, ephemeral: true });
=======
            const reply = await interaction.reply({ content: `❌ Shop ${name} not found.`, ephemeral: true });
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
            setTimeout(() => reply.delete().catch(() => {}), 5000);
            return;
          }

          const embed = generateShopEmbed(name, shop);
<<<<<<< HEAD
          const itemMenu = generateSelectMenu(name, shop, 'items');
          const accountMenu = generateSelectMenu(name, shop, 'accounts');
          await interaction.reply({ embeds: [embed], components: [itemMenu, accountMenu] });
=======
          const selectMenu = generateSelectMenu(name, shop);

          await interaction.reply({ embeds: [embed], components: [selectMenu] });
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
          break;
        }

        case 'additem': {
          const shopName = interaction.options.getString('shop');
          const itemName = interaction.options.getString('name');
          const price = interaction.options.getNumber('price');
          const quantity = interaction.options.getInteger('quantity');
          const image = interaction.options.getString('image');

          if (!shops[shopName]) {
<<<<<<< HEAD
            const reply = await interaction.reply({ content: `❅ Shop ${shopName} not found.`, ephemeral: true });
=======
            const reply = await interaction.reply({ content: `❌ Shop ${shopName} not found.`, ephemeral: true });
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
            setTimeout(() => reply.delete().catch(() => {}), 5000);
            return;
          }

          shops[shopName].items[itemName] = {
            price: price,
            quantity: quantity,
            image: image || null
          };
          saveData(SHOPS_FILE, shops);

          await interaction.reply({ content: `✅ Item ${itemName} added.` });
          break;
        }

<<<<<<< HEAD
        case 'addaccount': {
          const shopName = interaction.options.getString('shop');
          const accountName = interaction.options.getString('name');
          const price = interaction.options.getNumber('price');
          const quantity = interaction.options.getInteger('quantity');
          const description = interaction.options.getString('description');
          const images = [
            interaction.options.getString('image1'),
            interaction.options.getString('image2'),
            interaction.options.getString('image3'),
            interaction.options.getString('image4'),
            interaction.options.getString('image5'),
            interaction.options.getString('image6')
          ].filter(url => url);

          if (!shops[shopName]) {
            const reply = await interaction.reply({ content: `❅ Shop ${shopName} not found.`, ephemeral: true });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
            return;
          }

          if (!shops[shopName].accounts) {
            shops[shopName].accounts = {};
          }

          shops[shopName].accounts[accountName] = {
            price: price,
            quantity: quantity,
            description: description,
            images: images
          };
          saveData(SHOPS_FILE, shops);

          await interaction.reply({ content: `✅ Account ${accountName} added to ${shopName}.` });
          break;
        }

=======
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
        case 'edititem': {
          const shopName = interaction.options.getString('shop');
          const itemName = interaction.options.getString('name');
          const price = interaction.options.getNumber('price');
          const quantity = interaction.options.getInteger('quantity');
          const image = interaction.options.getString('image');

          if (!shops[shopName]?.items[itemName]) {
<<<<<<< HEAD
            const reply = await interaction.reply({ content: `❅ Item ${itemName} not found in ${shopName}.`, ephemeral: true });
=======
            const reply = await interaction.reply({ content: `❌ Item ${itemName} not found in ${shopName}.`, ephemeral: true });
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
            setTimeout(() => reply.delete().catch(() => {}), 5000);
            return;
          }

          const item = shops[shopName].items[itemName];
          if (price !== null) item.price = price;
          if (quantity !== null) item.quantity = quantity;
          if (image !== null) item.image = image;

          saveData(SHOPS_FILE, shops);

          await interaction.reply({ content: `✅ Item ${itemName} updated.` });
          break;
        }

        case 'removeitem':
        case 'deleteitem': {
          const shopName = interaction.options.getString('shop');
          const itemName = interaction.options.getString('name');

          if (!shops[shopName]?.items[itemName]) {
<<<<<<< HEAD
            const reply = await interaction.reply({ content: `❅ Item ${itemName} not found in ${shopName}.`, ephemeral: true });
=======
            const reply = await interaction.reply({ content: `❌ Item ${itemName} not found in ${shopName}.`, ephemeral: true });
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
            setTimeout(() => reply.delete().catch(() => {}), 5000);
            return;
          }

          delete shops[shopName].items[itemName];
          saveData(SHOPS_FILE, shops);

          await interaction.reply({ content: `🗑️ Item ${itemName} deleted.` });
          break;
        }

<<<<<<< HEAD
        case 'removeaccount': {
          const shopName = interaction.options.getString('shop');
          const accountName = interaction.options.getString('name');

          if (!shops[shopName]?.accounts[accountName]) {
            const reply = await interaction.reply({ content: `❅ Account ${accountName} not found in ${shopName}.`, ephemeral: true });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
            return;
          }

          delete shops[shopName].accounts[accountName];
          saveData(SHOPS_FILE, shops);

          await interaction.reply({ content: `🗑️ Account ${accountName} deleted.` });
          break;
        }

=======
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
        case 'itemstock': {
          const embed = new EmbedBuilder()
            .setTitle('📦 Stock Overview')
            .setColor(0x7289DA)
            .setFooter({ text: 'LorieSellShopBot | Happy Shopping!' });

          let description = '';
          for (const [shopName, shop] of Object.entries(shops)) {
            if (shopName === 'globalImage') continue;
<<<<<<< HEAD
            for (const [itemName, item] of Object.entries(shop.items || {})) {
              description += `📦 ${itemName} (Shop: ${shopName})\n`;
              description += `Stock: ${item.quantity}\n`;
              description += `Price: $${item.price.toFixed(2)}\n\n`;
            }
            for (const [accountName, account] of Object.entries(shop.accounts || {})) {
              description += `🏦 ${accountName} (Shop: ${shopName})\n`;
              description += `Stock: ${account.quantity}\n`;
              description += `Price: $${account.price.toFixed(2)}\n\n`;
            }
          }

          if (!description) {
            description = 'No items or accounts in any shop.';
=======
            for (const [itemName, item] of Object.entries(shop.items)) {
              description += `${itemName} (Shop: ${shopName})\n`;
              description += `Stock: ${item.quantity}\n`;
              description += `Price: $${item.price.toFixed(2)}\n\n`;
            }
          }

          if (!description) {
            description = 'No items in any shop.';
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
          }

          embed.setDescription(description);
          const reply = await interaction.reply({ embeds: [embed], ephemeral: true });
          setTimeout(() => reply.delete().catch(() => {}), 5000);
          break;
        }

        case 'cart': {
          const cartChannel = await getOrCreateCartChannel(interaction.guild, interaction.user.id);
          await updateCartDisplay(cartChannel, interaction.user.id);
<<<<<<< HEAD
=======
          
          // Message éphémère avec mention
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
          const reply = await interaction.reply({ 
            content: `✅ Your cart has been created here ${cartChannel} <@${interaction.user.id}>`, 
            ephemeral: true 
          });
          setTimeout(() => reply.delete().catch(() => {}), 5000);
          break;
        }

        case 'setglobalimage': {
          const image = interaction.options.getString('image');
          shops.globalImage = image;
          saveData(SHOPS_FILE, shops);
          const reply = await interaction.reply({ content: `✅ Global shop image set to ${image}.`, ephemeral: true });
          setTimeout(() => reply.delete().catch(() => {}), 5000);
          break;
        }
      }
    }
  } catch (error) {
<<<<<<< HEAD
    console.error('Error processing interaction:', error);
    if (!interaction.replied && !interaction.deferred) {
      const reply = await interaction.reply({ content: '❅ An error occurred.', ephemeral: true });
=======
    console.error('Error processing interaction:', error, {
      interactionType: interaction.type,
      customId: interaction.isButton() ? interaction.customId : null,
      commandName: interaction.isChatInputCommand() ? interaction.commandName : null,
      userId: interaction.user.id
    });
    if (!interaction.replied && !interaction.deferred) {
      const reply = await interaction.reply({ content: '❌ An error occurred.', ephemeral: true });
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
      setTimeout(() => reply.delete().catch(() => {}), 3000);
    }
  }
});

<<<<<<< HEAD
=======
// Fonctions de mise à jour des displays
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
async function updateCartDisplay(channel, userId) {
  const carts = loadData(CART_FILE);
  const userCart = carts[userId] || [];
  const shops = loadData(SHOPS_FILE);
  const globalImage = shops.globalImage;

<<<<<<< HEAD
=======
  // Générer l'embed
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
  const embed = new EmbedBuilder()
    .setTitle('🛒 Your Cart')
    .setColor(0x00AE86)
    .setFooter({ text: 'LorieSellShopBot | Happy Shopping!' });

  if (globalImage) {
    embed.setThumbnail(globalImage);
  }

  if (userCart.length === 0) {
    embed.setDescription('Your cart is empty.');
  } else {
<<<<<<< HEAD
=======
    // Afficher les items en colonnes (3 par ligne)
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
    for (let i = 0; i < userCart.length; i += 3) {
      const chunk = userCart.slice(i, i + 3);
      chunk.forEach(item => {
        const subtotal = item.price * item.quantity;
<<<<<<< HEAD
        const emoji = item.type === 'item' ? '📦' : '🏦';
        embed.addFields({
          name: `${emoji} ${item.name}`,
=======
        embed.addFields({
          name: `📦 ${item.name}`,
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
          value: `Price: $${item.price.toFixed(2)}\nQty: ${item.quantity}\nSubtotal: $${subtotal.toFixed(2)}`,
          inline: true
        });
      });
    }

<<<<<<< HEAD
=======
    // Calculer et afficher le total
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
    const total = userCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    embed.addFields({
      name: '💸 Total',
      value: `$${total.toFixed(2)}`,
      inline: false
    });
  }

<<<<<<< HEAD
  const buttons = userCart.map(item =>
    new ButtonBuilder()
      .setCustomId(`remove_item:${item.shop}:${item.name}:${item.type}`)
=======
  // Créer les boutons
  const buttons = userCart.map(item =>
    new ButtonBuilder()
      .setCustomId(`remove_item:${item.shop}:${item.name}`)
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
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

<<<<<<< HEAD
  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    const row = new ActionRowBuilder().addComponents(buttons.slice(i, i + 5));
    rows.push(row);
  }

=======
  // Créer les rows (5 boutons max par row)
  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    const row = new ActionRowBuilder()
      .addComponents(buttons.slice(i, i + 5));
    rows.push(row);
  }

  // Trouver le dernier message du bot
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
  const messages = await channel.messages.fetch({ limit: 100 });
  const botMessage = messages.find(msg => msg.author.id === client.user.id && !msg.content.includes('<@'));

  if (botMessage) {
<<<<<<< HEAD
    await botMessage.edit({ embeds: [embed], components: rows });
  } else {
=======
    // Éditer le message existant
    await botMessage.edit({ embeds: [embed], components: rows });
  } else {
    // Envoyer un nouveau message si aucun n'existe
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
    await channel.send({ embeds: [embed], components: rows });
  }
}

async function updateTicketDisplay(channel, userId, status = 'pending') {
  const carts = loadData(CART_FILE);
  const userCart = carts[userId] || [];
  const shops = loadData(SHOPS_FILE);
  const globalImage = shops.globalImage;

<<<<<<< HEAD
=======
  // Générer l'embed
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
  const embed = new EmbedBuilder()
    .setTitle('📋 Order Details')
    .setColor(status === 'sold' ? 0x00FF00 : 0xFF6B35)
    .setFooter({ text: 'LorieSellShopBot | Happy Shopping!' });

  if (globalImage) {
    embed.setThumbnail(globalImage);
  }

  let description = '';
  let total = 0;

  for (const item of userCart) {
    const subtotal = item.price * item.quantity;
    total += subtotal;
<<<<<<< HEAD
    const emoji = item.type === 'item' ? '📦' : '🏦';
    description += `${emoji} ${item.name} (Shop: ${item.shop})\n`;
=======
    description += `📦 ${item.name} (Shop: ${item.shop})\n`;
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
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

<<<<<<< HEAD
=======
  // Trouver le dernier message du bot
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
  const messages = await channel.messages.fetch({ limit: 100 });
  const botMessage = messages.find(msg => 
    msg.author.id === client.user.id && 
    !msg.content.includes('<@') && 
    !msg.content.includes('Please wait, your order is being prepared.')
  );

  if (botMessage) {
<<<<<<< HEAD
    await botMessage.edit({ embeds: [embed], components: [row] });
  } else {
=======
    // Éditer le message existant
    await botMessage.edit({ embeds: [embed], components: [row] });
  } else {
    // Envoyer un nouveau message si aucun n'existe
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
    await channel.send({ embeds: [embed], components: [row] });
  }
}

<<<<<<< HEAD
client.login(DISCORD_TOKEN).catch(error => {
  console.error('Error logging in:', error);
  process.exit(1);
});
=======
// Vérification du token avant la connexion
if (!process.env.DISCORD_TOKEN) {
  console.error('Error: DISCORD_TOKEN not defined in .env');
  process.exit(1);
}

// Connexion du bot
client.login(process.env.DISCORD_TOKEN);
>>>>>>> 850175b957b8b68ba3a12a64bf4fdefca701f42f
